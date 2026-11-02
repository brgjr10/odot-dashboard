#!/usr/bin/env python3
import argparse
import http.server
import os
import socketserver
import sys
import urllib.parse
import webbrowser

# The server used to expose the whole repository on 0.0.0.0: /.git/config,
# /package-lock.json and a full /node_modules/ listing were all readable by anyone
# on the LAN. Serve an explicit allow-list and refuse everything else.
ALLOWED_FILES = {
    "index.html",
    "bundle.js",
    "sw.js",
    "app.css",
    "manifest.webmanifest",
    "icon.png",
    "favicon.ico",
}

DENIED_SEGMENTS = {".git", ".env", "node_modules", ".github", "__pycache__", "dist"}

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": (
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "img-src 'self' data: blob: https://itscameras.dot.state.oh.us https://openweathermap.org https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com; "
        "connect-src 'self' https://api.openweathermap.org https://publicapi.ohgo.com https://itscameras.dot.state.oh.us; "
        "object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    ),
}


class ForbiddenPath(Exception):
    pass


def resolve_request_path(url_path: str) -> str:
    """Map a request path to one of ALLOWED_FILES, or raise ForbiddenPath."""
    decoded = urllib.parse.unquote(urllib.parse.urlsplit(url_path).path)
    parts = [p for p in decoded.replace("\\", "/").split("/") if p not in ("", ".")]

    # Dotfiles, dot-directories, traversal segments and the known-sensitive
    # directories are refused before anything is opened from disk.
    if any(p.startswith(".") for p in parts):
        raise ForbiddenPath(decoded)
    if any(p in DENIED_SEGMENTS for p in parts):
        raise ForbiddenPath(decoded)
    if ".." in parts:
        raise ForbiddenPath(decoded)

    if not parts:
        return "index.html"

    if len(parts) != 1 or parts[0] not in ALLOWED_FILES:
        raise ForbiddenPath(decoded)

    return parts[0]


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "OdotDashboard/1.0"

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path == "/proxy":
            from urllib.parse import parse_qs
            qs = parse_qs(parsed.query)
            target = (qs.get("url") or [""])[0]
            parsed_t = urllib.parse.urlsplit(target)
            if parsed_t.scheme != "https" or parsed_t.hostname != "itscameras.dot.state.oh.us":
                self._send_forbidden()
                return
            try:
                req = urllib.request.Request(target, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://ohgo.com/"})
                with urllib.request.urlopen(req, timeout=10) as r:
                    data = r.read()
                    ctype = r.headers.get("Content-Type", "image/jpeg")
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Access-Control-Allow-Origin", "*")
                for name, value in SECURITY_HEADERS.items():
                    self.send_header(name, value)
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(data)
            except Exception as e:
                import sys
                sys.stderr.write("proxy error: " + repr(e) + "\n")
                self._send_forbidden()
            return
        super().do_GET()

    def _send_forbidden(self) -> None:
        body = b"Forbidden\n"
        self.send_response(403)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for name, value in SECURITY_HEADERS.items():
            self.send_header(name, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def send_head(self):
        try:
            name = resolve_request_path(self.path)
        except ForbiddenPath:
            self._send_forbidden()
            return None

        self.path = "/" + name
        return super().send_head()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        for name, value in SECURITY_HEADERS.items():
            self.send_header(name, value)
        super().end_headers()

    def list_directory(self, path):
        # Never emit a directory listing.
        self._send_forbidden()
        return None

    def log_message(self, format: str, *args) -> None:
        sys.stdout.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve the ODOT dashboard locally.")
    parser.add_argument("--port", "-p", type=int, default=5173, help="Port to listen on (default: 5173)")
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Interface to bind (default: 127.0.0.1). Use 0.0.0.0 to expose it on the LAN.",
    )
    parser.add_argument("--no-open", action="store_true", help="Do not open a browser tab")
    args = parser.parse_args()

    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    class ReuseTCPServer(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True

    host = args.host
    url = f"http://localhost:{args.port}/"

    with ReuseTCPServer((host, args.port), NoCacheHandler) as httpd:
        print(f"Serving {root}")
        print(f"Bound to {host}:{args.port}")
        print(f"Open: {url}")
        print("Press Ctrl+C to stop.")

        if not args.no_open:
            try:
                webbrowser.open(url, new=2)
            except Exception as err:
                print(f"Could not open a browser tab: {err}", file=sys.stderr)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())