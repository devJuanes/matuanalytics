#!/usr/bin/env bash
# Deploy en el servidor (ya estando dentro del VPS)
# Uso:
#   cd ~/apps/matuanalytics
#   bash deploy/deploy.sh
#
# Desde tu PC (sube código + build + restart):
#   DEPLOY_PASSWORD=xxx python deploy/remote_deploy.py
#   DEPLOY_PASSWORD=xxx python deploy/fix_tracking.py
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> MatuAnalytics deploy (servidor)"
echo "    Directorio: $ROOT"

if [ ! -f .env.production ]; then
  if [ -f .env.production.example ]; then
    cp .env.production.example .env.production
    echo "    Creado .env.production desde ejemplo"
  else
    echo "ERROR: falta .env.production" >&2
    exit 1
  fi
fi

if [ ! -f server/.env ]; then
  if [ -f server/.env.production.example ]; then
    cp server/.env.production.example server/.env
    echo "    Creado server/.env desde ejemplo — revisa JWT_SECRET y Firebase"
  else
    echo "ERROR: falta server/.env" >&2
    exit 1
  fi
fi

echo "==> Instalando dependencias..."
npm ci
npm ci --prefix server

echo "==> Compilando frontend + API..."
npm run build:all

echo "==> Reiniciando PM2..."
if pm2 describe matuanalytics-api >/dev/null 2>&1; then
  pm2 restart matuanalytics-api
else
  pm2 start "$ROOT/deploy/ecosystem.config.cjs" --env production
fi
pm2 save

echo "==> Recargando Nginx..."
if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl reload nginx
fi

echo "==> Health check..."
sleep 2
curl -sf http://127.0.0.1:3001/health && echo "" || echo "    API health: pendiente o error"
curl -sfI http://127.0.0.1:3001/tracker.js | head -1 || true

echo ""
echo "Deploy listo."
echo "  Dashboard: https://matuanalytics.matubyte.com"
echo "  Tracker:   https://matuanalytics.matubyte.com/tracker.js"
