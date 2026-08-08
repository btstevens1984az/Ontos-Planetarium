#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f .env ]]; then cp .env.example .env; fi
export PATH="$HOME/.local/bin:$PATH"
mkdir -p backend/data
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
