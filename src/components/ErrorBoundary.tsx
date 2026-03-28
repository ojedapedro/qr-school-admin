import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
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
      let errorMessage = "Algo salió mal. Por favor, intenta recargar la página.";
      
      try {
        // Check if it's a Firestore error JSON
        const firestoreError = JSON.parse(this.state.error?.message || '');
        if (firestoreError.error?.includes('Missing or insufficient permissions')) {
          errorMessage = "No tienes permisos suficientes para realizar esta acción. Contacta al administrador.";
        }
      } catch (e) {
        // Not a JSON error, use default
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-12 text-center space-y-8 bg-brand-bg rounded-[2.5rem] border border-white/5">
          <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-500/10">
            <AlertTriangle size={48} />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight text-white">Error del Sistema</h2>
            <p className="text-brand-text-muted max-w-md mx-auto font-bold leading-relaxed">{errorMessage}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="brand-button flex items-center gap-3 px-8"
          >
            <RefreshCw size={20} />
            Recargar Aplicación
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
