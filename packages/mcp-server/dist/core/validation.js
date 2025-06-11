import { z } from 'zod';
import { LoggedError } from './logger.js';
/**
 * Comprehensive input validation schemas and utilities
 */
// Common validation patterns
const PathSchema = z.string()
    .min(1, 'Path cannot be empty')
    .max(500, 'Path too long (max 500 characters)')
    .refine(path => !path.includes('..'), 'Path cannot contain ".." for security')
    .refine(path => !/[<>:"|?*]/.test(path), 'Path contains invalid characters');
const SearchQuerySchema = z.string()
    .min(1, 'Search query cannot be empty')
    .max(1000, 'Search query too long (max 1000 characters)')
    .refine(query => query.trim().length > 0, 'Search query cannot be only whitespace');
const LimitSchema = z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(500, 'Limit too high (max 500)');
const TagSchema = z.string()
    .min(1, 'Tag cannot be empty')
    .max(100, 'Tag too long (max 100 characters)')
    .refine(tag => /^[a-zA-Z0-9/_-]+$/.test(tag), 'Invalid tag format');
// Consolidated tool validation schemas
export const ValidationSchemas = {
    // Semantic Search Schema
    SemanticSearch: z.object({
        query: SearchQuerySchema,
        filters: z.object({
            folders: z.array(z.string()).optional(),
            tags: z.array(TagSchema).optional(),
            linkedTo: z.array(z.string()).optional(),
            hasProperty: z.record(z.any()).optional(),
            dateRange: z.object({
                start: z.string().datetime().optional(),
                end: z.string().datetime().optional()
            }).optional()
        }).optional(),
        options: z.object({
            expandSearch: z.boolean().default(false),
            searchDepth: z.number().int().min(0).max(5).default(1),
            limit: z.number().int().min(1).max(500).default(50),
            threshold: z.number().min(0).max(1).default(0.7)
        }).optional()
    }),
    // Pattern Search Schema  
    PatternSearch: z.object({
        patterns: z.array(z.string().min(1)).min(1),
        scope: z.object({
            paths: z.array(z.string()).optional(),
            folders: z.array(z.string()).optional(),
            tags: z.array(TagSchema).optional(),
            filePattern: z.string().optional(),
            excludePaths: z.array(z.string()).optional(),
            excludeFolders: z.array(z.string()).optional(),
            dateRange: z.object({
                start: z.string().datetime().optional(),
                end: z.string().datetime().optional()
            }).optional()
        }).optional(),
        options: z.object({
            caseSensitive: z.boolean().default(false),
            wholeWord: z.boolean().default(false),
            contextWindow: z.number().int().min(0).max(10).default(2),
            maxMatches: z.number().int().min(1).optional(),
            includeStatistics: z.boolean().default(false)
        }).optional()
    }),
    ConsolidatedSearch: z.object({
        query: SearchQuerySchema,
        mode: z.enum(['semantic', 'structural', 'hybrid', 'pattern']).default('hybrid'),
        filters: z.object({
            tags: z.array(TagSchema).optional(),
            folders: z.array(PathSchema).optional(),
            dateRange: z.object({
                start: z.string().datetime().optional(),
                end: z.string().datetime().optional()
            }).optional()
        }).optional(),
        options: z.object({
            expandSearch: z.boolean().default(false),
            searchDepth: z.number().int().min(0).max(5).default(1),
            limit: z.number().int().min(1).max(500).default(50),
            useRegex: z.boolean().default(false),
            caseSensitive: z.boolean().default(false),
            contextWindow: z.number().int().min(0).max(10).default(2)
        }).optional()
    }),
    ConsolidatedGetNotes: z.object({
        target: z.union([
            PathSchema,
            z.array(PathSchema)
        ]),
        options: z.object({
            format: z.enum(['markdown', 'json']).default('markdown'),
            includeContent: z.boolean().default(true),
            includeMetadata: z.boolean().default(true),
            includeStat: z.boolean().default(false)
        }).optional()
    }),
    ConsolidatedWriteNote: z.object({
        targetType: z.enum(['path', 'active']).default('path'),
        targetIdentifier: z.string().optional(),
        content: z.string().min(0).max(100000),
        mode: z.enum(['whole-file', 'relative']).default('whole-file'),
        wholeFileMode: z.enum(['overwrite', 'append', 'prepend']).default('overwrite'),
        relativeMode: z.object({
            operation: z.enum(['append', 'prepend', 'replace']),
            targetType: z.enum(['heading', 'frontmatter']),
            target: z.string().min(1)
        }).optional()
    }).refine((data) => {
        // targetIdentifier is required when targetType is 'path'
        if (data.targetType === 'path' && !data.targetIdentifier) {
            return false;
        }
        // relativeMode is required when mode is 'relative'
        if (data.mode === 'relative' && !data.relativeMode) {
            return false;
        }
        return true;
    }, {
        message: "targetIdentifier is required when targetType is 'path', and relativeMode is required when mode is 'relative'"
    }),
    ConsolidatedExplore: z.object({
        mode: z.enum(['overview', 'list']).default('list'),
        scope: z.object({
            folder: PathSchema.optional(),
            recursive: z.boolean().default(false)
        }).optional(),
        options: z.object({
            limit: z.number().int().min(1).default(100)
        }).optional()
    }),
    ConsolidatedRelationships: z.object({
        target: PathSchema,
        analysis: z.array(z.enum(['backlinks'])).default(['backlinks'])
    }),
    ConsolidatedAnalyze: z.object({
        target: z.union([
            PathSchema,
            z.array(PathSchema)
        ]),
        analysis: z.array(z.enum(['structure', 'sections', 'elements', 'themes', 'quality', 'readability', 'connections', 'metadata'])).default(['structure']),
        sectionIdentifiers: z.array(z.union([
            z.string(),
            z.object({
                type: z.enum(['heading', 'line_range', 'pattern']),
                value: z.union([
                    z.string(),
                    z.object({
                        start: z.number().int().min(1),
                        end: z.number().int().min(1)
                    })
                ]),
                level: z.number().int().min(1).max(6).optional()
            })
        ])).optional(),
        options: z.object({
            extractTypes: z.array(z.enum(['headings', 'lists', 'code_blocks', 'tasks', 'quotes', 'tables', 'links', 'embeds'])).default(['headings']),
            includeHierarchy: z.boolean().default(true),
            includeContext: z.boolean().default(false),
            includeSectionContext: z.boolean().default(true),
            includeMetadata: z.boolean().default(true),
            contextWindow: z.number().int().min(0).max(10).default(1),
            minHeadingLevel: z.number().int().min(1).max(6).optional(),
            maxHeadingLevel: z.number().int().min(1).max(6).optional(),
            minSectionLength: z.number().int().min(0).optional()
        }).optional()
    }),
    ConsolidatedManage: z.object({
        operation: z.enum(['move', 'rename', 'copy', 'delete', 'create-dir', 'delete-dir', 'find-replace']),
        source: PathSchema,
        target: PathSchema.optional(),
        parameters: z.object({
            replacements: z.array(z.object({
                search: z.string(),
                replace: z.string()
            })).optional(),
            useRegex: z.boolean().default(false),
            caseSensitive: z.boolean().default(false),
            scope: z.object({
                paths: z.array(z.string()).optional(),
                folders: z.array(z.string()).optional()
            }).optional(),
            overwrite: z.boolean().default(false),
            recursive: z.boolean().default(false)
        }).optional(),
        options: z.object({
            updateLinks: z.boolean().default(true),
            createBackup: z.boolean().default(false),
            dryRun: z.boolean().default(false)
        }).optional()
    })
};
/**
 * Preprocess tool arguments to handle JSON strings that should be arrays
 */
function preprocessToolArguments(toolName, input) {
    if (!input || typeof input !== 'object') {
        return input;
    }
    // Create a copy to avoid mutating the original input
    const processed = { ...input };
    // Define which tools have array parameters that might come as JSON strings
    const toolArrayParams = {
        'obsidian_get_notes': ['target'],
        'obsidian_pattern_search': ['patterns'],
        'obsidian_semantic_search': ['filters.linkedTo', 'filters.folders', 'filters.tags'],
        'obsidian_relationships': ['target', 'relationshipTypes'],
        'obsidian_analyze': ['target', 'analysis', 'sectionIdentifiers'],
        'obsidian_manage': ['parameters.replacements']
    };
    const arrayParams = toolArrayParams[toolName];
    if (!arrayParams) {
        return processed;
    }
    // Helper function to safely parse JSON strings that look like arrays
    function tryParseJsonArray(value) {
        if (typeof value !== 'string') {
            return value;
        }
        // Check if it looks like a JSON array (starts with [ and ends with ])
        const trimmed = value.trim();
        if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
            return value;
        }
        try {
            const parsed = JSON.parse(trimmed);
            // Only return parsed value if it's actually an array
            return Array.isArray(parsed) ? parsed : value;
        }
        catch (error) {
            // If parsing fails, return the original value
            return value;
        }
    }
    // Helper function to get nested property value
    function getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    // Helper function to set nested property value
    function setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key])
                current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    // Process each array parameter
    for (const param of arrayParams) {
        const currentValue = getNestedValue(processed, param);
        if (currentValue !== undefined) {
            const parsedValue = tryParseJsonArray(currentValue);
            if (parsedValue !== currentValue) {
                setNestedValue(processed, param, parsedValue);
            }
        }
    }
    return processed;
}
/**
 * Validate input parameters for a specific tool
 */
