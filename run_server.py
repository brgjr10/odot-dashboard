#!/usr/bin/env python3
import argparse
import http.server
import os
import socketserver
import sys
import webbrowser


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        sys.stdout.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve the ODOT dashboard locally.")
    parser.add_argument("--port", "-p", type=int, default=5173, help="Port to listen on (default: 5173)")
    parser.add_argument("--no-open", action="store_true", help="Do not open a browser tab")
    args = parser.parse_args()

    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    class ReuseTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    host = "0.0.0.0"
    url = f"http://localhost:{args.port}/"

    with ReuseTCPServer((host, args.port), NoCacheHandler) as httpd:
        print(f"Serving {root}")
        print(f"Open: {url}")
        print("Press Ctrl+C to stop.")

        if not args.no_open:
            try:
                webbrowser.open(url, new=2)
            except Exception:
                pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
