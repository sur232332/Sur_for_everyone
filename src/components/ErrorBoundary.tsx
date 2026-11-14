import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'Unexpected rendering error' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="my-6 p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-center max-w-lg mx-auto"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
            {this.props.fallbackTitle || 'Component temporarily unavailable'}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            {this.props.fallbackDescription || this.state.errorMessage}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
