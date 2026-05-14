import React from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the error card (e.g. "Nutrition module") */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches any unhandled render error in the subtree and shows a friendly
 * recovery UI instead of a blank white screen.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[40vh] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white/5 border border-red-500/20 rounded-3xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-white">
              {this.props.label ? `${this.props.label} crashed` : "Something went wrong"}
            </h2>
            <p className="text-sm text-slate-500 font-mono break-all">
              {this.state.message || "An unexpected error occurred."}
            </p>
          </div>

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }
}
