"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional key change will reset the error state via getDerivedStateFromProps */
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export default class ErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  // Reset the error state whenever the parent changes the resetKey
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // If no error is present, nothing to reset
    if (!state.hasError) return null;
    // If resetKey changed, clear the error so children remount cleanly
    return null; // resetKey is handled via componentDidUpdate
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false, error: null, retryCount: 0 });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught:", error?.message || error, errorInfo?.componentStack?.slice(0, 300));

    // Auto-retry once after 2 s for transient hydration/network errors
    if (this.state.retryCount === 0) {
      const isTransient =
        !error?.message ||
        /fetch|network|load|chunk|hydrat|timeout|undefined|null/i.test(error.message);

      if (isTransient) {
        this.retryTimer = setTimeout(() => {
          this.setState((prev) => ({
            hasError: false,
            error: null,
            retryCount: prev.retryCount + 1,
          }));
        }, 2000);
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  handleRetry = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isAutoRetrying = this.state.retryCount === 0 && this.state.hasError;

      return (
        <div className="min-h-[40vh] flex items-center justify-center p-8 bg-bg-main">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-black text-white mb-2">
              {isAutoRetrying ? "Recovering…" : "Something went wrong"}
            </h2>
            <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
              {isAutoRetrying
                ? "Attempting automatic recovery. Please wait…"
                : "An unexpected error occurred in this section. Your other pages are unaffected."}
            </p>

            {isAutoRetrying ? (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="px-6 py-3 bg-gradient-to-r from-accent to-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-accent/20 hover:opacity-90 active:scale-95"
                >
                  Try Again
                </button>
                <button
                  onClick={() => (window.location.href = "/")}
                  className="px-6 py-3 bg-bg-card border border-border-color text-white font-bold rounded-xl transition-all hover:border-white/20 active:scale-95"
                >
                  Go Home
                </button>
              </div>
            )}

            {process.env.NODE_ENV === "development" && this.state.error && !isAutoRetrying && (
              <details className="mt-5 text-left">
                <summary className="text-[10px] text-zinc-600 cursor-pointer uppercase tracking-widest font-bold">
                  Error Details
                </summary>
                <pre className="mt-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-[10px] text-red-400 overflow-auto max-h-36 whitespace-pre-wrap">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
