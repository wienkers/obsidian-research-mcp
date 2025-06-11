export interface BacklinkIndex {
    forwardLinks: Map<string, Set<string>>;
    backLinks: Map<string, Set<string>>;
    embedLinks: Map<string, Set<string>>;
    tagIndex: Map<string, Set<string>>;
    lastUpdated: number;
    totalFiles: number;
    totalLinks: number;
    totalEmbeds: number;
    totalTags: number;
}
export interface BacklinkRelationship {
    source: string;
    target: string;
    contexts: Array<{
        line: number;
        text: string;
        linkType: 'wikilink' | 'markdown' | 'embed';
    }>;
}
export interface TagRelationship {
    filePath: string;
    tags: string[];
    contexts: Array<{
        line: number;
        text: string;
        tag: string;
    }>;
}
export interface MentionRelationship {
    source: string;
    target: string;
    contexts: Array<{
        line: number;
        text: string;
        mentionType: 'basename' | 'alias';
    }>;
}
export interface EmbedRelationship {
    source: string;
    target: string;
    contexts: Array<{
        line: number;
        text: string;
        embedType: 'image' | 'note' | 'audio' | 'video' | 'pdf' | 'other';
    }>;
}
export declare class BacklinkIndexManager {
    private index;
    private readonly CACHE_DURATION;
    private readonly INDEX_KEY;
    private buildingPromise;
    /**
     * Get backlinks for a target path with O(1) lookup
     */
    getBacklinks(targetPath: string): Promise<string[]>;
    /**
     * Get forward links (outgoing links) for a source path
     */
    getForwardLinks(sourcePath: string): Promise<string[]>;
    /**
     * Get detailed backlink relationships with context
     */
    getBacklinkRelationships(targetPath: string): Promise<BacklinkRelationship[]>;
    /**
     * Get tags for a specific file with context
     */
    getTags(filePath: string): Promise<TagRelationship | null>;
    /**
     * Find unlinked mentions of a target file across the vault
     */
    findMentions(targetPath: string): Promise<MentionRelationship[]>;
    /**
     * Get embed relationships for a specific file
     */
    getEmbeds(filePath: string): Promise<EmbedRelationship[]>;
    /**
     * Rebuild the entire backlink index
     */
    rebuildIndex(): Promise<BacklinkIndex>;
    /**
     * Check if index needs updating and rebuild if necessary
     */
    ensureIndexExists(): Promise<BacklinkIndex>;
    /**
     * Internal method to build the index
     */
    private buildIndexInternal;
    /**
     * Extract all links from content (excluding embeds)
     */
    private extractAllLinks;
    /**
     * Extract all embeds from content
     */
    private extractAllEmbeds;
    /**
     * Extract all tags from content
     */
    private extractAllTags;
    /**
     * Extract link contexts (the surrounding text for each link)
     */
    private extractLinkContexts;
    /**
     * Normalize link paths for consistent indexing
     */
    private normalizeLinkPath;
    /**
     * Extract basename from path
     */
    private extractBasename;
    /**
     * Extract tag contexts from content
     */
    private extractTagContexts;
    /**
     * Extract mention contexts (unlinked references)
     */
    private extractMentionContexts;
    /**
     * Extract embed contexts from content
     */
    private extractEmbedContexts;
    /**
     * Clear the index and cache
     */
    clearIndex(): Promise<void>;
    /**
     * Get index statistics
     */
    getIndexStats(): {
        exists: boolean;
        age: number;
        totalFiles: number;
        totalLinks: number;
        totalEmbeds: number;
        totalTags: number;
        avgLinksPerFile: number;
        avgEmbedsPerFile: number;
        avgTagsPerFile: number;
    } | null;
}
export declare const backlinkIndex: BacklinkIndexManager;
//# sourceMappingURL=backlink-index.d.ts.map