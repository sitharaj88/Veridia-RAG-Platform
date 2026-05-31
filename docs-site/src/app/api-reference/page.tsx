"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Code, 
  Terminal, 
  Layers, 
  Database, 
  Server, 
  ArrowRight, 
  Check, 
  Copy, 
  Cpu, 
  Globe, 
  Lock, 
  Settings,
  HelpCircle
} from "lucide-react";

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface Endpoint {
  method: "GET" | "POST" | "DELETE";
  path: string;
  title: string;
  description: string;
  params: Parameter[];
  curl: string;
  response: string;
}

export default function ApiReferencePage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"endpoints" | "bff" | "errors">("endpoints");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const endpoints: Endpoint[] = [
    {
      method: "GET",
      path: "/api/health",
      title: "Check System Health",
      description: "Returns connectivity and status metrics for Ollama local inference services, ChromaDB collection layers, document volume, and system uptime.",
      params: [],
      curl: `curl http://localhost:8000/api/health`,
      response: `{
  "status": "ok",
  "ollama": {
    "status": "connected",
    "message": "Ollama is running"
  },
  "chromadb": {
    "status": "connected",
    "message": "1 collection(s)"
  },
  "total_documents": 12,
  "total_chunks": 348,
  "uptime_seconds": 1845.2
}`
    },
    {
      method: "GET",
      path: "/api/strategies",
      title: "List Reasoning Strategies",
      description: "Lists all available search and reasoning generation strategies supported by the platform, including their configured icons and details.",
      params: [],
      curl: `curl http://localhost:8000/api/strategies`,
      response: `{
  "strategies": [
    {
      "id": "adaptive",
      "name": "Adaptive",
      "description": "Automatically selects the best strategy based on query complexity and available context.",
      "icon": "🧠",
      "is_default": true
    },
    {
      "id": "naive",
      "name": "Naive RAG",
      "description": "Simple retrieve-and-generate pipeline. Fast and effective for straightforward questions.",
      "icon": "⚡",
      "is_default": false
    }
  ]
}`
    },
    {
      method: "GET",
      path: "/api/collections",
      title: "List Collections",
      description: "Retrieves all vector search collections currently defined inside ChromaDB, including active document and chunk totals.",
      params: [],
      curl: `curl http://localhost:8000/api/collections`,
      response: `{
  "collections": [
    {
      "name": "default",
      "document_count": 5,
      "chunk_count": 142,
      "created_at": "2026-05-25T10:00:00Z",
      "description": "Default workspace collection"
    }
  ]
}`
    },
    {
      method: "POST",
      path: "/api/collections",
      title: "Create Collection",
      description: "Initializes a new vector collection index. Used to isolate documents into distinct project spaces or domains.",
      params: [
        { name: "name", type: "string", required: true, description: "Unique URL-safe identifier for the new collection." },
        { name: "description", type: "string", required: false, description: "Optional summary of what this collection houses." }
      ],
      curl: `curl -X POST http://localhost:8000/api/collections \\
  -H "Content-Type: application/json" \\
  -d '{"name": "financial-reports", "description": "Q3-Q4 Internal Audit Sheets"}'`,
      response: `{
  "name": "financial-reports",
  "document_count": 0,
  "chunk_count": 0,
  "created_at": "2026-05-25T10:08:24Z",
  "description": "Q3-Q4 Internal Audit Sheets"
}`
    },
    {
      method: "DELETE",
      path: "/api/collections/{name}",
      title: "Delete Collection",
      description: "Deletes a collection and all associated document vector chunk entries from disk. Note: The 'default' collection cannot be deleted.",
      params: [
        { name: "name", type: "string (path)", required: true, description: "Name of the target collection to erase." }
      ],
      curl: `curl -X DELETE http://localhost:8000/api/collections/financial-reports`,
      response: `// Status 204 No Content`
    },
    {
      method: "GET",
      path: "/api/documents",
      title: "List Documents",
      description: "Lists all normalized source files uploaded and chunked. Supports optional collection filtering.",
      params: [
        { name: "collection", type: "string (query)", required: false, description: "Filter documents belonging to a specific collection. Defaults to all collections." }
      ],
      curl: `curl "http://localhost:8000/api/documents?collection=default"`,
      response: `{
  "documents": [
    {
      "id": "e2a89c42-8f92-4f81-9b63-c7829d20c309",
      "filename": "Aletheia_Overview.pdf",
      "chunk_count": 18,
      "ingested_at": "2026-05-25T08:15:32Z",
      "collection": "default",
      "file_size": 1048576
    }
  ],
  "total": 1
}`
    },
    {
      method: "DELETE",
      path: "/api/documents/{doc_id}",
      title: "Delete Document",
      description: "Permanently deletes a document and all corresponding chunks from the vector store, then triggers a background re-indexing of the sparse BM25 retriever index.",
      params: [
        { name: "doc_id", type: "string (path)", required: true, description: "The UUID identifier of the document to remove." },
        { name: "collection", type: "string (query)", required: false, description: "The collection context. Defaults to the active connection." }
      ],
      curl: `curl -X DELETE "http://localhost:8000/api/documents/e2a89c42-8f92-4f81-9b63-c7829d20c309?collection=default"`,
      response: `// Status 204 No Content`
    },
    {
      method: "POST",
      path: "/api/ingest",
      title: "Ingest Documents",
      description: "Accepts raw file uploads (PDF, DOCX, Markdown, Code), runs character extractors, executes the ONNX OCR fallback if necessary, generates contextual overlays, and indexes chunks into ChromaDB.",
      params: [
        { name: "files", type: "File[] (multipart)", required: true, description: "Array of files to upload." },
        { name: "collection", type: "string (form)", required: false, description: "Target collection to save inside. Defaults to 'default'." }
      ],
      curl: `curl -X POST http://localhost:8000/api/ingest \\
  -F "files=@/path/to/handbook.pdf" \\
  -F "collection=default"`,
      response: `{
  "message": "Processed 1 file(s)",
  "files_processed": 1,
  "chunks_created": 34,
  "time_taken_ms": 4250.67,
  "errors": []
}`
    },
    {
      method: "POST",
      path: "/api/query",
      title: "Execute Standard Query",
      description: "Performs synchronous hybrid retrieval and LLM response generation. Best for non-UI integrations or simple automated checks.",
      params: [
        { name: "query", type: "string", required: true, description: "The user query or prompt." },
        { name: "strategy", type: "string", required: true, description: "Reasoning strategy (adaptive, naive, hyde, corrective, self_rag, agentic)." },
        { name: "collection", type: "string", required: false, description: "ChromaDB target collection. Defaults to 'default'." },
        { name: "chat_history", type: "array (objects)", required: false, description: "List of conversation messages: [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}] for context-aware conversations." }
      ],
      curl: `curl -X POST http://localhost:8000/api/query \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What is the token limit of Aletheia?",
    "strategy": "adaptive",
    "collection": "default",
    "chat_history": []
  }'`,
      response: `{
  "answer": "According to the Aletheia specifications, the default token configuration allows a context window of 8,192 tokens.",
  "sources": [
    {
      "document_id": "e2a89c42-8f92-4f81-9b63-c7829d20c309",
      "filename": "Aletheia_Overview.pdf",
      "chunk_text": "The LLM context limits configure context windows to 8192 tokens...",
      "relevance_score": 0.9412
    }
  ],
  "strategy_used": "naive",
  "timing": {
    "total_ms": 1120.45
  }
}`
    },
    {
      method: "POST",
      path: "/api/query/stream",
      title: "Stream Generative Query (SSE)",
      description: "Streams tokens, citations, and system execution traces (agent step reflections) in real-time using Server-Sent Events (SSE). Preferred for production UI chats.",
      params: [
        { name: "query", type: "string", required: true, description: "The user query or prompt." },
        { name: "strategy", type: "string", required: true, description: "Reasoning strategy (adaptive, naive, hyde, corrective, self_rag, agentic)." },
        { name: "collection", type: "string", required: false, description: "ChromaDB target collection. Defaults to 'default'." },
        { name: "chat_history", type: "array (objects)", required: false, description: "List of conversation messages for context-aware conversations." }
      ],
      curl: `curl -X POST http://localhost:8000/api/query/stream \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -d '{
    "query": "Explain semantic chunking",
    "strategy": "corrective"
  }'`,
      response: `event: trace
data: {"step": "grader", "message": "Evaluating retrieved vectors..."}

event: token
data: {"token": "Semantic "}

event: token
data: {"token": "chunking "}

event: sources
data: {"sources": [{"document_id": "doc-123", "filename": "chunk_methods.md", "relevance_score": 0.88}]}

event: done
data: {"timing": {"total_ms": 2341.1}, "strategy_used": "corrective"}`
    }
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-accent-cyan text-sm font-semibold tracking-wider uppercase">
        <Code className="h-4 w-4" /> API Reference
      </div>
      <h1>REST API Specifications</h1>
      <p className="text-text-secondary leading-relaxed">
        The Aletheia platform exposes a unified, highly optimized HTTP REST interface to integrate advanced local RAG capabilities directly into external microservices or frontends.
      </p>

      {/* Tabs */}
      <div className="flex border-b border-border-muted my-6 scrollbar-none overflow-x-auto">
        <button
          onClick={() => setActiveTab("endpoints")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 flex-shrink-0
            ${activeTab === "endpoints" 
              ? "border-accent-start text-text-primary" 
              : "border-transparent text-text-secondary hover:text-text-primary"}`}
        >
          <Terminal className="h-4 w-4" />
          <span>API Endpoints</span>
        </button>
        <button
          onClick={() => setActiveTab("bff")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 flex-shrink-0
            ${activeTab === "bff" 
              ? "border-accent-start text-text-primary" 
              : "border-transparent text-text-secondary hover:text-text-primary"}`}
        >
          <Globe className="h-4 w-4" />
          <span>BFF Architecture</span>
        </button>
        <button
          onClick={() => setActiveTab("errors")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 flex-shrink-0
            ${activeTab === "errors" 
              ? "border-accent-start text-text-primary" 
              : "border-transparent text-text-secondary hover:text-text-primary"}`}
        >
          <Lock className="h-4 w-4" />
          <span>Security & Error Codes</span>
        </button>
      </div>

      {activeTab === "endpoints" && (
        <div className="space-y-12">
          {endpoints.map((ep, idx) => {
            const copyId = `curl-${idx}`;
            const isCopied = copiedId === copyId;
            const badgeColor = 
              ep.method === "GET" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              ep.method === "POST" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
              "bg-rose-500/10 text-rose-400 border-rose-500/20";

            return (
              <div key={idx} className="border-b border-border-muted pb-8 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${badgeColor}`}>
                    {ep.method}
                  </span>
                  <span className="text-sm font-semibold font-mono text-white select-all">
                    {ep.path}
                  </span>
                  <span className="text-text-muted text-xs hidden sm:inline">•</span>
                  <span className="text-xs font-semibold text-text-muted">
                    {ep.title}
                  </span>
                </div>
                <p className="text-text-secondary text-sm mb-4 leading-relaxed">
                  {ep.description}
                </p>

                {/* Parameters */}
                {ep.params.length > 0 && (
                  <div className="mb-4">
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider block mb-2">Request Parameters</span>
                    <div className="overflow-x-auto border border-border-muted rounded-xl bg-bg-surface">
                      <table className="min-w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border-muted bg-bg-elevated/40 text-text-secondary">
                            <th className="p-3 font-semibold">Parameter</th>
                            <th className="p-3 font-semibold">Type</th>
                            <th className="p-3 font-semibold">Required</th>
                            <th className="p-3 font-semibold">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-muted text-text-secondary">
                          {ep.params.map((p, pIdx) => (
                            <tr key={pIdx} className="hover:bg-bg-hover/20">
                              <td className="p-3 font-semibold text-white font-mono">{p.name}</td>
                              <td className="p-3 font-mono text-[11px] text-accent-cyan">{p.type}</td>
                              <td className="p-3">
                                {p.required ? (
                                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">REQUIRED</span>
                                ) : (
                                  <span className="text-[10px] font-medium text-text-muted">optional</span>
                                )}
                              </td>
                              <td className="p-3 leading-relaxed">{p.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* cURL & Response Carousel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={() => copyToClipboard(ep.curl, copyId)}
                        className="p-1.5 rounded-md bg-bg-surface hover:bg-bg-hover border border-border-muted hover:border-border-light text-text-secondary hover:text-white transition-all"
                        title="Copy cURL Command"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Example Request</span>
                    <pre className="bg-bg-surface/80 border border-border-muted rounded-xl p-4 text-[11px] overflow-x-auto text-indigo-200 h-48 select-all font-mono leading-relaxed">
                      {ep.curl}
                    </pre>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Example Response</span>
                    <pre className="bg-[#09090e] border border-border-light rounded-xl p-4 text-[11px] overflow-x-auto text-emerald-300 h-48 font-mono leading-relaxed select-all">
                      {ep.response}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "bff" && (
        <div className="space-y-6">
          <h2>Next.js BFF (Backend-for-Frontend) Proxy</h2>
          <p className="leading-relaxed text-text-secondary">
            In our <strong>Option A (Decoupled Full-Stack)</strong> architecture, the client app running in the user's browser does not communicate directly with the Python FastAPI service on port 8000.
          </p>
          <p className="leading-relaxed text-text-secondary">
            Instead, all requests are routed through Next.js BFF routes (located inside <code>frontend-next/src/app/api/</code>). This proxying strategy provides several critical advantages:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
            <div className="metric-card">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm font-semibold text-white block">CORS Isolation</span>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed m-0">Prevents Cross-Origin Resource Sharing (CORS) leaks, since browser queries are sent to origin `/api/*` and handled on the same domain.</p>
            </div>
            <div className="metric-card">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                <Server className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm font-semibold text-white block">Streaming Buffering</span>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed m-0">The BFF routes correctly proxy chunked Server-Sent Events (SSE) from the python backend, buffering characters smoothly to the user.</p>
            </div>
            <div className="metric-card">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
                <Cpu className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm font-semibold text-white block">Payload Normalization</span>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed m-0">Handles file uploads via boundary parsing, ensuring clean binary piping to Python FastAPI's temporary buffers.</p>
            </div>
          </div>

          <div className="doc-alert doc-alert-tip">
            <strong>Endpoint Override:</strong> If you are deploying the backend on a remote host, configure the <code>BACKEND_URL</code> environment variable inside the Next.js process environment to point to the remote address, e.g., <code>BACKEND_URL=https://api.aletheia.internal</code>.
          </div>
        </div>
      )}

      {activeTab === "errors" && (
        <div className="space-y-6">
          <h2>Error Code Structures</h2>
          <p className="leading-relaxed text-text-secondary">
            The API uses standard HTTP response statuses combined with a JSON structured detail body when operations fail.
          </p>

          <pre className="my-4">
            <code>{`# Error response body format
{
  "detail": "Failed to connect to local vector store. Connection timed out."
}`}</code>
          </pre>

          <h3>Common HTTP Code Mapping</h3>
          <div className="overflow-x-auto border border-border-muted rounded-xl bg-bg-surface my-4">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-muted bg-bg-elevated/40 text-text-secondary">
                  <th className="p-3 font-semibold">Status Code</th>
                  <th className="p-3 font-semibold">Reason</th>
                  <th className="p-3 font-semibold">Typical Causes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-muted text-text-secondary">
                <tr className="hover:bg-bg-hover/20">
                  <td className="p-3 font-semibold text-white font-mono">400 Bad Request</td>
                  <td className="p-3">Malformed parameters or file data.</td>
                  <td className="p-3">Triggered when attempting to delete the <code>default</code> collection, or sending invalid JSON query schemas.</td>
                </tr>
                <tr className="hover:bg-bg-hover/20">
                  <td className="p-3 font-semibold text-white font-mono">404 Not Found</td>
                  <td className="p-3">Requested resource doesn't exist.</td>
                  <td className="p-3">Fired when querying a collection name or deleting a document UUID that has not been indexed in ChromaDB.</td>
                </tr>
                <tr className="hover:bg-bg-hover/20">
                  <td className="p-3 font-semibold text-white font-mono">500 Internal Error</td>
                  <td className="p-3">Backend processing failure.</td>
                  <td className="p-3">Occurs if the Ollama service is stopped, local CPU/GPU memory is exhausted, or ChromaDB's disk index is locked.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="doc-alert doc-alert-important">
            <strong>Check Logs:</strong> In the event of a 500 error, inspect the Uvicorn command logs or search your console output. Uvicorn outputs stacktraces in real-time, detailing the precise line in <code>src/pipeline.py</code> that failed.
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Link 
          href="/workflow/" 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-muted text-text-secondary hover:text-text-primary transition-colors"
        >
          Back to CI/CD
        </Link>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent-start to-accent-end text-white font-medium hover:shadow-glow transition-all"
        >
          <span>Return Home</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
