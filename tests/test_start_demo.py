import pathlib
import queue
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]


class DemoLauncherTest(unittest.TestCase):
    def test_launch_from_another_folder_serves_demo_and_its_modules(self):
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
                self.assertRegex(url, r"^http://127\.0\.0\.1:\d+/demos/astana-city/$")
                base = url.split("/demos/")[0]
                with urllib.request.urlopen(url, timeout=5) as response:
                    self.assertIn("ASTANA / Город возможностей", response.read().decode())
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
            finally:
                if process.poll() is None:
                    process.terminate()
                process.communicate(timeout=5)


if __name__ == "__main__":
    unittest.main()
