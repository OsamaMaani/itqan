#!/usr/bin/env python3
"""
Itqan reminders helper — shows desktop notifications for Itqan reminders, even when the app
is closed (ADR-013). Installed and started at login by scripts/install_local.sh as the
systemd user service `itqan-reminders`.

It knows nothing about reminder rules. The app computes a flat list of alerts
(src/lib/reminders.ts → buildSchedule) and PUTs it here; this helper only fires each alert
once, at its time, with notify-send.

An alert may also carry ready-made Web Push requests for the owner's phone (ADR-031): the app
signs and encrypts them (src/lib/push.ts); the helper only POSTs them at the alert's time, and
only to the known push services — it is never a general-purpose proxy.

Security: listens on 127.0.0.1 only; rejects any Host but 127.0.0.1/localhost (DNS
rebinding); rejects requests carrying a web Origin (only the file:// app, Origin "null", or
local tools); and every write needs the token generated at install time, which only the
locally built app knows. Python standard library only.
"""

import hmac
import json
import os
import subprocess
import sys
import threading
import base64
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(os.environ.get("ITQAN_PORT", "47321"))
DATA = Path(os.environ.get("ITQAN_DATA", Path.home() / ".local/share/itqan"))
TOKEN_FILE = DATA / "helper-token"
SCHEDULE_FILE = DATA / "schedule.json"
FIRED_FILE = DATA / "fired.json"
ICON = DATA / "icon.png"
GRACE_MS = 12 * 60 * 60 * 1000  # same as GRACE_MS in src/lib/reminders.ts
MAX_BODY = 4 * 1024 * 1024
VERSION = 3
# A push sent this late is dropped: "your session ended" an hour later is noise (laptop asleep).
PUSH_LATE_MS = 10 * 60 * 1000
# An item may allow more (`pushLateMs`): a reminder or check-in is still worth hearing about
# hours later. Never more than this — the app signs those pushes to expire then anyway.
PUSH_LATE_MAX_MS = 12 * 60 * 60 * 1000
# Web Push services of Safari/iOS, Chrome/Android, Firefox and Edge. Nothing else is ever contacted.
PUSH_HOSTS = ("web.push.apple.com", "fcm.googleapis.com", "updates.push.services.mozilla.com")
PUSH_HOST_SUFFIXES = (".notify.windows.com", ".push.apple.com")
PUSH_HEADERS = {"Authorization", "Content-Encoding", "Content-Type", "TTL", "Urgency", "Topic"}

lock = threading.Lock()
schedule: list[dict] = []
fired: set[str] = set()


def log(*a):
    print("[itqan-reminders]", *a, file=sys.stderr, flush=True)


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save_json(path: Path, value) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(value), encoding="utf-8")
    tmp.replace(path)  # atomic: a crash never leaves half a file


def token() -> str:
    try:
        return TOKEN_FILE.read_text(encoding="utf-8").strip()
    except Exception:
        return ""


def push_host_ok(endpoint: str) -> bool:
    try:
        u = urllib.parse.urlsplit(endpoint)
        host = (u.hostname or "").lower()
        return (
            u.scheme == "https" and u.username is None and u.password is None and u.port in (None, 443)
            and (host in PUSH_HOSTS or host.endswith(PUSH_HOST_SUFFIXES))
        )
    except ValueError:
        return False


def valid_push(p) -> bool:
    if not isinstance(p, dict) or not isinstance(p.get("endpoint"), str) or len(p["endpoint"]) > 1000:
        return False
    headers, body = p.get("headers"), p.get("body")
    if not isinstance(headers, dict) or not isinstance(body, str) or len(body) > 8000:
        return False
    if not all(k in PUSH_HEADERS and isinstance(v, str) and len(v) < 2000 and "\n" not in v and "\r" not in v
               for k, v in headers.items()):
        return False
    try:
        base64.b64decode(body, validate=True)
    except Exception:
        return False
    return push_host_ok(p["endpoint"])


def valid_item(i) -> bool:
    return (
        isinstance(i, dict)
        and isinstance(i.get("key"), str) and 0 < len(i["key"]) < 300
        and isinstance(i.get("fireAt"), (int, float))
        and isinstance(i.get("title"), str) and len(i["title"]) < 500
        and isinstance(i.get("body"), str) and len(i["body"]) < 4000
        and isinstance(i.get("desktop", True), bool)
        and type(i.get("pushLateMs", PUSH_LATE_MS)) is int and 0 < i.get("pushLateMs", PUSH_LATE_MS) <= PUSH_LATE_MAX_MS
        and isinstance(i.get("push", []), list) and len(i.get("push", [])) <= 10
        and all(valid_push(p) for p in i.get("push", []))
    )


def notify(title: str, body: str, urgent: bool) -> None:
    cmd = ["notify-send", "--app-name=Itqan", f"--urgency={'critical' if urgent else 'normal'}"]
    if ICON.exists():
        cmd.append(f"--icon={ICON}")
    cmd += [title, body]  # argument list, never a shell: titles cannot inject commands
    try:
        subprocess.run(cmd, timeout=10, check=False)
    except Exception as e:
        log("notify-send failed:", e)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """A push service never redirects; following one could send the request somewhere else."""

    def redirect_request(self, *args, **kwargs):
        return None


