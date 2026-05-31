"""Pydantic request/response schemas for the RAG API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Query ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """A single chat message in conversation history."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class QueryRequest(BaseModel):
    """Request body for querying the RAG system."""
    query: str = Field(..., min_length=1, max_length=4096, description="The question to ask")
    strategy: str = Field("adaptive", description="RAG strategy to use")
    collection: str = Field("default", description="Collection to search in")
    top_k: int = Field(5, ge=1, le=20, description="Number of top results to retrieve")
    chat_history: List[ChatMessage] = Field(default_factory=list, description="Previous conversation turns for context")


class SourceInfo(BaseModel):
    """Information about a retrieved source chunk."""
    document_id: str = ""
    filename: str = ""
    chunk_text: str = ""
    relevance_score: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TimingInfo(BaseModel):
    """Timing breakdown for the query pipeline."""
    retrieval_ms: float = 0.0
    generation_ms: float = 0.0
    total_ms: float = 0.0


class QueryResponse(BaseModel):
    """Response from a RAG query."""
    answer: str
    sources: List[SourceInfo] = Field(default_factory=list)
    strategy_used: str = ""
    timing: TimingInfo = Field(default_factory=TimingInfo)


# ── Ingestion ────────────────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    """Response after ingesting documents."""
    message: str
    files_processed: int = 0
    chunks_created: int = 0
    time_taken_ms: float = 0.0
    errors: List[str] = Field(default_factory=list)
    task_ids: List[str] = Field(default_factory=list)


class IngestTaskStatus(BaseModel):
    """Status of a background ingestion task."""
    task_id: str
    filename: str
    collection: str
    status: str  # pending, processing, completed, failed
    progress: float
    step: str
    message: str
    chunks_created: int = 0
    time_taken_ms: float = 0.0
    error: Optional[str] = None
    completed_at: Optional[str] = None



# ── Documents ────────────────────────────────────────────────────────────────

class DocumentInfo(BaseModel):
    """Information about an ingested document."""
    id: str
    filename: str
    chunk_count: int = 0
    ingested_at: Optional[str] = None
    collection: str = "default"
    file_size: Optional[int] = None


class DocumentListResponse(BaseModel):
    """Response listing all documents."""
    documents: List[DocumentInfo] = Field(default_factory=list)
    total: int = 0


# ── Collections ──────────────────────────────────────────────────────────────

class CollectionInfo(BaseModel):
    """Information about a collection."""
    name: str
    document_count: int = 0
    chunk_count: int = 0
    created_at: Optional[str] = None
    description: str = ""


class CollectionCreateRequest(BaseModel):
    """Request to create a new collection."""
    name: str = Field(..., min_length=1, max_length=128, pattern=r"^[a-zA-Z0-9_-]+$")
    description: str = ""


class CollectionListResponse(BaseModel):
    """Response listing all collections."""
    collections: List[CollectionInfo] = Field(default_factory=list)


# ── Health ───────────────────────────────────────────────────────────────────

class ServiceStatus(BaseModel):
    """Status of an individual service dependency."""
    status: str = "unknown"  # "connected", "disconnected", "error"
    message: str = ""


class HealthStatus(BaseModel):
    """Overall system health status."""
    status: str = "ok"  # "ok", "degraded", "error"
    ollama: ServiceStatus = Field(default_factory=ServiceStatus)
    chromadb: ServiceStatus = Field(default_factory=ServiceStatus)
    total_documents: int = 0
    total_chunks: int = 0
    uptime_seconds: float = 0.0


# ── Strategies ───────────────────────────────────────────────────────────────

class StrategyInfo(BaseModel):
    """Information about a RAG strategy."""
    id: str
    name: str
    description: str
    icon: str = "🔍"
    is_default: bool = False


class StrategyListResponse(BaseModel):
    """Response listing available strategies."""
    strategies: List[StrategyInfo] = Field(default_factory=list)


# ── Errors ───────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    """Standard error response body."""
    error: str
    detail: Optional[str] = None
    status_code: int = 500
