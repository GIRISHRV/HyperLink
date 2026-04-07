"use client";

import { Component, ReactNode } from "react";
import { logger } from "@repo/utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error({ error, errorInfo }, "Error Boundary caught an error:");
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background-dark text-white flex flex-col items-center justify-center p-4">
          <div className="max-w-2xl text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-bauhaus-red/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-bauhaus-red">error</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
              Component <span className="text-bauhaus-red">Error</span>
            </h1>

            <p className="text-gray-400 font-medium max-w-md">
              Something went wrong in this component. The error has been logged.
            </p>

            {this.state.error && (
              <div className="w-full bg-surface border border-bauhaus-red/30 p-4 rounded font-mono text-xs text-left overflow-auto">
                <p className="text-bauhaus-red font-bold mb-2">Error Details:</p>
                <p className="text-gray-400">{this.state.error.message}</p>
              </div>
            )}

            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="h-12 px-8 bg-primary hover:bg-primary-hover text-black font-bold uppercase tracking-wider transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
