import { BatchReadResult } from '../../core/file-operations.js';
export interface BatchReadOptions {
    includeContent: boolean;
    includeMetadata: boolean;
}
export declare class BatchReader {
    readMultipleNotes(paths: string[], options?: BatchReadOptions): Promise<BatchReadResult[]>;
    getNoteSummaries(paths: string[]): Promise<BatchReadResult[]>;
    getFullNotes(paths: string[]): Promise<BatchReadResult[]>;
    validatePaths(paths: string[]): Promise<{
        valid: string[];
        invalid: string[];
    }>;
    getContentPreview(paths: string[], maxLength?: number): Promise<Array<{
        path: string;
        preview: string;
        error?: string;
    }>>;
}
export declare const batchReader: BatchReader;
//# sourceMappingURL=batch-reader.d.ts.map