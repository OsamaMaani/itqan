#!/usr/bin/env python3
"""
Itqan reminders helper — shows desktop notifications for Itqan reminders, even when the app
is closed (ADR-013). Installed and started at login by scripts/install_local.sh as the
systemd user service `itqan-reminders`.

It knows nothing about reminder rules. The app computes a flat list of alerts
(src/lib/reminders.ts → buildSchedule) and PUTs it here; this helper only fires each alert
once, at its time, with notify-send.

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
import time
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
VERSION = 1

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


def valid_item(i) -> bool:
    return (
        isinstance(i, dict)
        and isinstance(i.get("key"), str) and 0 < len(i["key"]) < 300
        and isinstance(i.get("fireAt"), (int, float))
        and isinstance(i.get("title"), str) and len(i["title"]) < 500
        and isinstance(i.get("body"), str) and len(i["body"]) < 4000
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
        notify(item["title"], item["body"], bool(item.get("urgent")))


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
        self.send(200, {"ok": True, "version": VERSION, "authorized": self.authed(),
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
