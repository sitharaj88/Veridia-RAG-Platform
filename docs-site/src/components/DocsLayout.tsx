"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpen, 
  Cpu, 
  Layers, 
  Terminal, 
  ArrowRight, 
  Menu, 
  X, 
  ChevronRight, 
  Sparkles, 
  RefreshCw, 
  FileText, 
  Sun, 
  Moon,
  ExternalLink,
  Code
} from "lucide-react";

interface SidebarItem {
  id: string;
  path: string;
  title: string;
  category: string;
  icon: React.ReactNode;
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const menuItems: SidebarItem[] = [
    { id: "overview", path: "/", title: "Introduction & Stack", category: "Getting Started", icon: <BookOpen className="h-4 w-4" /> },
    { id: "setup", path: "/setup/", title: "Setup & Configuration", category: "Getting Started", icon: <Terminal className="h-4 w-4" /> },
    { id: "architecture", path: "/architecture/", title: "System Architecture", category: "Core Design", icon: <Cpu className="h-4 w-4" /> },
    { id: "api-reference", path: "/api-reference/", title: "REST API Reference", category: "Core Design", icon: <Code className="h-4 w-4" /> },
    { id: "chunking", path: "/chunking/", title: "Ingestion & Chunker", category: "Pipeline Details", icon: <FileText className="h-4 w-4" /> },
    { id: "retrieval", path: "/retrieval/", title: "Hybrid Search & Reranking", category: "Pipeline Details", icon: <Layers className="h-4 w-4" /> },
    { id: "strategies", path: "/strategies/", title: "Reasoning & Reflection", category: "Intelligence", icon: <Sparkles className="h-4 w-4" /> },
    { id: "workflow", path: "/workflow/", title: "Manual CI/CD Workflow", category: "Deployment", icon: <RefreshCw className="h-4 w-4" /> },
  ];

  // Load and apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
    setTheme(initialTheme);
    
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const isRouteActive = (itemPath: string) => {
    // Exact match or active subpath check
    if (itemPath === "/") {
      return pathname === "/" || pathname === "";
    }
    return pathname.startsWith(itemPath);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-deep text-text-primary transition-colors duration-200">
      
      {/* Left Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 h-full bg-bg-surface border-r border-border-muted flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:flex
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-border-muted flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-start to-accent-end shadow-glow">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-text-primary block">Aletheia Docs</span>
              <span className="text-[10px] text-accent-cyan font-mono block">v2.1.0 • Technical</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {["Getting Started", "Core Design", "Pipeline Details", "Intelligence", "Deployment"].map((category) => {
            const categoryItems = menuItems.filter(item => item.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category} className="space-y-1">
                <h4 className="px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {category}
                </h4>
                {categoryItems.map((item) => {
                  const active = isRouteActive(item.path);
                  return (
                    <Link
                      key={item.id}
                      href={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${active 
                          ? "bg-gradient-to-r from-accent-start/20 to-accent-end/10 text-text-primary border-l-2 border-accent-start pl-2.5 shadow-glow" 
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"}
                      `}
                    >
                      <span className={active ? "text-accent-cyan" : "text-text-secondary"}>{item.icon}</span>
                      <span>{item.title}</span>
                      {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-accent-cyan" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer Link to App */}
        <div className="p-4 border-t border-border-muted flex-shrink-0">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full p-2.5 bg-bg-elevated hover:bg-bg-hover rounded-lg border border-border-muted transition-all group"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary">Launch Chat UI</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-accent-cyan transition-colors" />
          </a>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-6 bg-bg-deep/80 border-b border-border-muted backdrop-blur-md md:px-12 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-bg-elevated text-text-secondary border border-border-light font-mono">BFF Option A</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent-start/10 text-accent-cyan border border-border-accent/30 font-mono">Tailwind v4</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border-muted transition-colors"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Content Box */}
        <main className="flex-1 overflow-y-auto px-6 py-10 md:px-12 max-w-4xl w-full mx-auto doc-content">
          {children}
        </main>
      </div>
    </div>
  );
}
