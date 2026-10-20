import os
import sys

# Support both Vercel Root Directory = "frontend" (bundled in api/_backend)
# and Root Directory = "." (../../backend)
current_dir = os.path.dirname(os.path.abspath(__file__))
bundled_backend = os.path.join(current_dir, "_backend")
repo_backend = os.path.normpath(os.path.join(current_dir, "..", "..", "backend"))

if os.path.isdir(os.path.join(bundled_backend, "app")):
    if bundled_backend not in sys.path:
        sys.path.insert(0, bundled_backend)
elif os.path.isdir(os.path.join(repo_backend, "app")):
    if repo_backend not in sys.path:
        sys.path.insert(0, repo_backend)

from app.main import app  # noqa: E402, F401
