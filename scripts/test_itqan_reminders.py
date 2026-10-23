#!/usr/bin/env python3
"""
Checks for the reminders helper's push sending (ADR-031): only known push services, only safe
headers, a push sent once and never late, desktop alerts only when asked. Nothing touches the
network — the opener is replaced. Run by `npm run ci:check`.
"""
import base64
import importlib.util
import os
import sys
import tempfile
import time
from pathlib import Path

sys.dont_write_bytecode = True  # leave no __pycache__ in scripts/
os.environ["ITQAN_DATA"] = tempfile.mkdtemp()
spec = importlib.util.spec_from_file_location("h", Path(__file__).with_name("itqan_reminders.py"))
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)

body = base64.b64encode(b"x" * 100).decode()
ok = {"endpoint": "https://web.push.apple.com/QGabc", "headers": {"Authorization": "vapid t=a.b.c, k=d", "TTL": "600", "Content-Encoding": "aes128gcm"}, "body": body}
def v(**kw): return h.valid_push({**ok, **kw})
checks = {
  "apple ok": v(),
  "fcm ok": v(endpoint="https://fcm.googleapis.com/fcm/send/x"),
  "edge ok": v(endpoint="https://wns2-par02p.notify.windows.com/w/?token=x"),
  "evil host": not v(endpoint="https://evil.com/x"),
  "suffix trick": not v(endpoint="https://web.push.apple.com.evil.com/x"),
  "http": not v(endpoint="http://web.push.apple.com/x"),
  "port": not v(endpoint="https://web.push.apple.com:8443/x"),
  "userinfo": not v(endpoint="https://user@web.push.apple.com/x"),
  "localhost": not v(endpoint="https://127.0.0.1/x"),
  "bad header name": not v(headers={"Host": "x"}),
  "header injection": not v(headers={"TTL": "1\r\nX-Evil: 1"}),
  "bad base64": not v(body="not base64!!"),
  "too big": not v(body=base64.b64encode(b"x" * 7000).decode()),
  "item without push still valid": h.valid_item({"key": "k", "fireAt": 1, "title": "t", "body": "b"}),
  "item with bad push rejected": not h.valid_item({"key": "k", "fireAt": 1, "title": "t", "body": "b", "push": [{**ok, "endpoint": "https://evil.com"}]}),
  "item desktop non-bool rejected": not h.valid_item({"key": "k", "fireAt": 1, "title": "t", "body": "b", "desktop": "no"}),
}
# Sending: capture instead of network; desktop:false skips notify-send; late push is dropped.
sent, notified = [], []
class R:
    status = 201
    def __enter__(s): return s
    def __exit__(s, *a): pass
h.opener.open = lambda req, timeout: (sent.append((req.full_url, req.get_method(), dict(req.header_items()), req.data)), R())[1]
h.notify = lambda *a: notified.append(a)
now = time.time() * 1000
h.schedule = [
  {"key": "a", "fireAt": now - 1000, "title": "T", "body": "B", "desktop": False, "push": [ok]},
  {"key": "b", "fireAt": now - 20 * 60 * 1000, "title": "Late", "body": "B", "push": [ok]},
  {"key": "c", "fireAt": now - 1000, "title": "Desk", "body": "B"},
]
h.fired = set()
h.tick(); time.sleep(0.3)
checks["one push sent (late one dropped)"] = len(sent) == 1
checks["push is POST to endpoint with decoded body"] = sent and sent[0][0] == ok["endpoint"] and sent[0][1] == "POST" and sent[0][3] == b"x" * 100
checks["desktop only for items not marked desktop:false"] = [n[0] for n in notified] == ["Late", "Desk"]
h.tick(); time.sleep(0.3)
checks["fires once"] = len(sent) == 1
for k, val in checks.items(): print("PASS" if val else "FAIL", k)
sys.exit(0 if all(checks.values()) else 1)
