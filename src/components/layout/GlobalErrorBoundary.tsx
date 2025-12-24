
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <ErrorState
                        variant="full"
                        title="Application Crash"
                        description="A critical error occurred. Refreshing the page usually fixes this."
                        action="Reload Application"
                        onAction={() => window.location.reload()}
                    />
                </div>
            );
        }

        return this.props.children;
    }
}
