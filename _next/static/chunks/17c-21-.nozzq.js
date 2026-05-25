(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,41220,68877,e=>{"use strict";var t=e.i(56420);let s=(0,t.default)("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);e.s(["Server",0,s],41220);let r=(0,t.default)("arrow-right",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);e.s(["ArrowRight",0,r],68877)},29337,e=>{"use strict";var t=e.i(43476),s=e.i(71645),r=e.i(22016),a=e.i(58072),n=e.i(4139),o=e.i(41220),i=e.i(68877),c=e.i(56420);let l=(0,c.default)("check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]),d=(0,c.default)("copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);var m=e.i(97142);let h=(0,c.default)("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]),p=(0,c.default)("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);e.s(["default",0,function(){let[e,c]=(0,s.useState)(null),[x,u]=(0,s.useState)("endpoints"),g=[{method:"GET",path:"/api/health",title:"Check System Health",description:"Returns connectivity and status metrics for Ollama local inference services, ChromaDB collection layers, document volume, and system uptime.",params:[],curl:"curl http://localhost:8000/api/health",response:`{
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
}`},{method:"GET",path:"/api/strategies",title:"List Reasoning Strategies",description:"Lists all available search and reasoning generation strategies supported by the platform, including their configured icons and details.",params:[],curl:"curl http://localhost:8000/api/strategies",response:`{
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
}`},{method:"GET",path:"/api/collections",title:"List Collections",description:"Retrieves all vector search collections currently defined inside ChromaDB, including active document and chunk totals.",params:[],curl:"curl http://localhost:8000/api/collections",response:`{
  "collections": [
    {
      "name": "default",
      "document_count": 5,
      "chunk_count": 142,
      "created_at": "2026-05-25T10:00:00Z",
      "description": "Default workspace collection"
    }
  ]
}`},{method:"POST",path:"/api/collections",title:"Create Collection",description:"Initializes a new vector collection index. Used to isolate documents into distinct project spaces or domains.",params:[{name:"name",type:"string",required:!0,description:"Unique URL-safe identifier for the new collection."},{name:"description",type:"string",required:!1,description:"Optional summary of what this collection houses."}],curl:`curl -X POST http://localhost:8000/api/collections \\
  -H "Content-Type: application/json" \\
  -d '{"name": "financial-reports", "description": "Q3-Q4 Internal Audit Sheets"}'`,response:`{
  "name": "financial-reports",
  "document_count": 0,
  "chunk_count": 0,
  "created_at": "2026-05-25T10:08:24Z",
  "description": "Q3-Q4 Internal Audit Sheets"
}`},{method:"DELETE",path:"/api/collections/{name}",title:"Delete Collection",description:"Deletes a collection and all associated document vector chunk entries from disk. Note: The 'default' collection cannot be deleted.",params:[{name:"name",type:"string (path)",required:!0,description:"Name of the target collection to erase."}],curl:"curl -X DELETE http://localhost:8000/api/collections/financial-reports",response:"// Status 204 No Content"},{method:"GET",path:"/api/documents",title:"List Documents",description:"Lists all normalized source files uploaded and chunked. Supports optional collection filtering.",params:[{name:"collection",type:"string (query)",required:!1,description:"Filter documents belonging to a specific collection. Defaults to all collections."}],curl:'curl "http://localhost:8000/api/documents?collection=default"',response:`{
  "documents": [
    {
      "id": "e2a89c42-8f92-4f81-9b63-c7829d20c309",
      "filename": "Aetheris_Overview.pdf",
      "chunk_count": 18,
      "ingested_at": "2026-05-25T08:15:32Z",
      "collection": "default",
      "file_size": 1048576
    }
  ],
  "total": 1
}`},{method:"DELETE",path:"/api/documents/{doc_id}",title:"Delete Document",description:"Permanently deletes a document and all corresponding chunks from the vector store, then triggers a background re-indexing of the sparse BM25 retriever index.",params:[{name:"doc_id",type:"string (path)",required:!0,description:"The UUID identifier of the document to remove."},{name:"collection",type:"string (query)",required:!1,description:"The collection context. Defaults to the active connection."}],curl:'curl -X DELETE "http://localhost:8000/api/documents/e2a89c42-8f92-4f81-9b63-c7829d20c309?collection=default"',response:"// Status 204 No Content"},{method:"POST",path:"/api/ingest",title:"Ingest Documents",description:"Accepts raw file uploads (PDF, DOCX, Markdown, Code), runs character extractors, executes the ONNX OCR fallback if necessary, generates contextual overlays, and indexes chunks into ChromaDB.",params:[{name:"files",type:"File[] (multipart)",required:!0,description:"Array of files to upload."},{name:"collection",type:"string (form)",required:!1,description:"Target collection to save inside. Defaults to 'default'."}],curl:`curl -X POST http://localhost:8000/api/ingest \\
  -F "files=@/path/to/handbook.pdf" \\
  -F "collection=default"`,response:`{
  "message": "Processed 1 file(s)",
  "files_processed": 1,
  "chunks_created": 34,
  "time_taken_ms": 4250.67,
  "errors": []
}`},{method:"POST",path:"/api/query",title:"Execute Standard Query",description:"Performs synchronous hybrid retrieval and LLM response generation. Best for non-UI integrations or simple automated checks.",params:[{name:"query",type:"string",required:!0,description:"The user query or prompt."},{name:"strategy",type:"string",required:!0,description:"Reasoning strategy (adaptive, naive, hyde, corrective, self_rag, agentic)."},{name:"collection",type:"string",required:!1,description:"ChromaDB target collection. Defaults to 'default'."},{name:"chat_history",type:"array (objects)",required:!1,description:"List of conversation messages: [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}] for context-aware conversations."}],curl:`curl -X POST http://localhost:8000/api/query \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What is the token limit of Aetheris?",
    "strategy": "adaptive",
    "collection": "default",
    "chat_history": []
  }'`,response:`{
  "answer": "According to the Aetheris specifications, the default token configuration allows a context window of 8,192 tokens.",
  "sources": [
    {
      "document_id": "e2a89c42-8f92-4f81-9b63-c7829d20c309",
      "filename": "Aetheris_Overview.pdf",
      "chunk_text": "The LLM context limits configure context windows to 8192 tokens...",
      "relevance_score": 0.9412
    }
  ],
  "strategy_used": "naive",
  "timing": {
    "total_ms": 1120.45
  }
}`},{method:"POST",path:"/api/query/stream",title:"Stream Generative Query (SSE)",description:"Streams tokens, citations, and system execution traces (agent step reflections) in real-time using Server-Sent Events (SSE). Preferred for production UI chats.",params:[{name:"query",type:"string",required:!0,description:"The user query or prompt."},{name:"strategy",type:"string",required:!0,description:"Reasoning strategy (adaptive, naive, hyde, corrective, self_rag, agentic)."},{name:"collection",type:"string",required:!1,description:"ChromaDB target collection. Defaults to 'default'."},{name:"chat_history",type:"array (objects)",required:!1,description:"List of conversation messages for context-aware conversations."}],curl:`curl -X POST http://localhost:8000/api/query/stream \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -d '{
    "query": "Explain semantic chunking",
    "strategy": "corrective"
  }'`,response:`event: trace
