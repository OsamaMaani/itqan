#!/usr/bin/env python3
"""
Regenerate dashboard/index.html from memory/status.json.

    python3 scripts/build_dashboard.py           # write the dashboard
    python3 scripts/build_dashboard.py --check   # fail if the committed dashboard is stale (CI)

Never edit dashboard/index.html by hand. Edit memory/status.json and run this.
"""

import html
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATUS = ROOT / "memory" / "status.json"
TEMPLATE = ROOT / "scripts" / "dashboard_template.html"
OUT = ROOT / "dashboard" / "index.html"

STATUS_LABEL = {
    "todo": ("To do", "s-todo"),
    "not-started": ("Not started", "s-todo"),
    "in-progress": ("In progress", "s-progress"),
    "done": ("Done", "s-done"),
    "blocked": ("Blocked", "s-blocked"),
}

LOG_VISIBLE = 5
CRIT = '<span class="crit-mark" title="Correctness here is non-negotiable">!</span>'


def e(text):
    return html.escape(str(text), quote=True)


def pill(status):
    label, cls = STATUS_LABEL.get(status, (status, "s-todo"))
    return f'<span class="pill {cls}">{e(label)}</span>'


def pct(done, total):
    return 0 if not total else round(done * 100 / total)


def render():
    data = json.loads(STATUS.read_text(encoding="utf-8"))
    template = TEMPLATE.read_text(encoding="utf-8")

    all_tasks = [t for s in data["stages"] for t in s["tasks"]]
    done_total = sum(1 for t in all_tasks if t["status"] == "done")

    stages = []
    for s in data["stages"]:
        tasks = s["tasks"]
        done = sum(1 for t in tasks if t["status"] == "done")
        p = pct(done, len(tasks))
        is_current = s["id"] == data.get("current_stage")
        rows = "".join(
            f'<tr class="{"crit" if t.get("critical") else ""}">'
            f'<td class="tid">{e(t["id"])}</td>'
            f'<td>{e(t["title"])}'
            f'{CRIT if t.get("critical") else ""}</td>'
            f'<td class="mod">{e(t.get("module", ""))}</td>'
            f"<td>{pill(t['status'])}</td></tr>"
            for t in tasks
        )
        stages.append(
            f'<details class="stage{" current" if is_current else ""}"{" open" if is_current else ""}>'
            f'<summary><span class="snum">{s["id"]}</span>'
            f'<span class="sname"><b>{e(s["name"])}</b><small>{e(s["goal"])}</small></span>'
            f'<span class="scount">{done}/{len(tasks)}<span class="bar"><i style="width:{p}%"></i></span></span>'
            f"</summary><div class=\"sbody\"><p class=\"exit\"><b>Done when:</b> {e(s['exit'])}</p>"
            f"<table><thead><tr><th>ID</th><th>Task</th><th>Module</th><th>Status</th></tr></thead>"
            f"<tbody>{rows}</tbody></table></div></details>"
        )

    modules = "".join(
        f'<div class="mod-card"><b>{e(m["name"])}</b><code>{e(m["slug"])}</code>{pill(m["status"])}</div>'
        for m in data.get("modules", [])
    )

    questions = "".join(
        f'<tr><td class="tid">{e(q["id"])}</td><td>{e(q["title"])}</td>'
        f'<td class="{"blocking" if q.get("blocks") not in ("—", "", None) else ""}">{e(q.get("blocks", "—"))}</td>'
        f'<td>{e(q.get("owner", ""))}</td></tr>'
        for q in data.get("open_questions", [])
    )

    entries = data.get("log", [])
    li = lambda l: f'<li><span class="date">{e(l["date"])}</span>{e(l["entry"])}</li>'
    log = "".join(li(l) for l in entries[:LOG_VISIBLE])
    if len(entries) > LOG_VISIBLE:
        log += (f'<details class="more"><summary>Show all {len(entries)} entries</summary>'
                f'<ul>{"".join(li(l) for l in entries[LOG_VISIBLE:])}</ul></details>')

    out = template
    for key, value in {
        "{{PROJECT}}": e(data["project"]),
        "{{SUBTITLE}}": e(data.get("subtitle", "")),
        "{{UPDATED}}": e(data.get("updated", "")),
        "{{CURRENT_STAGE}}": e(data.get("current_stage", "")),
        "{{OVERALL_PCT}}": str(pct(done_total, len(all_tasks))),
        "{{OVERALL_DONE}}": str(done_total),
        "{{OVERALL_TOTAL}}": str(len(all_tasks)),
        "{{NEXT_ACTIONS}}": "".join(f"<li>{e(a)}</li>" for a in data.get("next_actions", [])),
        "{{STAGES}}": "".join(stages),
        "{{MODULES}}": modules,
        "{{QUESTIONS}}": questions,
        "{{LOG}}": log,
        "{{GENERATED}}": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }.items():
        out = out.replace(key, value)
    return out, done_total, len(all_tasks)


# The generation timestamp differs on every run; --check compares everything else.
GENERATED = re.compile(r"Generated \d{4}-\d{2}-\d{2} \d{2}:\d{2}")


def normalise(s):
    return GENERATED.sub("Generated <time>", s)


def main():
    out, done, total = render()
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if normalise(current) == normalise(out):
            print(f"Dashboard is up to date — {done}/{total} tasks done.")
            return 0
        print(
            "STALE: dashboard/index.html does not match memory/status.json.\n"
            "Regenerate it and commit the result:\n\n    python3 scripts/build_dashboard.py\n",
            file=sys.stderr,
        )
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(out, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} — {done}/{total} tasks done ({pct(done, total)}%)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
