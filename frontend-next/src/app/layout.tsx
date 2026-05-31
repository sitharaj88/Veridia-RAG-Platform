import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aletheia RAG Platform | AI-Powered Knowledge Base",
  description: "Advanced retrieval-augmented generation engine with observability tracing, contextual chunking, and multiple reflection strategies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inline script to prevent flash of wrong theme on load
  const themeScript = `
    (function() {
      try {
        var theme = localStorage.getItem('aletheia-theme');
        if (theme === 'light' || theme === 'dark') {
          document.documentElement.setAttribute('data-theme', theme);
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      } catch(e) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  `;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
