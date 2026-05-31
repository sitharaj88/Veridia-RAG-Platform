# Aletheia RAG — Production-Grade Retrieval-Augmented Generation System

A complete RAG backend built from scratch using fundamental Python libraries. No LangChain, no LlamaIndex — every component is hand-crafted with clean abstractions and swappable implementations.

## Architecture

```
User Query
    │
    ▼
┌─────────────────┐
│  Query Router   │  ← Classifies: SIMPLE / MODERATE / COMPLEX
└────────┬────────┘
         │
    ┌────▼────┐
    │Strategy │  ← Naive / Corrective / Self-RAG / Agentic / Adaptive
    └────┬────┘
         │
  ┌──────▼───────┐
  │   Retrieval   │
  │ Dense + BM25  │  ← Hybrid search with Reciprocal Rank Fusion
  └──────┬───────┘
         │
  ┌──────▼───────┐
  │  Re-ranking   │  ← Cross-encoder (ms-marco-MiniLM)
  └──────┬───────┘
         │
  ┌──────▼───────┐
  │  Generation   │  ← Ollama (llama3.1:8b) with citations
  └──────────────┘
```

## Tech Stack

| Component       | Technology                              |
|----------------|-----------------------------------------|
| LLM            | Ollama + llama3.1:8b (local)           |
| Embeddings     | all-MiniLM-L6-v2 (sentence-transformers)|
| Vector DB      | ChromaDB (embedded, persistent)         |
| Sparse Search  | rank-bm25 (BM25Okapi)                  |
| Re-ranking     | cross-encoder/ms-marco-MiniLM-L-6-v2   |
| Fusion         | Reciprocal Rank Fusion (RRF)            |
| API            | FastAPI + uvicorn                       |
| Config         | Pydantic + YAML                         |
| Logging        | loguru                                  |

## RAG Strategies

1. **Naive RAG** — Retrieve → Re-rank → Generate (baseline)
2. **Corrective RAG (CRAG)** — Evaluates document relevance, rewrites queries for low-quality results
3. **Self-RAG** — Reflects on answer grounding, re-retrieves if poorly supported
4. **Agentic RAG** — LLM-driven tool-use loop (vector search, BM25, rewrite, decompose)
5. **Adaptive RAG** — Routes queries by complexity to the best strategy

## Quick Start

### Prerequisites

- Python 3.11+
- [Ollama](https://ollama.ai/) installed and running
- llama3.1:8b model pulled: `ollama pull llama3.1:8b`

### Installation

```bash
# Clone and enter the project
cd rag1

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -e .

# Copy and edit environment config
copy .env.example .env
```

### Configuration

Edit `config.yaml` to customise settings, or override via environment variables in `.env`:

```yaml
embedding:
  model_name: "all-MiniLM-L6-v2"
  dimension: 384

chunking:
  strategy: "recursive"
  chunk_size: 512
  chunk_overlap: 50

generation:
  ollama_host: "http://localhost:11434"
  model: "llama3.1:8b"
```

### Usage — Python API

```python
from pathlib import Path
from src.pipeline import RAGPipeline

# Initialise (all components load lazily)
pipeline = RAGPipeline()

# Ingest documents
stats = pipeline.ingest(Path("./data/raw"))
print(f"Ingested {stats.total_chunks} chunks from {stats.total_files} files")

# Query with different strategies
result = pipeline.query("What is retrieval-augmented generation?")
print(result.answer)

# Use a specific strategy
result = pipeline.query(
    "Compare BM25 and dense retrieval",
    strategy="agentic"
)

# Stream responses
for token in pipeline.query_stream("Explain CRAG"):
    print(token, end="", flush=True)
```

### Usage — API Request/Response

```python
from src.models import RAGRequest

request = RAGRequest(
    query="How does semantic chunking work?",
    strategy="adaptive",
    top_k=5,
    stream=False,
)

response = pipeline.query_api(request)
print(response.answer)
print(response.sources)
print(response.timing)
```

## Project Structure

```
rag1/
├── config.yaml                  # Default configuration
├── pyproject.toml               # Project metadata & dependencies
├── .env.example                 # Environment variable template
├── README.md
├── data/
│   ├── raw/                     # Place source documents here
│   ├── processed/               # Processed outputs
│   └── chromadb/                # ChromaDB persistence (auto-created)
├── logs/                        # Application logs (auto-created)
└── src/
    ├── __init__.py
    ├── models.py                # Core Pydantic data models
    ├── pipeline.py              # Main orchestrator
    ├── config/
    │   ├── __init__.py
    │   └── settings.py          # Pydantic settings (YAML + env)
    ├── ingestion/
    │   ├── __init__.py
    │   ├── loader.py            # Multi-format document loader
    │   ├── preprocessor.py      # Text cleaning & metadata extraction
    │   ├── chunker.py           # 4 chunking strategies
    │   └── pipeline.py          # Ingestion orchestration
    ├── embedding/
    │   ├── __init__.py
    │   ├── base.py              # Abstract embedder interface
    │   └── sentence_transformer.py
    ├── vectorstore/
    │   ├── __init__.py
    │   ├── base.py              # Abstract vector store interface
    │   └── chroma_store.py      # ChromaDB implementation
    ├── retrieval/
    │   ├── __init__.py
    │   ├── dense_retriever.py   # Vector similarity search
    │   ├── sparse_retriever.py  # BM25 keyword search
    │   ├── hybrid_retriever.py  # RRF fusion
    │   └── reranker.py          # Cross-encoder re-ranking
    ├── generation/
    │   ├── __init__.py
    │   ├── base.py              # Abstract LLM interface
    │   ├── ollama_llm.py        # Ollama implementation
    │   ├── prompts.py           # All prompt templates
    │   └── response.py          # Response formatting & citations
    ├── query/
    │   ├── __init__.py
    │   ├── rewriter.py          # Multi-query rewriting
    │   ├── decomposer.py        # Query decomposition
    │   ├── hyde.py              # Hypothetical Document Embeddings
    │   └── router.py            # Complexity classification
    ├── strategies/
    │   ├── __init__.py
    │   ├── base.py              # Abstract strategy interface
    │   ├── naive_rag.py         # Baseline RAG
    │   ├── corrective_rag.py    # CRAG
    │   ├── self_rag.py          # Self-RAG with reflection
    │   ├── agentic_rag.py       # Agentic tool-use RAG
    │   └── adaptive_rag.py      # Auto-routing strategy
    └── utils/
        ├── __init__.py
        ├── logger.py            # Loguru structured logging
        └── text.py              # Tokenisation & text helpers
```

## Key Design Decisions

- **No frameworks**: Built from scratch for full control and understanding
- **Abstract base classes**: Every component (embedder, vector store, LLM, retriever, strategy) has an ABC so implementations can be swapped
- **Lazy initialization**: Models load only when first accessed
- **Pydantic everywhere**: Type-safe data models with validation
- **Reciprocal Rank Fusion**: Combines dense and sparse retrieval without score normalisation issues
- **Persistent BM25**: Index saved to disk, rebuilt only after ingestion

## License

MIT
