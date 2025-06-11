import { z } from 'zod';
export declare const SafePathSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>;
export declare const SafeContentSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const RegexPatternSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const TagSchema: z.ZodString;
export declare const LinkedToPathSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>, string, string>, string, string>, string, string>;
export declare const LimitSchema: z.ZodNumber;
export declare const DepthSchema: z.ZodNumber;
export declare const SearchInputSchema: z.ZodEffects<z.ZodObject<{
    query: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<["semantic", "structural", "hybrid", "pattern"]>>;
    filters: z.ZodOptional<z.ZodObject<{
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        folders: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>, "many">>;
        linkedTo: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>, string, string>, string, string>, string, string>, "many">>;
        dateRange: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            start: z.ZodOptional<z.ZodString>;
            end: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            start?: string | undefined;
            end?: string | undefined;
        }, {
            start?: string | undefined;
            end?: string | undefined;
        }>, {
            start?: string | undefined;
            end?: string | undefined;
        }, {
            start?: string | undefined;
            end?: string | undefined;
        }>>;
        hasProperty: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        fileTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        fileTypes?: string[] | undefined;
        linkedTo?: string[] | undefined;
        hasProperty?: Record<string, any> | undefined;
    }, {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        fileTypes?: string[] | undefined;
        linkedTo?: string[] | undefined;
        hasProperty?: Record<string, any> | undefined;
    }>>;
    options: z.ZodOptional<z.ZodObject<{
        expandSearch: z.ZodDefault<z.ZodBoolean>;
        searchDepth: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        includeContext: z.ZodDefault<z.ZodBoolean>;
        useRegex: z.ZodDefault<z.ZodBoolean>;
        caseSensitive: z.ZodDefault<z.ZodBoolean>;
        contextWindow: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        includeContext: boolean;
        expandSearch: boolean;
        searchDepth: number;
        limit: number;
        caseSensitive: boolean;
        contextWindow: number;
        useRegex: boolean;
    }, {
        includeContext?: boolean | undefined;
        expandSearch?: boolean | undefined;
        searchDepth?: number | undefined;
        limit?: number | undefined;
        caseSensitive?: boolean | undefined;
        contextWindow?: number | undefined;
        useRegex?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    mode: "pattern" | "semantic" | "structural" | "hybrid";
    options?: {
        includeContext: boolean;
        expandSearch: boolean;
        searchDepth: number;
        limit: number;
        caseSensitive: boolean;
        contextWindow: number;
        useRegex: boolean;
    } | undefined;
    filters?: {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        fileTypes?: string[] | undefined;
        linkedTo?: string[] | undefined;
        hasProperty?: Record<string, any> | undefined;
    } | undefined;
}, {
    query: string;
    options?: {
        includeContext?: boolean | undefined;
        expandSearch?: boolean | undefined;
        searchDepth?: number | undefined;
        limit?: number | undefined;
        caseSensitive?: boolean | undefined;
        contextWindow?: number | undefined;
        useRegex?: boolean | undefined;
    } | undefined;
    filters?: {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        fileTypes?: string[] | undefined;
        linkedTo?: string[] | undefined;
        hasProperty?: Record<string, any> | undefined;
    } | undefined;
    mode?: "pattern" | "semantic" | "structural" | "hybrid" | undefined;
}>, {
    query: string;
    mode: "pattern" | "semantic" | "structural" | "hybrid";
    options?: {
        includeContext: boolean;
        expandSearch: boolean;
        searchDepth: number;
        limit: number;
        caseSensitive: boolean;
        contextWindow: number;
        useRegex: boolean;
    } | undefined;
    filters?: {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        fileTypes?: string[] | undefined;
        linkedTo?: string[] | undefined;
        hasProperty?: Record<string, any> | undefined;
    } | undefined;
}, {
    query: string;
    options?: {
        includeContext?: boolean | undefined;
        expandSearch?: boolean | undefined;
        searchDepth?: number | undefined;
        limit?: number | undefined;
        caseSensitive?: boolean | undefined;
        contextWindow?: number | undefined;
        useRegex?: boolean | undefined;
    } | undefined;
    filters?: {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        fileTypes?: string[] | undefined;
        linkedTo?: string[] | undefined;
        hasProperty?: Record<string, any> | undefined;
    } | undefined;
    mode?: "pattern" | "semantic" | "structural" | "hybrid" | undefined;
}>;
export declare const GetNotesInputSchema: z.ZodObject<{
    target: z.ZodUnion<[z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>, z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>, "many">, z.ZodEffects<z.ZodObject<{
        pattern: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        folder: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>>;
        recent: z.ZodOptional<z.ZodNumber>;
        random: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        recent?: number | undefined;
        random?: number | undefined;
    }, {
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        recent?: number | undefined;
        random?: number | undefined;
    }>, {
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        recent?: number | undefined;
        random?: number | undefined;
    }, {
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        recent?: number | undefined;
        random?: number | undefined;
    }>]>;
    options: z.ZodOptional<z.ZodObject<{
        format: z.ZodDefault<z.ZodEnum<["markdown", "json", "chunks"]>>;
        includeContent: z.ZodDefault<z.ZodBoolean>;
        includeMetadata: z.ZodDefault<z.ZodBoolean>;
        includeBacklinks: z.ZodDefault<z.ZodBoolean>;
        includeForwardLinks: z.ZodDefault<z.ZodBoolean>;
        chunkOptions: z.ZodOptional<z.ZodObject<{
            minLength: z.ZodDefault<z.ZodNumber>;
            maxLength: z.ZodDefault<z.ZodNumber>;
            preserveBoundaries: z.ZodDefault<z.ZodBoolean>;
            includeContext: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            includeContext: boolean;
            minLength: number;
            maxLength: number;
            preserveBoundaries: boolean;
        }, {
            includeContext?: boolean | undefined;
            minLength?: number | undefined;
            maxLength?: number | undefined;
            preserveBoundaries?: boolean | undefined;
        }>>;
        sections: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
            type: z.ZodEnum<["heading", "line_range", "pattern"]>;
            value: z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>]>;
            level: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type: "heading" | "line_range" | "pattern";
            value: string | {
                start: number;
                end: number;
            };
            level?: number | undefined;
        }, {
            type: "heading" | "line_range" | "pattern";
            value: string | {
                start: number;
                end: number;
            };
            level?: number | undefined;
        }>]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        includeContent: boolean;
        includeMetadata: boolean;
        format: "markdown" | "json" | "chunks";
        includeBacklinks: boolean;
        includeForwardLinks: boolean;
        sections?: (string | {
            type: "heading" | "line_range" | "pattern";
            value: string | {
                start: number;
                end: number;
            };
            level?: number | undefined;
        })[] | undefined;
        chunkOptions?: {
            includeContext: boolean;
            minLength: number;
            maxLength: number;
            preserveBoundaries: boolean;
        } | undefined;
    }, {
        sections?: (string | {
            type: "heading" | "line_range" | "pattern";
            value: string | {
                start: number;
                end: number;
            };
            level?: number | undefined;
        })[] | undefined;
        includeContent?: boolean | undefined;
        includeMetadata?: boolean | undefined;
        format?: "markdown" | "json" | "chunks" | undefined;
        includeBacklinks?: boolean | undefined;
        includeForwardLinks?: boolean | undefined;
        chunkOptions?: {
            includeContext?: boolean | undefined;
            minLength?: number | undefined;
            maxLength?: number | undefined;
            preserveBoundaries?: boolean | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    target: string | string[] | {
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        recent?: number | undefined;
        random?: number | undefined;
    };
    options?: {
        includeContent: boolean;
        includeMetadata: boolean;
        format: "markdown" | "json" | "chunks";
        includeBacklinks: boolean;
        includeForwardLinks: boolean;
        sections?: (string | {
            type: "heading" | "line_range" | "pattern";
            value: string | {
                start: number;
                end: number;
            };
            level?: number | undefined;
        })[] | undefined;
        chunkOptions?: {
            includeContext: boolean;
            minLength: number;
            maxLength: number;
            preserveBoundaries: boolean;
        } | undefined;
    } | undefined;
}, {
    target: string | string[] | {
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        recent?: number | undefined;
        random?: number | undefined;
    };
    options?: {
        sections?: (string | {
            type: "heading" | "line_range" | "pattern";
            value: string | {
                start: number;
                end: number;
            };
            level?: number | undefined;
        })[] | undefined;
        includeContent?: boolean | undefined;
        includeMetadata?: boolean | undefined;
        format?: "markdown" | "json" | "chunks" | undefined;
        includeBacklinks?: boolean | undefined;
        includeForwardLinks?: boolean | undefined;
        chunkOptions?: {
            includeContext?: boolean | undefined;
            minLength?: number | undefined;
            maxLength?: number | undefined;
            preserveBoundaries?: boolean | undefined;
        } | undefined;
    } | undefined;
}>;
export declare const WriteNoteInputSchema: z.ZodEffects<z.ZodObject<{
    path: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>;
    content: z.ZodEffects<z.ZodString, string, string>;
    mode: z.ZodDefault<z.ZodEnum<["overwrite", "append", "prepend", "insert"]>>;
    target: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["heading", "line", "after", "before", "frontmatter"]>;
        value: z.ZodString;
        createIfMissing: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "heading" | "frontmatter" | "before" | "after" | "line";
        value: string;
        createIfMissing: boolean;
    }, {
        type: "heading" | "frontmatter" | "before" | "after" | "line";
        value: string;
        createIfMissing?: boolean | undefined;
    }>>;
    options: z.ZodOptional<z.ZodObject<{
        ensureDirectories: z.ZodDefault<z.ZodBoolean>;
        backup: z.ZodDefault<z.ZodBoolean>;
        templatePath: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>>;
    }, "strip", z.ZodTypeAny, {
        ensureDirectories: boolean;
        backup: boolean;
        templatePath?: string | undefined;
    }, {
        ensureDirectories?: boolean | undefined;
        backup?: boolean | undefined;
        templatePath?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    content: string;
    mode: "overwrite" | "append" | "prepend" | "insert";
    options?: {
        ensureDirectories: boolean;
        backup: boolean;
        templatePath?: string | undefined;
    } | undefined;
    target?: {
        type: "heading" | "frontmatter" | "before" | "after" | "line";
        value: string;
        createIfMissing: boolean;
    } | undefined;
}, {
    path: string;
    content: string;
    options?: {
        ensureDirectories?: boolean | undefined;
        backup?: boolean | undefined;
        templatePath?: string | undefined;
    } | undefined;
    target?: {
        type: "heading" | "frontmatter" | "before" | "after" | "line";
        value: string;
        createIfMissing?: boolean | undefined;
    } | undefined;
    mode?: "overwrite" | "append" | "prepend" | "insert" | undefined;
}>, {
    path: string;
    content: string;
    mode: "overwrite" | "append" | "prepend" | "insert";
    options?: {
        ensureDirectories: boolean;
        backup: boolean;
        templatePath?: string | undefined;
    } | undefined;
    target?: {
        type: "heading" | "frontmatter" | "before" | "after" | "line";
        value: string;
        createIfMissing: boolean;
    } | undefined;
}, {
    path: string;
    content: string;
    options?: {
        ensureDirectories?: boolean | undefined;
        backup?: boolean | undefined;
        templatePath?: string | undefined;
    } | undefined;
    target?: {
        type: "heading" | "frontmatter" | "before" | "after" | "line";
        value: string;
        createIfMissing?: boolean | undefined;
    } | undefined;
    mode?: "overwrite" | "append" | "prepend" | "insert" | undefined;
}>;
export declare const BatchOperationInputSchema: z.ZodObject<{
    operation: z.ZodEnum<["find-replace", "update-links", "manage-metadata", "rename", "move", "tag", "cleanup"]>;
    target: z.ZodEffects<z.ZodObject<{
        paths: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>, "many">>;
        pattern: z.ZodOptional<z.ZodString>;
        folder: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        query: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        query?: string | undefined;
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        paths?: string[] | undefined;
    }, {
        query?: string | undefined;
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        paths?: string[] | undefined;
    }>, {
        query?: string | undefined;
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        paths?: string[] | undefined;
    }, {
        query?: string | undefined;
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        paths?: string[] | undefined;
    }>;
    parameters: z.ZodOptional<z.ZodObject<{
        replacements: z.ZodOptional<z.ZodArray<z.ZodObject<{
            find: z.ZodString;
            replace: z.ZodString;
            useRegex: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            find: string;
            replace: string;
            useRegex: boolean;
        }, {
            find: string;
            replace: string;
            useRegex?: boolean | undefined;
        }>, "many">>;
        oldPath: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>>;
        newPath: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>>;
        updateBacklinks: z.ZodDefault<z.ZodBoolean>;
        metadataOperation: z.ZodOptional<z.ZodEnum<["add", "remove", "update", "get"]>>;
        key: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        updateBacklinks: boolean;
        value?: any;
        tags?: string[] | undefined;
        key?: string | undefined;
        oldPath?: string | undefined;
        newPath?: string | undefined;
        replacements?: {
            find: string;
            replace: string;
            useRegex: boolean;
        }[] | undefined;
        metadataOperation?: "update" | "add" | "remove" | "get" | undefined;
    }, {
        value?: any;
        tags?: string[] | undefined;
        key?: string | undefined;
        oldPath?: string | undefined;
        newPath?: string | undefined;
        replacements?: {
            find: string;
            replace: string;
            useRegex?: boolean | undefined;
        }[] | undefined;
        updateBacklinks?: boolean | undefined;
        metadataOperation?: "update" | "add" | "remove" | "get" | undefined;
    }>>;
    options: z.ZodOptional<z.ZodObject<{
        dryRun: z.ZodDefault<z.ZodBoolean>;
        backup: z.ZodDefault<z.ZodBoolean>;
        continueOnError: z.ZodDefault<z.ZodBoolean>;
        maxFiles: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        dryRun: boolean;
        backup: boolean;
        continueOnError: boolean;
        maxFiles: number;
    }, {
        dryRun?: boolean | undefined;
        backup?: boolean | undefined;
        continueOnError?: boolean | undefined;
        maxFiles?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    target: {
        query?: string | undefined;
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        paths?: string[] | undefined;
    };
    operation: "move" | "rename" | "find-replace" | "tag" | "update-links" | "manage-metadata" | "cleanup";
    options?: {
        dryRun: boolean;
        backup: boolean;
        continueOnError: boolean;
        maxFiles: number;
    } | undefined;
    parameters?: {
        updateBacklinks: boolean;
        value?: any;
        tags?: string[] | undefined;
        key?: string | undefined;
        oldPath?: string | undefined;
        newPath?: string | undefined;
        replacements?: {
            find: string;
            replace: string;
            useRegex: boolean;
        }[] | undefined;
        metadataOperation?: "update" | "add" | "remove" | "get" | undefined;
    } | undefined;
}, {
    target: {
        query?: string | undefined;
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        paths?: string[] | undefined;
    };
    operation: "move" | "rename" | "find-replace" | "tag" | "update-links" | "manage-metadata" | "cleanup";
    options?: {
        dryRun?: boolean | undefined;
        backup?: boolean | undefined;
        continueOnError?: boolean | undefined;
        maxFiles?: number | undefined;
    } | undefined;
    parameters?: {
        value?: any;
        tags?: string[] | undefined;
        key?: string | undefined;
        oldPath?: string | undefined;
        newPath?: string | undefined;
        replacements?: {
            find: string;
            replace: string;
            useRegex?: boolean | undefined;
        }[] | undefined;
        updateBacklinks?: boolean | undefined;
        metadataOperation?: "update" | "add" | "remove" | "get" | undefined;
    } | undefined;
}>;
export declare const FileOperationInputSchema: z.ZodEffects<z.ZodObject<{
    operation: z.ZodEnum<["create", "delete", "move", "copy", "mkdir", "exists", "info"]>;
    source: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>;
    target: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>>;
    options: z.ZodOptional<z.ZodObject<{
        recursive: z.ZodDefault<z.ZodBoolean>;
        overwrite: z.ZodDefault<z.ZodBoolean>;
        backup: z.ZodDefault<z.ZodBoolean>;
        safeDelete: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        overwrite: boolean;
        recursive: boolean;
        backup: boolean;
        safeDelete: boolean;
    }, {
        overwrite?: boolean | undefined;
        recursive?: boolean | undefined;
        backup?: boolean | undefined;
        safeDelete?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    operation: "move" | "copy" | "delete" | "info" | "exists" | "create" | "mkdir";
    source: string;
    options?: {
        overwrite: boolean;
        recursive: boolean;
        backup: boolean;
        safeDelete: boolean;
    } | undefined;
    target?: string | undefined;
}, {
    operation: "move" | "copy" | "delete" | "info" | "exists" | "create" | "mkdir";
    source: string;
    options?: {
        overwrite?: boolean | undefined;
        recursive?: boolean | undefined;
        backup?: boolean | undefined;
        safeDelete?: boolean | undefined;
    } | undefined;
    target?: string | undefined;
}>, {
    operation: "move" | "copy" | "delete" | "info" | "exists" | "create" | "mkdir";
    source: string;
    options?: {
        overwrite: boolean;
        recursive: boolean;
        backup: boolean;
        safeDelete: boolean;
    } | undefined;
    target?: string | undefined;
}, {
    operation: "move" | "copy" | "delete" | "info" | "exists" | "create" | "mkdir";
    source: string;
    options?: {
        overwrite?: boolean | undefined;
        recursive?: boolean | undefined;
        backup?: boolean | undefined;
        safeDelete?: boolean | undefined;
    } | undefined;
    target?: string | undefined;
}>;
export declare const RateLimitSchema: z.ZodObject<{
    windowMs: z.ZodNumber;
    maxRequests: z.ZodNumber;
    skipSuccessfulRequests: z.ZodDefault<z.ZodBoolean>;
    skipFailedRequests: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
}, {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean | undefined;
    skipFailedRequests?: boolean | undefined;
}>;
export declare class InputValidator {
    /**
     * Validate and sanitize input for any tool
     */
    static validateInput<T>(schema: z.ZodSchema<T>, input: any, toolName: string): T;
    /**
     * Validate file path with additional security checks
     */
    static validateFilePath(path: string, context?: string): string;
    /**
     * Validate array of paths
     */
    static validateFilePaths(paths: string[], context?: string): string[];
    /**
     * Validate regex pattern
     */
    static validateRegexPattern(pattern: string, context?: string): RegExp;
    /**
     * Validate and sanitize search query
     */
    static validateSearchQuery(query: string, allowRegex?: boolean): string;
    /**
     * Additional security checks for paths
     */
    private static checkPathSecurity;
    /**
     * Sanitize input for logging (remove sensitive data)
     */
    private static sanitizeForLogging;
    /**
     * Validate content size and type
     */
    static validateContent(content: string, maxSize?: number): string;
    /**
     * Validate numerical limits
     */
    static validateLimit(limit: number, min?: number, max?: number): number;
}
export declare const validateSearchInput: (input: any) => {
    query: string;
    options?: {
        includeContext?: boolean | undefined;
        expandSearch?: boolean | undefined;
        searchDepth?: number | undefined;
        limit?: number | undefined;
        caseSensitive?: boolean | undefined;
        contextWindow?: number | undefined;
        useRegex?: boolean | undefined;
    } | undefined;
    filters?: {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        fileTypes?: string[] | undefined;
        linkedTo?: string[] | undefined;
        hasProperty?: Record<string, any> | undefined;
    } | undefined;
    mode?: "pattern" | "semantic" | "structural" | "hybrid" | undefined;
};
export declare const validateGetNotesInput: (input: any) => {
    target: string | string[] | {
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        recent?: number | undefined;
        random?: number | undefined;
    };
    options?: {
        sections?: (string | {
            type: "heading" | "line_range" | "pattern";
            value: string | {
                start: number;
                end: number;
            };
            level?: number | undefined;
        })[] | undefined;
        includeContent?: boolean | undefined;
        includeMetadata?: boolean | undefined;
        format?: "markdown" | "json" | "chunks" | undefined;
        includeBacklinks?: boolean | undefined;
        includeForwardLinks?: boolean | undefined;
        chunkOptions?: {
            includeContext?: boolean | undefined;
            minLength?: number | undefined;
            maxLength?: number | undefined;
            preserveBoundaries?: boolean | undefined;
        } | undefined;
    } | undefined;
};
export declare const validateWriteNoteInput: (input: any) => {
    path: string;
    content: string;
    options?: {
        ensureDirectories?: boolean | undefined;
        backup?: boolean | undefined;
        templatePath?: string | undefined;
    } | undefined;
    target?: {
        type: "heading" | "frontmatter" | "before" | "after" | "line";
        value: string;
        createIfMissing?: boolean | undefined;
    } | undefined;
    mode?: "overwrite" | "append" | "prepend" | "insert" | undefined;
};
export declare const validateBatchOperationInput: (input: any) => {
    target: {
        query?: string | undefined;
        tags?: string[] | undefined;
        pattern?: string | undefined;
        folder?: string | undefined;
        paths?: string[] | undefined;
    };
    operation: "move" | "rename" | "find-replace" | "tag" | "update-links" | "manage-metadata" | "cleanup";
    options?: {
        dryRun?: boolean | undefined;
        backup?: boolean | undefined;
        continueOnError?: boolean | undefined;
        maxFiles?: number | undefined;
    } | undefined;
    parameters?: {
        value?: any;
        tags?: string[] | undefined;
        key?: string | undefined;
        oldPath?: string | undefined;
        newPath?: string | undefined;
        replacements?: {
            find: string;
            replace: string;
            useRegex?: boolean | undefined;
        }[] | undefined;
        updateBacklinks?: boolean | undefined;
        metadataOperation?: "update" | "add" | "remove" | "get" | undefined;
    } | undefined;
};
export declare const validateFileOperationInput: (input: any) => {
    operation: "move" | "copy" | "delete" | "info" | "exists" | "create" | "mkdir";
    source: string;
    options?: {
        overwrite?: boolean | undefined;
        recursive?: boolean | undefined;
        backup?: boolean | undefined;
        safeDelete?: boolean | undefined;
    } | undefined;
    target?: string | undefined;
};
//# sourceMappingURL=enhanced-validation.d.ts.map