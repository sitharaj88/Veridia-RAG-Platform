"""
Ingestion pipeline orchestrator.

Coordinates loader → preprocessor → chunker → embedder → vector store
and provides progress logging plus summary statistics.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Callable, Optional


from src.embedding.base import BaseEmbedder
from src.ingestion.chunker import BaseChunker
from src.ingestion.loader import DocumentLoader
from src.ingestion.preprocessor import TextPreprocessor
from src.models import Chunk, IngestionStats
from src.utils.logger import get_logger
from src.vectorstore.base import BaseVectorStore

log = get_logger(__name__)


class IngestionPipeline:
    """
    End-to-end document ingestion pipeline.

    Usage::

        pipeline = IngestionPipeline(loader, preprocessor, chunker, embedder, store)
        stats = pipeline.ingest_file(Path("report.pdf"))
        stats = pipeline.ingest_directory(Path("./docs"))
    """

    def __init__(
        self,
        loader: DocumentLoader,
        preprocessor: TextPreprocessor,
        chunker: BaseChunker,
        embedder: BaseEmbedder,
        vector_store: BaseVectorStore,
    ) -> None:
        self.loader = loader
        self.preprocessor = preprocessor
        self.chunker = chunker
        self.embedder = embedder
        self.vector_store = vector_store

    def ingest_file(
        self,
        path: Path,
        progress_callback: Optional[Callable[[str, float, dict], None]] = None,
    ) -> IngestionStats:
        """Ingest a single file through the full pipeline."""
        start = time.perf_counter()
        stats = IngestionStats()
        path = Path(path).resolve()

        log.info(f"Ingesting file: {path}")

        if progress_callback:
            progress_callback("loading", 0.1, {"message": f"Parsing file: {path.name}..."})

        # 1. Load
        documents = self.loader.load_file(path)
        if not documents:
            stats.failed_files.append(str(path))
            stats.elapsed_seconds = time.perf_counter() - start
            if progress_callback:
                progress_callback("failed", 1.0, {"error": "Failed to parse document text (0 pages extracted)"})
            return stats

        stats.total_files = 1
        stats.total_documents = len(documents)

        # 2. Preprocess
        if progress_callback:
            progress_callback("preprocessing", 0.2, {"message": "Cleaning and preprocessing text..."})
        documents = self.preprocessor.preprocess_batch(documents)

        # 3. Chunk
        all_chunks: list[Chunk] = []
        for idx, doc in enumerate(documents):
            if progress_callback:
                page_info = f" (page {idx + 1} of {len(documents)})" if len(documents) > 1 else ""
                progress_callback(
                    "chunking",
                    0.2 + (idx / len(documents)) * 0.5,
                    {"message": f"Splitting text and generating context{page_info}..."}
                )
            chunks = self.chunker.chunk(doc)
            all_chunks.extend(chunks)

        if not all_chunks:
            log.warning(f"No chunks produced from {path}")
            stats.elapsed_seconds = time.perf_counter() - start
            if progress_callback:
                progress_callback("failed", 1.0, {"error": "No text chunks generated from file"})
            return stats

        # 4. Embed
        if progress_callback:
            progress_callback("embedding", 0.75, {"message": f"Generating embeddings for {len(all_chunks)} chunk(s)..."})
        texts = [c.content for c in all_chunks]
        embeddings = self.embedder.embed_batch(texts)
        for chunk, emb in zip(all_chunks, embeddings):
            chunk.embedding = emb

        # 5. Store
        if progress_callback:
            progress_callback("storing", 0.85, {"message": f"Saving {len(all_chunks)} chunk(s) in ChromaDB..."})
        self.vector_store.add(all_chunks)

        stats.total_chunks = len(all_chunks)
        stats.elapsed_seconds = time.perf_counter() - start

        log.info(
            f"Ingested {path.name}: {stats.total_documents} doc(s), "
            f"{stats.total_chunks} chunk(s) in {stats.elapsed_seconds:.2f}s"
        )
        return stats


    def ingest_directory(
        self,
        directory: Path,
        extensions: Optional[list[str]] = None,
        recursive: bool = True,
    ) -> IngestionStats:
        """Ingest all supported files in *directory*."""
        start = time.perf_counter()
        stats = IngestionStats()
        directory = Path(directory).resolve()

        log.info(f"Ingesting directory: {directory}")

        # 1. Load all documents
        documents = self.loader.load_directory(
            directory, extensions=extensions, recursive=recursive
        )
        stats.total_documents = len(documents)

        if not documents:
            log.warning(f"No documents found in {directory}")
            stats.elapsed_seconds = time.perf_counter() - start
            return stats

        # Count unique files
        unique_sources = {d.source for d in documents}
        stats.total_files = len(unique_sources)

        # 2. Preprocess
        documents = self.preprocessor.preprocess_batch(documents)

        # 3. Chunk
        all_chunks: list[Chunk] = []
        for doc in documents:
            try:
                chunks = self.chunker.chunk(doc)
                all_chunks.extend(chunks)
            except Exception as exc:
                log.error(f"Chunking failed for {doc.source}: {exc}")
                stats.failed_files.append(doc.source)

        if not all_chunks:
            log.warning("No chunks produced from any document")
            stats.elapsed_seconds = time.perf_counter() - start
            return stats

        # 4. Embed in batches
        log.info(f"Embedding {len(all_chunks)} chunk(s)…")
        texts = [c.content for c in all_chunks]
        embeddings = self.embedder.embed_batch(texts)
        for chunk, emb in zip(all_chunks, embeddings):
            chunk.embedding = emb

        # 5. Store
        log.info(f"Storing {len(all_chunks)} chunk(s) in vector store…")
        self.vector_store.add(all_chunks)

        stats.total_chunks = len(all_chunks)
        stats.elapsed_seconds = time.perf_counter() - start

        log.info(
            f"Directory ingestion complete: {stats.total_files} file(s), "
            f"{stats.total_documents} doc(s), {stats.total_chunks} chunk(s) "
            f"in {stats.elapsed_seconds:.2f}s"
        )
        return stats
