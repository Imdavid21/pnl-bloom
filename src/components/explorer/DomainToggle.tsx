
import React from 'react';
import { ArrowLeftRight, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ResolutionResult } from '@/types/resolver';
import { getDomainLabel } from '@/hooks/useUnifiedResolver';

interface DomainToggleProps {
    result: ResolutionResult;
    currentDomain: 'hypercore' | 'hyperevm';
    onToggle: (domain: 'hypercore' | 'hyperevm') => void;
}

export function DomainToggle({ result, currentDomain, onToggle }: DomainToggleProps) {
    // Only show if we have alternates
    if (!result.alternates || result.alternates.length === 0) {
        return null;
    }

    const alternate = result.alternates[0];
    const targetDomain = alternate.domain;

    if (!targetDomain) return null;

    return (
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">
                    Also found on {getDomainLabel(targetDomain)}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {alternate.context || `This entity also exists on ${getDomainLabel(targetDomain)}`}
                </p>
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() => onToggle(targetDomain)}
                className="gap-2 h-8 text-xs bg-background/50 hover:bg-background"
            >
                <ArrowLeftRight className="w-3 h-3" />
                Switch to {getDomainLabel(targetDomain)}
            </Button>
        </div>
    );
}
