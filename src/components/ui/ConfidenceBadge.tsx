
import React from 'react';
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { ViewModelMetadata } from '@/types/viewmodel';
import { formatDistanceToNow } from 'date-fns';

interface ConfidenceBadgeProps {
    metadata: ViewModelMetadata;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ metadata }) => {
    const { confidence_score, computed_at, data_completeness, consistency_level } = metadata;

    // Determine variant based on confidence score
    const getBadgeVariant = (score: number) => {
        if (score >= 95) return "default"; // Usually green/primary
        if (score >= 80) return "secondary"; // Usually yellow/warning-ish or muted
        return "destructive"; // Red
    };

    const getBadgeColor = (score: number) => {
        if (score >= 95) return "bg-green-500 hover:bg-green-600";
        if (score >= 80) return "bg-yellow-500 hover:bg-yellow-600";
        return "bg-red-500 hover:bg-red-600";
    };

    const isStale = consistency_level === 'stale';

    return (
        <div className="flex items-center gap-2">
            {isStale && (
                <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded flex items-center gap-1 border border-yellow-200">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Data Stale</span>
                </div>
            )}

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Badge
                            className={`${getBadgeColor(confidence_score)} text-white border-none transition-all duration-300`}
                        >
                            {confidence_score}% Confidence
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="p-3 max-w-xs space-y-2">
                        <div className="flex items-center justify-between gap-4 font-semibold">
                            <span>Data Quality</span>
                            <span className={confidence_score >= 80 ? 'text-green-500' : 'text-red-500'}>
                                {confidence_score}/100
                            </span>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Updated {formatDistanceToNow(new Date(computed_at), { addSuffix: true })}</span>
                            </div>

                            <div className="space-y-1 pt-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${data_completeness.trades ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <span>Trades</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${data_completeness.funding ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <span>Funding</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${data_completeness.positions ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <span>Positions</span>
                                </div>
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
};
