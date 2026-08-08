"""On-prem Active Directory / LDAP authentication via ldap3."""

from __future__ import annotations

from datetime import datetime, timezone

from ldap3 import ALL, Connection, Server, Tls
from ldap3.core.exceptions import LDAPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models import AuthEvent, User


def _user_dn(settings: Settings, username: str) -> str:
    template = settings.ldap_user_dn_template or "{username}"
    return template.format(username=username)


def ldap_bind_validate(settings: Settings, username: str, password: str) -> tuple[bool, str, str]:
    """
    Attempt LDAP bind as the user.
    Returns (ok, detail, display_name).
    """
    if not settings.ldap_url:
        return False, "LDAP URL not configured", ""
    if not username or not password:
        return False, "username and password required", ""

    try:
        tls = Tls() if settings.ldap_use_ssl or settings.ldap_start_tls else None
        server = Server(
            settings.ldap_url,
            use_ssl=settings.ldap_use_ssl,
            get_info=ALL,
            tls=tls,
        )
        user_dn = _user_dn(settings, username)
        conn = Connection(server, user=user_dn, password=password, auto_bind=True, raise_exceptions=True)
        if settings.ldap_start_tls and not settings.ldap_use_ssl:
            conn.start_tls()

        display = username
        # Optional group gate
        if settings.ldap_required_group:
            # Re-bind with service account if provided for search
            search_conn = conn
            if settings.ldap_bind_dn:
                search_conn = Connection(
                    server,
                    user=settings.ldap_bind_dn,
                    password=settings.ldap_bind_password,
                    auto_bind=True,
                    raise_exceptions=True,
                )
            search_filter = f"(&(objectClass=user)(sAMAccountName={username}))"
            search_conn.search(
                settings.ldap_base_dn,
                search_filter,
                attributes=["memberOf", "displayName", "mail"],
            )
            if not search_conn.entries:
                conn.unbind()
                return False, "user not found in directory search", ""
            entry = search_conn.entries[0]
            groups = [str(g) for g in (entry.memberOf.values if "memberOf" in entry else [])]
            if settings.ldap_required_group not in groups:
                conn.unbind()
                return False, "user not in required group", ""
            if "displayName" in entry and entry.displayName:
                display = str(entry.displayName)

        conn.unbind()
        return True, "ok", display
    except LDAPException as exc:
        return False, f"ldap error: {exc.__class__.__name__}", ""
    except Exception as exc:  # noqa: BLE001
        return False, f"ldap failure: {exc.__class__.__name__}", ""


async def authenticate_ldap(
    db: AsyncSession,
    settings: Settings,
    *,
    username: str,
    password: str,
    ip_address: str = "",
) -> User | None:
    ok, detail, display = ldap_bind_validate(settings, username, password)
    db.add(
        AuthEvent(
            username=username,
            provider="ldap",
            success=ok,
            detail=detail,
            ip_address=ip_address,
        )
    )
    if not ok:
        await db.commit()
        return None

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            username=username,
            display_name=display or username,
            email="",
            auth_provider="ldap",
            role="operator",
            hashed_password=None,
            external_id=f"ldap:{username}",
            is_active=True,
        )
        db.add(user)
    else:
        user.display_name = display or user.display_name
        user.auth_provider = "ldap"
        user.is_active = True
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user
