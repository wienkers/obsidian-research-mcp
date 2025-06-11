import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Consolidated MCP Tools for Enhanced Claude Experience
 * Reduced from 21 tools to 8 polymorphic tools to minimize cognitive overhead
 */
export const CONSOLIDATED_OBSIDIAN_TOOLS: Tool[] = [
  // 1. SEMANTIC SEARCH TOOL (Smart Connections only)
  {
    name: 'obsidian_semantic_search',
    description: 'Perform semantic search using Smart Connections with advanced filtering and link expansion. Searches by meaning and concept similarity.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: 'Natural language search query for semantic search' 
        },
        filters: {
          type: 'object',
          properties: {
            folders: { type: 'array', items: { type: 'string' }, description: 'Filter by specific folders' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Filter by specific tags' },
            linkedTo: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'Filter notes that link to these files. Accepts filenames with or without .md extension (e.g., ["Research Notes", "Bibliography.md"] or ["project.md", "index"]). Supports relative paths within the vault.' 
            },
            hasProperty: { type: 'object', description: 'Filter by frontmatter properties' },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' }
              },
              description: 'Modification date range'
            }
          }
        },
        options: {
          type: 'object',
          properties: {
            expandSearch: { type: 'boolean', default: false, description: 'Expand search to linked notes' },
            searchDepth: { type: 'integer', minimum: 0, maximum: 5, default: 1, description: 'Link expansion depth' },
            limit: { type: 'integer', minimum: 1, maximum: 500, default: 50, description: 'Maximum results to return' },
            threshold: { type: 'number', minimum: 0, maximum: 1, default: 0.7, description: 'Semantic similarity threshold' }
          }
        }
      },
      required: ['query']
    }
  },

  // 2. PATTERN SEARCH TOOL (Regex with advanced features)
  {
    name: 'obsidian_pattern_search',
    description: 'Search for regex patterns across vault content with advanced scoping, statistics, and insights. Supports multiple patterns and exclusion filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        patterns: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of regex patterns to search for' 
        },
        scope: {
          type: 'object',
          properties: {
            paths: { type: 'array', items: { type: 'string' }, description: 'Specific file paths to search' },
            folders: { type: 'array', items: { type: 'string' }, description: 'Folders to search within' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Only search files with these tags' },
            filePattern: { type: 'string', description: 'File name pattern to match (glob syntax)' },
            excludePaths: { type: 'array', items: { type: 'string' }, description: 'File paths to exclude from search' },
            excludeFolders: { type: 'array', items: { type: 'string' }, description: 'Folders to exclude from search' },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' }
              },
              description: 'Date range to limit search to'
            }
          }
        },
        options: {
          type: 'object',
          properties: {
            caseSensitive: { type: 'boolean', default: false, description: 'Case sensitive pattern matching' },
            wholeWord: { type: 'boolean', default: false, description: 'Match whole words only' },
            contextWindow: { type: 'integer', minimum: 0, maximum: 10, default: 2, description: 'Lines of context around matches. Context includes up to 2 non-blank lines before and after each match.' },
            maxMatches: { type: 'integer', minimum: 1, description: 'Maximum number of matches to return' },
            includeStatistics: { type: 'boolean', default: false, description: 'Include pattern statistics and frequency analysis' },
            includeMetadata: { type: 'boolean', default: false, description: 'Include detailed match metadata (timestamp, position, length). Useful for debugging or precise text manipulation. Timestamps are JavaScript millisecond timestamps.' }
          }
        }
      },
      required: ['patterns']
    }
  },

  // 3. UNIFIED NOTE RETRIEVAL (replaces obsidian_get_note + obsidian_get_multiple_notes)
  {
    name: 'obsidian_get_notes',
    description: 'Retrieve single or multiple notes by file path with comprehensive content, metadata, and statistics. Supports markdown/JSON formats, file statistics (creation/modification times, size, token estimates), frontmatter, tags, links, and backlinks.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          oneOf: [
            { type: 'string', description: 'Single file path' },
            { type: 'array', items: { type: 'string' }, description: 'Multiple file paths' }
          ]
        },
        options: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
            includeContent: { type: 'boolean', default: true },
            includeMetadata: { type: 'boolean', default: true },
            includeStat: { type: 'boolean', default: false, description: 'Include file statistics (creation time, modification time, size, token count estimate)' }
          }
        }
      },
      required: ['target']
    }
  },

  // 4. UNIFIED NOTE WRITING (replaces obsidian_write_note + obsidian_update_note)
  {
    name: 'obsidian_write_content',
    description: 'Create, update, or modify notes with flexible targeting and positioning strategies. Supports whole-file operations (overwrite/append/prepend) and relative positioning (section-based operations).',
    inputSchema: {
      type: 'object',
      properties: {
        targetType: {
          type: 'string',
          enum: ['path', 'active'],
          default: 'path',
          description: 'Target selection method: path (specify file path) or active (currently active note in Obsidian)'
        },
        targetIdentifier: {
          type: 'string',
          description: 'File path (required when targetType is "path")'
        },
        content: {
          type: 'string',
          description: 'Content to write, append, prepend, or insert'
        },
        mode: {
          type: 'string',
          enum: ['whole-file', 'relative'],
          default: 'whole-file',
          description: 'Operation mode: whole-file (operate on entire file) or relative (operate relative to specific sections)'
        },
        wholeFileMode: {
          type: 'string',
          enum: ['overwrite', 'append', 'prepend'],
          default: 'overwrite',
          description: 'Whole-file operation: overwrite (replace entire content), append (add to end), prepend (add to beginning)'
        },
        relativeMode: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['append', 'prepend', 'replace'],
              description: 'Section operation: append (after target), prepend (before target), replace (replace target section)'
            },
            targetType: {
              type: 'string',
              enum: ['heading', 'frontmatter'],
              description: 'Anchor point type: heading (markdown heading) or frontmatter (YAML frontmatter)'
            },
            target: {
              type: 'string',
              description: 'Specific target identifier (heading text or frontmatter key)'
            }
          },
          required: ['operation', 'targetType', 'target'],
          description: 'Relative positioning configuration (required when mode is "relative")'
        }
      },
      required: ['content'],
      oneOf: [
        {
          properties: {
            targetType: { const: 'path' }
          },
          required: ['targetIdentifier']
        },
        {
          properties: {
            targetType: { const: 'active' }
          }
        }
      ]
    }
  },

  // 5. VAULT NAVIGATION & ANALYSIS (replaces obsidian_list_files + obsidian_get_vault_overview + obsidian_get_recent_notes)
  {
    name: 'obsidian_explore',
    description: 'Vault exploration with filtering capabilities. Provides overview mode (file counts) or file listing with advanced filtering options.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['overview', 'list'],
          default: 'list',
          description: 'overview: file counts, list: file listing with metadata'
        },
        scope: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Folder to explore' },
            recursive: { type: 'boolean', default: false, description: 'Include subfolders recursively' }
          }
        },
        filters: {
          type: 'object',
          properties: {
            extensions: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'File extensions to include (e.g., ["md", "txt"])' 
            },
            namePattern: { 
              type: 'string', 
              description: 'Regex pattern for filename matching' 
            },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time', description: 'Start date for modification time filter' },
                end: { type: 'string', format: 'date-time', description: 'End date for modification time filter' }
              },
              description: 'Filter files by modification date range'
            },
            excludePatterns: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'Array of regex patterns to exclude from results' 
            }
          },
          description: 'Filtering options for file selection'
        },
        options: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, default: 100, description: 'Maximum number of files to return' }
          }
        }
      }
    }
  },

  // 6. RELATIONSHIP ANALYSIS (replaces obsidian_get_backlinks + obsidian_get_graph_context + obsidian_get_file_relationships)
  {
    name: 'obsidian_relationships',
    description: 'Comprehensive relationship analysis for single or multiple files including backlinks, forward links, tags, mentions, and embeds with contextual information.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          oneOf: [
            { type: 'string', description: 'Single note path to analyze' },
            { type: 'array', items: { type: 'string' }, description: 'Multiple note paths to analyze' }
          ]
        },
        relationshipTypes: {
          type: 'array',
          items: { 
            type: 'string', 
            enum: ['backlinks', 'links', 'tags', 'mentions', 'embeds', 'all'] 
          },
          default: ['backlinks'],
          description: 'Types of relationships to analyze: backlinks (incoming links), links (outgoing links), tags (tag relationships), mentions (unlinked mentions), embeds (embedded content)'
        },
        includeContext: {
          type: 'boolean',
          default: true,
          description: 'Whether to include contextual snippets around relationships'
        },
        maxResults: {
          type: 'integer',
          minimum: 1,
          maximum: 500,
          description: 'Maximum number of relationships to return per file per relationship type'
        },
        strengthThreshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          default: 0.0,
          description: 'Minimum relationship strength to include (0.0 = include all)'
        }
      },
      required: ['target']
    }
  },

  // 7. CONTENT ANALYSIS (replaces obsidian_extract_structure)
  {
    name: 'obsidian_analyze',
    description: 'Extract structural elements from notes with advanced section targeting capabilities. Supports 8 analysis types (structure/sections/elements/themes/quality/readability/connections/metadata), 8 extract types (headings/lists/code_blocks/tasks/quotes/tables/links/embeds), and sophisticated section identification (heading/line_range/pattern targeting).',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          oneOf: [
            { type: 'string', description: 'Single file path' },
            { type: 'array', items: { type: 'string' }, description: 'Multiple file paths' }
          ]
        },
        analysis: {
          type: 'array',
          items: { type: 'string', enum: ['structure', 'sections', 'elements', 'themes', 'quality', 'readability', 'connections', 'metadata'] },
          default: ['structure'],
          description: 'Analysis types: structure (element extraction with hierarchy), sections (advanced section targeting with metadata), elements/themes/quality/readability/connections/metadata (all use structure extraction engine)'
        },
        sectionIdentifiers: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'string', description: 'Simple heading text to match' },
              {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['heading', 'line_range', 'pattern'], description: 'Section identification method' },
                  value: {
                    oneOf: [
                      { type: 'string', description: 'Heading text or regex pattern' },
                      {
                        type: 'object',
                        properties: {
                          start: { type: 'integer', minimum: 1, description: 'Starting line number' },
                          end: { type: 'integer', minimum: 1, description: 'Ending line number' }
                        },
                        required: ['start', 'end'],
                        description: 'Line range for precise targeting'
                      }
                    ]
                  },
                  level: { type: 'integer', minimum: 1, maximum: 6, description: 'Heading level (1-6) for heading type targeting' }
                },
                required: ['type', 'value'],
                description: 'Complex section identifier with type-specific targeting'
              }
            ]
          },
          description: 'Section identifiers for advanced targeting (triggers sections analysis)'
        },
        options: {
          type: 'object',
          properties: {
            extractTypes: {
              type: 'array',
              items: { type: 'string', enum: ['headings', 'lists', 'code_blocks', 'tasks', 'quotes', 'tables', 'links', 'embeds'] },
              default: ['headings']
            },
            includeHierarchy: { type: 'boolean', default: true },
            includeContext: { type: 'boolean', default: false },
            includeSectionContext: { type: 'boolean', default: true, description: 'Include section relationships (parent, subsections, preceding/following)' },
            includeMetadata: { type: 'boolean', default: true, description: 'Include section metadata (word count, content types, line count)' },
            contextWindow: { type: 'integer', minimum: 0, maximum: 10, default: 1 },
            minHeadingLevel: { type: 'integer', minimum: 1, maximum: 6 },
            maxHeadingLevel: { type: 'integer', minimum: 1, maximum: 6 },
            minSectionLength: { type: 'integer', minimum: 0, description: 'Minimum section content length to include' }
          }
        }
      },
      required: ['target']
    }
  },

  // 8. FILE & DIRECTORY MANAGEMENT (replaces obsidian_files + obsidian_batch + file operations)
  {
    name: 'obsidian_manage',
    description: 'Comprehensive file and directory management with automatic link integrity maintenance. Handles file operations (move, rename, copy, delete), directory operations, and batch text operations.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['move', 'rename', 'copy', 'delete', 'create-dir', 'delete-dir', 'find-replace'],
          description: 'File/directory operation to perform'
        },
        source: { 
          type: 'string', 
          description: 'Source file/directory path' 
        },
        target: { 
          type: 'string', 
          description: 'Target path (for move, rename, copy operations)' 
        },
        parameters: {
          type: 'object',
          properties: {
            replacements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  search: { type: 'string', description: 'Text or regex pattern to find' },
                  replace: { type: 'string', description: 'Replacement text' }
                },
                required: ['search', 'replace']
              },
              description: 'Search/replace operations for find-replace operation'
            },
            useRegex: { type: 'boolean', default: false, description: 'Use regex patterns in replacements' },
            caseSensitive: { type: 'boolean', default: false, description: 'Case sensitive search' },
            scope: {
              type: 'object',
              properties: {
                paths: { type: 'array', items: { type: 'string' }, description: 'Specific file paths to target' },
                folders: { type: 'array', items: { type: 'string' }, description: 'Folder paths to target' }
              },
              description: 'Scope for find-replace operation'
            },
            overwrite: { type: 'boolean', default: false, description: 'Overwrite existing files in copy operations' },
            recursive: { type: 'boolean', default: false, description: 'Recursive operation for directory operations' }
          }
        },
        options: {
          type: 'object',
          properties: {
            updateLinks: { type: 'boolean', default: true, description: 'Automatically update links for move/rename operations (always true for delete)' },
            createBackup: { type: 'boolean', default: false, description: 'Create backup before destructive operations' },
            dryRun: { type: 'boolean', default: false, description: 'Preview changes without executing' }
          }
        }
      },
      required: ['operation', 'source']
    }
  }
];

