import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Without this, any uncaught error anywhere in the tree (a bad prop, a
// missing field on a Firestore doc, etc.) unmounts the ENTIRE app to a
// blank white screen — the "page just disappears" symptom. This catches
// it, shows something recoverable, and logs the real error to the
// console in dev so it's still debuggable.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught a render error:', error, info);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: 24, textAlign: 'center', background: 'var(--color-canvas, #F7F5F2)',
        }}>
          <AlertTriangle size={40} color="#DC6B4A" />
          <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
          <p style={{ maxWidth: 420, color: '#6B7280', margin: 0 }}>
            This page hit an unexpected error. Your data is safe — this is just a display issue.
          </p>
          <button
            onClick={this.handleReload}
            className="btn-primary"
            style={{ marginTop: 8 }}
          >
            Back to home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
