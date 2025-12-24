export interface ViewModelMetadata {
    computed_at: string; // ISO timestamp
    source_watermark: {
        hypercore_seq?: number;
        hyperevm_block?: number;
    };
    consistency_level: 'eventual' | 'synchronized' | 'stale';
    confidence_score: number; // 0-100
    data_completeness: {
        trades: boolean;
        funding: boolean;
        positions: boolean;
    };
}

export interface ViewModel<T> {
    data: T;
    metadata: ViewModelMetadata;
}
