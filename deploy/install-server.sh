#!/usr/bin/env bash
# Instalación inicial en servidor Ubuntu/Debian
# Uso: sudo bash deploy/install-server.sh
set -euo pipefail

APP_DIR="/var/www/matuanalytics"
REPO_URL="${REPO_URL:-}"  # opcional: git clone URL

echo "==> Instalando Node.js 20 (si no está)..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Instalando PM2 y Nginx..."
npm install -g pm2
apt-get update && apt-get install -y nginx certbot python3-certbot-nginx

echo "==> Creando directorio $APP_DIR..."
mkdir -p "$APP_DIR"
mkdir -p /var/log/pm2

if [ -n "$REPO_URL" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "    Copia el proyecto manualmente a $APP_DIR"
fi

echo "==> Nginx sites..."
cp "$APP_DIR/deploy/nginx/api.matubyte.com.conf" /etc/nginx/sites-available/
cp "$APP_DIR/deploy/nginx/matuanalytics.matubyte.com.conf" /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/api.matubyte.com.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/matuanalytics.matubyte.com.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo ""
echo "==> Pasos manuales restantes:"
echo "  1. DNS: A records → IP del servidor"
echo "     - api.matubyte.com"
echo "     - matuanalytics.matubyte.com"
echo "  2. Copiar serviceAccountKey.json → $APP_DIR/"
echo "  3. cp server/.env.production.example server/.env && editar JWT_SECRET"
echo "  4. cp .env.production.example .env.production"
echo "  5. bash deploy/build.sh"
echo "  6. pm2 start $APP_DIR/deploy/ecosystem.config.cjs --env production"
echo "  7. pm2 save && pm2 startup"
echo "  8. certbot --nginx -d api.matubyte.com -d matuanalytics.matubyte.com"
echo "  9. Firebase Auth → dominios autorizados: matuanalytics.matubyte.com"
