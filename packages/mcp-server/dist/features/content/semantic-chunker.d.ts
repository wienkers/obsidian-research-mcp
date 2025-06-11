export interface ContentBoundary {
    line: number;
    column: number;
    type: 'paragraph' | 'section' | 'list' | 'codeblock' | 'quote' | 'table';
}
export interface HeadingPath {
    level: number;
    text: string;
    line: number;
}
export interface SemanticChunk {
    id: string;
    content: string;
    boundaries: {
        start: ContentBoundary;
        end: ContentBoundary;
        semantic: 'paragraph' | 'section' | 'list' | 'codeblock' | 'quote' | 'table';
    };
    context: {
        preceding: string;
        following: string;
        hierarchy: HeadingPath[];
        metadata: Record<string, any>;
    };
    embeddings?: number[];
    tokens: number;
}
export interface ChunkOptions {
    minLength: number;
    maxLength: number;
    overlapLength: number;
    preserveBoundaries: boolean;
    includeContext: boolean;
    contextWindow: number;
}
export declare class ContentChunker {
    private readonly defaultOptions;
    /**
     * Main chunking method that preserves semantic boundaries while maintaining context
     */
    chunk(content: string, path: string, options?: Partial<ChunkOptions>): SemanticChunk[];
    /**
     * Identify semantic units in the content
     */
    private identifySemanticUnits;
    /**
     * Build heading hierarchy for context
     */
    private buildHeadingHierarchy;
    /**
     * Create chunks with context preservation
     */
    private createChunksWithContext;
    /**
     * Post-process chunks: merge small ones, split large ones
     */
    private postProcessChunks;
    /**
     * Split a large chunk while preserving semantic boundaries
     */
    private splitLargeChunk;
    /**
     * Split text into sentences
     */
    private splitIntoSentences;
    /**
     * Estimate token count (rough approximation)
     */
    private estimateTokenCount;
}
export declare const contentChunker: ContentChunker;
//# sourceMappingURL=semantic-chunker.d.ts.map