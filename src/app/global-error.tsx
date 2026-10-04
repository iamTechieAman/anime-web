"use client";

import { useEffect, useCallback } from "react";
import { RefreshCcw, RotateCcw, Home } from "lucide-react";

/**
 * global-error.tsx - Next.js App Router root-level error boundary.
 * This replaces the root layout when a truly fatal error occurs.
 * Must include its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ToonPlayer GlobalError]", error?.message || error);
  }, [error]);

  const handleReset = useCallback(() => {
    try {
      reset();
    } catch (_) {
      window.location.href = "/";
    }
  }, [reset]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#0b0c10",
          color: "#ffffff",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            maxWidth: 480,
            width: "100%",
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              marginBottom: "2rem",
              background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ToonPlayer
          </div>

          {/* Error card */}
          <div
            style={{
              background: "#12131a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding: "2rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 900,
                marginBottom: "0.5rem",
                color: "#fff",
              }}
            >
              Something Went Wrong
            </h1>
            <p
              style={{
                fontSize: "0.8rem",
                color: "#71717a",
                lineHeight: 1.6,
                marginBottom: "1.5rem",
              }}
            >
              ToonPlayer ran into an unexpected issue. Your content is still
              available — just retry or go back home.
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={handleReset}
                style={{
                  padding: "10px 20px",
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                style={{
                  padding: "10px 20px",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Go Home
              </button>
            </div>
          </div>

          {/* Digest for debugging */}
          {error?.digest && (
            <p style={{ fontSize: "0.65rem", color: "#3f3f46" }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
