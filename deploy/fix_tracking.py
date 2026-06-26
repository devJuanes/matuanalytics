#!/usr/bin/env python3
"""Deploy tracking fixes to production server."""
import io
import os
import sys
import tarfile

import paramiko

HOST = "13.140.160.248"
USER = "root"
PASSWORD = os.environ.get("DEPLOY_PASSWORD", "")
REMOTE = "/root/apps/matuanalytics"
LOCAL = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

SKIP_DIRS = {"node_modules", ".git", "dist", "server/dist", "server/data", ".vite"}
SKIP_FILES = {".env", ".env.production", "server/.env"}


def should_skip(rel: str) -> bool:
    parts = rel.replace("\\", "/").split("/")
    return any(p in SKIP_DIRS for p in parts) or rel.replace("\\", "/") in SKIP_FILES


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


def run(ssh, cmd):
    print(f"\n>>> {cmd[:120]}...")
    _, stdout, _ = ssh.exec_command(cmd, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out[-3000:] if len(out) > 3000 else out)
    return code, out


def main():
    if not PASSWORD:
        print("Set DEPLOY_PASSWORD", file=sys.stderr)
        return 1

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print("==> Packaging...")
    data = make_tarball()

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=120)

    sftp = ssh.open_sftp()
    sftp.putfo(io.BytesIO(data), "/tmp/matuanalytics-track-fix.tar.gz")
    with open(os.path.join(LOCAL, "deploy/nginx/matuanalytics.matubyte.com.conf"), encoding="utf-8") as f:
        nginx_conf = f.read()
    with sftp.file("/etc/nginx/sites-available/matuanalytics.matubyte.com.conf", "w") as nf:
        nf.write(nginx_conf)
    sftp.close()

    patch_env = r"""
if ! grep -q TRACKER_URL /root/apps/matuanalytics/server/.env; then
  echo 'TRACKER_URL=https://matuanalytics.matubyte.com' >> /root/apps/matuanalytics/server/.env
else
  sed -i 's|^TRACKER_URL=.*|TRACKER_URL=https://matuanalytics.matubyte.com|' /root/apps/matuanalytics/server/.env
fi
"""

    cmds = f"""
set -e
cd {REMOTE}
tar -xzf /tmp/matuanalytics-track-fix.tar.gz -C {REMOTE}
rm -f /tmp/matuanalytics-track-fix.tar.gz
{patch_env}
npm run build:prod
npm run build:server
pm2 restart matuanalytics-api
nginx -t && systemctl reload nginx
sleep 2
echo '--- tracker ---'
curl -sI https://matuanalytics.matubyte.com/tracker.js | head -5
echo '--- track POST ---'
curl -s -X POST https://matuanalytics.matubyte.com/api/track \\
  -H 'Content-Type: application/json' \\
  -H 'Origin: https://example.com' \\
  -d '{{"siteId":"MA-340D78819AB5","visitorId":"deploy-test","sessionId":"sess-test","url":"https://example.com","title":"Test","browser":"Chrome","os":"Windows","device":"Desktop"}}'
echo ''
echo '--- CORS header ---'
curl -sI -X OPTIONS https://matuanalytics.matubyte.com/api/track -H 'Origin: https://example.com' -H 'Access-Control-Request-Method: POST' | grep -i access-control
echo TRACK_FIX_DONE
"""
    code, out = run(ssh, cmds)
    ssh.close()
    return 0 if "TRACK_FIX_DONE" in out else code


if __name__ == "__main__":
    raise SystemExit(main())
