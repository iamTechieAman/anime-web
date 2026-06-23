"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-[50vh] flex items-center justify-center p-8">
                    <div className="max-w-md w-full text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Something went wrong</h2>
                        <p className="text-[var(--text-muted)] text-sm mb-6">
                            An unexpected error occurred. This might be a temporary issue.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="px-6 py-3 bg-gradient-to-r from-[var(--accent)] to-blue-600 hover:from-[var(--accent)] hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-[var(--accent-warm)]/20"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-6 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] font-bold rounded-xl transition-all hover:border-[var(--accent-warm)]/30"
                            >
                                Go Home
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-xs text-[var(--text-muted)] cursor-pointer">Error details</summary>
                                <pre className="mt-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-red-400 overflow-auto max-h-40">
                                    {this.state.error.message}
                                    {'\n'}
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