data: {"step": "grader", "message": "Evaluating retrieved vectors..."}

event: token
data: {"token": "Semantic "}

event: token
data: {"token": "chunking "}

event: sources
data: {"sources": [{"document_id": "doc-123", "filename": "chunk_methods.md", "relevance_score": 0.88}]}

event: done
data: {"timing": {"total_ms": 2341.1}, "strategy_used": "corrective"}`}];return(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{className:"flex items-center gap-2 mb-2 text-accent-cyan text-sm font-semibold tracking-wider uppercase",children:[(0,t.jsx)(a.Code,{className:"h-4 w-4"})," API Reference"]}),(0,t.jsx)("h1",{children:"REST API Specifications"}),(0,t.jsx)("p",{className:"text-text-secondary leading-relaxed",children:"The Aetheris platform exposes a unified, highly optimized HTTP REST interface to integrate advanced local RAG capabilities directly into external microservices or frontends."}),(0,t.jsxs)("div",{className:"flex border-b border-border-muted my-6 scrollbar-none overflow-x-auto",children:[(0,t.jsxs)("button",{onClick:()=>u("endpoints"),className:`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 flex-shrink-0
            ${"endpoints"===x?"border-accent-start text-text-primary":"border-transparent text-text-secondary hover:text-text-primary"}`,children:[(0,t.jsx)(n.Terminal,{className:"h-4 w-4"}),(0,t.jsx)("span",{children:"API Endpoints"})]}),(0,t.jsxs)("button",{onClick:()=>u("bff"),className:`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 flex-shrink-0
            ${"bff"===x?"border-accent-start text-text-primary":"border-transparent text-text-secondary hover:text-text-primary"}`,children:[(0,t.jsx)(h,{className:"h-4 w-4"}),(0,t.jsx)("span",{children:"BFF Architecture"})]}),(0,t.jsxs)("button",{onClick:()=>u("errors"),className:`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 flex-shrink-0
            ${"errors"===x?"border-accent-start text-text-primary":"border-transparent text-text-secondary hover:text-text-primary"}`,children:[(0,t.jsx)(p,{className:"h-4 w-4"}),(0,t.jsx)("span",{children:"Security & Error Codes"})]})]}),"endpoints"===x&&(0,t.jsx)("div",{className:"space-y-12",children:g.map((s,r)=>{let a=`curl-${r}`,n=e===a,o="GET"===s.method?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":"POST"===s.method?"bg-indigo-500/10 text-indigo-400 border-indigo-500/20":"bg-rose-500/10 text-rose-400 border-rose-500/20";return(0,t.jsxs)("div",{className:"border-b border-border-muted pb-8 last:border-0 last:pb-0",children:[(0,t.jsxs)("div",{className:"flex flex-wrap items-center gap-3 mb-2",children:[(0,t.jsx)("span",{className:`text-xs font-bold font-mono px-2 py-0.5 rounded border ${o}`,children:s.method}),(0,t.jsx)("span",{className:"text-sm font-semibold font-mono text-white select-all",children:s.path}),(0,t.jsx)("span",{className:"text-text-muted text-xs hidden sm:inline",children:"•"}),(0,t.jsx)("span",{className:"text-xs font-semibold text-text-muted",children:s.title})]}),(0,t.jsx)("p",{className:"text-text-secondary text-sm mb-4 leading-relaxed",children:s.description}),s.params.length>0&&(0,t.jsxs)("div",{className:"mb-4",children:[(0,t.jsx)("span",{className:"text-xs font-bold text-text-primary uppercase tracking-wider block mb-2",children:"Request Parameters"}),(0,t.jsx)("div",{className:"overflow-x-auto border border-border-muted rounded-xl bg-bg-surface",children:(0,t.jsxs)("table",{className:"min-w-full text-left text-xs border-collapse",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"border-b border-border-muted bg-bg-elevated/40 text-text-secondary",children:[(0,t.jsx)("th",{className:"p-3 font-semibold",children:"Parameter"}),(0,t.jsx)("th",{className:"p-3 font-semibold",children:"Type"}),(0,t.jsx)("th",{className:"p-3 font-semibold",children:"Required"}),(0,t.jsx)("th",{className:"p-3 font-semibold",children:"Description"})]})}),(0,t.jsx)("tbody",{className:"divide-y divide-border-muted text-text-secondary",children:s.params.map((e,s)=>(0,t.jsxs)("tr",{className:"hover:bg-bg-hover/20",children:[(0,t.jsx)("td",{className:"p-3 font-semibold text-white font-mono",children:e.name}),(0,t.jsx)("td",{className:"p-3 font-mono text-[11px] text-accent-cyan",children:e.type}),(0,t.jsx)("td",{className:"p-3",children:e.required?(0,t.jsx)("span",{className:"text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20",children:"REQUIRED"}):(0,t.jsx)("span",{className:"text-[10px] font-medium text-text-muted",children:"optional"})}),(0,t.jsx)("td",{className:"p-3 leading-relaxed",children:e.description})]},s))})]})})]}),(0,t.jsxs)("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4",children:[(0,t.jsxs)("div",{className:"relative group",children:[(0,t.jsx)("div",{className:"absolute top-2 right-2 z-10",children:(0,t.jsx)("button",{onClick:()=>{var e;return e=s.curl,void(navigator.clipboard.writeText(e),c(a),setTimeout(()=>c(null),2e3))},className:"p-1.5 rounded-md bg-bg-surface hover:bg-bg-hover border border-border-muted hover:border-border-light text-text-secondary hover:text-white transition-all",title:"Copy cURL Command",children:n?(0,t.jsx)(l,{className:"h-3.5 w-3.5 text-emerald-400"}):(0,t.jsx)(d,{className:"h-3.5 w-3.5"})})}),(0,t.jsx)("span",{className:"text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1",children:"Example Request"}),(0,t.jsx)("pre",{className:"bg-bg-surface/80 border border-border-muted rounded-xl p-4 text-[11px] overflow-x-auto text-indigo-200 h-48 select-all font-mono leading-relaxed",children:s.curl})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{className:"text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1",children:"Example Response"}),(0,t.jsx)("pre",{className:"bg-[#09090e] border border-border-light rounded-xl p-4 text-[11px] overflow-x-auto text-emerald-300 h-48 font-mono leading-relaxed select-all",children:s.response})]})]})]},r)})}),"bff"===x&&(0,t.jsxs)("div",{className:"space-y-6",children:[(0,t.jsx)("h2",{children:"Next.js BFF (Backend-for-Frontend) Proxy"}),(0,t.jsxs)("p",{className:"leading-relaxed text-text-secondary",children:["In our ",(0,t.jsx)("strong",{children:"Option A (Decoupled Full-Stack)"})," architecture, the client app running in the user's browser does not communicate directly with the Python FastAPI service on port 8000."]}),(0,t.jsxs)("p",{className:"leading-relaxed text-text-secondary",children:["Instead, all requests are routed through Next.js BFF routes (located inside ",(0,t.jsx)("code",{children:"frontend-next/src/app/api/"}),"). This proxying strategy provides several critical advantages:"]}),(0,t.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 my-6",children:[(0,t.jsxs)("div",{className:"metric-card",children:[(0,t.jsx)("div",{className:"h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3",children:(0,t.jsx)(h,{className:"h-4.5 w-4.5"})}),(0,t.jsx)("span",{className:"text-sm font-semibold text-white block",children:"CORS Isolation"}),(0,t.jsx)("p",{className:"text-xs text-text-secondary mt-1 leading-relaxed m-0",children:"Prevents Cross-Origin Resource Sharing (CORS) leaks, since browser queries are sent to origin `/api/*` and handled on the same domain."})]}),(0,t.jsxs)("div",{className:"metric-card",children:[(0,t.jsx)("div",{className:"h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3",children:(0,t.jsx)(o.Server,{className:"h-4.5 w-4.5"})}),(0,t.jsx)("span",{className:"text-sm font-semibold text-white block",children:"Streaming Buffering"}),(0,t.jsx)("p",{className:"text-xs text-text-secondary mt-1 leading-relaxed m-0",children:"The BFF routes correctly proxy chunked Server-Sent Events (SSE) from the python backend, buffering characters smoothly to the user."})]}),(0,t.jsxs)("div",{className:"metric-card",children:[(0,t.jsx)("div",{className:"h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3",children:(0,t.jsx)(m.Cpu,{className:"h-4.5 w-4.5"})}),(0,t.jsx)("span",{className:"text-sm font-semibold text-white block",children:"Payload Normalization"}),(0,t.jsx)("p",{className:"text-xs text-text-secondary mt-1 leading-relaxed m-0",children:"Handles file uploads via boundary parsing, ensuring clean binary piping to Python FastAPI's temporary buffers."})]})]}),(0,t.jsxs)("div",{className:"doc-alert doc-alert-tip",children:[(0,t.jsx)("strong",{children:"Endpoint Override:"})," If you are deploying the backend on a remote host, configure the ",(0,t.jsx)("code",{children:"BACKEND_URL"})," environment variable inside the Next.js process environment to point to the remote address, e.g., ",(0,t.jsx)("code",{children:"BACKEND_URL=https://api.aetheris.internal"}),"."]})]}),"errors"===x&&(0,t.jsxs)("div",{className:"space-y-6",children:[(0,t.jsx)("h2",{children:"Error Code Structures"}),(0,t.jsx)("p",{className:"leading-relaxed text-text-secondary",children:"The API uses standard HTTP response statuses combined with a JSON structured detail body when operations fail."}),(0,t.jsx)("pre",{className:"my-4",children:(0,t.jsx)("code",{children:`# Error response body format
{
  "detail": "Failed to connect to local vector store. Connection timed out."
}`})}),(0,t.jsx)("h3",{children:"Common HTTP Code Mapping"}),(0,t.jsx)("div",{className:"overflow-x-auto border border-border-muted rounded-xl bg-bg-surface my-4",children:(0,t.jsxs)("table",{className:"min-w-full text-left text-xs border-collapse",children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{className:"border-b border-border-muted bg-bg-elevated/40 text-text-secondary",children:[(0,t.jsx)("th",{className:"p-3 font-semibold",children:"Status Code"}),(0,t.jsx)("th",{className:"p-3 font-semibold",children:"Reason"}),(0,t.jsx)("th",{className:"p-3 font-semibold",children:"Typical Causes"})]})}),(0,t.jsxs)("tbody",{className:"divide-y divide-border-muted text-text-secondary",children:[(0,t.jsxs)("tr",{className:"hover:bg-bg-hover/20",children:[(0,t.jsx)("td",{className:"p-3 font-semibold text-white font-mono",children:"400 Bad Request"}),(0,t.jsx)("td",{className:"p-3",children:"Malformed parameters or file data."}),(0,t.jsxs)("td",{className:"p-3",children:["Triggered when attempting to delete the ",(0,t.jsx)("code",{children:"default"})," collection, or sending invalid JSON query schemas."]})]}),(0,t.jsxs)("tr",{className:"hover:bg-bg-hover/20",children:[(0,t.jsx)("td",{className:"p-3 font-semibold text-white font-mono",children:"404 Not Found"}),(0,t.jsx)("td",{className:"p-3",children:"Requested resource doesn't exist."}),(0,t.jsx)("td",{className:"p-3",children:"Fired when querying a collection name or deleting a document UUID that has not been indexed in ChromaDB."})]}),(0,t.jsxs)("tr",{className:"hover:bg-bg-hover/20",children:[(0,t.jsx)("td",{className:"p-3 font-semibold text-white font-mono",children:"500 Internal Error"}),(0,t.jsx)("td",{className:"p-3",children:"Backend processing failure."}),(0,t.jsx)("td",{className:"p-3",children:"Occurs if the Ollama service is stopped, local CPU/GPU memory is exhausted, or ChromaDB's disk index is locked."})]})]})]})}),(0,t.jsxs)("div",{className:"doc-alert doc-alert-important",children:[(0,t.jsx)("strong",{children:"Check Logs:"})," In the event of a 500 error, inspect the Uvicorn command logs or search your console output. Uvicorn outputs stacktraces in real-time, detailing the precise line in ",(0,t.jsx)("code",{children:"src/pipeline.py"})," that failed."]})]}),(0,t.jsxs)("div",{className:"mt-8 flex justify-between",children:[(0,t.jsx)(r.default,{href:"/workflow/",className:"inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-muted text-text-secondary hover:text-text-primary transition-colors",children:"Back to CI/CD"}),(0,t.jsxs)(r.default,{href:"/",className:"inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent-start to-accent-end text-white font-medium hover:shadow-glow transition-all",children:[(0,t.jsx)("span",{children:"Return Home"}),(0,t.jsx)(i.ArrowRight,{className:"h-4 w-4"})]})]})]})}],29337)}]);