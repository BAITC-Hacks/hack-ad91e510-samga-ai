#!/usr/bin/env python3
"""Open the shared mockup locally, without packages or a fixed working folder."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser


class DemoHandler(SimpleHTTPRequestHandler):
    # Windows MIME registries do not always recognise JavaScript modules.
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".mjs": "text/javascript",
        ".geojson": "application/geo+json",
    }


def main():
    parser = argparse.ArgumentParser(description="Start ASTANA / City Lab locally.")
    parser.add_argument("--no-browser", action="store_true", help="Print the URL without opening a browser.")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    if not (root / "demos/astana-city/index.html").is_file():
        parser.error("Demo files are missing. Extract the entire ZIP before starting.")
    handler = partial(DemoHandler, directory=str(root))
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        url = "http://127.0.0.1:{}/demos/astana-city/".format(server.server_port)
        print(url, flush=True)
        print("Keep this window open. Stop with Ctrl+C. Internet is needed for map tiles.", flush=True)
        if not args.no_browser:
            if not webbrowser.open(url):
                print("Open the URL above in your browser.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nDemo stopped.", flush=True)


if __name__ == "__main__":
    main()
