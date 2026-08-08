# Install & run — Linux, macOS, Windows

Ontos Planetarium is a **FastAPI** backend + **React** galaxy UI.  
Demo mode uses synthetic RFC5737 data only (safe for videos/screenshots).

## Prerequisites

| Tool | Version |
|---|---|
| Python | 3.11+ (3.12 recommended) |
| Node.js | 20+ |
| npm | 10+ |
| Git | any recent |
| Docker (optional) | 24+ with Compose |

Clone:

```bash
git clone https://github.com/btstevens1984az/Ontos-Planetarium.git
cd Ontos-Planetarium
cp .env.example .env
```

Edit `.env` and set a strong `ONTOS_SECRET_KEY` and bootstrap password before production use.

---

## Option A — Docker (all platforms)

```bash
cp .env.example .env
# edit secrets in .env
docker compose up --build
```

Open **http://localhost:8080**

Sign in with the bootstrap local admin from `.env` (default demo: `admin` / `ChangeMeNow!`).

Stop:

```bash
docker compose down
```

---

## Option B — Native (dev: API + Vite)

### Linux (Debian/Ubuntu/Fedora)

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git

# Node 22 via NodeSource or nvm — example with nvm:
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 22

cd Ontos-Planetarium
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Terminal 1 — API
cd backend
mkdir -p data
uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload

# Terminal 2 — UI
cd ../frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173** (Vite proxies `/api` → `:8080`).

### macOS (Intel or Apple Silicon)

```bash
# Homebrew
brew install python@3.12 git
brew install node@22
# ensure node is on PATH (brew link if needed)

cd Ontos-Planetarium
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Terminal 1
cd backend
mkdir -p data
uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload

# Terminal 2
cd ../frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173**

> Apple Silicon note: pure Python wheels are used; no Rosetta required for the default demo stack.

### Windows 10/11 (PowerShell)

```powershell
# Install from https://www.python.org and https://nodejs.org if needed
# Then in PowerShell:

cd Ontos-Planetarium
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt

# Terminal 1 — API
cd backend
New-Item -ItemType Directory -Force -Path data | Out-Null
uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload

# Terminal 2 — UI
cd ..\frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173**

If script activation is blocked:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
```

---

## Option C — Single-process production build (no Vite)

```bash
cd frontend && npm install && npm run build && cd ..
cd backend
pip install -r requirements.txt
mkdir -p data
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

The API serves `frontend/dist` at **http://localhost:8080**.

---

## Verify

```bash
curl -s http://127.0.0.1:8080/api/health
curl -s http://127.0.0.1:8080/api/auth/providers
```

Login smoke test:

```bash
curl -s -X POST http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"ChangeMeNow!","provider":"local"}'
```

---

## Active Directory / Azure AD

See [AUTH.md](./AUTH.md) for Entra app registration and LDAP bind templates.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| CORS errors in browser | Add your UI origin to `ONTOS_CORS_ORIGINS` |
| `database is locked` | Ensure only one API process uses the SQLite file |
| LDAP bind fails | Check DN template (`DOMAIN\{username}` vs full DN) and LDAPS certs |
| Azure redirect mismatch | Redirect URI must match Entra app registration exactly |
| Blank galaxy | Confirm JWT login succeeded; check browser Network tab for `/api/ontology/snapshot` |
