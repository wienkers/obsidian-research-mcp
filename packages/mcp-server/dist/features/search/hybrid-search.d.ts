import { HybridSearchParams, SearchResult } from '@obsidian-research-mcp/shared';
export declare class HybridSearchEngine {
    search(params: HybridSearchParams): Promise<SearchResult[]>;
    private expandSearchOptimized;
    private findBacklinksOptimized;
    private performSemanticSearch;
    private performStructuralSearch;
    private getFilesWithTags;
    private filterFilesByTags;
    private searchInFile;
    private combineResults;
    private applyFilters;
    private rankResults;
    private generateCacheKey;
    private extractTitle;
    private extractSearchTerms;
    private calculateTextScore;
    private extractContextSnippets;
    private matchesProperties;
    private compareValues;
    private normalizeValue;
    private deepEqual;
    /**
     * Calculate bonus for title and header matches only
     * Only applies bonus if ≥50% of search terms are found in titles/headers
     */
    private calculateTitleHeaderBonus;
    /**
     * Extract unique words from text (case-insensitive)
     */
    private getUniqueWords;
    /**
     * Count unique word matches between query and title word sets
     */
    private countUniqueMatches;
    /**
     * Extract unique words from all headers in content
     */
    private getUniqueWordsFromHeaders;
    /**
     * Check if matched words maintain the same relative order
     * Uses full word lists including repeats for context
     */
    private checkWordOrder;
    private isStopWord;
}
export declare const hybridSearchEngine: HybridSearchEngine;
//# sourceMappingURL=hybrid-search.d.ts.map