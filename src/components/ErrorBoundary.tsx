'use client';

import { Component } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
            Something went wrong
          </p>
          <p style={{ fontSize: '0.85rem', color: '#737373', marginBottom: 16 }}>
            An unexpected error occurred. Please refresh the page and try again.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              padding: '10px 24px', background: '#CC785C', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
