
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    icon?: LucideIcon;
    image?: string; // URL or path to illustration
    className?: string;
}

export function EmptyState({
    title,
    description,
    action,
    icon: Icon,
    image,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-border/50 bg-card/30 min-h-[300px]",
            className
        )}>
            {image ? (
                <div className="mb-6 max-w-[200px] w-full aspect-square relative opacity-80">
                    <img src={image} alt="Illustration" className="object-contain w-full h-full" />
                </div>
            ) : Icon ? (
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <Icon className="w-8 h-8 text-muted-foreground" />
                </div>
            ) : null}

            <h3 className="text-lg font-semibold text-foreground mb-2">
                {title}
            </h3>

            <p className="text-muted-foreground max-w-sm mb-6 text-sm leading-relaxed">
                {description}
            </p>

            {action && (
                <Button onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}
