"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-2xl w-full space-y-4">
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-4">
              <h2 className="text-lg font-bold text-red-700 dark:text-red-300 mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                {this.state.error.message}
              </p>
              {this.state.error.stack && (
                <pre className="text-xs bg-white dark:bg-black/40 p-2 rounded overflow-auto max-h-64 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand/90"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
