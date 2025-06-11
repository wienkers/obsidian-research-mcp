import { FrontmatterResult } from './yaml-parser.js';
import { ProgressCallback } from './streaming.js';
export interface FileMetadata {
    path: string;
    title: string;
    created: number;
    modified: number;
    size: number;
    tags: string[];
    frontmatter: Record<string, any>;
    wordCount: number;
    linkCount: number;
    backlinksCount: number;
    headingCount: number;
    taskCount: number;
    completedTaskCount: number;
    codeBlockCount: number;
    imageCount: number;
    tableCount: number;
    outgoingLinks: string[];
    incomingLinks: string[];
    contentTypes: Array<'text' | 'code' | 'list' | 'table' | 'link' | 'embed' | 'task' | 'quote'>;
}
export interface EnhancedNote {
    path: string;
    content: string;
    frontmatter: Record<string, any>;
    metadata: FileMetadata;
    structure: {
        headings: Array<{
            level: number;
            text: string;
            line: number;
        }>;
        links: Array<{
            type: 'wiki' | 'markdown';
            text: string;
            target: string;
            line: number;
        }>;
        tags: Array<{
            tag: string;
            line: number;
            inherited?: boolean;
        }>;
        tasks: Array<{
            text: string;
            completed: boolean;
            line: number;
        }>;
    };
}
export interface BatchReadOptions {
    includeContent: boolean;
    includeMetadata: boolean;
    includeFrontmatter: boolean;
    includeStructure: boolean;
    useCache: boolean;
    onProgress?: ProgressCallback;
}
export interface BatchReadResult {
    path: string;
    success: boolean;
    note?: EnhancedNote;
    error?: string;
}
export declare class FileOperationsManager {
    /**
     * Read multiple notes with unified processing
     */
    readMultipleNotes(paths: string[], options?: Partial<BatchReadOptions>): Promise<BatchReadResult[]>;
    /**
     * Read a single note with comprehensive processing
     */
    readSingleNote(filePath: string, options?: Partial<BatchReadOptions>): Promise<EnhancedNote | null>;
    /**
     * Extract comprehensive metadata from file content
     */
    extractFileMetadata(fileInfo: any, content: string, frontmatterResult: FrontmatterResult): FileMetadata;
    /**
     * Process note content into enhanced structure
     */
    private processNoteContent;
    /**
     * Extract note structure (headings, links, tags, tasks)
     */
    private extractNoteStructure;
    /**
     * Calculate accurate word count
     */
    private calculateWordCount;
    /**
     * Extract wiki links from content
     */
    private extractWikiLinks;
    /**
     * Extract markdown links from content
     */
    private extractMarkdownLinks;
    /**
     * Extract tags from content (not frontmatter)
     */
    private extractContentTags;
    /**
     * Merge tags and handle inheritance for nested tags
     */
    private mergeAndInheritTags;
    /**
     * Detect content types in the document
     */
    private detectContentTypes;
    /**
     * Extract title from various sources
     */
    private extractTitle;
    /**
     * Update file with proper Unicode handling
     */
    updateFile(filePath: string, content: string): Promise<void>;
    /**
     * Normalize Unicode file paths for proper handling
     */
    private normalizeUnicodePath;
    /**
     * Extract backlink context from referring file
     */
    extractBacklinkContext(referencingFile: string, targetFile: string, contextWindow?: number): Promise<string[]>;
}
export declare const fileOperationsManager: FileOperationsManager;
//# sourceMappingURL=file-operations.d.ts.map