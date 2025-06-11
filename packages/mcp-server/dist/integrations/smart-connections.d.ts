import { SearchResult } from '@obsidian-research-mcp/shared';
export interface SmartConnectionsResult {
    path: string;
    title: string;
    similarity: number;
    content?: string;
    embeddings?: number[];
}
export interface SimilarityOptions {
    limit?: number;
    threshold?: number;
    folders?: string[];
}
export declare class SmartConnectionsAPI {
    private baseUrl;
    private headers;
    private isEnabled;
    private agent;
    constructor();
    isAvailable(): Promise<boolean>;
    searchSemantic(query: string, options?: SimilarityOptions): Promise<SearchResult[]>;
    findSimilar(notePath: string, options?: SimilarityOptions): Promise<SearchResult[]>;
    getEmbedding(text: string): Promise<number[]>;
    calculateSimilarity(text1: string, text2: string): Promise<number>;
    private cosineSimilarity;
    private extractSnippet;
}
export declare const smartConnectionsAPI: SmartConnectionsAPI;
//# sourceMappingURL=smart-connections.d.ts.map