opener = urllib.request.build_opener(NoRedirect)


def send_push(p: dict) -> None:
    """POSTs one prepared push; retries twice on a network error or a 5xx/429."""
    host = urllib.parse.urlsplit(p["endpoint"]).hostname
    for attempt in range(3):
        req = urllib.request.Request(p["endpoint"], data=base64.b64decode(p["body"]), headers=p["headers"], method="POST")
        try:
            with opener.open(req, timeout=15) as res:
                log("push:", host, res.status)
                return
        except urllib.error.HTTPError as e:
            log("push:", host, e.code, e.read(300).decode("utf-8", "replace"))
            if e.code < 500 and e.code != 429:
                return  # 404/410: the phone unsubscribed; 400/403: bad request — retrying won't help
        except Exception as e:
            log("push failed:", host, e)
        time.sleep(20)


def send_pushes(pushes: list) -> None:
    for p in pushes:
        threading.Thread(target=send_push, args=(p,), daemon=True).start()


def tick() -> None:
    now = time.time() * 1000
    due = []
    with lock:
        for item in schedule:
            if item["key"] in fired or item["fireAt"] > now:
                continue
            fired.add(item["key"])
            if now - item["fireAt"] <= GRACE_MS:
                due.append(item)
        if due:
            save_json(FIRED_FILE, sorted(fired))
    for item in due:
        log("alert:", item["title"])
        if item.get("desktop", True):
            notify(item["title"], item["body"], bool(item.get("urgent")))
        if item.get("push") and now - item["fireAt"] <= item.get("pushLateMs", PUSH_LATE_MS):
            send_pushes(item["push"])


def loop() -> None:
    while True:
        try:
            tick()
        except Exception as e:
            log("tick failed:", e)
        time.sleep(15)


class Handler(BaseHTTPRequestHandler):
    server_version = "ItqanReminders/1"

    def log_message(self, *args):  # keep the journal quiet
        pass

    # --- guards -------------------------------------------------------------------
    def host_ok(self) -> bool:
        host = (self.headers.get("Host") or "").lower()
        return host in (f"127.0.0.1:{PORT}", f"localhost:{PORT}")

    def origin_ok(self) -> bool:
        origin = self.headers.get("Origin")
        return origin is None or origin == "null"  # file:// pages send "null"; websites never can

    def authed(self) -> bool:
        t = token()
        return bool(t) and hmac.compare_digest(self.headers.get("X-Itqan-Token") or "", t)

    def send(self, code: int, payload=None) -> None:
        body = json.dumps(payload if payload is not None else {}).encode()
        self.send_response(code)
        if self.headers.get("Origin") == "null":
            self.send_header("Access-Control-Allow-Origin", "null")
            self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Itqan-Token")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def guard(self, need_auth: bool) -> bool:
        if not self.host_ok() or not self.origin_ok():
            self.send(403, {"error": "forbidden"})
            return False
        if need_auth and not self.authed():
            self.send(401, {"error": "bad token"})
            return False
        return True

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            return None
        try:
            return json.loads(self.rfile.read(n))
        except Exception:
            return None

    # --- routes -------------------------------------------------------------------
    def do_OPTIONS(self):
        if self.guard(False):
            self.send(204)

    def do_GET(self):
        if not self.guard(False):
            return
        if self.path != "/health":
            return self.send(404, {"error": "not found"})
        now = time.time() * 1000
        with lock:
            upcoming = [i["fireAt"] for i in schedule if i["key"] not in fired and i["fireAt"] > now]
        self.send(200, {"ok": True, "version": VERSION, "authorized": self.authed(), "push": True,
                        "pending": len(upcoming), "next": min(upcoming) if upcoming else None})

    def do_PUT(self):
        if not self.guard(True):
            return
        if self.path != "/schedule":
            return self.send(404, {"error": "not found"})
        data = self.read_json()
        items = data.get("items") if isinstance(data, dict) else None
        if not isinstance(items, list) or len(items) > 20000 or not all(valid_item(i) for i in items):
            return self.send(400, {"error": "bad schedule"})
        global schedule
        with lock:
            schedule = items
            keys = {i["key"] for i in items}
            fired.intersection_update(keys)  # forget alerts that no longer exist
            save_json(SCHEDULE_FILE, schedule)
            save_json(FIRED_FILE, sorted(fired))
        self.send(200, {"ok": True, "count": len(items)})

    def do_POST(self):
        if not self.guard(True):
            return
        if self.path != "/test":
            return self.send(404, {"error": "not found"})
        # {"push": [...]} tests the phones (sent now); without it, the desktop.
        data = self.read_json()
        pushes = data.get("push") if isinstance(data, dict) else None
        if pushes:
            if not isinstance(pushes, list) or len(pushes) > 10 or not all(valid_push(p) for p in pushes):
                return self.send(400, {"error": "bad push"})
            send_pushes(pushes)
        else:
            notify("Itqan", "Desktop notifications are working ✓", False)
        self.send(200, {"ok": True})


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    global schedule, fired
    schedule = [i for i in load_json(SCHEDULE_FILE, []) if valid_item(i)]
    fired = set(load_json(FIRED_FILE, []))
    threading.Thread(target=loop, daemon=True).start()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    log(f"listening on 127.0.0.1:{PORT}, {len(schedule)} alerts loaded")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
