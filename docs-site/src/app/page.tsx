import React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Terminal, 
  ArrowRight, 
  CheckCircle, 
  Database, 
  Cpu, 
  Code,
  Shield,
  Layers,
  Settings
} from "lucide-react";

export default function Home() {
  const stack = [
    { name: "Next.js 16", desc: "Powers the frontend dashboard and streaming Backend-for-Frontend (BFF) proxy routes.", category: "Frontend & BFF" },
    { name: "Tailwind CSS v4", desc: "Sleek, responsive dark-glassmorphic styling compiled with Turbopack.", category: "Frontend & BFF" },
    { name: "FastAPI", desc: "Asynchronous Python web framework orchestrating the RAG retrieval core.", category: "Backend Microservice" },
    { name: "Ollama", desc: "Local LLM orchestrator running generative models (Qwen 2.5/Llama 3.1) and embeddings locally.", category: "Machine Learning Core" },
    { name: "ChromaDB", desc: "Local vector database persisting document chunk embeddings on disk.", category: "Vector Store" },
    { name: "SentenceTransformers", desc: "Extracts local dense representations and Cross-Encoder neural re-ranking scores.", category: "Machine Learning Core" },
    { name: "Rank-BM25", desc: "Computes traditional lexical keyword scores for hybrid Reciprocal Rank Fusion.", category: "Retrieval" },
    { name: "RapidOCR", desc: "Local ONNX OCR parser fallback to extract text from scanned, image-based PDFs.", category: "Ingestion" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-accent-cyan text-sm font-semibold tracking-wider uppercase">
        <Sparkles className="h-4 w-4" /> Technical Documentation
      </div>
      <h1>Aletheia RAG Platform</h1>
      <p className="text-lg text-text-secondary leading-relaxed">
        Welcome to the technical documentation site for Aletheia RAG — a state-of-the-art, local-first Retrieval-Augmented Generation system, co-designed and engineered by the Antigravity Coding Agent. This documentation covers the architecture, strategies, mathematical formulations, and step-by-step procedures powering the application.
      </p>

      <h2>Technological Stack</h2>
      <p>
        The platform decouples the ingestion pipeline and local ML execution from the chat interface using a hybrid Next.js + Python FastAPI design.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
        {stack.map((tech) => (
          <div key={tech.name} className="metric-card">
            <span className="text-[10px] text-accent-cyan font-mono uppercase font-bold tracking-wider">{tech.category}</span>
            <h3 className="text-white text-base font-semibold mt-1 mb-2">{tech.name}</h3>
            <p className="text-xs text-text-secondary m-0 leading-relaxed">{tech.desc}</p>
          </div>
        ))}
      </div>

      <h2>Core Techniques Implemented</h2>
      <p>
        Aletheia RAG Platform moves beyond standard vector matching to solve real-world context constraints and hallucinations:
      </p>

      <ul className="space-y-4 my-6">
        <li className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Contextual Chunking:</strong> Using a local LLM to inject global document context into individual chunk embeddings, minimizing search ambiguity.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Dense-Sparse Hybrid Search:</strong> Fusing semantic vector similarities with BM25 keyword rankings via Reciprocal Rank Fusion (RRF).
          </div>
        </li>
        <li className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Cross-Encoder Neural Reranking:</strong> Evaluating the top retrieved candidates against the question using a neural scoring transformer.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Self-Reflective RAG (Self-RAG):</strong> LLM-based verification checks to critique generations for correctness and contextual grounding.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Agentic Query Routing:</strong> Adaptive strategies routing simple prompts to Naive pipelines, moderate queries to Corrective RAG (CRAG), and complex tasks to Multi-hop loops.
          </div>
        </li>
      </ul>

      <div className="doc-alert doc-alert-tip">
        <strong>Quick Tip:</strong> Select the menu options in the left sidebar to explore the exact file pathways, configuration overrides, mathematical formulas, and CI/CD manual workflow scripts.
      </div>

      <div className="mt-8 flex justify-end">
        <Link 
          href="/setup/" 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent-start to-accent-end text-white font-medium hover:shadow-glow transition-all"
        >
          <span>Get Started with Setup</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
