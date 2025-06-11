import { SearchResult } from '@obsidian-research-mcp/shared';
/**
 * Maximal Marginal Relevance (MMR) Ranker
 *
 * Implements MMR algorithm to balance relevance and diversity in search results.
 * This reduces redundancy and improves the overall quality of results for Claude.
 *
 * MMR Formula: MMR = λ * Relevance - (1-λ) * max(Similarity to already selected)
 * where λ controls the trade-off between relevance and diversity
 */
export interface MMROptions {
    lambda: number;
    maxResults: number;
    diversityThreshold: number;
    useSemanticSimilarity: boolean;
    contentSimilarityWeight: number;
    pathSimilarityWeight: number;
    tagSimilarityWeight: number;
}
export interface SimilarityMetrics {
    contentSimilarity: number;
    pathSimilarity: number;
    tagSimilarity: number;
    semanticSimilarity?: number;
    overallSimilarity: number;
}
export declare class MMRRanker {
    private readonly defaultOptions;
    /**
     * Apply MMR ranking to search results
     */
    rankWithMMR(results: SearchResult[], options?: Partial<MMROptions>): SearchResult[];
    /**
     * Pre-process results to extract features needed for similarity computation
     */
    private preprocessResults;
    /**
     * Core MMR selection algorithm
     */
    private selectWithMMR;
    /**
     * Calculate maximum similarity between a candidate and all selected results
     */
    private calculateMaxSimilarityToSelected;
    /**
     * Calculate comprehensive similarity between two results
     */
    private calculateSimilarity;
    /**
     * Calculate content similarity using Jaccard index of tokens
     */
    private calculateContentSimilarity;
    /**
     * Calculate path similarity based on shared folder structure
     */
    private calculatePathSimilarity;
    /**
     * Calculate tag similarity using Jaccard index
     */
    private calculateTagSimilarity;
    /**
     * Calculate cosine similarity between embedding vectors
     */
    private calculateCosineSimilarity;
    /**
     * Calculate Jaccard similarity between two sets
     */
    private jaccardSimilarity;
    /**
     * Extract meaningful tokens from content
     */
    private extractContentTokens;
    /**
     * Extract path components for similarity calculation
     */
    private extractPathComponents;
    /**
     * Extract and normalize tags
     */
    private extractTags;
    /**
     * Normalize search scores to [0, 1] range
     */
    private normalizeScore;
    /**
     * Calculate diversity improvement metric
     */
    private calculateDiversityImprovement;
    /**
     * Calculate average pairwise difference (simple diversity metric)
     */
    private calculateAveragePairwiseDifference;
    /**
     * Get adaptive lambda value based on query characteristics
     */
    getAdaptiveLambda(query: string, resultCount: number): number;
}
export declare const mmrRanker: MMRRanker;
//# sourceMappingURL=mmr-ranker.d.ts.map