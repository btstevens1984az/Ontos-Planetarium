"""Application settings — loaded from environment / .env only (never hard-coded secrets)."""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="ONTOS_",
        extra="ignore",
    )

    app_name: str = "Ontos Planetarium"
    env: str = "development"
    secret_key: str = Field(default="dev-only-change-me")
    access_token_minutes: int = 30
    refresh_token_days: int = 7
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080"
    database_url: str = "sqlite+aiosqlite:///./data/ontos.db"

    demo_mode: bool = True
    allow_live_collect: bool = False

    bootstrap_admin_user: str = "admin"
    bootstrap_admin_password: str = "ChangeMeNow!"
    bootstrap_admin_email: str = "admin@example.local"

    auth_local_enabled: bool = True
    auth_azure_ad_enabled: bool = False
    auth_ldap_enabled: bool = False

    azure_tenant_id: str = ""
    azure_client_id: str = ""
    azure_client_secret: str = ""
    azure_redirect_uri: str = "http://localhost:8080/api/auth/azure/callback"
    azure_scopes: str = "openid profile email offline_access"

    ldap_url: str = ""
    ldap_base_dn: str = ""
    ldap_user_dn_template: str = "{username}"
    ldap_bind_dn: str = ""
    ldap_bind_password: str = ""
    ldap_use_ssl: bool = False
    ldap_start_tls: bool = False
    ldap_required_group: str = ""

    login_rate_limit: str = "10/minute"

    @field_validator("secret_key")
    @classmethod
    def warn_weak_secret(cls, v: str) -> str:
        if not v or v in {"change-me-to-a-long-random-string", "dev-only-change-me"}:
            # Allowed for local demos; production should override.
            return v or "dev-only-change-me"
        return v

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def azure_authority(self) -> str:
        tenant = self.azure_tenant_id or "common"
        return f"https://login.microsoftonline.com/{tenant}"

    @property
    def azure_scopes_list(self) -> List[str]:
        return [s.strip() for s in self.azure_scopes.split() if s.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
