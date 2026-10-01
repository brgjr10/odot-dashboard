"""Guards for the ODOT-PY-001 / ODOT-PY-002 hardening in run_server.py.

Run with: python -m unittest discover -s tests -p test_*.py
"""
import unittest

import run_server


class ResolveRequestPathTests(unittest.TestCase):
    def test_root_serves_the_dashboard(self):
        for path in ("/", "", "/?a=1", "//", "/index.html"):
            self.assertEqual(run_server.resolve_request_path(path), "index.html")

    def test_allowed_assets(self):
        for asset in ("/bundle.js", "/sw.js", "/app.css", "/icon.png", "/manifest.webmanifest"):
            self.assertEqual(run_server.resolve_request_path(asset), asset.lstrip("/"))

    def test_secrets_and_vcs_metadata_are_refused(self):
        denied = (
            "/.git/config",
            "/.git/HEAD",
            "/.git",
            "/.env",
            "/.env.local",
            "/node_modules/",
            "/node_modules/electron/package.json",
            "/.github/workflows/docker-publish.yml",
            "/__pycache__/run_server.cpython-312.pyc",
        )
        for path in denied:
            with self.subTest(path=path):
                with self.assertRaises(run_server.ForbiddenPath):
                    run_server.resolve_request_path(path)

    def test_repository_files_outside_the_allow_list_are_refused(self):
        for path in ("/package-lock.json", "/run_server.py", "/main.js", "/project.json", "/src/app.js"):
            with self.subTest(path=path):
                with self.assertRaises(run_server.ForbiddenPath):
                    run_server.resolve_request_path(path)

    def test_traversal_and_encoded_traversal_are_refused(self):
        denied = (
            "/../run_server.py",
            "/../../../../etc/passwd",
            "/%2e%2e%2f%2e%2e%2fetc/passwd",
            "/..%5c..%5cWindows%5cwin.ini",
            "/bundle.js/../run_server.py",
        )
        for path in denied:
            with self.subTest(path=path):
                with self.assertRaises(run_server.ForbiddenPath):
                    run_server.resolve_request_path(path)


class SecurityHeaderTests(unittest.TestCase):
    def test_security_headers_present(self):
        for header in ("X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Content-Security-Policy"):
            self.assertIn(header, run_server.SECURITY_HEADERS)

    def test_csp_allows_only_the_three_known_origins(self):
        csp = run_server.SECURITY_HEADERS["Content-Security-Policy"]
        for origin in ("https://itscameras.dot.state.oh.us", "https://api.openweathermap.org", "https://publicapi.ohgo.com"):
            self.assertIn(origin, csp)
        self.assertIn("object-src 'none'", csp)

    def test_default_bind_is_localhost(self):
        # A hardcoded 0.0.0.0 is the defect; the argparse default must stay loopback.
        import inspect

        source = inspect.getsource(run_server.main)
        self.assertIn('default="127.0.0.1"', source)


if __name__ == "__main__":
    unittest.main()