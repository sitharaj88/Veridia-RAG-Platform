"""API route definitions for the RAG Intelligence system."""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse

from .schemas import (
    CollectionCreateRequest,
    CollectionInfo,
    CollectionListResponse,
    DocumentInfo,
    DocumentListResponse,
    ErrorResponse,
    HealthStatus,
    IngestResponse,
    IngestTaskStatus,
    QueryRequest,
    QueryResponse,
    ServiceStatus,
    SourceInfo,
    StrategyInfo,
    StrategyListResponse,
    TimingInfo,
)

logger = logging.getLogger("rag.api")

router = APIRouter(prefix="/api", tags=["RAG API"])

# ── Available strategies ─────────────────────────────────────────────────────

STRATEGIES: List[StrategyInfo] = [
    StrategyInfo(
        id="adaptive",
        name="Adaptive",
        description="Automatically selects the best strategy based on query complexity and available context.",
        icon="🧠",
        is_default=True,
    ),
    StrategyInfo(
        id="naive",
        name="Naive RAG",
        description="Simple retrieve-and-generate pipeline. Fast and effective for straightforward questions.",
        icon="⚡",
    ),
    StrategyInfo(
        id="hyde",
        name="HyDE RAG",
        description="Generates a hypothetical answer via LLM to perform dense vector search, boosting abstract search recall.",
        icon="🔮",
    ),
    StrategyInfo(
        id="corrective",
        name="Corrective RAG",
        description="Evaluates retrieval quality and self-corrects by refining queries or filtering poor results.",
        icon="🔄",
    ),
    StrategyInfo(
        id="self_rag",
        name="Self-RAG",
        description="Reflects on its own generation, checking for hallucinations and grounding in sources.",
        icon="🪞",
    ),
    StrategyInfo(
        id="agentic",
        name="Agentic RAG",
        description="Multi-step reasoning agent that plans, retrieves, and synthesizes across multiple queries.",
        icon="🤖",
    ),
]


# ── Helper: get the backend pipeline (lazy import) ──────────────────────────

_pipeline_instance = None


def _get_pipeline():
    """Try to import the RAG pipeline. Returns None if not yet available."""
    global _pipeline_instance
    if _pipeline_instance is not None:
        return _pipeline_instance
    try:
        from src.pipeline import RAGPipeline
        _pipeline_instance = RAGPipeline()
        return _pipeline_instance
    except Exception as e:
        logger.warning("Pipeline not available: %s", e)
        return None


# ── Health ───────────────────────────────────────────────────────────────────

_start_time = time.time()


@router.get("/health", response_model=HealthStatus)
async def health_check():
    """Check system health — Ollama connectivity, ChromaDB status, stats."""
    ollama_status = ServiceStatus(status="disconnected", message="Ollama is not running")
    chroma_status = ServiceStatus(status="disconnected", message="ChromaDB disconnected")
    total_docs = 0
    total_chunks = 0

    pipeline = _get_pipeline()

    # Try to check Ollama (use 127.0.0.1 to avoid DNS delays on Windows)
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("http://127.0.0.1:11434/api/tags")
            if resp.status_code == 200:
                ollama_status = ServiceStatus(status="connected", message="Ollama is running")
            else:
                ollama_status = ServiceStatus(status="error", message=f"HTTP {resp.status_code}")
    except Exception as e:
        ollama_status = ServiceStatus(status="disconnected", message=str(e))

    # Check ChromaDB & retrieve statistics
    if pipeline:
        try:
            colls = pipeline.vector_store.list_collections()
            chroma_status = ServiceStatus(status="connected", message=f"{len(colls)} collection(s)")
            total_docs = len(colls)
            
            # Fetch default collection count
            stats = pipeline.vector_store.get_collection_stats()
            total_chunks = stats.get("count", 0)
        except Exception as e:
            chroma_status = ServiceStatus(status="error", message=f"ChromaDB error: {e}")

    # Determine overall status
    overall = "ok"
    if ollama_status.status != "connected" or chroma_status.status != "connected":
        overall = "degraded"
    if ollama_status.status == "disconnected" and chroma_status.status == "disconnected":
        overall = "error"

    return HealthStatus(
        status=overall,
        ollama=ollama_status,
        chromadb=chroma_status,
        total_documents=total_docs,
        total_chunks=total_chunks,
        uptime_seconds=round(time.time() - _start_time, 1),
    )


