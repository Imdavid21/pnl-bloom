
/**
 * Time-To-Live (TTL) constants in milliseconds.
 * Central source of truth for caching strategies.
 */
export const TTL = {
    /** 
     * Data that never changes (e.g., historical blocks, finalized transactions).
     * Cache effectively forever (24 hours).
     */
    IMMUTABLE: 1000 * 60 * 60 * 24,

    /**
     * Data that changes infrequently (e.g., wallet addresses, token metadata).
     * Cache for a long session (1 hour).
     */
    LONG: 1000 * 60 * 60,

    /**
     * Standard user data (e.g., PnL analysis, trade history).
     * Cache for a short session (5 minutes).
     */
    USER_ANALYTICS: 1000 * 60 * 5,

    /**
     * Volatile market data (e.g., prices, finding rates).
     * Cache for a very short period (30 seconds).
     */
    MARKET: 1000 * 30,

    /**
     * Real-time data (e.g., order book, recent trades).
     * Do not cache or cache for very short time (5 seconds).
     */
    REALTIME: 1000 * 5
} as const;

/**
 * Default configuration for TanStack Query Client
 */
export const QUERY_DEFAULTS = {
    defaultOptions: {
        queries: {
            // Default to 1 minute to prevent excessive refetching on window focus
            staleTime: 1000 * 60,
            // Keep inactive data in memory for 10 minutes
            gcTime: 1000 * 60 * 10,
            // Retry failed requests once
            retry: 1,
            // Do not refetch on window focus by default, it can be jarring
            refetchOnWindowFocus: false,
        },
    },
};
