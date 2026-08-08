# Authentication

Ontos Planetarium supports three sign-in paths. Enable only what your environment needs.

| Provider | When to use | Config flags |
|---|---|---|
| **Local** | No domain / lab / air-gap bootstrap | `ONTOS_AUTH_LOCAL_ENABLED=true` |
| **Active Directory / LDAP** | On-prem domain join style login | `ONTOS_AUTH_LDAP_ENABLED=true` + LDAP URL |
| **Azure AD / Entra ID** | Cloud identity (OIDC) | `ONTOS_AUTH_AZURE_AD_ENABLED=true` + app registration |

## Local accounts

On first boot, if the user table is empty and local auth is enabled, a bootstrap admin is created from:

```env
ONTOS_BOOTSTRAP_ADMIN_USER=admin
ONTOS_BOOTSTRAP_ADMIN_PASSWORD=ChangeMeNow!
ONTOS_BOOTSTRAP_ADMIN_EMAIL=admin@example.local
```

**Change these before any networked deployment.** Passwords are stored as bcrypt hashes. JWT access tokens expire per `ONTOS_ACCESS_TOKEN_MINUTES`.

## Active Directory / LDAP

```env
ONTOS_AUTH_LDAP_ENABLED=true
ONTOS_LDAP_URL=ldaps://dc01.contoso.local:636
ONTOS_LDAP_BASE_DN=DC=contoso,DC=local
ONTOS_LDAP_USER_DN_TEMPLATE=CONTOSO\{username}
# Optional group gate
ONTOS_LDAP_REQUIRED_GROUP=CN=Planetarium-Operators,OU=Groups,DC=contoso,DC=local
```

The API binds as the user. Failed binds never create accounts. Successful binds upsert a `auth_provider=ldap` user.

## Azure AD / Microsoft Entra ID

1. Entra admin center → App registrations → New registration  
2. Add redirect URI: `http://localhost:8080/api/auth/azure/callback` (or your production URL)  
3. Create a client secret  
4. API permissions: Microsoft Graph `User.Read` (delegated)  
5. Set:

```env
ONTOS_AUTH_AZURE_AD_ENABLED=true
ONTOS_AZURE_TENANT_ID=<tenant-guid>
ONTOS_AZURE_CLIENT_ID=<app-client-id>
ONTOS_AZURE_CLIENT_SECRET=<secret>
ONTOS_AZURE_REDIRECT_URI=http://localhost:8080/api/auth/azure/callback
```

Users click **Sign in with Microsoft Entra ID** on the login card.

## Security notes

- `.env` is gitignored — never commit secrets or machine-specific paths  
- Auth attempts are written to `auth_events` (username, provider, success, IP)  
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`  
- CORS is an allow-list (`ONTOS_CORS_ORIGINS`)  
- Live host collection is **off** by default (`ONTOS_ALLOW_LIVE_COLLECT=false`)