# ── Strategies ───────────────────────────────────────────────────────────────

@router.get("/strategies", response_model=StrategyListResponse)
async def list_strategies():
    """List available RAG strategies with descriptions."""
    return StrategyListResponse(strategies=STRATEGIES)


# ── Collections ──────────────────────────────────────────────────────────────

_collections: dict[str, CollectionInfo] = {}


@router.get("/collections", response_model=CollectionListResponse)
async def list_collections():
    """List all collections with stats."""
    pipeline = _get_pipeline()
    if pipeline:
        try:
            colls = pipeline.vector_store.list_collections()
            res = []
            for name in colls:
                c = pipeline.vector_store._client.get_collection(name)
                chunk_count = c.count()
                
                # Deduplicate unique document_ids
                metadatas = c.get(include=["metadatas"])
                doc_ids = set()
                if metadatas and metadatas["metadatas"]:
                    for meta in metadatas["metadatas"]:
                        if meta and "document_id" in meta:
                            doc_ids.add(meta["document_id"])
                
                res.append(CollectionInfo(
                    name=name,
                    document_count=len(doc_ids),
                    chunk_count=chunk_count,
                    created_at=datetime.now(timezone.utc).isoformat(),
                    description=f"Collection '{name}'",
                ))
            return CollectionListResponse(collections=res)
        except Exception as e:
            logger.error("Error listing collections from database: %s", e)
            pass
            
    # Default fallback
    return CollectionListResponse(collections=[
        CollectionInfo(
            name="default",
            document_count=0,
            chunk_count=0,
            created_at=datetime.now(timezone.utc).isoformat(),
            description="Default collection",
        )
    ])


@router.post("/collections", response_model=CollectionInfo, status_code=201)
async def create_collection(body: CollectionCreateRequest):
    """Create a new collection."""
    pipeline = _get_pipeline()
    if pipeline:
        try:
            pipeline.vector_store.switch_collection(body.name)
        except Exception as e:
            logger.error("Error creating collection in vector store: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    info = CollectionInfo(
        name=body.name,
        document_count=0,
        chunk_count=0,
        created_at=datetime.now(timezone.utc).isoformat(),
        description=body.description,
    )
    _collections[body.name] = info
    return info


@router.delete("/collections/{name}", status_code=204)
async def delete_collection(name: str):
    """Delete a collection and all its data."""
    if name == "default":
        raise HTTPException(status_code=400, detail="Cannot delete the default collection")
        
    pipeline = _get_pipeline()
    deleted = False
    
    if pipeline:
        try:
            pipeline.vector_store.delete_collection(name)
            deleted = True
        except Exception as e:
            logger.error("Error deleting collection from vector store: %s", e)
            
    if name in _collections:
        del _collections[name]
        deleted = True
        
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Collection '{name}' not found")


# ── Documents ────────────────────────────────────────────────────────────────

_documents: dict[str, DocumentInfo] = {}


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(collection: str | None = None):
    """List all ingested documents."""
    pipeline = _get_pipeline()
    if pipeline:
        try:
            if collection:
                pipeline.switch_collection(collection)
            chunks = pipeline.vector_store.get_all_chunks()
            docs_map = {}
            for chunk in chunks:
                doc_id = chunk.document_id or chunk.metadata.get("document_id", "unknown-doc")
                filename = chunk.metadata.get("source", "unknown")
                from pathlib import Path
                filename = Path(filename).name
                
                if doc_id not in docs_map:
                    docs_map[doc_id] = {
                        "id": doc_id,
                        "filename": filename,
                        "chunk_count": 0,
                        "ingested_at": chunk.metadata.get("ingested_at", datetime.now(timezone.utc).isoformat()),
                        "collection": pipeline.vector_store.collection_name,
                        "file_size": int(chunk.metadata.get("file_size", 0)),
                    }
                docs_map[doc_id]["chunk_count"] += 1
            
            res_docs = [DocumentInfo(**doc_data) for doc_data in docs_map.values()]
            return DocumentListResponse(documents=res_docs, total=len(res_docs))
        except Exception as e:
            logger.error("Error listing documents from vector store: %s", e)
            pass
            
    docs = list(_documents.values())
    return DocumentListResponse(documents=docs, total=len(docs))


