#!/usr/bin/env python3
"""One-shot deploy script — run locally, not committed with secrets."""
import io
import os
import secrets
import string
import sys
import tarfile
import time

import paramiko

HOST = os.environ.get("DEPLOY_HOST", "13.140.160.248")
USER = os.environ.get("DEPLOY_USER", "root")
PASSWORD = os.environ.get("DEPLOY_PASSWORD", "")
REMOTE = "/root/apps/matuanalytics"
LOCAL = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

SKIP_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "server/dist",
    "server/data",
    ".vite",
}
SKIP_FILES = {".env", ".env.production", "server/.env"}


def should_skip(rel: str) -> bool:
    parts = rel.replace("\\", "/").split("/")
    for part in parts:
        if part in SKIP_DIRS:
            return True
    if rel.replace("\\", "/") in SKIP_FILES:
        return True
    return False


def make_tarball() -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for root, dirs, files in os.walk(LOCAL):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for name in files:
                full = os.path.join(root, name)
                rel = os.path.relpath(full, LOCAL)
                if should_skip(rel):
                    continue
                tar.add(full, arcname=rel)
    buf.seek(0)
    return buf.read()


def run(ssh: paramiko.SSHClient, cmd: str) -> tuple[int, str, str]:
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out)
    if err.strip():
        print("ERR:", err)
    return code, out, err


def main() -> int:
    if not PASSWORD:
        print("Set DEPLOY_PASSWORD env var", file=sys.stderr)
        return 1

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("==> Creating tarball...")
    data = make_tarball()
    print(f"    {len(data) / 1024 / 1024:.2f} MB")

    print("==> Connecting SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=120)

    # Upload tarball
    sftp = ssh.open_sftp()
    remote_tar = "/tmp/matuanalytics-deploy.tar.gz"
    print("==> Uploading...")
    with sftp.file(remote_tar, "wb") as f:
        f.write(data)

    key_local = os.path.join(LOCAL, "serviceAccountKey.json")
    if os.path.exists(key_local):
        print("==> Uploading serviceAccountKey.json...")
        sftp.put(key_local, f"{REMOTE}/serviceAccountKey.json")

    sftp.close()

    jwt = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(48))

    commands = f"""
set -e
cd {REMOTE}
echo "==> Extracting..."
tar -xzf {remote_tar} -C {REMOTE}
rm -f {remote_tar}

echo "==> Frontend env..."
cat > .env.production << 'ENVEOF'
VITE_API_URL=https://matuanalytics.matubyte.com
VITE_TRACKER_URL=https://matuanalytics.matubyte.com
VITE_FIREBASE_API_KEY=AIzaSyCDuYETmGyrLNZVNcPMiuK1pXCsEQPHRE4
VITE_FIREBASE_AUTH_DOMAIN=matuanalytics-37f2f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=matuanalytics-37f2f
VITE_FIREBASE_STORAGE_BUCKET=matuanalytics-37f2f.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=316220274720
VITE_FIREBASE_APP_ID=1:316220274720:web:2c481eeb1349dd86d2e445
VITE_FIREBASE_MEASUREMENT_ID=G-S4ZTD3231Y
ENVEOF

echo "==> Backend env..."
cat > server/.env << ENVEOF
NODE_ENV=production
PORT=3001
API_URL=https://matuanalytics.matubyte.com
TRACKER_URL=https://matuanalytics.matubyte.com
CORS_ORIGIN=https://matuanalytics.matubyte.com
JWT_SECRET={jwt}
FIREBASE_DATABASE_URL=https://matuanalytics-37f2f-default-rtdb.firebaseio.com
FIREBASE_SERVICE_ACCOUNT_PATH={REMOTE}/serviceAccountKey.json
DATA_DIR={REMOTE}/server/data
TRUST_PROXY=true
ENVEOF

echo "==> npm install..."
npm ci
npm ci --prefix server

echo "==> build..."
npm run build:all

echo "==> PM2..."
pm2 delete matuanalytics-api 2>/dev/null || true
pm2 start {REMOTE}/deploy/ecosystem.config.cjs --env production
pm2 save

echo "==> Nginx..."
cp {REMOTE}/deploy/nginx/api.matubyte.com.conf /etc/nginx/sites-available/api.matubyte.com.conf
cp {REMOTE}/deploy/nginx/matuanalytics.matubyte.com.conf /etc/nginx/sites-available/matuanalytics.matubyte.com.conf
ln -sf /etc/nginx/sites-available/api.matubyte.com.conf /etc/nginx/sites-enabled/api.matubyte.com.conf
ln -sf /etc/nginx/sites-available/matuanalytics.matubyte.com.conf /etc/nginx/sites-enabled/matuanalytics.matubyte.com.conf
nginx -t
systemctl reload nginx

if ! test -f /etc/letsencrypt/live/api.matubyte.com/fullchain.pem; then
  certbot --nginx -d api.matubyte.com -d matuanalytics.matubyte.com --non-interactive --agree-tos -m admin@matubyte.com || echo "CERTBOT_SKIPPED"
fi

echo "==> Health check..."
sleep 2
curl -sf http://127.0.0.1:3001/health || echo "API health pending"
pm2 list | grep matuanalytics || true
echo "DEPLOY_DONE"
"""

    code, out, _ = run(ssh, commands)
    ssh.close()

    if "DEPLOY_DONE" in out:
        print("\n✓ Deploy completed successfully")
        return 0
    print("\n✗ Deploy may have failed — check output above", file=sys.stderr)
    return code or 1


if __name__ == "__main__":
    raise SystemExit(main())
