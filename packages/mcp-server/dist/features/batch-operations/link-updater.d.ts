export interface LinkUpdateOptions {
    oldPath: string;
    newPath: string;
    updateBacklinks: boolean;
}
export interface LinkUpdateResult {
    success: boolean;
    filesUpdated: number;
    linksUpdated: number;
    updatedFiles: string[];
    errors: Array<{
        file: string;
        error: string;
    }>;
    summary: string;
}
export interface ParsedLink {
    type: 'wikilink' | 'embed' | 'markdown';
    fullMatch: string;
    filePath: string;
    section?: string;
    blockId?: string;
    alias?: string;
    isEmbed: boolean;
    startIndex: number;
}
export interface LinkMatch extends ParsedLink {
    original: string;
    replacement: string;
    linkText: string;
}
export declare class LinkUpdater {
    /**
     * Comprehensive regex patterns for all Obsidian link types
     */
    private readonly linkPatterns;
    updateLinks(options: LinkUpdateOptions): Promise<LinkUpdateResult>;
    private updateBacklinks;
    private updateForwardLinks;
    /**
     * Parse a link string into its components
     */
    private parseLink;
    /**
     * Parse markdown link into components
     */
    private parseMarkdownLink;
    /**
     * Check if a parsed link points to the target file
     */
    private isLinkToTargetFile;
    /**
     * Create replacement text for a parsed link
     */
    private createReplacement;
    /**
     * Find all links to a target file in content using comprehensive parsing
     */
    private findLinksToFile;
    private findRelativeLinks;
    private replaceLinks;
    private updateRelativeLinks;
    private adjustRelativePath;
    private getBasename;
    private getDirectory;
    private generateSummary;
    previewLinkUpdates(options: LinkUpdateOptions): Promise<LinkUpdateResult>;
}
export declare const linkUpdater: LinkUpdater;
//# sourceMappingURL=link-updater.d.ts.map