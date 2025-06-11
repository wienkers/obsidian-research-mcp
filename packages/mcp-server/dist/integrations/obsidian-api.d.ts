import { SearchFilters } from '@obsidian-research-mcp/shared';
export interface ObsidianFile {
    path: string;
    name: string;
    isFolder: boolean;
    size?: number;
    mtime?: number;
    ctime?: number;
}
export interface ObsidianNote {
    path: string;
    content: string;
    frontmatter?: Record<string, any>;
    tags?: string[];
    links?: string[];
    backlinks?: string[];
}
export interface Backlink {
    sourcePath: string;
    sourceTitle: string;
    linkText: string;
    context: string;
}
export declare class ObsidianAPI {
    private baseUrl;
    private headers;
    private agent;
    private fileListCache;
    private readonly CACHE_DURATION;
    private yamlParser;
    constructor();
    private getFetchOptions;
    private normalizePath;
    getVaultInfo(): Promise<{
        name: string;
        path: string;
    }>;
    listFiles(folder?: string, recursive?: boolean, includeMetadata?: boolean): Promise<ObsidianFile[]>;
    getDirectoryFileCount(folderPath: string): Promise<number>;
    getFileMetadata(filePath: string): Promise<{
        size: number;
        mtime: number;
        ctime: number;
    }>;
    getFileContent(path: string): Promise<string>;
    getNote(path: string): Promise<ObsidianNote>;
    private resolveLinkPath;
    private searchFilesystemForBasename;
    getBacklinks(notePath: string): Promise<string[]>;
    searchFiles(filters: SearchFilters): Promise<string[]>;
    updateFileContent(path: string, content: string): Promise<void>;
    createFile(path: string, content: string): Promise<void>;
    moveFile(oldPath: string, newPath: string): Promise<void>;
    private ensureDirectoryExists;
    deleteFile(path: string): Promise<void>;
    private deleteFileExact;
    private parseNoteContent;
    private normalizeLinkPath;
    private extractAllTags;
    private extractFrontmatterTags;
    private extractInlineTags;
    private isValidObsidianTag;
    patchContent(path: string, operation: 'append' | 'prepend' | 'replace', targetType: 'heading' | 'frontmatter' | 'block', target: string, content: string): Promise<void>;
    getActiveNote(): Promise<{
        path: string;
        content: string;
    }>;
}
export declare const obsidianAPI: ObsidianAPI;
//# sourceMappingURL=obsidian-api.d.ts.map