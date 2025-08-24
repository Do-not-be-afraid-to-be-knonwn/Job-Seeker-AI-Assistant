#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
APP_NAME="${PM2_APP_NAME:-job-seeker-dev}"
ENTRYPOINT="${ENTRYPOINT:-server.ts}" # change if your entry file isn't server.ts

cd "$APP_DIR"
echo "[deploy] Host: $(hostname)"
echo "[deploy] Directory: $APP_DIR"

# Load env if present
if [ -f ".env" ]; then
  echo "[deploy] Loading .env"
  set -a
  # shellcheck disable=SC1091
  source .env || true
  set +a
fi

# Install Node deps
if [ -f "package.json" ]; then
  echo "[deploy] Installing Node dependencies..."
  if [ -f "package-lock.json" ]; then
    npm ci
  else
    npm install
  fi
fi

# Ensure logs directory exists (rsync excludes it so it persists)
mkdir -p logs

# Ensure PM2 is available
if ! command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] PM2 not found. Attempting to install (may require proper npm permissions)..."
  if npm install -g pm2; then
    echo "[deploy] PM2 installed."
  else
    echo "[deploy] Failed to install PM2 automatically."
    echo "Please run: npm i -g pm2"
    exit 1
  fi
fi

# Use ecosystem if present, else start directly
if [ -f "ecosystem.config.cjs" ]; then
  echo "[deploy] Using PM2 ecosystem.config.cjs..."
  PM2_HOME="${PM2_HOME:-$HOME/.pm2}" pm2 startOrReload ecosystem.config.cjs --only "$APP_NAME" --update-env
else
  echo "[deploy] Starting with PM2 directly..."
  pm2 describe "$APP_NAME" >/dev/null 2>&1 && \
    pm2 restart "$APP_NAME" --update-env || \
    pm2 start npx --name "$APP_NAME" -- ts-node "$ENTRYPOINT"
fi

# Persist PM2 process list
pm2 save

echo "[deploy] Deployment complete."