@router.delete("/documents/{doc_id}", status_code=204)
async def delete_document(doc_id: str, collection: str | None = None):
    """Delete a document and all its chunks."""
    pipeline = _get_pipeline()
    deleted = False
    
    if pipeline:
        try:
            if collection:
                pipeline.switch_collection(collection)
            chunks = pipeline.vector_store.get_all_chunks()
            chunk_ids_to_delete = []
            for chunk in chunks:
                chk_doc_id = chunk.document_id or chunk.metadata.get("document_id")
                if chk_doc_id == doc_id:
                    chunk_ids_to_delete.append(chunk.id)
            
            if chunk_ids_to_delete:
                pipeline.vector_store.delete(chunk_ids_to_delete)
                deleted = True
                
                # Rebuild BM25 index
                pipeline.sparse_retriever.build_index()
                pipeline.sparse_retriever.save_index()
        except Exception as e:
            logger.error("Error deleting document from vector store: %s", e)
            raise HTTPException(status_code=500, detail=str(e))
            
    if doc_id in _documents:
        del _documents[doc_id]
        deleted = True
        
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")


@router.delete("/documents", status_code=204)
async def delete_all_documents(collection: str | None = None):
    """Delete all documents and chunks in a collection."""
    global _documents
    pipeline = _get_pipeline()
    if pipeline:
        try:
            if collection:
                pipeline.switch_collection(collection)
            chunks = pipeline.vector_store.get_all_chunks()
            chunk_ids_to_delete = [chunk.id for chunk in chunks]
            
            if chunk_ids_to_delete:
                pipeline.vector_store.delete(chunk_ids_to_delete)
                
            # Rebuild BM25 index
            pipeline.sparse_retriever.build_index()
            pipeline.sparse_retriever.save_index()
            
            # Clear local documents cache matching the collection
            col_name = pipeline.vector_store.collection_name
            _documents = {k: v for k, v in _documents.items() if v.collection != col_name}
            return
        except Exception as e:
            logger.error("Error clearing collection: %s", e)
            raise HTTPException(status_code=500, detail=str(e))
            
    # Fallback clear cache
    col = collection or "default"
    _documents = {k: v for k, v in _documents.items() if v.collection != col}


# ── Ingest Tasks Status Store ────────────────────────────────────────────────
ingest_tasks: dict[str, dict] = {}


