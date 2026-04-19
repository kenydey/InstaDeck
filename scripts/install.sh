#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v uv >/dev/null 2>&1; then
  echo "Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi

cd backend
uv sync --extra dev
cd "$ROOT/frontend"
if command -v npm >/dev/null 2>&1; then
  npm install
else
  echo "npm not found; install Node.js 20+ and run: cd frontend && npm install"
fi

echo ""
echo "Next: cp .env.example .env"
echo "Backend: cd backend && uv run uvicorn instadeck.main:app --reload --port 8000"
echo "Frontend: cd frontend && npm run dev"
