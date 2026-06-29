/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MankindFactory] Error capturado por ErrorBoundary:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div role="alert" className="bg-red-950/20 border border-red-700/40 rounded-xl p-6 m-4 space-y-4 text-red-100 font-mono text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-400" aria-hidden="true" />
          <span className="font-bold uppercase tracking-wider">Algo se rompió en este módulo</span>
        </div>
        <pre className="whitespace-pre-wrap text-xs bg-black/50 p-3 rounded text-red-300 overflow-auto max-h-40">
          {error.message}
        </pre>
        <button
          onClick={this.reset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-bold uppercase rounded transition"
        >
          <RotateCw size={12} aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  }
}
