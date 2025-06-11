export declare class ObsidianResearchServer {
    private server;
    constructor();
    run(): Promise<void>;
    private normalizePath;
    private setupHandlers;
    private getSimilarBasenamesHint;
    private formatTimestamp;
    private estimateTokenCount;
    private getFileStatistics;
    private handleSemanticSearch;
    private handlePatternSearch;
    private handleConsolidatedGetNotes;
    private handleConsolidatedWriteNote;
    private handleConsolidatedExplore;
    private applyExploreFilters;
    private handleConsolidatedRelationships;
    private extractFileTitle;
    private extractBasename;
    private calculateLinkStrength;
    private calculateTagStrength;
    private calculateMentionStrength;
    private getLinkContext;
    private handleConsolidatedAnalyze;
    private handleConsolidatedManage;
    private previewOperation;
    private cleanupLinksAfterDelete;
    private performFindReplace;
}
export declare const server: ObsidianResearchServer;
//# sourceMappingURL=server.d.ts.map