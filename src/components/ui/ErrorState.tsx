
import React from 'react';
import { AlertTriangle, WifiOff, RefreshCcw, SearchX, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorVariant = 'inline' | 'full' | 'card';

interface ErrorStateProps {
    title?: string;
    description?: string;
    action?: string;
    onAction?: () => void;
    variant?: ErrorVariant;
    icon?: React.ReactNode;
    className?: string;
    code?: string | number;
}

export function ErrorState({
    title = "Something went wrong",
    description = "We encountered an error while processing your request.",
    action,
    onAction,
    variant = 'card',
    icon,
    className,
    code
}: ErrorStateProps) {

    // Default icons based on common error codes or general usage
    const getIcon = () => {
        if (icon) return icon;
        if (code === 404) return <SearchX className="w-10 h-10 text-muted-foreground" />;
        if (code === 'NETWORK') return <WifiOff className="w-10 h-10 text-muted-foreground" />;
        return <AlertTriangle className="w-10 h-10 text-muted-foreground" />; // Default generic
    };

    const IconComponent = getIcon();

    if (variant === 'inline') {
        return (
            <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20", className)}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 text-sm font-medium">{title}: {description}</div>
                {action && onAction && (
                    <Button variant="outline" size="sm" onClick={onAction} className="h-8 border-destructive/30 hover:bg-destructive/20 text-destructive-foreground">
                        {action}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center p-8 rounded-xl border border-border bg-card/50",
            variant === 'full' && "min-h-[60vh] border-none bg-transparent",
            className
        )}>
            <div className="bg-muted p-4 rounded-full mb-4">
                {IconComponent}
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-2">
                {title}
            </h3>

            <p className="text-muted-foreground max-w-sm mb-6">
                {description}
            </p>

            {action && onAction && (
                <Button onClick={onAction} className="gap-2">
                    {action === 'Retry' && <RefreshCcw className="w-4 h-4" />}
                    {action}
                </Button>
            )}
        </div>
    );
}
