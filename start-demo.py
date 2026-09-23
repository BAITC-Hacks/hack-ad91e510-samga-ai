#!/usr/bin/env python3
"""Start the integrated local demo without packages or a fixed working folder."""

import argparse
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser


def node_24_or_newer():
    for candidate in ("node", "node24"):
        executable = shutil.which(candidate)
        if not executable:
            continue
        try:
            version = subprocess.run(
                [executable, "--version"], capture_output=True, text=True, check=True
            ).stdout.strip().removeprefix("v")
            if int(version.split(".", 1)[0]) >= 24:
                return executable
        except (OSError, subprocess.CalledProcessError, ValueError):
            continue
    return None


def available_loopback_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def stop(child):
    if child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()


def interrupt(_signum, _frame):
    raise KeyboardInterrupt


def wait_until_ready(child, url):
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if child.poll() is not None:
            return child.returncode or 1
        try:
            with urllib.request.urlopen(url + "api/health", timeout=0.25) as response:
                if response.status == 200:
                    return None
        except urllib.error.URLError:
            time.sleep(0.05)
    print("The local server did not become ready within 5 seconds.", file=sys.stderr, flush=True)
    return 1


def main():
    parser = argparse.ArgumentParser(description="Start ASTANA / City Lab locally.")
    parser.add_argument("--no-browser", action="store_true", help="Print the URL without opening a browser.")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    if not (root / "demos/astana-city/index.html").is_file():
        parser.error("Demo files are missing. Extract the entire ZIP before starting.")
    node = node_24_or_newer()
    if not node:
        parser.error("Node.js 24 or newer is required: https://nodejs.org/")
    port = available_loopback_port()
    url = "http://127.0.0.1:{}/".format(port)
    command = [node]
    env_file = root / "backend/.env"
    if env_file.is_file():
        command.append("--env-file=" + str(env_file))
    command.append(str(root / "backend/server.mjs"))
    environment = {**os.environ, "PORT": str(port)}
    print(url, flush=True)
    child = subprocess.Popen(command, cwd=root, env=environment)
    previous_sigterm = signal.signal(signal.SIGTERM, interrupt)
    try:
        startup_error = wait_until_ready(child, url)
        if startup_error is not None:
            return startup_error
        if not args.no_browser and not webbrowser.open(url):
            print("Open the URL above in your browser.", flush=True)
        child.wait()
        return child.returncode
    except KeyboardInterrupt:
        return 0
    finally:
        signal.signal(signal.SIGTERM, previous_sigterm)
        stop(child)


if __name__ == "__main__":
    raise SystemExit(main())
