"""Local username/password authentication (no domain required)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuthEvent, User
from app.security import verify_password


async def authenticate_local(
    db: AsyncSession,
    *,
    username: str,
    password: str,
    ip_address: str = "",
) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    ok = bool(
        user
        and user.is_active
        and user.auth_provider == "local"
        and verify_password(password, user.hashed_password)
    )
    db.add(
        AuthEvent(
            username=username,
            provider="local",
            success=ok,
            detail="ok" if ok else "invalid credentials",
            ip_address=ip_address,
        )
    )
    if not ok:
        await db.commit()
        return None
    assert user is not None
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user
