
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TemporalMode = 'live' | 'historical' | 'aggregate';
export type TemporalGranularity = 'tick' | 'minute' | 'hour' | 'day';

export interface TemporalContextType {
    mode: TemporalMode;
    range?: { start: Date; end: Date };
    granularity?: TemporalGranularity;
    selectedDate?: Date;
    setMode: (mode: TemporalMode) => void;
    setRange: (range: { start: Date; end: Date } | undefined) => void;
    setGranularity: (granularity: TemporalGranularity) => void;
    setSelectedDate: (date: Date | undefined) => void;
}

const TemporalContext = createContext<TemporalContextType | undefined>(undefined);

export function TemporalProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<TemporalMode>('live');
    const [range, setRange] = useState<{ start: Date; end: Date } | undefined>();
    const [granularity, setGranularity] = useState<TemporalGranularity>('minute');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();

    return (
        <TemporalContext.Provider
            value={{
                mode,
                setMode,
                range,
                setRange,
                granularity,
                setGranularity,
                selectedDate,
                setSelectedDate
            }}
        >
            {children}
        </TemporalContext.Provider>
    );
}

export function useTemporalContext() {
    const context = useContext(TemporalContext);
    if (context === undefined) {
        throw new Error('useTemporalContext must be used within a TemporalProvider');
    }
    return context;
}