def run_ingest_task(task_id: str, file_path: Path, filename: str, collection: str, file_size: int):
    """Background runner for document ingestion."""
    start = time.perf_counter()
    from pathlib import Path

    def cb(step: str, progress: float, details: dict):
        if task_id in ingest_tasks:
            ingest_tasks[task_id]["step"] = step
            ingest_tasks[task_id]["progress"] = progress
            ingest_tasks[task_id]["message"] = details.get("message", "")
            if step == "completed":
                ingest_tasks[task_id]["status"] = "completed"
                ingest_tasks[task_id]["chunks_created"] = details.get("chunks_created", 0)
                ingest_tasks[task_id]["time_taken_ms"] = round((time.perf_counter() - start) * 1000, 2)
                ingest_tasks[task_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
                
                # Register in local cache as fallback
                _documents[task_id] = DocumentInfo(
                    id=task_id,
                    filename=filename,
                    chunk_count=details.get("chunks_created", 0),
                    ingested_at=datetime.now(timezone.utc).isoformat(),
                    collection=collection,
                    file_size=file_size,
                )
            elif step == "failed":
                ingest_tasks[task_id]["status"] = "failed"
                ingest_tasks[task_id]["error"] = details.get("error", "Unknown error")
                ingest_tasks[task_id]["time_taken_ms"] = round((time.perf_counter() - start) * 1000, 2)
                ingest_tasks[task_id]["completed_at"] = datetime.now(timezone.utc).isoformat()

    try:
        if task_id in ingest_tasks:
            ingest_tasks[task_id]["status"] = "processing"
            
        pipeline = _get_pipeline()
        if not pipeline:
            raise Exception("RAG pipeline not initialized")
            
        # Switch collection
        pipeline.switch_collection(collection)
        # Process file ingestion
        pipeline.ingest(file_path, progress_callback=cb)

    except Exception as e:
        logger.error("Background ingestion error for %s: %s", filename, e, exc_info=True)
        cb("failed", 1.0, {"error": str(e)})


@router.post("/ingest", response_model=IngestResponse)
async def ingest_files(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    collection: str = Form("default"),
):
    """Upload and queue files for background ingestion."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    from pathlib import Path
    raw_dir = Path("data/raw")
    raw_dir.mkdir(parents=True, exist_ok=True)

    task_ids = []

    for f in files:
        task_id = str(uuid.uuid4())
        filename = f.filename or "unknown"
        task_ids.append(task_id)

        try:
            content = await f.read()
            # Save file to disk
            file_path = raw_dir / f"{task_id}_{filename}"
            file_path.write_bytes(content)

            # Register task progress
            ingest_tasks[task_id] = {
                "task_id": task_id,
                "filename": filename,
                "collection": collection,
                "status": "pending",
                "progress": 0.0,
                "step": "queued",
                "message": "Queued for background processing...",
                "chunks_created": 0,
                "time_taken_ms": 0.0,
                "error": None,
                "completed_at": None,
            }

            # Enqueue FastAPI background task
            background_tasks.add_task(
                run_ingest_task,
                task_id=task_id,
                file_path=file_path,
                filename=filename,
                collection=collection,
                file_size=len(content),
            )
        except Exception as e:
            logger.error("Error queueing %s: %s", filename, e)
            ingest_tasks[task_id] = {
                "task_id": task_id,
                "filename": filename,
                "collection": collection,
                "status": "failed",
                "progress": 1.0,
                "step": "failed",
                "message": "Failed to queue file",
                "chunks_created": 0,
                "time_taken_ms": 0.0,
                "error": str(e),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }

    return IngestResponse(
        message=f"Queued {len(files)} file(s) for processing",
        files_processed=len(files),
        chunks_created=0,
        time_taken_ms=0.0,
        errors=[],
        task_ids=task_ids,
    )


@router.get("/ingest/tasks", response_model=List[IngestTaskStatus])
async def list_ingest_tasks(collection: str | None = None):
    """List all background ingestion tasks."""
    tasks = list(ingest_tasks.values())
    if collection:
        tasks = [t for t in tasks if t["collection"] == collection]
    return [IngestTaskStatus(**t) for t in tasks]


@router.get("/ingest/tasks/{task_id}", response_model=IngestTaskStatus)
async def get_ingest_task(task_id: str):
    """Get the status of a specific background ingestion task."""
    if task_id not in ingest_tasks:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    return IngestTaskStatus(**ingest_tasks[task_id])


# ── Query ────────────────────────────────────────────────────────────────────

@router.post("/query", response_model=QueryResponse)
async def query_rag(body: QueryRequest):
    """Query the RAG system and get a complete response."""
    start = time.perf_counter()

    pipeline = _get_pipeline()
    if pipeline:
        try:
            # Switch collection before querying
            pipeline.switch_collection(body.collection)

            # Convert chat history to plain dicts
            history = [{"role": m.role, "content": m.content} for m in body.chat_history] if body.chat_history else None

            # Run sync pipeline.query in a thread to not block event loop
            result = await asyncio.to_thread(
                pipeline.query,
                body.query,
                body.strategy,
                chat_history=history,
            )
            elapsed = (time.perf_counter() - start) * 1000

            # Convert RetrievalResult sources to SourceInfo
            sources = []
            for r in result.sources:
                sources.append(SourceInfo(
                    document_id=r.chunk.document_id,
                    filename=r.chunk.metadata.get("source", r.source or "unknown"),
                    chunk_text=r.chunk.content[:500],
                    relevance_score=round(r.score, 4),
                    metadata=r.chunk.metadata,
                ))

            return QueryResponse(
                answer=result.answer,
                sources=sources,
                strategy_used=result.strategy_used,
                timing=TimingInfo(
                    total_ms=round(elapsed, 2),
                ),
            )
        except Exception as e:
            logger.error("Pipeline query error: %s", e, exc_info=True)
            raise HTTPException(status_code=500, detail=f"Query failed: {e}")

    # Fallback demo response when pipeline is not available
    elapsed = (time.perf_counter() - start) * 1000
    return QueryResponse(
        answer=(
            "⚠️ The RAG pipeline is not yet connected. This is a placeholder response.\n\n"
            f"Your query was: **{body.query}**\n\n"
            "Once the backend core is integrated, this will return real AI-generated answers "
            "grounded in your uploaded documents."
        ),
        sources=[
            SourceInfo(
                document_id="demo-1",
                filename="example.pdf",
                chunk_text="This is a demo source chunk showing how citations will appear.",
                relevance_score=0.95,
            ),
            SourceInfo(
                document_id="demo-2",
                filename="readme.md",
                chunk_text="Another example source to demonstrate the multi-source citation display.",
                relevance_score=0.87,
            ),
        ],
        strategy_used=body.strategy,
        timing=TimingInfo(total_ms=round(elapsed, 2)),
    )


# ── Streaming Query (SSE) ───────────────────────────────────────────────────

@router.post("/query/stream")
async def query_rag_stream(body: QueryRequest):
    """Stream a RAG query response via Server-Sent Events."""

    async def event_stream():
        start = time.perf_counter()

        pipeline = _get_pipeline()
        if pipeline:
            try:
                import queue
                import threading

                # Switch collection before query stream
                pipeline.switch_collection(body.collection)

                # Convert chat history to plain dicts
                history = [{"role": m.role, "content": m.content} for m in body.chat_history] if body.chat_history else None

                q = queue.Queue()

                def worker():
                    try:
                        for item in pipeline.query_stream(body.query, body.strategy, chat_history=history):
                            q.put(("item", item))
                        q.put(("done", None))
                    except Exception as err:
                        q.put(("error", err))

                thread = threading.Thread(target=worker, daemon=True)
                thread.start()

                while True:
                    status, val = await asyncio.to_thread(q.get)
                    if status == "item":
                        event_type = val.get("type")
                        if event_type == "token":
                            yield f"event: token\ndata: {json.dumps({'token': val.get('token', '')})}\n\n"
                        elif event_type == "sources":
                            yield f"event: sources\ndata: {json.dumps({'sources': val.get('sources', [])})}\n\n"
                        elif event_type == "trace":
                            yield f"event: trace\ndata: {json.dumps({'step': val.get('step', ''), 'message': val.get('message', ''), 'details': val.get('details', {})})}\n\n"
                    elif status == "done":
                        break
                    elif status == "error":
                        raise val

                elapsed = (time.perf_counter() - start) * 1000
                yield f"event: done\ndata: {json.dumps({'timing': {'total_ms': round(elapsed, 2)}, 'strategy_used': body.strategy})}\n\n"
                return
            except Exception as e:
                logger.error("Streaming pipeline error: %s", e, exc_info=True)
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                return

        # ── Fallback demo streaming when no pipeline is connected ────────
        demo_text = (
            "⚠️ The RAG pipeline is not yet connected. "
            "This is a **streaming demo** response.\n\n"
            f"Your query was: *{body.query}*\n\n"
            "Once the backend core is integrated, you will see real AI-generated "
            "answers streamed token-by-token, grounded in your uploaded documents.\n\n"
            "### How it works\n"
            "1. Your query is analyzed for complexity\n"
            "2. The best RAG strategy is selected\n"
            "3. Relevant document chunks are retrieved\n"
            "4. An LLM generates an answer grounded in the sources\n"
            "5. The response streams back in real-time\n\n"
            "```python\n"
            "# Example pipeline call\n"
            "result = pipeline.query(\n"
            f'    query="{body.query[:40]}...",\n'
            f'    strategy="{body.strategy}",\n'
            ")\n"
            "```\n"
        )

        # Stream tokens with a natural typing cadence
        words = demo_text.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
            await asyncio.sleep(0.03)

        # Send demo sources
        sources = [
            {
                "document_id": "demo-1",
                "filename": "example.pdf",
                "chunk_text": "This is a demo source chunk showing how citations will appear when the RAG pipeline is connected.",
                "relevance_score": 0.95,
                "metadata": {},
            },
            {
                "document_id": "demo-2",
                "filename": "readme.md",
                "chunk_text": "Another example source to demonstrate the multi-source citation display with expandable cards.",
                "relevance_score": 0.87,
                "metadata": {},
            },
            {
                "document_id": "demo-3",
                "filename": "research_paper.pdf",
                "chunk_text": "A third source demonstrating how multiple citations appear as beautifully styled expandable cards below the response.",
                "relevance_score": 0.72,
                "metadata": {},
            },
        ]
        yield f"event: sources\ndata: {json.dumps({'sources': sources})}\n\n"

        elapsed = (time.perf_counter() - start) * 1000
        yield f"event: done\ndata: {json.dumps({'timing': {'total_ms': round(elapsed, 2)}, 'strategy_used': body.strategy})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
