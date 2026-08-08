# Security policy

## Reporting

If you discover a vulnerability, open a **private** security advisory on GitHub or email the maintainer. Do not file public issues with exploit details.

## Hardening checklist (enterprise)

1. Set a long random `ONTOS_SECRET_KEY` (≥ 32 bytes)  
2. Change bootstrap admin password on first login  
3. Disable unused providers (`LOCAL` / `LDAP` / `AZURE`)  
4. Run behind TLS reverse proxy (Caddy / nginx / Traefik)  
5. Use Postgres instead of SQLite for multi-user production  
6. Keep `ONTOS_ALLOW_LIVE_COLLECT=false` unless operators explicitly need local socket ingest  
7. Restrict `ONTOS_CORS_ORIGINS` to known frontends  
8. Store `.env` and `data/` outside git (already gitignored)

## What this repo never contains

- Real hostnames/IPs from contributor machines (demo uses RFC5737)  
- `.env` secrets, tokens, or AD bind passwords  
- Editor / OS local settings (`.vscode`, `.DS_Store`, etc. ignored)  
- Live telemetry databases
