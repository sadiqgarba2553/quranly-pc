import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--bg-color, #fff)',
          color: 'var(--text-primary, #111)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{
            maxWidth: 420,
            width: '100%',
            padding: 24,
            border: '1px solid var(--glass-border, #e4e4e7)',
            borderRadius: 16,
            background: 'var(--glass-bg, #f4f4f5)',
          }}>
            <h3 style={{ marginBottom: 8 }}>Something went wrong</h3>
            <p style={{ opacity: 0.75, fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
              Quranly hit an unexpected error. You can try again, or reload the app.
            </p>
            {this.state.error && (
              <pre style={{
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                opacity: 0.65,
                marginBottom: 16,
                maxHeight: 120,
                overflow: 'auto',
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '10px 16px',
                  background: 'var(--accent-color, #000)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: 'inherit',
                  border: '1px solid var(--glass-border, #e4e4e7)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
