import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Optimized MCP Tool Schemas for Enhanced Claude Experience
 * Token-efficient, information-dense schemas covering full functionality
 */
export const CONSOLIDATED_OBSIDIAN_TOOLS: Tool[] = [
  // 1. SEMANTIC SEARCH - Smart Connections only, concept-based search
  {
    name: 'obsidian_semantic_search',
    description: 'Concept-based search via Smart Connections. Finds conceptually related content using meaning/context similarity rather than keyword matching. Returns compact result summaries with contextual snippets.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: 'Natural language concept query. Optimized for: research topics, thematic exploration, conceptual relationships.'
        },
        filters: {
          type: 'object',
          properties: {
            folders: { type: 'array', items: { type: 'string' }, description: 'Path prefixes: ["Research/", "Notes/"]' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Exact tag matches (case-sensitive)' },
            linkedTo: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'Files linking to targets. Accepts: basenames ("Note") or paths ("folder/note.md"). Auto-normalized.'
            },
            hasProperty: { type: 'object', description: 'Frontmatter key-value pairs. Supports nested objects.' },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        options: {
          type: 'object',
          properties: {
            expandSearch: { type: 'boolean', default: false, description: 'Follow backlinks/forward links. WARNING: Can significantly increase result count and output size.' },
            searchDepth: { type: 'integer', minimum: 0, maximum: 5, default: 1, description: 'Link traversal levels. 0=none, 1=direct, 2=recommended max for manageable output.' },
            limit: { type: 'integer', minimum: 1, maximum: 500, default: 50 },
            threshold: { type: 'number', minimum: 0, maximum: 1, default: 0.7, description: 'Similarity cutoff. 0.5=broad results, 0.7=balanced, 0.9=precise matches only.' }
          }
        }
      },
      required: ['query'],
      additionalProperties: false
    }
  },

  // 2. PATTERN SEARCH - Regex with statistics and context
  {
    name: 'obsidian_pattern_search',
    description: 'Regex pattern extraction with statistics and context. Use for: structured data mining, format analysis, content auditing. Context windows and statistics significantly increase output volume.',
    inputSchema: {
      type: 'object',
      properties: {
        patterns: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Validated regex patterns. Examples: date extraction "\\\\b\\\\d{4}-\\\\d{2}-\\\\d{2}\\\\b", TODO items "TODO:.*", headings "^#{2}\\\\s+(.+)$"'
        },
        scope: {
          type: 'object',
          description: 'Search boundaries. Combine for intersection, exclude for subtraction.',
          properties: {
            paths: { type: 'array', items: { type: 'string' }, description: 'Explicit file list' },
            folders: { type: 'array', items: { type: 'string' }, description: 'Directory trees' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Files with ANY listed tags' },
            filePattern: { type: 'string', description: 'Filename glob: "*.md", "draft-*"' },
            excludePaths: { type: 'array', items: { type: 'string' } },
            excludeFolders: { type: 'array', items: { type: 'string' } },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        options: {
          type: 'object',
          properties: {
            caseSensitive: { type: 'boolean', default: false },
            wholeWord: { type: 'boolean', default: false, description: 'Wraps patterns in \\\\b boundaries' },
            contextWindow: { type: 'integer', minimum: 0, maximum: 10, default: 2, description: 'Lines before/after matches. Higher values dramatically increase response size.' },
            maxMatches: { type: 'integer', minimum: 1, description: 'Result limiter to control output volume' },
            includeStatistics: { type: 'boolean', default: false, description: 'Pattern frequency analysis and file distribution. Adds comprehensive analytical data to output.' },
            includeMetadata: { type: 'boolean', default: false, description: 'Debug info: timestamps, positions. Development use - increases output size.' }
          }
        }
      },
      required: ['patterns'],
      additionalProperties: false
    }
  },

  // 3. NOTE RETRIEVAL - Single/multiple with stats and formats
  {
    name: 'obsidian_get_notes',
    description: 'Single/batch note retrieval with metadata and file statistics. Batch operations return structured data for multiple files. Statistics add formatted timestamps and content metrics to output.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          oneOf: [
            { type: 'string', description: 'Single file path. Auto-resolves basenames to full paths.' },
            { type: 'array', items: { type: 'string' }, description: 'Multiple paths for batch processing. More efficient than sequential calls.' }
          ]
        },
        options: {
          type: 'object',
          properties: {
            format: { 
              type: 'string', 
              enum: ['markdown', 'json'], 
              default: 'markdown',
              description: 'Response format. JSON includes structured metadata, markdown optimized for direct display.'
            },
            includeContent: { type: 'boolean', default: true, description: 'Content body. Disable for metadata-only queries to reduce output size.' },
            includeMetadata: { 
              type: 'boolean', 
              default: true, 
              description: 'Frontmatter, tags, links, backlinks. Backlinks computed from cached index.'
            },
            includeStat: { 
              type: 'boolean', 
              default: false, 
              description: 'File statistics: formatted timestamps, size in bytes, estimated token count. Adds significant metadata to each file result.'
            }
          }
        }
      },
      required: ['target'],
      additionalProperties: false
    }
  },

  // 4. CONTENT WRITING - Precise positioning system
  {
    name: 'obsidian_write_content',
    description: 'Precise content insertion with automatic frontmatter preservation. Supports whole-file operations and surgical section targeting. Link integrity maintained automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        targetType: {
          type: 'string',
          enum: ['path', 'active'],
          default: 'path',
          description: 'Target: explicit path or currently active Obsidian file'
        },
        targetIdentifier: {
          type: 'string',
          description: 'File path when targetType="path". Creates file if non-existent.'
        },
        content: {
          type: 'string',
          description: 'Content to insert. Markdown formatting preserved.'
        },
        mode: {
          type: 'string',
          enum: ['whole-file', 'relative'],
          default: 'whole-file',
          description: 'Operation scope: entire file vs targeted section insertion'
        },
        wholeFileMode: {
          type: 'string',
          enum: ['overwrite', 'append', 'prepend'],
          default: 'overwrite',
          description: 'overwrite=replace entire content, append=add to end, prepend=add after frontmatter or beginning'
        },
        relativeMode: {
          type: 'object',
          description: 'Surgical insertion configuration. Required when mode="relative".',
          properties: {
            operation: {
              type: 'string',
              enum: ['append', 'prepend', 'replace'],
              description: 'Position relative to target: append=after, prepend=before, replace=substitute'
            },
            targetType: {
              type: 'string',
              enum: ['heading', 'frontmatter', 'line_range'],
              description: 'Anchor type: heading=markdown heading text, frontmatter=YAML key, line_range=precise line numbers'
            },
            target: {
              oneOf: [
                { type: 'string', description: 'Heading text or frontmatter key (exact match)' },
                {
                  type: 'object',
                  properties: {
                    start: { type: 'integer', minimum: 1, description: '1-based line number' },
                    end: { type: 'integer', minimum: 1, description: '1-based line number (inclusive)' }
                  },
                  required: ['start', 'end'],
                  description: 'Line range for precise targeting. Max 10,000 lines for manageable processing.'
                }
              ]
            }
          },
          required: ['operation', 'targetType', 'target']
        }
      },
      required: ['content'],
      oneOf: [
        { properties: { targetType: { const: 'path' } }, required: ['targetIdentifier'] },
        { properties: { targetType: { const: 'active' } } }
      ],
      additionalProperties: false
    }
  },

  // 5. VAULT EXPLORATION - Filtered navigation
  {
    name: 'obsidian_explore',
    description: 'Vault navigation with content statistics. Overview mode returns summary counts, list mode provides detailed file information with content statistics for text files.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['overview', 'list'],
          default: 'list',
          description: 'overview=aggregated counts only, list=detailed file listing with metadata and content stats'
        },
        scope: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Starting folder path. Omit for vault root.' },
            recursive: { type: 'boolean', default: true, description: 'Include subdirectories recursively' }
          }
        },
        filters: {
          type: 'object',
          description: 'Combinatorial filtering. Multiple filters use AND logic.',
          properties: {
            extensions: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'File extensions: ["md", "pdf"]. Excludes folders when active.'
            },
            namePattern: { type: 'string', description: 'Regex pattern for filename matching. Case-insensitive.' },
            dateRange: {
              type: 'object',
              description: 'Filter by file modification time',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' }
              }
            },
            excludePatterns: { type: 'array', items: { type: 'string' }, description: 'Regex exclusion patterns' }
          }
        },
        options: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, default: 100, description: 'Max results returned. Applied after filtering to control output size.' }
          }
        }
      },
      additionalProperties: false
    }
  },

  // 6. RELATIONSHIP ANALYSIS - Cached graph operations
  {
    name: 'obsidian_relationships',
    description: 'Graph relationship analysis using cached indices. Context inclusion significantly increases output size (3-5x) but provides textual evidence for relationships. Batch analysis supported.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          oneOf: [
            { type: 'string', description: 'Single file path for relationship analysis' },
            { type: 'array', items: { type: 'string' }, description: 'Multiple files for batch analysis' }
          ]
        },
        relationshipTypes: {
          type: 'array',
          items: { 
            type: 'string', 
            enum: ['backlinks', 'links', 'tags', 'mentions', 'embeds', 'all'] 
          },
          default: ['backlinks'],
          description: 'Relationship categories: backlinks=incoming wikilinks, links=outgoing links, tags=shared tags, mentions=unlinked text references, embeds=file inclusions'
        },
        includeContext: {
          type: 'boolean',
          default: true,
          description: 'Include text snippets showing relationship context. Dramatically increases response size but provides relationship evidence.'
        },
        maxResults: {
          type: 'integer',
          minimum: 1,
          maximum: 500,
          description: 'Per-file, per-relationship-type limit. Higher values substantially increase output volume.'
        },
        strengthThreshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          default: 0.0,
          description: 'Relationship strength filter. 0.0=include all, 0.5=moderate connections, 0.8+=strong only'
        }
      },
      required: ['target'],
      additionalProperties: false
    }
  },

  // 7. CONTENT ANALYSIS - Dual-mode processing
  {
    name: 'obsidian_analyze',
    description: 'Document structure extraction and section analysis. Structure mode: element extraction with hierarchy. Sections mode: detailed content analysis with metadata. sectionIdentifiers automatically triggers sections analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          oneOf: [
            { type: 'string', description: 'Single file path' },
            { type: 'array', items: { type: 'string' }, description: 'Multiple files for comparative analysis' }
          ]
        },
        analysis: {
          type: 'array',
          items: { type: 'string', enum: ['structure', 'sections'] },
          default: ['structure'],
          description: 'Analysis types: structure=hierarchy extraction, sections=detailed content analysis with metadata'
        },
        sectionIdentifiers: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'string', description: 'Simple heading text (case-insensitive partial match)' },
              {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['heading', 'line_range', 'pattern'], description: 'Targeting method' },
                  value: {
                    oneOf: [
                      { type: 'string', description: 'Heading text or regex pattern' },
                      {
                        type: 'object',
                        properties: {
                          start: { type: 'integer', minimum: 1 },
                          end: { type: 'integer', minimum: 1 }
                        },
                        required: ['start', 'end'],
                        description: 'Precise line range (1-based, inclusive)'
                      }
                    ]
                  },
                  level: { type: 'integer', minimum: 1, maximum: 6, description: 'Heading level filter for heading type' }
                },
                required: ['type', 'value'],
                description: 'Advanced section targeting with type-specific parameters'
              }
            ]
          },
          description: 'Section targeting. Presence automatically enables sections analysis regardless of analysis parameter.'
        },
        options: {
          type: 'object',
          properties: {
            extractTypes: {
              type: 'array',
              items: { type: 'string', enum: ['headings', 'lists', 'code_blocks', 'tasks', 'quotes', 'tables', 'links', 'embeds'] },
              default: ['headings'],
              description: 'Structural elements to extract. More types increase output comprehensiveness.'
            },
            includeContext: { type: 'boolean', default: false, description: 'Text context around elements - increases output size' },
            includeSectionContext: { type: 'boolean', default: true, description: 'Section relationships: parent/child/sibling connections' },
            includeMetadata: { type: 'boolean', default: true, description: 'Word counts, content type classification, comprehensive statistics' },
            contextWindow: { type: 'integer', minimum: 0, maximum: 10, default: 1, description: 'Lines of context around elements' },
            minHeadingLevel: { type: 'integer', minimum: 1, maximum: 6, description: 'Filter headings by minimum level' },
            maxHeadingLevel: { type: 'integer', minimum: 1, maximum: 6, description: 'Filter headings by maximum level' },
            minSectionLength: { type: 'integer', minimum: 0, description: 'Exclude sections shorter than N characters' }
          }
        }
      },
      required: ['target'],
      additionalProperties: false
    }
  },

  // 8. FILE MANAGEMENT - Link-aware operations
  {
    name: 'obsidian_manage',
    description: 'File operations with automatic link integrity maintenance. Move/rename operations update all references. Delete operations clean up broken links. Find-replace supports regex with smart case preservation.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['move', 'rename', 'copy', 'delete', 'create-dir', 'delete-dir', 'find-replace'],
          description: 'File operation type. move/rename auto-update links, delete cleans broken links, find-replace supports vault-wide text operations.'
        },
        source: { 
          type: 'string', 
          description: 'Source file/directory path. Auto-resolved from basenames when unambiguous.'
        },
        target: { 
          type: 'string', 
          description: 'Destination path (move/rename/copy operations). Creates intermediate directories as needed.'
        },
        parameters: {
          type: 'object',
          description: 'Operation-specific parameters',
          properties: {
            replacements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  search: { type: 'string', description: 'Search text or regex pattern' },
                  replace: { type: 'string', description: 'Replacement text with optional capture group refs ($1, $2)' }
                },
                required: ['search', 'replace']
              },
              description: 'Search/replace pairs for find-replace operation'
            },
            useRegex: { type: 'boolean', default: false, description: 'Enable regex patterns in search strings' },
            caseSensitive: { type: 'boolean', default: false, description: 'Case-sensitive matching' },
            preserveCase: { 
              type: 'boolean', 
              default: true, 
              description: 'Smart case preservation: Content→Material, content→material, CONTENT→MATERIAL'
            },
            scope: {
              type: 'object',
              description: 'Operation scope for find-replace',
              properties: {
                paths: { type: 'array', items: { type: 'string' }, description: 'Specific target files' },
                folders: { type: 'array', items: { type: 'string' }, description: 'Target directories (recursive)' }
              }
            },
            overwrite: { type: 'boolean', default: false, description: 'Allow overwriting existing files in copy operations' },
            recursive: { type: 'boolean', default: false, description: 'Recursive directory operations' }
          }
        },
        options: {
          type: 'object',
          properties: {
            updateLinks: { type: 'boolean', default: true, description: 'Auto-update file references (forced true for delete operations)' },
            createBackup: { type: 'boolean', default: false, description: 'Create timestamped backup before destructive operations' },
            dryRun: { type: 'boolean', default: false, description: 'Preview changes without execution. Returns estimated change list.' }
          }
        }
      },
      required: ['operation', 'source'],
      additionalProperties: false
    }
  }
];

