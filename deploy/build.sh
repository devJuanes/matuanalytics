#!/usr/bin/env bash
# Build de producción (ejecutar en el servidor o en CI antes de subir dist/)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Instalando dependencias..."
npm ci
npm ci --prefix server

echo "==> Configurando entorno frontend..."
if [ ! -f .env.production ]; then
  cp .env.production.example .env.production
  echo "    Creado .env.production desde ejemplo — revisa VITE_API_URL"
fi

echo "==> Configurando entorno backend..."
if [ ! -f server/.env ]; then
  cp server/.env.production.example server/.env
  echo "    Creado server/.env desde ejemplo — revisa JWT_SECRET y Firebase"
fi

echo "==> Compilando frontend..."
npm run build

echo "==> Compilando API..."
npm run build:server

echo ""
echo "Build listo."
echo "  Frontend: $ROOT/dist/"
echo "  API:      $ROOT/server/dist/"
echo ""
echo "Siguiente: pm2 start deploy/ecosystem.config.cjs --env production"
