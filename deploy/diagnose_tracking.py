#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

print("=== Public HTTP tests ===")
for url in [
    "http://api.matubyte.com/tracker.js",
    "http://api.matubyte.com/health",
    "https://api.matubyte.com/health",
    "https://matuanalytics.matubyte.com/tracker.js",
]:
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=10) as r:
            print(f"OK {url} -> {r.status}")
    except Exception as e:
        print(f"FAIL {url} -> {e}")

# POST track test
payload = json.dumps({
    "siteId": "MA-340D78819AB5",
    "visitorId": "test-visitor-001",
    "sessionId": "test-session-001",
    "url": "https://example.com",
    "title": "Test",
    "browser": "Chrome",
    "os": "Windows",
    "device": "Desktop",
}).encode()
for api_url in [
    "http://api.matubyte.com/api/track",
    "https://matuanalytics.matubyte.com/api/track",
]:
    try:
        req = urllib.request.Request(api_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode()
            print(f"TRACK {api_url} -> {r.status} {body[:200]}")
    except urllib.error.HTTPError as e:
        print(f"TRACK {api_url} -> HTTP {e.code} {e.read().decode()[:200]}")
    except Exception as e:
        print(f"TRACK {api_url} -> {e}")

print("\n=== Server SSH diagnostics ===")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("13.140.160.248", username="root", password="Jesteban9091", timeout=30)

cmds = [
    "grep API_URL /root/apps/matuanalytics/server/.env",
    "pm2 logs matuanalytics-api --lines 30 --nostream 2>&1 | tail -35",
    "curl -s http://127.0.0.1:3001/api/track -X POST -H 'Content-Type: application/json' -d '{\"siteId\":\"MA-340D78819AB5\",\"visitorId\":\"v1\",\"sessionId\":\"s1\",\"url\":\"https://t.com\",\"title\":\"T\",\"browser\":\"Chrome\",\"os\":\"Win\",\"device\":\"Desktop\"}'",
    "ls -la /etc/letsencrypt/live/ | grep api",
    "certbot certificates 2>/dev/null | grep -A2 api.matubyte || echo no_api_cert",
]
for c in cmds:
    print(f"\n>>> {c}")
    _, o, e = ssh.exec_command(c)
    print(o.read().decode("utf-8", errors="replace"))
    err = e.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err[:500])

ssh.close()
