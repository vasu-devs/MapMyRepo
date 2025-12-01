import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (this as any).props.fallback || (
                <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    <h2 className="font-bold mb-2">Something went wrong.</h2>
                    <details className="whitespace-pre-wrap">
                        {this.state.error && this.state.error.toString()}
                    </details>
                </div>
            );
        }

        return (this as any).props.children;
    }
}