export function validateToolInput(toolName, input) {
    try {
        // Preprocess the input to handle JSON strings that should be arrays
        const preprocessedInput = preprocessToolArguments(toolName, input);
        const schemaKey = toolNameToSchemaKey(toolName);
        const schema = ValidationSchemas[schemaKey];
        if (!schema) {
            throw new LoggedError(`No validation schema found for tool: ${toolName}`);
        }
        return schema.parse(preprocessedInput);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
            throw new LoggedError(`Invalid input for ${toolName}: ${issues}`);
        }
        throw error;
    }
}
/**
 * Map tool names to schema keys
 */
function toolNameToSchemaKey(toolName) {
    const mapping = {
        // Consolidated tools - 8 tools matching CONSOLIDATED_OBSIDIAN_TOOLS
        'obsidian_semantic_search': 'SemanticSearch',
        'obsidian_pattern_search': 'PatternSearch',
        'obsidian_get_notes': 'ConsolidatedGetNotes',
        'obsidian_write_content': 'ConsolidatedWriteNote',
        'obsidian_explore': 'ConsolidatedExplore',
        'obsidian_relationships': 'ConsolidatedRelationships',
        'obsidian_analyze': 'ConsolidatedAnalyze',
        'obsidian_manage': 'ConsolidatedManage'
    };
    return mapping[toolName] || toolName;
}
/**
 * Enhanced error handling with structured logging
 */
export function handleValidationError(error, toolName, input) {
    if (error instanceof LoggedError) {
        throw error;
    }
    // Log the validation failure for debugging
    console.error('Validation failed', {
        tool: toolName,
        error: error.message,
        input: typeof input === 'string' ? input.substring(0, 200) : JSON.stringify(input).substring(0, 200)
    });
    throw new LoggedError(`Validation failed for ${toolName}: ${error.message}`);
}
