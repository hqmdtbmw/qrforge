from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from generate_qr import router as qr_router
from analyze_scans import router as scans_router
from documents import router as docs_router
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.middleware("http")
async def vercel_path_rewrite(request: Request, call_next):
    """Strip Vercel function prefix from request path for internal routing.

    On Vercel, rewrites like /api/py/scans/aggregate -> /api/python/main
    cause FastAPI to see the path as /api/python/main. This middleware
    reconstructs the correct internal path by reading the ASGI root_path.
    """
    original = request.url.path
    root = request.scope.get("root_path", "")

    # root_path is typically set to /api/python/main by Vercel's ASGI wrapper
    if root and original.startswith(root):
        stripped = original[len(root):] or "/"
        request.scope["path"] = stripped
        request.scope["root_path"] = root

        # Strip /api/python/ prefix if root_path not set but path starts with it
    if not root and original.startswith("/api/python/"):
        suffix = original[len("/api/python/"):]
        request.scope["path"] = f"/{suffix}"

    response = await call_next(request)
    return response


app.include_router(qr_router, prefix="/qr")
app.include_router(scans_router, prefix="/scans")
app.include_router(docs_router, prefix="/docs")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "qrforge-python"}
