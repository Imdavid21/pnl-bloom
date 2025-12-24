export interface ResolutionEntity {
    entity_type: 'wallet' | 'tx' | 'block' | 'token' | 'market';
    domain: 'hypercore' | 'hyperevm';
    canonical_id: string;
    confidence: number;
    metadata?: any;
}

export interface ResolutionResult {
    primary: ResolutionEntity | null;
    alternates?: Array<ResolutionEntity & { context: string }>;
    resolved_at: string;
    query: string;
}