// Validation functions remain the same but with enhanced error messages
export function validateSemanticSearchParams(input: any) {
  if (!input.query || typeof input.query !== 'string') {
    throw new Error('Search query must be a non-empty string for semantic similarity matching');
  }
  if (input.options?.threshold && (input.options.threshold < 0 || input.options.threshold > 1)) {
    throw new Error('Semantic similarity threshold must be between 0 (broad) and 1 (precise)');
  }
  
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
  
  for (const pattern of input.patterns) {
    if (typeof pattern !== 'string' || pattern.trim().length === 0) {
      throw new Error('All patterns must be non-empty regex strings');
    }
    try {
      new RegExp(pattern);
    } catch (error) {
      throw new Error(`Invalid regex pattern "${pattern}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return input;
}

export function validateTargetInput(input: any) {
  if (!input.target) {
    throw new Error('Target file path(s) required');
  }
  
  if (typeof input.target === 'string') {
    if (input.target.trim().length === 0) {
      throw new Error('Target file path cannot be empty');
    }
  } else if (Array.isArray(input.target)) {
    if (input.target.length === 0) {
      throw new Error('Target array cannot be empty - provide at least one file path');
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
  if (!linkedTo) return [];
  
  if (!Array.isArray(linkedTo)) {
    throw new Error('linkedTo must be an array of file paths or basenames');
  }
  
  const normalizedPaths: string[] = [];
  
  for (let i = 0; i < linkedTo.length; i++) {
    const path = linkedTo[i];
    
    if (typeof path !== 'string') {
      throw new Error(`linkedTo item at index ${i} must be a string`);
    }
    
    const trimmedPath = path.trim();
    if (trimmedPath.length === 0) {
      throw new Error(`linkedTo item at index ${i} cannot be empty`);
    }
    
    // Security and validation checks
    if (trimmedPath.length > 500) {
      throw new Error(`linkedTo item at index ${i} exceeds maximum length (500 chars)`);
    }
    
    const cleanPath = trimmedPath.split('?')[0].split('#')[0];
    
    if (cleanPath.includes('\0')) {
      throw new Error(`linkedTo item at index ${i} contains invalid null bytes`);
    }
    
    if (cleanPath.match(/\.\.[/\\]/)) {
      throw new Error(`linkedTo item at index ${i} cannot contain directory traversal patterns`);
    }
    
    if (/[<>"|*]/.test(cleanPath)) {
      throw new Error(`linkedTo item at index ${i} contains invalid filename characters`);
    }
    
    if (cleanPath.startsWith('/') || cleanPath.match(/^[a-zA-Z]:/)) {
      throw new Error(`linkedTo item at index ${i} should be relative to vault root, not absolute path`);
    }
    
    // Normalize: add .md extension if no extension present
    const normalizedPath = (!cleanPath.endsWith('.md') && !cleanPath.includes('.')) 
      ? cleanPath + '.md' 
      : cleanPath;
    
    normalizedPaths.push(normalizedPath);
  }
  
  return normalizedPaths;
}

export function validateWriteContentParams(input: any) {
  if (!input.content || typeof input.content !== 'string') {
    throw new Error('Content must be a non-empty string');
  }

  if (input.targetType === 'path' && !input.targetIdentifier) {
    throw new Error('targetIdentifier (file path) required when targetType is "path"');
  }

  if (input.mode === 'relative') {
    if (!input.relativeMode) {
      throw new Error('relativeMode configuration required when mode is "relative"');
    }

    const { operation, targetType, target } = input.relativeMode;
    
    if (!operation || !['append', 'prepend', 'replace'].includes(operation)) {
      throw new Error('relativeMode.operation must be: append, prepend, or replace');
    }

    if (!targetType || !['heading', 'frontmatter', 'line_range'].includes(targetType)) {
      throw new Error('relativeMode.targetType must be: heading, frontmatter, or line_range');
    }

    if (target === undefined || target === null) {
      throw new Error('relativeMode.target is required');
    }

    if (targetType === 'line_range') {
      if (typeof target !== 'object' || Array.isArray(target)) {
        throw new Error('line_range target must be an object with start/end properties');
      }

      const { start, end } = target;
      
      if (typeof start !== 'number' || !Number.isInteger(start) || start < 1) {
        throw new Error('line_range start must be a positive integer (1-based line number)');
      }

      if (typeof end !== 'number' || !Number.isInteger(end) || end < 1) {
        throw new Error('line_range end must be a positive integer (1-based line number)');
      }

      if (end < start) {
        throw new Error('line_range end must be >= start');
      }

      if (end - start > 10000) {
        throw new Error('line_range too large (max 10,000 lines for manageable processing)');
      }
    } else {
      if (typeof target !== 'string' || target.trim().length === 0) {
        throw new Error(`${targetType} target must be a non-empty string`);
      }
    }
  }

  return input;
}