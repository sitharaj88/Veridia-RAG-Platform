"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Brain,
  Layers,
  Settings,
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  UploadCloud,
  Send,
  Paperclip,
  Trash,
  CheckCircle,
  AlertTriangle,
  X,
  BookOpen,
  ChevronRight,
  Menu,
  Activity,
  Sun,
  Moon
} from "lucide-react";

// --- Interfaces ---
interface Message {
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  timestamp: string;
  traces: TraceStep[];
  isStreaming?: boolean;
}

interface Source {
  document_id: string;
  filename: string;
  chunk_text: string;
  relevance_score: number;
  metadata?: any;
}

interface TraceStep {
  step: string;
  message: string;
}

interface DocumentInfo {
  id: string;
  filename: string;
  chunk_count: number;
  ingested_at: string;
  collection: string;
  file_size: number;
}

interface IngestTaskStatus {
  task_id: string;
  filename: string;
  collection: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  step: string;
  message: string;
  chunks_created: number;
  time_taken_ms: number;
  error?: string | null;
  completed_at?: string | null;
}


interface CollectionInfo {
  name: string;
  document_count: number;
  chunk_count: number;
  description?: string;
}

interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_default?: boolean;
}

interface SystemHealth {
  status: string;
  ollama: { status: string; message: string };
  chromadb: { status: string; message: string };
  total_chunks: number;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

export default function ChatPage() {
  // --- States ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>("default");
  const [activeStrategy, setActiveStrategy] = useState<string>("adaptive");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [queryInput, setQueryInput] = useState<string>("");
  
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [strategies, setStrategies] = useState<StrategyInfo[]>([
    { id: "adaptive", name: "Adaptive", description: "Auto-selects the best strategy", icon: "🧠", is_default: true },
    { id: "naive", name: "Naive RAG", description: "Simple retrieve-and-generate", icon: "⚡" },
    { id: "hyde", name: "HyDE RAG", description: "Hypothetical document search", icon: "🔮" },
    { id: "corrective", name: "Corrective RAG", description: "Self-correcting retrieval", icon: "🔄" },
    { id: "self_rag", name: "Self-RAG", description: "Reflection-based generation", icon: "🪞" },
    { id: "agentic", name: "Agentic RAG", description: "Multi-step reasoning agent", icon: "🤖" }
  ]);
  const [health, setHealth] = useState<SystemHealth>({
    status: "unknown",
    ollama: { status: "disconnected", message: "Checking..." },
    chromadb: { status: "disconnected", message: "Checking..." },
    total_chunks: 0
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState<boolean>(false);
  const [newCollectionName, setNewCollectionName] = useState<string>("");
  const [newCollectionDesc, setNewCollectionDesc] = useState<string>("");
  
  // Sources Modal
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState<boolean>(false);
  const [sourcesModalData, setSourcesModalData] = useState<Source[]>([]);
  const [sourcesHighlightIndex, setSourcesHighlightIndex] = useState<number>(-1);

  // Expanded traces map (index -> expanded state)
  const [expandedTraces, setExpandedTraces] = useState<Record<number, boolean>>({});
  
  // Upload status animation
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [activeTasks, setActiveTasks] = useState<IngestTaskStatus[]>([]);


  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Theme ---
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") {
      setTheme(current);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("veridia-theme", next);
    } catch (e) {}
  };

  // --- Side Effects ---
  useEffect(() => {
    fetchStrategies();
    fetchCollections();
    checkHealth();
    
    const interval = setInterval(checkHealth, 30000);
    
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    window.addEventListener("resize", handleResize);
    handleResize(); // run initially
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, expandedTraces]);

  // --- Toast helper ---
  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // --- API Fetches ---
  const fetchStrategies = async () => {
    try {
      const resp = await fetch("/api/strategies");
      if (resp.ok) {
        const data = await resp.json();
        if (data.strategies && data.strategies.length > 0) {
          setStrategies(data.strategies);
        }
      }
    } catch (e) {
      // Keep defaults
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const fetchCollections = async () => {
    try {
      const resp = await fetch("/api/collections");
      if (resp.ok) {
        const data = await resp.json();
        setCollections(data.collections || []);
      }
    } catch (e) {
      setCollections([{ name: "default", document_count: 0, chunk_count: 0 }]);
    }
  };

  const fetchDocuments = async (collectionName?: string) => {
    try {
      const col = collectionName !== undefined ? collectionName : activeCollection;
      const resp = await fetch(`/api/documents?collection=${encodeURIComponent(col)}`);
      if (resp.ok) {
        const data = await resp.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      setDocuments([]);
    }
  };

  const fetchIngestTasks = async (collectionName?: string) => {
    try {
      const col = collectionName !== undefined ? collectionName : activeCollection;
      const resp = await fetch(`/api/ingest/tasks?collection=${encodeURIComponent(col)}`);
      if (resp.ok) {
        const data = await resp.json();
        setActiveTasks(data || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchDocuments(activeCollection);
    fetchIngestTasks(activeCollection);
  }, [activeCollection]);


  const checkHealth = async () => {
    try {
      const resp = await fetch("/api/health");
      if (resp.ok) {
        const data = await resp.json();
        setHealth(data);
      }
    } catch (e) {
      setHealth({
        status: "error",
        ollama: { status: "disconnected", message: "API Offline" },
        chromadb: { status: "disconnected", message: "API Offline" },
        total_chunks: 0
      });
    }
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) {
      showToast("Collection name is required", "warning");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      showToast("Name must contain only letters, numbers, hyphens, and underscores", "warning");
      return;
    }

    try {
      const resp = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: newCollectionDesc.trim() })
      });
      if (resp.ok) {
        showToast(`Collection "${name}" created`, "success");
        setIsCollectionModalOpen(false);
        setNewCollectionName("");
        setNewCollectionDesc("");
        fetchCollections();
        setActiveCollection(name);
      } else {
        const err = await resp.json();
        showToast(err.error || "Failed to create collection", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to create collection", "error");
    }
  };

  const handleDeleteCollection = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (name === "default") {
      showToast("Cannot delete the default collection", "warning");
      return;
    }
    if (!confirm(`Delete collection "${name}"? This deletes all documents and chunks inside it.`)) return;

    try {
      const resp = await fetch(`/api/collections/${encodeURIComponent(name)}`, {
        method: "DELETE"
      });
      if (resp.status === 204) {
        showToast(`Collection "${name}" deleted`, "success");
        fetchCollections();
        if (activeCollection === name) {
          setActiveCollection("default");
        }
      } else {
        const err = await resp.json();
        showToast(err.error || "Failed to delete collection", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to delete collection", "error");
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, id: string, filename: string) => {
    e.stopPropagation();
    if (!confirm(`Remove document "${filename}"?`)) return;

    try {
      const resp = await fetch(`/api/documents/${encodeURIComponent(id)}?collection=${encodeURIComponent(activeCollection)}`, {
        method: "DELETE"
      });
      if (resp.status === 204) {
        showToast(`Document "${filename}" removed`, "success");
        fetchDocuments(activeCollection);
        fetchCollections();
        checkHealth();
      } else {
        const err = await resp.json();
        showToast(err.error || "Failed to delete document", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to delete document", "error");
    }
  };

  const handleClearAllDocuments = async () => {
    if (!confirm(`Clear all documents in collection "${activeCollection}"? This is permanent.`)) return;

    try {
      const resp = await fetch(`/api/documents?collection=${encodeURIComponent(activeCollection)}`, {
        method: "DELETE"
      });
      if (resp.status === 204) {
        showToast("Collection cleared successfully", "success");
        fetchDocuments(activeCollection);
        fetchCollections();
        checkHealth();
      } else {
        const err = await resp.json();
        showToast(err.error || "Failed to clear collection", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to clear collection", "error");
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setIsSidebarOpen(true);
    showToast(`Uploading ${files.length} file(s) for background processing...`, "info");

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    formData.append("collection", activeCollection);

    try {
      const resp = await fetch("/api/ingest", {
        method: "POST",
        body: formData
      });

      if (resp.ok) {
        const data = await resp.json();
        showToast(data.message || "Files uploaded. Processing in background...", "info");
        fetchIngestTasks(activeCollection);
      } else {
        const err = await resp.json();
        showToast(err.error || "File upload failed", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Upload connection error", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const activeRunningTasks = activeTasks.filter(
      (t) => t.status === "pending" || t.status === "processing"
    );
    if (activeRunningTasks.length === 0) return;

    let timer: NodeJS.Timeout;

    const pollTasks = async () => {
      try {
        const resp = await fetch(`/api/ingest/tasks?collection=${encodeURIComponent(activeCollection)}`);
        if (resp.ok) {
          const serverTasks: IngestTaskStatus[] = await resp.json();
          
          const serverTasksMap = new Map(serverTasks.map((t) => [t.task_id, t]));
          
          let completedAny = false;
          let failedAny = false;
          
          const updatedTasks = activeTasks.map((localTask) => {
            const serverTask = serverTasksMap.get(localTask.task_id);
            if (!serverTask) return localTask;
            
            if (localTask.status !== "completed" && serverTask.status === "completed") {
              completedAny = true;
              showToast(`"${serverTask.filename}" processed: created ${serverTask.chunks_created} chunks!`, "success");
            } else if (localTask.status !== "failed" && serverTask.status === "failed") {
              failedAny = true;
              showToast(`Failed to process "${serverTask.filename}": ${serverTask.error}`, "error");
            }
            
            return serverTask;
          });
          
          const localTaskIds = new Set(activeTasks.map(t => t.task_id));
          for (const serverTask of serverTasks) {
            if (!localTaskIds.has(serverTask.task_id) && (serverTask.status === "pending" || serverTask.status === "processing" || serverTask.status === "failed")) {
              updatedTasks.push(serverTask);
            }
          }
          
          setActiveTasks(updatedTasks);
          
          if (completedAny || failedAny) {
            fetchDocuments(activeCollection);
            fetchCollections();
            checkHealth();
          }
        }
      } catch (e) {
        console.error("Error polling tasks:", e);
      }
    };

    timer = setInterval(pollTasks, 1500);

    return () => {
      clearInterval(timer);
    };
  }, [activeTasks, activeCollection]);


  // --- Chat Streaming Pipeline ---
  const handleSendQuery = async () => {
    const text = queryInput.trim();
    if (!text || isStreaming) return;

    setQueryInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Append User Message
    const userMsg: Message = {
      role: "user",
      content: text,
      sources: [],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      traces: []
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    // Initial assistant empty bubble message state
    const assistantIndex = messages.length + 1; // user message will be pushed
    const assistantMsg: Message = {
      role: "assistant",
      content: "",
      sources: [],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      traces: [],
      isStreaming: true
    };
    setMessages((prev) => [...prev, assistantMsg]);

    let fullText = "";
    let sources: Source[] = [];
    let traces: TraceStep[] = [];

    try {
      // Build chat history from prior messages (exclude the just-added user message)
      const chatHistory = messages
        .filter((m) => m.content && m.content.trim() !== "")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          strategy: activeStrategy,
          collection: activeCollection,
          chat_history: chatHistory,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            try {
              const data = JSON.parse(raw);
              if (currentEvent === "token") {
                fullText += data.token || "";
                setMessages((prev) => {
                  const copy = [...prev];
                  const idx = copy.length - 1;
                  if (copy[idx]) {
                    copy[idx].content = fullText;
                  }
                  return copy;
                });
              } else if (currentEvent === "trace") {
                traces.push({ step: data.step, message: data.message });
                setMessages((prev) => {
                  const copy = [...prev];
                  const idx = copy.length - 1;
                  if (copy[idx]) {
                    copy[idx].traces = [...traces];
                  }
                  return copy;
                });
              } else if (currentEvent === "sources") {
                sources = data.sources || [];
                setMessages((prev) => {
                  const copy = [...prev];
                  const idx = copy.length - 1;
                  if (copy[idx]) {
                    copy[idx].sources = sources;
                  }
                  return copy;
                });
              } else if (currentEvent === "error") {
                showToast(data.error || "RAG stream error", "error");
              }
            } catch (err) {
              // Ignore parse error
            }
          }
        }
      }
    } catch (e: any) {
      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.length - 1;
        if (copy[idx]) {
          copy[idx].content = `⚠️ **Could not connect to the server.**\n\nEnsure the Python RAG backend is running locally.\n\n\`\`\`\nError: ${e.message}\n\`\`\``;
        }
        return copy;
      });
    } finally {
      setIsStreaming(false);
      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.length - 1;
        if (copy[idx]) {
          copy[idx].isStreaming = false;
        }
        return copy;
      });
    }
  };

  // --- Scroll helpers ---
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  // --- HTML Rendering helpers ---
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const renderMarkdown = (text: string) => {
    if (!text) return "";
    let html = escapeHtml(text);

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code class="language-${lang || "text"}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Citations [N]
    html = html.replace(/\[(\d+)\]/g, '<span class="citation" data-ref="$1">[$1]</span>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Blockquote
    html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

    // Lines & lists
    html = html.replace(/^---$/gm, "<hr>");
    html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
    html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Paragraph blocks
    html = html
      .split("\n\n")
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        if (
          trimmed.startsWith("<h") ||
          trimmed.startsWith("<pre") ||
          trimmed.startsWith("<ul") ||
          trimmed.startsWith("<ol") ||
          trimmed.startsWith("<blockquote") ||
          trimmed.startsWith("<hr")
        ) {
          return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
      })
      .join("\n");

    return html;
  };

  // --- Click Event Interceptors ---
  const handleMessageListClick = (e: React.MouseEvent<HTMLDivElement>, msg: Message) => {
    const target = e.target as HTMLElement;
    const citationSpan = target.closest(".citation") as HTMLElement;
    if (citationSpan) {
      const refNum = parseInt(citationSpan.getAttribute("data-ref") || "", 10);
      if (!isNaN(refNum) && msg.sources && msg.sources.length >= refNum) {
        setSourcesModalData(msg.sources);
        setSourcesHighlightIndex(refNum - 1);
        setIsSourcesModalOpen(true);
      }
    }
  };

  const getTraceIcon = (step: string) => {
    const s = step.toLowerCase();
    if (s.includes("route") || s.includes("strategy")) return "🎯";
    if (s.includes("retrieve") || s.includes("search")) return "🔍";
    if (s.includes("rerank")) return "📈";
    if (s.includes("generate") || s.includes("llm")) return "🧠";
    if (s.includes("rewrite")) return "✍️";
    if (s.includes("decompose")) return "🧩";
    if (s.includes("hyde")) return "🔮";
    if (s.includes("evaluate") || s.includes("reflection") || s.includes("judge")) return "🪞";
    return "⚙️";
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-deep text-text-primary font-sans relative">
      
      {/* --- Sidebar --- */}
      <aside
        className={`fixed md:relative top-0 left-0 h-full w-[280px] bg-bg-surface border-r border-border-muted z-40 flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:hidden"
        }`}
      >
        <div className="flex flex-col h-full">
          
          {/* Brand — pinned top */}
          <div className="px-4 shrink-0">
            <div className="flex items-center gap-3 py-5 border-b border-border-muted shrink-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-start to-accent-end flex items-center justify-center shadow-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold bg-gradient-to-r from-accent-start to-accent-cyan bg-clip-text text-transparent leading-none">
                  Veridia RAG Platform
                </h1>
                <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                  AI Knowledge Base
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable middle — collections + documents + upload */}
          <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin min-h-0">

            {/* Collections */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5"><FolderOpen className="h-3 w-3" /> Collections</span>
                <button
                  onClick={() => setIsCollectionModalOpen(true)}
                  className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-accent-start transition-colors"
                  title="Create Collection"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <ul className="space-y-1">
                {collections.map((col) => (
                  <li
                    key={col.name}
                    onClick={() => setActiveCollection(col.name)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      activeCollection === col.name
                        ? "bg-bg-elevated text-text-primary border-l-2 border-accent-start"
                        : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          activeCollection === col.name ? "bg-accent-start shadow-glow" : "bg-text-muted"
                        }`}
                      ></span>
                      <span className="truncate">{col.name}</span>
                    </div>
                    {col.name !== "default" && (
                      <button
                        onClick={(e) => handleDeleteCollection(e, col.name)}
                        className="text-text-muted hover:text-error opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-bg-hover p-0.5 rounded cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Active/Failed Background Tasks */}
            {activeTasks.filter(t => t.status === "pending" || t.status === "processing" || t.status === "failed").length > 0 && (
              <div className="mb-4 border border-border-light bg-bg-surface/50 rounded-xl p-3 shadow-inner">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {activeTasks.some(t => t.status === "pending" || t.status === "processing") ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan"></span>
                        </span>
                        Ingestion Queue
                      </>
                    ) : (
                      "Ingestion Status"
                    )}
                  </span>
                  {activeTasks.some(t => t.status === "failed") && (
                    <button
                      onClick={() => setActiveTasks(prev => prev.filter(t => t.status !== "failed"))}
                      className="text-[9px] text-text-muted hover:text-text-primary hover:underline cursor-pointer"
                    >
                      Clear Failures
                    </button>
                  )}
                </div>
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {activeTasks.filter(t => t.status === "pending" || t.status === "processing" || t.status === "failed").map((task) => (
                    <div key={task.task_id} className="text-[11px] flex flex-col gap-1 border-b border-border-muted pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center overflow-hidden gap-2">
                        <span className="text-text-primary truncate font-medium" title={task.filename}>
                          {task.filename}
                        </span>
                        {task.status === "failed" ? (
                          <span className="text-[8px] text-error font-bold bg-error/10 px-1 rounded flex items-center gap-0.5">
                            <AlertTriangle className="h-2 w-2" /> Failed
                          </span>
                        ) : (
                          <span className="text-[9px] text-accent-cyan font-bold bg-bg-deep px-1 rounded">
                            {Math.round(task.progress * 100)}%
                          </span>
                        )}
                      </div>
                      
                      {task.status !== "failed" && (
                        <div className="w-full bg-bg-deep rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-accent-start to-accent-cyan h-1 rounded-full transition-all duration-500"
                            style={{ width: `${task.progress * 100}%` }}
                          ></div>
                        </div>
                      )}
                      
                      <div className={`text-[9px] leading-tight ${task.status === "failed" ? "text-error whitespace-normal break-words" : "text-text-secondary truncate"}`} title={task.status === "failed" ? task.error || "" : task.message}>
                        {task.status === "failed" ? task.error || "Ingestion failed" : task.message || "Queueing..."}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> Documents</span>
                <div className="flex items-center gap-2">
                  {documents.length > 0 && (
                    <button
                      onClick={handleClearAllDocuments}
                      className="text-[10px] text-text-muted hover:text-error hover:bg-bg-elevated px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer transition-colors"
                      title="Clear all documents"
                    >
                      <Trash2 className="h-3 w-3" /> Clear All
                    </button>
                  )}
                  <span className="text-[10px] bg-bg-elevated text-text-secondary px-1.5 py-0.5 rounded-full font-bold">
                    {documents.length}
                  </span>
                </div>
              </div>
              
              <div className="max-h-[200px] overflow-y-auto mb-2 pr-1 border border-dashed border-border-muted rounded-xl p-2 bg-bg-deep/20">
                {documents.length === 0 && !isUploading ? (
                  <div className="text-xs italic text-text-muted p-3 text-center">No documents yet</div>
                ) : (
                  <ul className="space-y-1.5">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="group flex flex-col gap-1 px-2.5 py-2 rounded-lg hover:bg-bg-elevated text-xs transition-all border border-transparent hover:border-border-muted"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate font-medium text-text-primary flex-1 pr-2" title={doc.filename}>
                            {doc.filename}
                          </span>
                          <button
                            onClick={(e) => handleDeleteDocument(e, doc.id, doc.filename)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-hover text-text-muted hover:text-error transition-all shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          <span className="bg-accent-start/15 text-accent-cyan px-1.5 py-0.5 rounded font-mono font-semibold">
                            {doc.chunk_count} chunks
                          </span>
                          <span>•</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                        </div>
                      </li>
                    ))}
                    {isUploading && (
                      <li className="group flex flex-col gap-1 px-2.5 py-2 rounded-lg bg-accent-cyan/5 text-xs border border-dashed border-accent-cyan/35 animate-pulse">
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate font-medium text-text-primary flex-1 pr-2">
                            Ingesting new document...
                          </span>
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin shrink-0"></span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-text-muted">
                          <span className="bg-accent-cyan/15 text-accent-cyan px-1.5 py-0.5 rounded font-mono font-semibold uppercase tracking-wider">
                            Processing Chunks
                          </span>
                          <span>•</span>
                          <span>running SOTA pipeline</span>
                        </div>
                      </li>
                    )}
                  </ul>
                )}
              </div>
              
              {/* Upload Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  handleUploadFiles(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all shrink-0 relative overflow-hidden ${
                  isDragOver ? "border-accent-start bg-accent-start/5" : "border-border-light hover:border-accent-start"
                } ${isUploading ? "pointer-events-none" : ""}`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".pdf,.docx,.md,.txt,.json,.yaml,.yml,.toml"
                  onChange={(e) => handleUploadFiles(e.target.files)}
                  hidden
                />
                <div className="flex flex-col items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors">
                  <UploadCloud className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-tight">
                    Drop files or <span className="text-accent-cyan underline">browse</span>
                  </span>
                </div>
                {isUploading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-start/10 to-transparent animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]"></div>
                )}
              </div>
            </div>

          </div>{/* end scrollable middle */}

          {/* Strategy — pinned bottom */}
          <div className="px-4 py-3 shrink-0 border-t border-border-muted">
            <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              ⚙️ Strategy
            </div>
            <div className="flex flex-col gap-1">
              {strategies.map((str) => (
                <button
                  key={str.id}
                  onClick={() => setActiveStrategy(str.id)}
                  title={str.description}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                    activeStrategy === str.id
                      ? "bg-bg-elevated text-text-primary shadow-inner border-l-3 border-accent-start"
                      : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                  }`}
                >
                  <span className="text-sm shrink-0">{str.icon || "🔍"}</span>
                  <span className="truncate flex-1">{str.name}</span>
                  {str.is_default && (
                    <span className="text-[8px] bg-accent-start/20 text-accent-start px-1.5 py-0.5 rounded uppercase font-bold shrink-0">
                      auto
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* System Status */}
            <div className="border-t border-border-muted pt-3 mt-3">
              <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="h-3 w-3" /> System Status
              </div>
              <div className="grid gap-2 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Ollama</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        health.ollama.status === "connected" ? "bg-success shadow-[0_0_6px_#10b981]" : "bg-text-muted"
                      }`}
                    ></span>
                    <span className="text-text-secondary truncate max-w-[80px]" title={health.ollama.message}>
                      {health.ollama.status === "connected" ? "Online" : health.ollama.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">ChromaDB</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        health.chromadb.status === "connected" ? "bg-success shadow-[0_0_6px_#10b981]" : "bg-text-muted"
                      }`}
                    ></span>
                    <span className="text-text-secondary truncate max-w-[80px]" title={health.chromadb.message}>
                      {health.chromadb.status === "connected" ? "Online" : health.chromadb.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Total Chunks</span>
                  <span className="text-text-secondary font-semibold">{health.total_chunks} chunks</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* Sidebar mobile overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        ></div>
      )}

      {/* --- Main Area --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-bg-deep relative">
        
        {/* Top Header */}
        <header className="h-[56px] border-b border-border-muted bg-bg-surface/80 backdrop-blur-md flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 bg-bg-deep/40 px-2.5 py-1 rounded-full border border-border-muted">
                <span className="text-text-muted">Collection:</span>
                <span className="font-semibold text-text-primary">{activeCollection}</span>
              </div>
              <div className="flex items-center gap-1 bg-bg-deep/40 px-2.5 py-1 rounded-full border border-border-muted">
                <span className="text-text-muted">Strategy:</span>
                <span className="font-semibold text-text-primary capitalize">{activeStrategy}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all cursor-pointer"
              title={mounted ? (theme === "dark" ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
            >
              {(!mounted || theme === "dark") ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
            </button>
          </div>
        </header>

        {/* Viewport Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin"
        >
          {messages.length === 0 ? (
            <div className="max-w-[760px] mx-auto flex flex-col items-center justify-center min-h-[80%] text-center px-4 relative mt-10">
              <div className="absolute top-[10%] left-1/2 -translate-x-1/2 h-[350px] w-[350px] bg-gradient-to-br from-accent-start/5 to-accent-cyan/5 rounded-full blur-[80px] pointer-events-none"></div>
              
              <h2 className="text-3xl font-extrabold mb-3 leading-tight tracking-tight relative">
                <span className="bg-gradient-to-r from-accent-start via-accent-cyan to-accent-start bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradientFlow_6s_ease_infinite]">
                  Veridia RAG Platform
                </span>
              </h2>
              <p className="text-text-secondary text-sm max-w-[450px] mb-8 leading-relaxed">
                Connect your local knowledge base, stream queries with tracing, and inspect cited sources instantly.
              </p>

              {/* Suggestions */}
              <div className="w-full max-w-[600px] text-left">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-3 text-center">
                  Get Started
                </span>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      setQueryInput("Summarize the key findings from my documents");
                      textareaRef.current?.focus();
                    }}
                    className="p-3 bg-bg-surface/50 border border-border-muted hover:border-border-light hover:bg-bg-surface rounded-xl text-left cursor-pointer transition-all text-xs flex flex-col gap-1 hover:-translate-y-0.5 hover:shadow-glow duration-300"
                  >
                    <span className="font-semibold text-text-primary">📋 Key summary</span>
                    <span className="text-text-secondary">Summarize the main details from all files</span>
                  </button>
                  <button
                    onClick={() => {
                      setQueryInput("What are the main themes across my uploaded files?");
                      textareaRef.current?.focus();
                    }}
                    className="p-3 bg-bg-surface/50 border border-border-muted hover:border-border-light hover:bg-bg-surface rounded-xl text-left cursor-pointer transition-all text-xs flex flex-col gap-1 hover:-translate-y-0.5 hover:shadow-glow duration-300"
                  >
                    <span className="font-semibold text-text-primary">🎯 Main Themes</span>
                    <span className="text-text-secondary">Identify cross-document connections</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-[760px] mx-auto space-y-6 pb-12">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {/* Avatar */}
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-bg-elevated border border-border-muted flex items-center justify-center shrink-0">
                      <Brain className="h-4.5 w-4.5 text-accent-start" />
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    
                    {/* Traces (Observability) */}
                    {msg.traces && msg.traces.length > 0 && (
                      <div className="w-full mb-2 bg-bg-surface/40 border border-border-muted rounded-xl overflow-hidden backdrop-blur-sm transition-all duration-300">
                        <button
                          onClick={() => {
                            setExpandedTraces((prev) => ({ ...prev, [index]: !prev[index] }));
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-surface/30 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-accent-cyan">⚙️</span>
                            <span className="font-bold text-text-primary">Observability Trace</span>
                            <span className="text-[10px] text-text-muted italic max-w-[200px] truncate">
                              {msg.isStreaming ? msg.traces[msg.traces.length - 1].message : "Pipeline execution complete"}
                            </span>
                          </div>
                          <ChevronRight
                            className={`h-3.5 w-3.5 text-text-muted transition-transform duration-300 ${
                              expandedTraces[index] ? "rotate-90" : "rotate-0"
                            }`}
                          />
                        </button>
                        {expandedTraces[index] && (
                          <div className="border-t border-border-muted bg-bg-deep/40 px-3 py-2 text-[10px] max-h-[180px] overflow-y-auto">
                            <ul className="space-y-1.5">
                              {msg.traces.map((tr, ti) => (
                                <li key={ti} className="flex items-start gap-2 text-text-secondary leading-snug">
                                  <span className="shrink-0">{getTraceIcon(tr.step)}</span>
                                  <span>
                                    <strong className="text-text-primary capitalize">{tr.step}</strong>: {tr.message}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bubble Content */}
                    <div
                      onClick={(e) => handleMessageListClick(e, msg)}
                      className={`message-bubble-content px-4 py-2.5 rounded-2xl text-sm leading-relaxed border ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-accent-start to-accent-end border-transparent text-white rounded-br-xs"
                          : `bg-bg-surface/80 backdrop-blur-sm border-border-muted text-text-primary rounded-bl-xs ${
                              msg.content === "" && msg.isStreaming ? "hidden" : ""
                            }`
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: msg.role === "user" ? escapeHtml(msg.content) : renderMarkdown(msg.content)
                      }}
                    ></div>

                    {/* Meta information */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted">
                      <span>{msg.timestamp}</span>
                      {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                        <button
                          onClick={() => {
                            setSourcesModalData(msg.sources);
                            setSourcesHighlightIndex(-1);
                            setIsSourcesModalOpen(true);
                          }}
                          className="flex items-center gap-1 hover:text-accent-cyan cursor-pointer ml-1 p-0.5 rounded hover:bg-bg-elevated transition-colors"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span>Sources</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-start to-accent-end text-white flex items-center justify-center font-bold text-xs shrink-0 select-none shadow">
                      U
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming typing dot indicator */}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex gap-3.5 items-center justify-start">
                  <div className="h-8 w-8 rounded-full bg-bg-elevated border border-border-muted flex items-center justify-center shrink-0">
                    <Brain className="h-4.5 w-4.5 text-accent-start" />
                  </div>
                  <div className="px-4 py-3 bg-bg-surface/80 border border-border-muted rounded-2xl rounded-bl-xs flex items-center gap-1 shadow-sm">
                    <span className="h-1.5 w-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 bg-text-muted rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef}></div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 max-w-[760px] w-full mx-auto shrink-0 z-10">
          <div
            className="flex items-end gap-2.5 bg-bg-surface/80 border border-border-light focus-within:border-accent-start rounded-2xl px-4 py-2.5 backdrop-blur-md transition-all shadow-lg hover:border-border-accent focus-within:shadow-glow"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onInput={handleTextareaInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuery();
                }
              }}
              placeholder="Ask anything about your documents..."
              className="flex-1 bg-transparent border-none outline-none resize-none max-h-[160px] text-sm text-text-primary placeholder:text-text-muted scrollbar-none py-1 align-bottom leading-relaxed"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Attach Document"
              >
                <Paperclip className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={handleSendQuery}
                disabled={isStreaming || !queryInput.trim()}
                className="p-1.5 bg-gradient-to-br from-accent-start to-accent-end text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="text-[10px] text-text-muted text-center mt-2.5">
            <span><kbd className="bg-bg-elevated px-1 py-0.5 border border-border-muted rounded text-[9px] mr-1">Enter</kbd> to send · <kbd className="bg-bg-elevated px-1 py-0.5 border border-border-muted rounded text-[9px] mr-1">Shift + Enter</kbd> for newline</span>
          </div>
        </div>

      </main>

      {/* --- Collection Creation Modal --- */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease]">
          <div className="w-[420px] max-w-[90vw] bg-bg-elevated border border-border-light rounded-2xl p-5 shadow-2xl animate-[scaleIn_0.25s_ease] relative">
            <div className="flex items-center justify-between border-b border-border-muted pb-3.5 mb-4">
              <h3 className="text-sm font-bold text-text-primary">Create Collection</h3>
              <button
                onClick={() => setIsCollectionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-1.5">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g. engineering-docs"
                  className="w-full text-xs bg-bg-deep border border-border-muted focus:border-accent-start rounded-lg p-2.5 outline-none text-text-primary transition-colors"
                />
                <span className="text-[9px] text-text-muted block mt-1.5 leading-snug">
                  Only letters, numbers, hyphens, and underscores are allowed.
                </span>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  placeholder="e.g. Design details and technical plans"
                  className="w-full text-xs bg-bg-deep border border-border-muted focus:border-accent-start rounded-lg p-2.5 outline-none text-text-primary transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border-muted pt-4 mt-5">
              <button
                onClick={() => setIsCollectionModalOpen(false)}
                className="px-4 py-2 border border-border-muted rounded-lg text-xs hover:bg-bg-hover cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                className="px-4 py-2 bg-gradient-to-br from-accent-start to-accent-end text-white rounded-lg text-xs font-semibold hover:shadow-glow hover:brightness-110 cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Sources Modal --- */}
      {isSourcesModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSourcesModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease]"
        >
          <div className="w-[620px] max-w-[95vw] bg-bg-elevated/90 border border-border-light rounded-2xl p-5 shadow-2xl animate-[scaleIn_0.25s_ease] backdrop-blur-lg flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border-muted pb-3.5 mb-4 shrink-0">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-accent-cyan" /> Cited Sources ({sourcesModalData.length})
              </h3>
              <button
                onClick={() => setIsSourcesModalOpen(false)}
                className="p-1 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 py-2 scrollbar-thin">
              {sourcesModalData.map((src, idx) => (
                <div
                  key={idx}
                  className={`border rounded-xl p-4 transition-all duration-300 flex flex-col gap-2 ${
                    idx === sourcesHighlightIndex
                      ? "border-accent-cyan bg-accent-cyan/5 shadow-cyan-glow scroll-mt-2"
                      : "border-border-muted bg-bg-deep/30 hover:border-border-light hover:bg-bg-deep/40"
                  }`}
                  ref={(el) => {
                    if (idx === sourcesHighlightIndex && el) {
                      setTimeout(() => {
                        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                      }, 100);
                    }
                  }}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="h-5 w-5 rounded-md bg-gradient-to-br from-accent-start to-accent-end text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate text-text-primary pr-2" title={src.filename}>{src.filename}</span>
                    </div>
                    {src.relevance_score != null && (
                      <span className="text-accent-cyan text-[11px] shrink-0 font-bold">
                        {(src.relevance_score * 100).toFixed(0)}% Match
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary leading-relaxed bg-bg-deep/40 border border-border-muted p-3 rounded-lg overflow-y-auto max-h-[140px] whitespace-pre-wrap word-break">
                    {src.chunk_text}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-end border-t border-border-muted pt-4 mt-4 shrink-0">
              <button
                onClick={() => setIsSourcesModalOpen(false)}
                className="px-4 py-2 bg-bg-hover border border-border-muted rounded-lg text-xs text-text-primary hover:text-white cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Toast Notifications --- */}
      <div className="fixed top-5 right-5 z-55 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-4.5 py-3 rounded-xl shadow-xl pointer-events-auto border animate-[toastIn_0.35s_ease] bg-bg-surface/90 backdrop-blur-md max-w-[400px] min-w-[280px] text-xs text-text-primary ${
              toast.type === "success"
                ? "border-l-4 border-success border-border-muted"
                : toast.type === "error"
                ? "border-l-4 border-error border-border-muted"
                : toast.type === "warning"
                ? "border-l-4 border-warning border-border-muted"
                : "border-l-4 border-accent-start border-border-muted"
            }`}
          >
            <span className="text-base shrink-0">
              {toast.type === "success" && <CheckCircle className="h-4.5 w-4.5 text-success" />}
              {toast.type === "error" && <X className="h-4.5 w-4.5 text-error" />}
              {toast.type === "warning" && <AlertTriangle className="h-4.5 w-4.5 text-warning" />}
              {toast.type === "info" && <Activity className="h-4.5 w-4.5 text-accent-start" />}
            </span>
            <span className="flex-1">{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
