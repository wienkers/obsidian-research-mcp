import { Readable, Transform } from 'stream';
export interface StreamingOptions {
    chunkSize: number;
    maxConcurrent: number;
    yieldEvery: number;
    timeoutMs: number;
}
export interface ProgressInfo {
    processed: number;
    total: number;
    percentage: number;
    startTime: number;
    estimatedRemaining: number;
}
export type ProgressCallback = (progress: ProgressInfo) => void;
export declare class StreamingProcessor {
    private defaultOptions;
    /**
     * Process array in chunks with progress tracking
     */
    processInChunks<T, R>(items: T[], processor: (item: T, index: number) => Promise<R>, options?: Partial<StreamingOptions>, onProgress?: ProgressCallback): AsyncGenerator<R[], void, unknown>;
    /**
     * Stream large result sets as readable stream
     */
    createResultStream<T>(dataSource: () => AsyncGenerator<T[], void, unknown>, options?: Partial<StreamingOptions>): Readable;
    /**
     * Create transform stream for processing data
     */
    createProcessingStream<T, R>(processor: (data: T) => Promise<R>, options?: Partial<StreamingOptions>): Transform;
    /**
     * Process large file operations with streaming
     */
    streamFileOperations<T>(filePaths: string[], operation: (path: string) => Promise<T>, options?: Partial<StreamingOptions>, onProgress?: ProgressCallback): AsyncGenerator<{
        path: string;
        result: T | null;
        error?: string;
    }[], void, unknown>;
    /**
     * Batch process with memory-aware chunking
     */
    memoryAwareProcessing<T, R>(items: T[], processor: (item: T) => Promise<R>, estimateSize: (item: T | R) => number, maxMemoryMB: number, options?: Partial<StreamingOptions>): AsyncGenerator<R[], void, unknown>;
    /**
     * Create backpressure-aware stream
     */
    processWithBackpressure<T, R>(items: T[], processor: (item: T) => Promise<R>, options?: Partial<StreamingOptions>): Promise<R[]>;
    private processChunk;
    private withTimeout;
    private yield;
}
export declare const streamingProcessor: StreamingProcessor;
//# sourceMappingURL=streaming.d.ts.map