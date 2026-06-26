#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

with open("deploy/nginx/matuanalytics.matubyte.com.conf", encoding="utf-8") as f:
    nginx_conf = f.read()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("13.140.160.248", username="root", password="Jesteban9091", timeout=60)

sftp = ssh.open_sftp()
with sftp.file("/etc/nginx/sites-available/matuanalytics.matubyte.com.conf", "w") as f:
    f.write(nginx_conf)
sftp.close()

for cmd in [
    "nginx -t",
    "systemctl reload nginx",
    'curl -s -o /dev/null -w "%{http_code}" https://matuanalytics.matubyte.com/api/auth/me -H "Authorization: Bearer test"',
    "grep -o 'matuanalytics.matubyte.com' /root/apps/matuanalytics/dist/assets/index-*.js | head -1",
]:
    print(">>>", cmd)
    _, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode("utf-8", errors="replace"))
    err = stderr.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err)

ssh.close()
print("OK")
