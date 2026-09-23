import pathlib
import json
import os
import queue
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]


def open_after_ready(url):
    last_error = None
    for _ in range(50):
        try:
            return urllib.request.urlopen(url, timeout=1)
        except urllib.error.URLError as error:
            last_error = error
            time.sleep(0.1)
    raise last_error


class DemoLauncherTest(unittest.TestCase):
    def test_launcher_returns_nonzero_when_node_exits_during_startup(self):
        with tempfile.TemporaryDirectory() as tools, tempfile.TemporaryDirectory() as other_folder:
            node = pathlib.Path(tools) / "node"
            node.write_text("#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then echo v24.0.0; exit 0; fi\nexit 7\n")
            node.chmod(0o755)
            result = subprocess.run(
                [sys.executable, str(ROOT / "start-demo.py"), "--no-browser"], cwd=other_folder,
                env={**os.environ, "PATH": tools}, capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 7)
            self.assertRegex(result.stdout.splitlines()[0], r"^http://127\.0\.0\.1:\d+/$")

    def test_launch_from_another_folder_serves_integrated_api_and_only_public_assets(self):
        with tempfile.TemporaryDirectory() as other_folder:
            process = subprocess.Popen(
                [sys.executable, str(ROOT / "start-demo.py"), "--no-browser"],
                cwd=other_folder, stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, text=True,
            )
            try:
                lines = queue.Queue()
                threading.Thread(
                    target=lambda: lines.put(process.stdout.readline()), daemon=True,
                ).start()
                url = lines.get(timeout=10).strip()
                if not url:
                    self.fail(process.communicate(timeout=5)[1])
                self.assertRegex(url, r"^http://127\.0\.0\.1:\d+/$")
                base = url.rstrip("/")
                with open_after_ready(url) as response:
                    self.assertGreater(len(response.read()), 100)
                with urllib.request.urlopen(base + "/api/catalog", timeout=5) as response:
                    self.assertAlmostEqual(json.load(response)["baseline"]["score"], 52.55768)
                for path in [
                    "/demos/astana-city/app.mjs",
                    "/docs/brief-analysis/dist/data.mjs",
                    "/docs/brief-analysis/dist/model.mjs",
                ]:
                    with urllib.request.urlopen(base + path, timeout=5) as response:
                        self.assertIn("javascript", response.headers["Content-Type"])
                        self.assertGreater(len(response.read()), 100)
                with urllib.request.urlopen(base + "/demos/astana-city/astana.geojson", timeout=5) as response:
                    self.assertIn(b'FeatureCollection', response.read())
                with self.assertRaises(urllib.error.HTTPError) as denied:
                    urllib.request.urlopen(base + "/backend/.env.example", timeout=5)
                self.assertEqual(denied.exception.code, 404)
            finally:
                if process.poll() is None:
                    process.terminate()
                process.communicate(timeout=5)
            self.assertIsNotNone(process.returncode)
            with self.assertRaises(urllib.error.URLError):
                urllib.request.urlopen(base + "/api/health", timeout=1)


if __name__ == "__main__":
    unittest.main()
