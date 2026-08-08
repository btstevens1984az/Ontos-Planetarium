"""Auth API routes — local, Azure AD, LDAP/AD."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.azure_ad import (
    azure_configured,
    begin_azure_login,
    exchange_code,
    pop_valid_state,
    upsert_azure_user,
)
from app.auth.ldap_ad import authenticate_ldap
from app.auth.local import authenticate_local
from app.config import Settings, get_settings
from app.db import get_db
from app.models import User
from app.security import client_ip, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)
    provider: str = Field(default="local", pattern="^(local|ldap)$")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    provider: str
    user: dict


class ProviderInfo(BaseModel):
    local: bool
    azure_ad: bool
    ldap: bool
    azure_ready: bool
    ldap_ready: bool
    demo_mode: bool
    app_name: str


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role,
        "auth_provider": user.auth_provider,
    }


def _tokens_for(user: User) -> TokenResponse:
    settings = get_settings()
    access = create_token(
        user.username,
        token_type="access",
        extra={"role": user.role, "provider": user.auth_provider},
        minutes=settings.access_token_minutes,
    )
    refresh = create_token(
        user.username,
        token_type="refresh",
        days=settings.refresh_token_days,
    )
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        provider=user.auth_provider,
        user=_user_dict(user),
    )


@router.get("/providers", response_model=ProviderInfo)
async def providers(settings: Settings = Depends(get_settings)) -> ProviderInfo:
    return ProviderInfo(
        local=settings.auth_local_enabled,
        azure_ad=settings.auth_azure_ad_enabled,
        ldap=settings.auth_ldap_enabled,
        azure_ready=azure_configured(settings),
        ldap_ready=bool(settings.auth_ldap_enabled and settings.ldap_url),
        demo_mode=settings.demo_mode,
        app_name=settings.app_name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    ip = client_ip(request)
    user: User | None = None

    if body.provider == "local":
        if not settings.auth_local_enabled:
            raise HTTPException(status_code=400, detail="Local auth disabled")
        user = await authenticate_local(
            db, username=body.username, password=body.password, ip_address=ip
        )
    elif body.provider == "ldap":
        if not settings.auth_ldap_enabled:
            raise HTTPException(status_code=400, detail="LDAP/AD auth disabled")
        user = await authenticate_ldap(
            db,
            settings,
            username=body.username,
            password=body.password,
            ip_address=ip,
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return _tokens_for(user)


@router.get("/azure/login")
async def azure_login(settings: Settings = Depends(get_settings)):
    if not azure_configured(settings):
        raise HTTPException(status_code=400, detail="Azure AD is not configured")
    url, _state = begin_azure_login(settings)
    return {"authorize_url": url}


@router.get("/azure/callback")
async def azure_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    if error:
        raise HTTPException(status_code=400, detail=f"Azure AD error: {error}")
    if not code or not state or not pop_valid_state(state):
        raise HTTPException(status_code=400, detail="Invalid OAuth state or code")
    try:
        data = await exchange_code(settings, code)
        user = await upsert_azure_user(
            db, data["profile"], ip_address=client_ip(request)
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"Azure sign-in failed: {exc}") from exc

    tokens = _tokens_for(user)
    # Hand tokens to SPA via fragment-less query on frontend route
    redirect = (
        f"/#/auth/callback?access_token={tokens.access_token}"
        f"&refresh_token={tokens.refresh_token}"
    )
    return RedirectResponse(redirect)


@router.get("/me")
async def me(user: User = Depends(get_current_user)) -> dict:
    return _user_dict(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    from app.security import decode_token
    from sqlalchemy import select

    body = await request.json()
    token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")
    result = await db.execute(select(User).where(User.username == payload.get("sub")))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return _tokens_for(user)
