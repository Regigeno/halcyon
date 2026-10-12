"""HALCYON: Five Nights at the Aviary - local game server.

Run:  python server.py            (opens the game in your browser)
      python server.py --port 8090 --no-browser
"""

import argparse
import json
import os
import threading
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import game_data as gd

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
SAVE_PATH = ROOT / "data" / "save.json"
BIRD_IDS = list(gd.BIRDS.keys()) + list(gd.SECRET_BIRDS.keys())
MAX_STORY_NIGHT = 6
WISE_NIGHT = 7
SAVE_LOCK = threading.Lock()


def default_save():
    return {
        "nights_beaten": 0,
        "cranes_found": [],
        "cranes_folded_total": 0,
        "deaths": {b: 0 for b in BIRD_IDS},
        "power_outs": 0,
        "endings": [],
        "custom_best": 0,
        "owl_seen": False,
        "overtime_done": [],
        "wise_beaten": False,
    }


def load_save():
    if not SAVE_PATH.exists():
        return default_save()
    try:
        data = json.loads(SAVE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default_save()
    merged = default_save()
    merged.update(data)
    merged["deaths"] = {**default_save()["deaths"], **data.get("deaths", {})}
    merged.pop("overtime", None)
    merged.pop("overtime_survived", None)
    return merged


def pending_overtime(save):
    """The overtime shift that must be survived before the next story night, if any."""
    n = save["nights_beaten"]
    if n in gd.OVERTIME_TASKS and n not in save["overtime_done"]:
        return n
    return None


def write_save(save):
    SAVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = SAVE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(save, indent=2), encoding="utf-8")
    tmp.replace(SAVE_PATH)


def public_state(save):
    beaten = save["nights_beaten"]
    found = sorted(set(save["cranes_found"]))
    owl_seen = save["owl_seen"]
    archive = [
        doc for doc in gd.ARCHIVE
        if beaten >= doc["unlock"] and len(found) >= doc.get("cranes", 0)
        and (owl_seen or not doc.get("owl")) and (save["wise_beaten"] or not doc.get("wise"))
    ]
    secret_docs = sum(1 for d in gd.ARCHIVE if d.get("owl") or d.get("wise"))
    birds = {**gd.BIRDS, **(gd.SECRET_BIRDS if owl_seen else {})}
    return {
        "save": save,
        "birds": birds,
        "nights": gd.NIGHTS,
        "calls": {n: c for n, c in gd.CALLS.items() if n <= beaten + 1},
        "wise_call": gd.WISE_CALL if owl_seen else None,
        "notes": {n: gd.CRANE_NOTES[n] for n in found if n in gd.CRANE_NOTES},
        "archive": archive,
        "archive_total": len(gd.ARCHIVE) - (0 if owl_seen else secret_docs),
        "overtime_tasks": gd.OVERTIME_TASKS,
        "pending_overtime": pending_overtime(save),
        "next_night": min(beaten + 1, MAX_STORY_NIGHT),
        "custom_unlocked": beaten >= MAX_STORY_NIGHT,
        "wise_unlocked": owl_seen,
    }


def apply_overtime(save, payload):
    """Record an overtime shift: survived shifts unlock the next night; claims count as deaths."""
    ot = int(payload.get("ot", 0))
    if ot not in gd.OVERTIME_TASKS:
        return False
    if payload.get("caught"):
        save["deaths"][gd.OVERTIME_TASKS[ot]["bird"]] += 1
    elif payload.get("success") and ot not in save["overtime_done"]:
        save["overtime_done"].append(ot)
    return True


def apply_result(save, result):
    """Update the save from a finished night. Returns optional ending payload."""
    night = int(result.get("night", 0))
    survived = bool(result.get("survived"))
    killer = result.get("killer")
    folded = max(0, min(int(result.get("folded", 0)), 500))
    save["cranes_folded_total"] = min(1000, save["cranes_folded_total"] + folded)

    found = result.get("crane_found")
    if found in gd.CRANE_NOTES and found not in save["cranes_found"]:
        save["cranes_found"].append(found)
    if result.get("owl_seen") or killer == "owl":
        save["owl_seen"] = True

    if not survived:
        if killer in save["deaths"]:
            save["deaths"][killer] += 1
        if result.get("power_out"):
            save["power_outs"] += 1
        return None

    if night == 0:
        stars = int(result.get("custom_total", 0))
        save["custom_best"] = max(save["custom_best"], stars)
        return None

    if night == WISE_NIGHT:
        save["wise_beaten"] = True
        return {"id": "wise", "title": "A LETTER IN CRAYON", "text": gd.MARA_NOTE}

    if night == save["nights_beaten"] + 1:
        save["nights_beaten"] = night

    ending = None
    if night == 5:
        ending = {"id": "normal", "title": "PAYDAY", "text": gd.NORMAL_ENDING}
    elif night == 6:
        if len(set(save["cranes_found"])) >= len(gd.CRANE_NOTES):
            ending = {"id": "true", "title": "ONE THOUSAND", "text": gd.TRUE_ENDING}
        else:
            ending = {"id": "keeper", "title": "THE NEW KEEPER", "text": gd.KEEPER_ENDING}
    if ending and ending["id"] not in save["endings"]:
        save["endings"].append(ending["id"])
    return ending


class GameHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def log_message(self, fmt, *args):
        if "/api/" in (self.path or ""):
            super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def do_GET(self):
        if self.path.startswith("/api/state"):
            with SAVE_LOCK:
                return self._json(public_state(load_save()))
        return super().do_GET()

    def do_POST(self):
        payload = self._read_json()
        with SAVE_LOCK:
            if self.path.startswith("/api/result"):
                save = load_save()
                ending = apply_result(save, payload)
                write_save(save)
                state = public_state(save)
                state["ending"] = ending
                return self._json(state)
            if self.path.startswith("/api/overtime"):
                save = load_save()
                if not apply_overtime(save, payload):
                    return self._json({"error": "bad overtime"}, HTTPStatus.BAD_REQUEST)
                write_save(save)
                return self._json(public_state(save))
            if self.path.startswith("/api/crane"):
                night = int(payload.get("night", 0))
                if night not in gd.CRANE_NOTES:
                    return self._json({"error": "no crane"}, HTTPStatus.BAD_REQUEST)
                save = load_save()
                if night not in save["cranes_found"]:
                    save["cranes_found"].append(night)
                    write_save(save)
                return self._json({"note": gd.CRANE_NOTES[night], "found": len(set(save["cranes_found"]))})
            if self.path.startswith("/api/reset"):
                save = default_save()
                write_save(save)
                return self._json(public_state(save))
        self._json({"error": "unknown endpoint"}, HTTPStatus.NOT_FOUND)


class GameServer(ThreadingHTTPServer):
    # On Windows SO_REUSEADDR lets a second server silently share the port.
    allow_reuse_address = os.name != "nt"


def main():
    parser = argparse.ArgumentParser(description="HALCYON: Five Nights at the Aviary")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address. Use 0.0.0.0 to allow other devices.")
    parser.add_argument("--port", type=int, default=8077)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    shown = "127.0.0.1" if args.host in ("0.0.0.0", "::") else args.host
    url = f"http://{shown}:{args.port}/"
    try:
        server = GameServer((args.host, args.port), GameHandler)
    except OSError:
        print(f"Port {args.port} is busy. HALCYON may already be running at {url}")
        print("Close the other window, or pick another port: python server.py --port 8090")
        return
    print(f"HALCYON is open at {url}  (Ctrl+C to close the aviary)")
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nThe aviary goes quiet.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
