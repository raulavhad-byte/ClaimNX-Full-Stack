
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || "An unexpected error occurred.";
      let isFirestoreError = false;
      let firestorePath = "";

      try {
        const errorInfo = JSON.parse(errorMessage);
        if (errorInfo.error) {
          isFirestoreError = true;
          errorMessage = errorInfo.error;
          firestorePath = errorInfo.path;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10 text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-4">
              System Interruption
            </h2>
            
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Error Details</p>
              <p className="text-sm font-bold text-slate-600 break-words">
                {isFirestoreError ? `Database Access Error: ${errorMessage}` : errorMessage}
              </p>
              {firestorePath && (
                <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-widest">
                  Path: {firestorePath}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-[#000080] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
              >
                <RefreshCw size={18} />
                Reload Application
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
              >
                <Home size={18} />
                Return to Dashboard
              </button>
            </div>

            <p className="mt-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              ClaimNX Enterprise Security Framework
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
