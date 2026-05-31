"""FastAPI application factory and lifespan for the RAG Intelligence system."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .middleware import RequestLoggingMiddleware, RequestTimingMiddleware, install_error_handlers
from .routes import router as api_router

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("rag.api")

# ── Paths ────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # rag1/
WEB_DIR = PROJECT_ROOT / "web"

# ── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle events."""
    logger.info("🚀 RAG Intelligence API starting up…")
    logger.info("   Web UI directory: %s", WEB_DIR)

    # Startup: try to initialize backend components
    try:
        from src.pipeline import RAGPipeline
        pipeline = RAGPipeline()
        app.state.pipeline = pipeline
        logger.info("   ✅ Backend pipeline initialized")
        logger.info("   📊 Model: %s", pipeline.settings.generation.model)
    except ImportError:
        logger.warning("   ⚠️  Backend pipeline not available yet — running in UI-only mode")
    except Exception as exc:
        logger.warning("   ⚠️  Backend pipeline init failed: %s", exc)

    yield  # ── Application is running ──

    logger.info("🛑 RAG Intelligence API shutting down…")


# ── App Factory ──────────────────────────────────────────────────────────────


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Aletheia RAG Platform",
        description="AI-Powered Knowledge Base with advanced RAG strategies, co-designed by Antigravity Coding Agent",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── CORS ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Custom middleware (order matters: outermost first) ────────────────
    app.add_middleware(RequestTimingMiddleware)
    app.add_middleware(RequestLoggingMiddleware)

    # ── Error handlers ───────────────────────────────────────────────────
    install_error_handlers(app)

    # ── API routes ───────────────────────────────────────────────────────
    app.include_router(api_router)

    # ── Static files (web UI) ────────────────────────────────────────────
    if WEB_DIR.exists():
        app.mount("/", StaticFiles(directory=str(WEB_DIR), html=True), name="web")
        logger.info("   📁 Serving web UI from %s", WEB_DIR)
    else:
        logger.warning("   ⚠️  Web directory %s not found — UI won't be served", WEB_DIR)

    return app


# ── Module-level app instance (for `uvicorn src.api.app:app`) ────────────────

app = create_app()
