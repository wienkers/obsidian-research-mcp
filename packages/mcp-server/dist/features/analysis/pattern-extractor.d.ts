export interface SearchScope {
    paths?: string[];
    folders?: string[];
    tags?: string[];
    filePattern?: string;
    excludePaths?: string[];
    excludeFolders?: string[];
    dateRange?: {
        start?: string;
        end?: string;
    };
}
export interface PatternMatch {
    pattern: string;
    match: string;
    file: string;
    lineNumber: number;
    line: string;
    context?: {
        before: string[];
        after: string[];
    };
    groups?: string[];
    metadata?: {
        timestamp: number;
        length: number;
        startIndex: number;
        endIndex: number;
    };
}
export interface PatternStatistics {
    pattern: string;
    totalMatches: number;
    uniqueFiles: number;
    avgMatchesPerFile: number;
    mostCommonMatch: string;
    fileDistribution: Array<{
        file: string;
        matches: number;
        percentage: number;
    }>;
    matchFrequency: Record<string, number>;
}
export interface PatternExtractionResult {
    patterns: string[];
    matches: PatternMatch[];
    statistics: PatternStatistics[];
    summary: {
        totalMatches: number;
        filesProcessed: number;
        executionTime: number;
        uniqueMatches: number;
        mostProductivePattern: string;
        leastProductivePattern: string;
    };
}
export interface PatternExtractionOptions {
    patterns: string[];
    scope?: SearchScope;
    contextWindow?: number;
    includeStatistics: boolean;
    maxMatches?: number;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    includeMetadata?: boolean;
}
export declare class PatternExtractor {
    extractPatterns(options: PatternExtractionOptions): Promise<PatternExtractionResult>;
    private getFilesToSearch;
    private extractAllMatches;
    private extractMatchesFromContent;
    private calculateStatistics;
    private calculateSummary;
}
export declare const patternExtractor: PatternExtractor;
//# sourceMappingURL=pattern-extractor.d.ts.map