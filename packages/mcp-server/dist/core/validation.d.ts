import { z } from 'zod';
export declare const ValidationSchemas: {
    SemanticSearch: z.ZodObject<{
        query: z.ZodEffects<z.ZodString, string, string>;
        filters: z.ZodOptional<z.ZodObject<{
            folders: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            tags: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
            linkedTo: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            hasProperty: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            dateRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodOptional<z.ZodString>;
                end: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                start?: string | undefined;
                end?: string | undefined;
            }, {
                start?: string | undefined;
                end?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            tags?: string[] | undefined;
            folders?: string[] | undefined;
            dateRange?: {
                start?: string | undefined;
                end?: string | undefined;
            } | undefined;
            linkedTo?: string[] | undefined;
            hasProperty?: Record<string, any> | undefined;
        }, {
            tags?: string[] | undefined;
            folders?: string[] | undefined;
            dateRange?: {
                start?: string | undefined;
                end?: string | undefined;
            } | undefined;
            linkedTo?: string[] | undefined;
            hasProperty?: Record<string, any> | undefined;
        }>>;
        options: z.ZodOptional<z.ZodObject<{
            expandSearch: z.ZodDefault<z.ZodBoolean>;
            searchDepth: z.ZodDefault<z.ZodNumber>;
            limit: z.ZodDefault<z.ZodNumber>;
            threshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            threshold: number;
            expandSearch: boolean;
            searchDepth: number;
            limit: number;
        }, {
            threshold?: number | undefined;
            expandSearch?: boolean | undefined;
            searchDepth?: number | undefined;
            limit?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        query: string;
        options?: {
            threshold: number;
            expandSearch: boolean;
            searchDepth: number;
            limit: number;
        } | undefined;
        filters?: {
            tags?: string[] | undefined;
            folders?: string[] | undefined;
            dateRange?: {
                start?: string | undefined;
                end?: string | undefined;
            } | undefined;
            linkedTo?: string[] | undefined;
            hasProperty?: Record<string, any> | undefined;
        } | undefined;
    }, {
        query: string;
        options?: {
            threshold?: number | undefined;
            expandSearch?: boolean | undefined;
            searchDepth?: number | undefined;
            limit?: number | undefined;
        } | undefined;
        filters?: {
            tags?: string[] | undefined;
            folders?: string[] | undefined;
            dateRange?: {
                start?: string | undefined;
                end?: string | undefined;
            } | undefined;
            linkedTo?: string[] | undefined;
            hasProperty?: Record<string, any> | undefined;
        } | undefined;
    }>;
    PatternSearch: z.ZodObject<{
        patterns: z.ZodArray<z.ZodString, "many">;
        scope: z.ZodOptional<z.ZodObject<{
            paths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            folders: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            tags: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
            filePattern: z.ZodOptional<z.ZodString>;
            excludePaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            excludeFolders: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            dateRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodOptional<z.ZodString>;
                end: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                start?: string | undefined;
                end?: string | undefined;
            }, {
                start?: string | undefined;
                end?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            tags?: string[] | undefined;
            folders?: string[] | undefined;
            dateRange?: {
                start?: string | undefined;
                end?: string | undefined;
            } | undefined;
            paths?: string[] | undefined;
            filePattern?: string | undefined;
            excludePaths?: string[] | undefined;
            excludeFolders?: string[] | undefined;
        }, {
            tags?: string[] | undefined;
            folders?: string[] | undefined;
            dateRange?: {
                start?: string | undefined;
                end?: string | undefined;
            } | undefined;
            paths?: string[] | undefined;
            filePattern?: string | undefined;
            excludePaths?: string[] | undefined;
            excludeFolders?: string[] | undefined;
        }>>;
        options: z.ZodOptional<z.ZodObject<{
            caseSensitive: z.ZodDefault<z.ZodBoolean>;
            wholeWord: z.ZodDefault<z.ZodBoolean>;
            contextWindow: z.ZodDefault<z.ZodNumber>;
            maxMatches: z.ZodOptional<z.ZodNumber>;
            includeStatistics: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            caseSensitive: boolean;
            wholeWord: boolean;
            contextWindow: number;
            includeStatistics: boolean;
            maxMatches?: number | undefined;
        }, {
            caseSensitive?: boolean | undefined;
            wholeWord?: boolean | undefined;
            contextWindow?: number | undefined;
            maxMatches?: number | undefined;
            includeStatistics?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        patterns: string[];
        options?: {
            caseSensitive: boolean;
            wholeWord: boolean;
            contextWindow: number;
            includeStatistics: boolean;
            maxMatches?: number | undefined;
        } | undefined;
        scope?: {
            tags?: string[] | undefined;
            folders?: string[] | undefined;
            dateRange?: {
                start?: string | undefined;
                end?: string | undefined;
            } | undefined;
            paths?: string[] | undefined;
            filePattern?: string | undefined;
            excludePaths?: string[] | undefined;
            excludeFolders?: string[] | undefined;
        } | undefined;
    }, {
        patterns: string[];
        options?: {
            caseSensitive?: boolean | undefined;
            wholeWord?: boolean | undefined;
            contextWindow?: number | undefined;
            maxMatches?: number | undefined;
            includeStatistics?: boolean | undefined;
        } | undefined;
        scope?: {
            tags?: string[] | undefined;
            folders?: string[] | undefined;
            dateRange?: {
                start?: string | undefined;
                end?: string | undefined;
            } | undefined;
            paths?: string[] | undefined;
            filePattern?: string | undefined;
            excludePaths?: string[] | undefined;
            excludeFolders?: string[] | undefined;
        } | undefined;
    }>;
    ConsolidatedSearch: z.ZodObject<{
        query: z.ZodEffects<z.ZodString, string, string>;
        mode: z.ZodDefault<z.ZodEnum<["semantic", "structural", "hybrid", "pattern"]>>;
        filters: z.ZodOptional<z.ZodObject<{
            tags: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
            folders: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, "many">>;
            dateRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodOptional<z.ZodString>;
                end: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                start?: string | undefined;
                end?: string | undefined;
            }, {
                start?: string | undefined;
                end?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            tags?: string[] | undefined;
            folders?: string[] | undefined;
            dateRange?: {
                start?: string | undefined;
                end?: string | undefined;
            } | undefined;
        }, {
            tags?: string[] | undefined;
            folders?: string[] | undefined;
            dateRange?: {
                start?: string | undefined;
                end?: string | undefined;
            } | undefined;
        }>>;
        options: z.ZodOptional<z.ZodObject<{
            expandSearch: z.ZodDefault<z.ZodBoolean>;
            searchDepth: z.ZodDefault<z.ZodNumber>;
            limit: z.ZodDefault<z.ZodNumber>;
            useRegex: z.ZodDefault<z.ZodBoolean>;
            caseSensitive: z.ZodDefault<z.ZodBoolean>;
            contextWindow: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            expandSearch: boolean;
            searchDepth: number;
            limit: number;
            caseSensitive: boolean;
            contextWindow: number;
            useRegex: boolean;
        }, {
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
        } | undefined;
    }, {
        query: string;
        options?: {
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
        } | undefined;
        mode?: "pattern" | "semantic" | "structural" | "hybrid" | undefined;
    }>;
    ConsolidatedGetNotes: z.ZodObject<{
        target: z.ZodUnion<[z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, "many">]>;
        options: z.ZodOptional<z.ZodObject<{
            format: z.ZodDefault<z.ZodEnum<["markdown", "json"]>>;
            includeContent: z.ZodDefault<z.ZodBoolean>;
            includeMetadata: z.ZodDefault<z.ZodBoolean>;
            includeStat: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            includeContent: boolean;
            includeMetadata: boolean;
            format: "markdown" | "json";
            includeStat: boolean;
        }, {
            includeContent?: boolean | undefined;
            includeMetadata?: boolean | undefined;
            format?: "markdown" | "json" | undefined;
            includeStat?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        target: string | string[];
        options?: {
            includeContent: boolean;
            includeMetadata: boolean;
            format: "markdown" | "json";
            includeStat: boolean;
        } | undefined;
    }, {
        target: string | string[];
        options?: {
            includeContent?: boolean | undefined;
            includeMetadata?: boolean | undefined;
            format?: "markdown" | "json" | undefined;
            includeStat?: boolean | undefined;
        } | undefined;
    }>;
    ConsolidatedWriteNote: z.ZodEffects<z.ZodObject<{
        targetType: z.ZodDefault<z.ZodEnum<["path", "active"]>>;
        targetIdentifier: z.ZodOptional<z.ZodString>;
        content: z.ZodString;
        mode: z.ZodDefault<z.ZodEnum<["whole-file", "relative"]>>;
        wholeFileMode: z.ZodDefault<z.ZodEnum<["overwrite", "append", "prepend"]>>;
        relativeMode: z.ZodOptional<z.ZodObject<{
            operation: z.ZodEnum<["append", "prepend", "replace"]>;
            targetType: z.ZodEnum<["heading", "frontmatter"]>;
            target: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            target: string;
            targetType: "heading" | "frontmatter";
            operation: "append" | "prepend" | "replace";
        }, {
            target: string;
            targetType: "heading" | "frontmatter";
            operation: "append" | "prepend" | "replace";
        }>>;
    }, "strip", z.ZodTypeAny, {
        targetType: "path" | "active";
        content: string;
        mode: "whole-file" | "relative";
        wholeFileMode: "overwrite" | "append" | "prepend";
        targetIdentifier?: string | undefined;
        relativeMode?: {
            target: string;
            targetType: "heading" | "frontmatter";
            operation: "append" | "prepend" | "replace";
        } | undefined;
    }, {
        content: string;
        targetType?: "path" | "active" | undefined;
        targetIdentifier?: string | undefined;
        mode?: "whole-file" | "relative" | undefined;
        wholeFileMode?: "overwrite" | "append" | "prepend" | undefined;
        relativeMode?: {
            target: string;
            targetType: "heading" | "frontmatter";
            operation: "append" | "prepend" | "replace";
        } | undefined;
    }>, {
        targetType: "path" | "active";
        content: string;
        mode: "whole-file" | "relative";
        wholeFileMode: "overwrite" | "append" | "prepend";
        targetIdentifier?: string | undefined;
        relativeMode?: {
            target: string;
            targetType: "heading" | "frontmatter";
            operation: "append" | "prepend" | "replace";
        } | undefined;
    }, {
        content: string;
        targetType?: "path" | "active" | undefined;
        targetIdentifier?: string | undefined;
        mode?: "whole-file" | "relative" | undefined;
        wholeFileMode?: "overwrite" | "append" | "prepend" | undefined;
        relativeMode?: {
            target: string;
            targetType: "heading" | "frontmatter";
            operation: "append" | "prepend" | "replace";
        } | undefined;
    }>;
    ConsolidatedExplore: z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["overview", "list"]>>;
        scope: z.ZodOptional<z.ZodObject<{
            folder: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
            recursive: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            recursive: boolean;
            folder?: string | undefined;
        }, {
            folder?: string | undefined;
            recursive?: boolean | undefined;
        }>>;
        options: z.ZodOptional<z.ZodObject<{
            limit: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            limit: number;
        }, {
            limit?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        mode: "overview" | "list";
        options?: {
            limit: number;
        } | undefined;
        scope?: {
            recursive: boolean;
            folder?: string | undefined;
        } | undefined;
    }, {
        options?: {
            limit?: number | undefined;
        } | undefined;
        scope?: {
            folder?: string | undefined;
            recursive?: boolean | undefined;
        } | undefined;
        mode?: "overview" | "list" | undefined;
    }>;
    ConsolidatedRelationships: z.ZodObject<{
        target: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        analysis: z.ZodDefault<z.ZodArray<z.ZodEnum<["backlinks"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        target: string;
        analysis: "backlinks"[];
    }, {
        target: string;
        analysis?: "backlinks"[] | undefined;
    }>;
    ConsolidatedAnalyze: z.ZodObject<{
        target: z.ZodUnion<[z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, "many">]>;
        analysis: z.ZodDefault<z.ZodArray<z.ZodEnum<["structure", "sections", "elements", "themes", "quality", "readability", "connections", "metadata"]>, "many">>;
        sectionIdentifiers: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
            type: z.ZodEnum<["heading", "line_range", "pattern"]>;
            value: z.ZodUnion<[z.ZodString, z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
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
        options: z.ZodOptional<z.ZodObject<{
            extractTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["headings", "lists", "code_blocks", "tasks", "quotes", "tables", "links", "embeds"]>, "many">>;
            includeHierarchy: z.ZodDefault<z.ZodBoolean>;
            includeContext: z.ZodDefault<z.ZodBoolean>;
            includeSectionContext: z.ZodDefault<z.ZodBoolean>;
            includeMetadata: z.ZodDefault<z.ZodBoolean>;
            contextWindow: z.ZodDefault<z.ZodNumber>;
            minHeadingLevel: z.ZodOptional<z.ZodNumber>;
            maxHeadingLevel: z.ZodOptional<z.ZodNumber>;
            minSectionLength: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            includeContext: boolean;
            includeMetadata: boolean;
            contextWindow: number;
            extractTypes: ("links" | "embeds" | "headings" | "lists" | "code_blocks" | "tasks" | "quotes" | "tables")[];
            includeHierarchy: boolean;
            includeSectionContext: boolean;
            minHeadingLevel?: number | undefined;
            maxHeadingLevel?: number | undefined;
            minSectionLength?: number | undefined;
        }, {
            includeContext?: boolean | undefined;
            includeMetadata?: boolean | undefined;
            contextWindow?: number | undefined;
            extractTypes?: ("links" | "embeds" | "headings" | "lists" | "code_blocks" | "tasks" | "quotes" | "tables")[] | undefined;
            includeHierarchy?: boolean | undefined;
            includeSectionContext?: boolean | undefined;
            minHeadingLevel?: number | undefined;
            maxHeadingLevel?: number | undefined;
            minSectionLength?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        target: string | string[];
        analysis: ("structure" | "sections" | "elements" | "themes" | "quality" | "readability" | "connections" | "metadata")[];
        options?: {
            includeContext: boolean;
            includeMetadata: boolean;
            contextWindow: number;
            extractTypes: ("links" | "embeds" | "headings" | "lists" | "code_blocks" | "tasks" | "quotes" | "tables")[];
            includeHierarchy: boolean;
            includeSectionContext: boolean;
            minHeadingLevel?: number | undefined;
            maxHeadingLevel?: number | undefined;
            minSectionLength?: number | undefined;
        } | undefined;
        sectionIdentifiers?: (string | {
            type: "heading" | "line_range" | "pattern";
            value: string | {
                start: number;
                end: number;
            };
            level?: number | undefined;
        })[] | undefined;
    }, {
        target: string | string[];
        options?: {
            includeContext?: boolean | undefined;
            includeMetadata?: boolean | undefined;
            contextWindow?: number | undefined;
            extractTypes?: ("links" | "embeds" | "headings" | "lists" | "code_blocks" | "tasks" | "quotes" | "tables")[] | undefined;
            includeHierarchy?: boolean | undefined;
            includeSectionContext?: boolean | undefined;
            minHeadingLevel?: number | undefined;
            maxHeadingLevel?: number | undefined;
            minSectionLength?: number | undefined;
        } | undefined;
        analysis?: ("structure" | "sections" | "elements" | "themes" | "quality" | "readability" | "connections" | "metadata")[] | undefined;
        sectionIdentifiers?: (string | {
            type: "heading" | "line_range" | "pattern";
            value: string | {
                start: number;
                end: number;
            };
            level?: number | undefined;
        })[] | undefined;
    }>;
    ConsolidatedManage: z.ZodObject<{
        operation: z.ZodEnum<["move", "rename", "copy", "delete", "create-dir", "delete-dir", "find-replace"]>;
        source: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        target: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
        parameters: z.ZodOptional<z.ZodObject<{
            replacements: z.ZodOptional<z.ZodArray<z.ZodObject<{
                search: z.ZodString;
                replace: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                replace: string;
                search: string;
            }, {
                replace: string;
                search: string;
            }>, "many">>;
            useRegex: z.ZodDefault<z.ZodBoolean>;
            caseSensitive: z.ZodDefault<z.ZodBoolean>;
            scope: z.ZodOptional<z.ZodObject<{
                paths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                folders: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                folders?: string[] | undefined;
                paths?: string[] | undefined;
            }, {
                folders?: string[] | undefined;
                paths?: string[] | undefined;
            }>>;
            overwrite: z.ZodDefault<z.ZodBoolean>;
            recursive: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            overwrite: boolean;
            recursive: boolean;
            caseSensitive: boolean;
            useRegex: boolean;
            scope?: {
                folders?: string[] | undefined;
                paths?: string[] | undefined;
            } | undefined;
            replacements?: {
                replace: string;
                search: string;
            }[] | undefined;
        }, {
            scope?: {
                folders?: string[] | undefined;
                paths?: string[] | undefined;
            } | undefined;
            overwrite?: boolean | undefined;
            recursive?: boolean | undefined;
            caseSensitive?: boolean | undefined;
            useRegex?: boolean | undefined;
            replacements?: {
                replace: string;
                search: string;
            }[] | undefined;
        }>>;
        options: z.ZodOptional<z.ZodObject<{
            updateLinks: z.ZodDefault<z.ZodBoolean>;
            createBackup: z.ZodDefault<z.ZodBoolean>;
            dryRun: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            updateLinks: boolean;
            createBackup: boolean;
            dryRun: boolean;
        }, {
            updateLinks?: boolean | undefined;
            createBackup?: boolean | undefined;
            dryRun?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        operation: "move" | "rename" | "copy" | "delete" | "create-dir" | "delete-dir" | "find-replace";
        source: string;
        options?: {
            updateLinks: boolean;
            createBackup: boolean;
            dryRun: boolean;
        } | undefined;
        target?: string | undefined;
        parameters?: {
            overwrite: boolean;
            recursive: boolean;
            caseSensitive: boolean;
            useRegex: boolean;
            scope?: {
                folders?: string[] | undefined;
                paths?: string[] | undefined;
            } | undefined;
            replacements?: {
                replace: string;
                search: string;
            }[] | undefined;
        } | undefined;
    }, {
        operation: "move" | "rename" | "copy" | "delete" | "create-dir" | "delete-dir" | "find-replace";
        source: string;
        options?: {
            updateLinks?: boolean | undefined;
            createBackup?: boolean | undefined;
            dryRun?: boolean | undefined;
        } | undefined;
        target?: string | undefined;
        parameters?: {
            scope?: {
                folders?: string[] | undefined;
                paths?: string[] | undefined;
            } | undefined;
            overwrite?: boolean | undefined;
            recursive?: boolean | undefined;
            caseSensitive?: boolean | undefined;
            useRegex?: boolean | undefined;
            replacements?: {
                replace: string;
                search: string;
            }[] | undefined;
        } | undefined;
    }>;
};
/**
 * Validate input parameters for a specific tool
 */
export declare function validateToolInput<T>(toolName: string, input: any): T;
/**
 * Enhanced error handling with structured logging
 */
export declare function handleValidationError(error: Error, toolName: string, input: any): never;
//# sourceMappingURL=validation.d.ts.map