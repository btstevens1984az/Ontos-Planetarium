"""Azure AD / Microsoft Entra ID OIDC helpers."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models import AuthEvent, User

# In-memory state store for OAuth CSRF (single-process demo/prod-small).
# For multi-replica deploy, move to Redis.
_oauth_states: dict[str, float] = {}


def azure_configured(settings: Settings) -> bool:
    return bool(
        settings.auth_azure_ad_enabled
        and settings.azure_tenant_id
        and settings.azure_client_id
        and settings.azure_client_secret
    )


def begin_azure_login(settings: Settings) -> tuple[str, str]:
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = datetime.now(timezone.utc).timestamp()
    params = {
        "client_id": settings.azure_client_id,
        "response_type": "code",
        "redirect_uri": settings.azure_redirect_uri,
        "response_mode": "query",
        "scope": " ".join(settings.azure_scopes_list),
        "state": state,
    }
    url = f"{settings.azure_authority}/oauth2/v2.0/authorize?{urlencode(params)}"
    return url, state


def pop_valid_state(state: str, *, max_age_sec: int = 600) -> bool:
    ts = _oauth_states.pop(state, None)
    if ts is None:
        return False
    return (datetime.now(timezone.utc).timestamp() - ts) <= max_age_sec


async def exchange_code(settings: Settings, code: str) -> dict[str, Any]:
    token_url = f"{settings.azure_authority}/oauth2/v2.0/token"
    data = {
        "client_id": settings.azure_client_id,
        "client_secret": settings.azure_client_secret,
        "code": code,
        "redirect_uri": settings.azure_redirect_uri,
        "grant_type": "authorization_code",
        "scope": " ".join(settings.azure_scopes_list),
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(token_url, data=data)
        resp.raise_for_status()
        tokens = resp.json()
        # Fetch profile
        me = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        me.raise_for_status()
        profile = me.json()
    return {"tokens": tokens, "profile": profile}


async def upsert_azure_user(
    db: AsyncSession,
    profile: dict[str, Any],
    *,
    ip_address: str = "",
) -> User:
    oid = profile.get("id") or profile.get("oid") or ""
    upn = profile.get("userPrincipalName") or profile.get("mail") or oid
    display = profile.get("displayName") or upn
    email = profile.get("mail") or profile.get("userPrincipalName") or ""

    result = await db.execute(select(User).where(User.external_id == f"azure:{oid}"))
    user = result.scalar_one_or_none()
    if user is None:
        # Fall back to username match
        result = await db.execute(select(User).where(User.username == upn))
        user = result.scalar_one_or_none()

    if user is None:
        user = User(
            username=upn,
            email=email,
            display_name=display,
            auth_provider="azure",
            role="operator",
            hashed_password=None,
            external_id=f"azure:{oid}",
            is_active=True,
        )
        db.add(user)
    else:
        user.email = email or user.email
        user.display_name = display
        user.auth_provider = "azure"
        user.external_id = f"azure:{oid}"
        user.is_active = True

    user.last_login_at = datetime.now(timezone.utc)
    db.add(
        AuthEvent(
            username=upn,
            provider="azure",
            success=True,
            detail="oidc ok",
            ip_address=ip_address,
        )
    )
    await db.commit()
    await db.refresh(user)
    return user