// Validation functions for consolidated tools
export function validateSemanticSearchParams(input: any) {
  if (!input.query || typeof input.query !== 'string') {
    throw new Error('Search query must be a non-empty string');
  }
  if (input.options?.threshold && (input.options.threshold < 0 || input.options.threshold > 1)) {
    throw new Error('Threshold must be between 0 and 1');
  }
  
  // Validate and normalize linkedTo parameter if present
  if (input.filters?.linkedTo) {
    try {
      input.filters.linkedTo = validateLinkedToParams(input.filters.linkedTo);
    } catch (error) {
      throw new Error(`LinkedTo validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return input;
}

export function validatePatternSearchParams(input: any) {
  if (!input.patterns || !Array.isArray(input.patterns) || input.patterns.length === 0) {
    throw new Error('Patterns must be a non-empty array of regex patterns');
  }
  
  // Validate regex patterns
  for (const pattern of input.patterns) {
    if (typeof pattern !== 'string' || pattern.trim().length === 0) {
      throw new Error('All patterns must be non-empty strings');
    }
    try {
      new RegExp(pattern);
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${pattern} - ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return input;
}

export function validateTargetInput(input: any) {
  if (!input.target) {
    throw new Error('Target is required');
  }
  
  if (typeof input.target === 'string') {
    if (input.target.trim().length === 0) {
      throw new Error('Target path cannot be empty');
    }
  } else if (Array.isArray(input.target)) {
    if (input.target.length === 0) {
      throw new Error('Target array cannot be empty');
    }
    for (const path of input.target) {
      if (typeof path !== 'string' || path.trim().length === 0) {
        throw new Error('All target paths must be non-empty strings');
      }
    }
  }
  
  return input;
}

export function validateLinkedToParams(linkedTo: any): string[] {
  if (!linkedTo) {
    return [];
  }
  
  if (!Array.isArray(linkedTo)) {
    throw new Error('LinkedTo must be an array of file paths');
  }
  
  const normalizedPaths: string[] = [];
  
  for (let i = 0; i < linkedTo.length; i++) {
    const path = linkedTo[i];
    
    if (typeof path !== 'string') {
      throw new Error(`LinkedTo item at index ${i} must be a string`);
    }
    
    const trimmedPath = path.trim();
    if (trimmedPath.length === 0) {
      throw new Error(`LinkedTo item at index ${i} cannot be empty`);
    }
    
    if (trimmedPath.length > 500) {
      throw new Error(`LinkedTo item at index ${i} is too long (max 500 characters)`);
    }
    
    // Clean path first: remove query parameters and fragments
    const cleanPath = trimmedPath.split('?')[0].split('#')[0];
    
    // Security checks on cleaned path
    if (cleanPath.includes('\0')) {
      throw new Error(`LinkedTo item at index ${i} cannot contain null bytes`);
    }
    
    if (cleanPath.match(/\.\.[/\\]/)) {
      throw new Error(`LinkedTo item at index ${i} cannot contain directory traversal`);
    }
    
    if (/[<>"|*]/.test(cleanPath)) {
      throw new Error(`LinkedTo item at index ${i} contains invalid characters`);
    }
    
    if (cleanPath.startsWith('/') || cleanPath.match(/^[a-zA-Z]:/)) {
      throw new Error(`LinkedTo item at index ${i} should be a relative path within the vault`);
    }
    
    // Check for reserved filenames (both with and without extensions)
    const basename = cleanPath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    if (basename.match(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i)) {
      throw new Error(`LinkedTo item at index ${i} is a reserved filename`);
    }
    
    // Normalize path: add .md extension if no extension present
    const normalizedPath = (!cleanPath.endsWith('.md') && !cleanPath.includes('.')) 
      ? cleanPath + '.md' 
      : cleanPath;
    
    normalizedPaths.push(normalizedPath);
  }
  
  return normalizedPaths;
}