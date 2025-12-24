
import React from 'react';
import { useTemporalContext } from '@/contexts/TemporalContext';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export function TemporalSelector() {
    const { mode, setMode } = useTemporalContext();

    return (
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50 backdrop-blur-sm sticky top-2 z-50 w-fit mx-auto shadow-sm">
            <Button
                variant={mode === 'live' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setMode('live')}
                className={cn("gap-2 h-7 text-xs", mode === 'live' && "bg-background shadow-sm")}
            >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
            </Button>

            <Button
                variant={mode === 'historical' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setMode('historical')}
                className={cn("gap-2 h-7 text-xs", mode === 'historical' && "bg-background shadow-sm")}
            >
                <Calendar className="w-3 h-3" />
                Historical
            </Button>

            <Button
                variant={mode === 'aggregate' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setMode('aggregate')}
                className={cn("gap-2 h-7 text-xs", mode === 'aggregate' && "bg-background shadow-sm")}
            >
                <BarChart2 className="w-3 h-3" />
                Range
            </Button>
        </div>
    );
}
