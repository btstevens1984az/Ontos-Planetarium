"""First-boot local admin when the user table is empty."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models import User
from app.security import hash_password


async def ensure_bootstrap_admin(db: AsyncSession, settings: Settings) -> None:
    count = await db.scalar(select(func.count()).select_from(User))
    if count and count > 0:
        return
    if not settings.auth_local_enabled:
        return
    admin = User(
        username=settings.bootstrap_admin_user,
        email=settings.bootstrap_admin_email,
        display_name="Planetarium Admin",
        hashed_password=hash_password(settings.bootstrap_admin_password),
        auth_provider="local",
        role="admin",
        is_active=True,
    )
    db.add(admin)
    await db.commit()
