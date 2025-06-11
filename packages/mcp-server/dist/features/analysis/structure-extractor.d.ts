export type ExtractType = 'headings' | 'lists' | 'code_blocks' | 'tasks' | 'quotes' | 'tables' | 'links' | 'embeds';
export interface StructureElement {
    type: ExtractType;
    content: string;
    lineNumber: number;
    level?: number;
    language?: string;
    completed?: boolean;
    raw: string;
    context?: {
        precedingText?: string;
        followingText?: string;
        parentHeading?: string;
    };
}
export interface FileStructure {
    path: string;
    title: string;
    elements: StructureElement[];
    hierarchy?: StructureHierarchy;
    summary: {
        totalElements: number;
        byType: Record<ExtractType, number>;
        headingLevels: Record<number, number>;
        taskCompletion: {
            total: number;
            completed: number;
            percentage: number;
        };
    };
}
export interface StructureHierarchy {
    sections: Array<{
        heading: StructureElement;
        level: number;
        children: StructureElement[];
        subsections: StructureHierarchy['sections'];
    }>;
}
export interface StructureExtractionOptions {
    paths: string[];
    extractTypes: ExtractType[];
    includeHierarchy: boolean;
    includeContext: boolean;
    contextWindow?: number;
    minHeadingLevel?: number;
    maxHeadingLevel?: number;
}
export interface StructureExtractionResult {
    files: FileStructure[];
    aggregatedSummary: {
        totalFiles: number;
        totalElements: number;
        byType: Record<ExtractType, number>;
        commonPatterns: Array<{
            type: ExtractType;
            pattern: string;
            frequency: number;
        }>;
    };
}
export declare class StructureExtractor {
    extractStructure(options: StructureExtractionOptions): Promise<StructureExtractionResult>;
    private processFiles;
    private extractFileStructure;
    private extractHeadings;
    private extractLists;
    private extractCodeBlocks;
    private extractTasks;
    private extractQuotes;
    private extractTables;
    /**
     * Check if a line could be part of a markdown table
     */
    private isMarkdownTableRow;
    /**
     * Validate that collected lines form a proper markdown table
     */
    private isValidMarkdownTable;
    private extractLinks;
    private extractEmbeds;
    private addContext;
    private buildHierarchy;
    private calculateFileSummary;
    private calculateAggregatedSummary;
    private extractTitle;
}
export declare const structureExtractor: StructureExtractor;
//# sourceMappingURL=structure-extractor.d.ts.map