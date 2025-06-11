export interface SectionIdentifier {
    type: 'heading' | 'line_range' | 'pattern';
    value: string | {
        start: number;
        end: number;
    };
    level?: number;
}
export interface NoteSection {
    identifier: string;
    title: string;
    content: string;
    startLine: number;
    endLine: number;
    level?: number;
    context?: {
        precedingSection?: string;
        followingSection?: string;
        parentSection?: string;
        subsections?: string[];
    };
    metadata: {
        wordCount: number;
        lineCount: number;
        hasSubsections: boolean;
        contentTypes: Array<'text' | 'code' | 'list' | 'table' | 'link' | 'embed'>;
    };
}
export interface NoteSectionsResult {
    path: string;
    title: string;
    sections: NoteSection[];
    outline: Array<{
        title: string;
        level: number;
        lineNumber: number;
        hasContent: boolean;
    }>;
    summary: {
        totalSections: number;
        totalWords: number;
        averageWordsPerSection: number;
        deepestLevel: number;
        longestSection: string;
        shortestSection: string;
    };
}
export interface SectionOperationsOptions {
    path: string;
    sectionIdentifiers?: Array<string | SectionIdentifier>;
    includeContext: boolean;
    includeMetadata: boolean;
    contextWindow?: number;
    minSectionLength?: number;
}
export declare class SectionOperationsManager {
    getNoteSections(options: SectionOperationsOptions): Promise<NoteSectionsResult>;
    getSectionContent(path: string, sectionIdentifier: string | SectionIdentifier): Promise<NoteSection | null>;
    updateSection(path: string, sectionIdentifier: string | SectionIdentifier, newContent: string): Promise<{
        success: boolean;
        updatedSection?: NoteSection;
        error?: string;
    }>;
    private extractAllSections;
    private finalizeSection;
    private filterSections;
    private findSectionByIdentifier;
    private addSectionContext;
    private buildOutline;
    private calculateSummary;
    private calculateSectionMetadata;
    private calculateWordCount;
    private extractTitle;
}
export declare const sectionOperationsManager: SectionOperationsManager;
//# sourceMappingURL=section-operations.d.ts.map