import { Component, type ReactNode } from "react";
interface P { children: ReactNode; }
interface S { hasError: boolean; error?: Error; }
export default class ErrorBoundary extends Component<P, S> {
  state: S = { hasError: false };
  static getDerivedStateFromError(error: Error): S { return { hasError: true, error }; }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#fff" }}>
        <h2>Algo deu errado</h2>
        <p style={{ color: "#94a3b8", marginTop: 8 }}>{this.state.error?.message}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: "10px 24px", background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}>
          Recarregar
        </button>
      </div>
    );
  }
}
