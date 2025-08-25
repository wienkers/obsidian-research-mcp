import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { CONSOLIDATED_OBSIDIAN_TOOLS, validateSemanticSearchParams, validatePatternSearchParams, validateTargetInput, validateWriteContentParams } from './tools/consolidated-tools.js';
import { hybridSearchEngine } from './features/search/hybrid-search.js';
import { backlinkIndex } from './features/search/backlink-index.js';
import { batchReader } from './features/batch-operations/batch-reader.js';
import { linkUpdater } from './features/batch-operations/link-updater.js';
import { structureExtractor } from './features/analysis/structure-extractor.js';
import { sectionOperationsManager } from './features/analysis/section-operations.js';
import { patternExtractor } from './features/analysis/pattern-extractor.js';
import { obsidianAPI } from './integrations/obsidian-api.js';
import { logger, LoggedError } from './core/logger.js';
import { config } from './core/config.js';
import { getRateLimiterForTool, RateLimitResult } from './core/rate-limiter.js';
import { validateToolInput } from './core/validation.js';
import * as fs from 'fs/promises';
import path from 'path';

export class ObsidianResearchServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'obsidian-research-mcp',
        version: '1.0.0',
      }
    );

    this.setupHandlers();
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Obsidian Research MCP Server running on stdio');
  }

  private normalizePath(path: string): string {
    // Remove leading slash if present
    let normalized = path.startsWith('/') ? path.substring(1) : path;
    
    // 🔧 ENHANCEMENT: Handle both full paths and basenames
    // If path contains no slashes, treat as basename lookup
    if (!normalized.includes('/')) {
      // For basename-only input, add .md if not present
      if (!normalized.endsWith('.md') && !normalized.includes('.')) {
        normalized += '.md';
      }
    } else {
      // For full paths, ensure .md extension for notes
      if (!normalized.endsWith('.md') && !normalized.includes('.')) {
        normalized += '.md';
      }
    }
    
    // Normalize slashes to forward slashes
    normalized = normalized.replace(/\\/g, '/');
    
    return normalized;
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: CONSOLIDATED_OBSIDIAN_TOOLS,
      };
    });

    // List available prompts (empty for now)
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Rate limiting check
        const clientId = 'mcp-client'; // Could be enhanced to use actual client ID
        const rateLimitKey = `${clientId}:${name}`;
        const rateLimiter = getRateLimiterForTool(name);
        const rateLimitResult = rateLimiter.checkLimit(rateLimitKey);

        if (!rateLimitResult.allowed) {
          logger.warn('Request rate limited', { 
            tool: name, 
            resetTime: rateLimitResult.resetTime,
            message: rateLimitResult.message 
          });
          
          throw new LoggedError(
            `Rate limit exceeded for ${name}. ${rateLimitResult.message} Reset in ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds.`
          );
        }

        logger.debug('Rate limit check passed', {
          tool: name,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        });

        // Input validation
        const validatedArgs = validateToolInput(name, args);
        logger.debug('Input validation passed', { tool: name });

        let result;
        switch (name) {
          case 'obsidian_semantic_search':
            result = await this.handleSemanticSearch(validatedArgs);
            break;
          case 'obsidian_pattern_search':
            result = await this.handlePatternSearch(validatedArgs);
            break;

          case 'obsidian_get_notes':
            result = await this.handleConsolidatedGetNotes(validatedArgs);
            break;

          case 'obsidian_write_content':
            result = await this.handleConsolidatedWriteNote(validatedArgs);
            break;

          case 'obsidian_explore':
            result = await this.handleConsolidatedExplore(validatedArgs);
            break;

          case 'obsidian_relationships':
            result = await this.handleConsolidatedRelationships(validatedArgs);
            break;

          case 'obsidian_analyze':
            result = await this.handleConsolidatedAnalyze(validatedArgs);
            break;

          case 'obsidian_manage':
            result = await this.handleConsolidatedManage(validatedArgs);
            break;

          default:
            throw new LoggedError(`Unknown tool: ${name}`);
        }
        
        return result;
      } catch (error) {
        // 🔧 ENHANCEMENT: Enhanced error logging for debugging
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        logger.error(`Tool execution failed: ${name}`, { 
          error: errorMessage,
          stack: errorStack,
          args,
          nodeVersion: process.version,
          moduleType: 'module',
          cwd: process.cwd(),
          env: {
            NODE_ENV: process.env.NODE_ENV,
            OBSIDIAN_VAULT_PATH: process.env.OBSIDIAN_VAULT_PATH ? '***set***' : 'unset'
          }
        });
        
        // Special handling for require errors
        if (errorMessage.includes('require is not defined')) {
          logger.error('REQUIRE ERROR DETECTED - This should not happen after fixes', {
            originalError: errorMessage,
            stack: errorStack,
            suggestion: 'This indicates a dynamic import was missed or there is an environment issue'
          });
        }
        
        // 🔧 ENHANCEMENT: More descriptive error messages
        if ((name === 'obsidian_get_notes' || name === 'obsidian_write_content') && error instanceof LoggedError && args?.path) {
          const enhancedError = new LoggedError(
            `Failed to get note. Tried: ${args.path}. ${await this.getSimilarBasenamesHint(args.path as string)}`,
            { error, originalPath: args.path }
          );
          throw enhancedError;
        }
        throw error;
      }
    });
  }


  private async getSimilarBasenamesHint(path: string): Promise<string> {
    try {
      const allFiles = await obsidianAPI.listFiles(undefined, true);
      const searchBasename = path.split('/').pop()?.replace(/\.md$/, '') || path;
      
      const similarFiles = allFiles
        .filter(f => !f.isFolder)
        .map(f => f.path.split('/').pop()?.replace(/\.md$/, '') || '')
        .filter(basename => basename.toLowerCase().includes(searchBasename.toLowerCase()))
        .slice(0, 3);
      
      return similarFiles.length > 0 
        ? `Similar basenames found: ${similarFiles.join(', ')}`
        : 'No similar basenames found';
    } catch (error) {
      return 'Unable to check for similar files';
    }
  }

  // Helper functions for file statistics
  private formatTimestamp(timestamp: number): string {
    try {
      const date = new Date(timestamp);
      // Format: "05:29:00 PM | 05-03-2025"
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const dateStr = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      return `${timeStr} | ${dateStr}`;
    } catch (error) {
      logger.warn('Failed to format timestamp', { timestamp, error });
      return 'Invalid Date';
    }
  }

  private estimateTokenCount(text: string): number {
    if (!text) return 0;
    // Rough approximation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  private async getFileStatistics(targetPath: string): Promise<{ rawStats: any; formattedStats: any }> {
    // Get file info from Obsidian vault listing with metadata
    const allFiles = await obsidianAPI.listFiles(undefined, true, true);
    const fileInfo = allFiles.find(f => f.path === targetPath);
    
    if (!fileInfo || !fileInfo.mtime || !fileInfo.ctime) {
      throw new LoggedError(`File statistics not available for '${targetPath}'. File metadata not provided by Obsidian API.`);
    }

    const rawStats = {
      ctime: fileInfo.ctime,
      mtime: fileInfo.mtime,
      size: fileInfo.size || 0,
    };

    const formattedStats = {
      createdTime: this.formatTimestamp(fileInfo.ctime),
      modifiedTime: this.formatTimestamp(fileInfo.mtime),
      size: fileInfo.size || 0,
    };

    return { rawStats, formattedStats };
  }

  // CONSOLIDATED TOOL HANDLERS
  // These replace the 16 legacy tools with 8 polymorphic tools

  private async handleSemanticSearch(args: any) {
    validateSemanticSearchParams(args);
    const { query, filters = {}, options = {} } = args;
    
    // Pure semantic search via Smart Connections
    const results = await hybridSearchEngine.search({
      semanticQuery: query,
      structuralFilters: {
        folders: filters.folders,
        tags: filters.tags,
        linkedTo: filters.linkedTo,
        hasProperty: filters.hasProperty,
        dateRange: filters.dateRange,
      },
      expandSearch: options.expandSearch || false,
      searchDepth: options.searchDepth || 1,
      limit: options.limit || 50,
      semanticOnly: true,  // Force semantic-only mode
      threshold: options.threshold || 0.7
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query,
          results: results.map(result => {
            // Only include title if it differs from filename
            const filename = result.path.split('/').pop()?.replace(/\.md$/i, '') || '';
            const resultObj: any = {
              path: result.path,
              score: result.score,
              contextSnippets: result.contextSnippets?.slice(0, 2),
            };
            
            // Add title only if it's different from filename
            if (result.title !== filename) {
              resultObj.title = result.title;
            }
            
            return resultObj;
          }),
          totalResults: results.length,
          searchParams: {
            expandSearch: options.expandSearch,
            searchDepth: options.searchDepth,
            threshold: options.threshold,
            filters: filters,
          },
        }, null, 2)
      }]
    };
  }

  private async handlePatternSearch(args: any) {
    validatePatternSearchParams(args);
    const { patterns, scope = {}, options = {} } = args;
    
    // Enhanced pattern search with all restored features
    const results = await patternExtractor.extractPatterns({
      patterns,
      scope: {
        paths: scope.paths,
        folders: scope.folders,
        tags: scope.tags,
        filePattern: scope.filePattern,
        excludePaths: scope.excludePaths,
        excludeFolders: scope.excludeFolders,
        dateRange: scope.dateRange,
      },
      contextWindow: options.contextWindow || 2,
      includeStatistics: options.includeStatistics === true,
      maxMatches: options.maxMatches,
      caseSensitive: options.caseSensitive || false,
      wholeWord: options.wholeWord || false,
      includeMetadata: options.includeMetadata || false
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          patterns,
          results,
          searchParams: {
            scope,
            options
          }
        }, null, 2)
      }]
    };
  }

  private async handleConsolidatedGetNotes(args: any) {
    const { target, options = {} } = args;
    
    // Handle boolean parameter that might come as string or boolean
    let includeStat = false;
    if (options.includeStat !== undefined) {
      if (typeof options.includeStat === 'boolean') {
        includeStat = options.includeStat;
      } else if (typeof options.includeStat === 'string') {
        includeStat = options.includeStat.toLowerCase() === 'true';
      } else {
        includeStat = Boolean(options.includeStat);
      }
    }

    logger.info('Parameters parsed:', { 
      target, 
      format: options.format || 'markdown', 
      includeStat, 
      receivedIncludeStat: options.includeStat,
      includeStatType: typeof options.includeStat
    });
    
    if (typeof target === 'string') {
      // Single note retrieval using obsidianAPI directly
      const note = await obsidianAPI.getNote(target);
      
      // Get file statistics if requested
      let rawStats: any = null;
      let formattedStats: any = null;
      
      if (includeStat) {
        try {
          const stats = await this.getFileStatistics(note.path);
          rawStats = stats.rawStats;
          formattedStats = {
            ...stats.formattedStats,
            tokenCountEstimate: this.estimateTokenCount(note.content)
          };
        } catch (error) {
          // If stats were explicitly requested, throw the error
          throw error;
        }
      }

      if (options.format === 'json') {
        const result: any = {
          path: note.path,
          content: note.content,
          frontmatter: note.frontmatter,
          tags: note.tags,
          links: note.links,
          backlinks: note.backlinks
        };
        
        if (includeStat && rawStats && formattedStats) {
          result.formattedStat = formattedStats;
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } else {
        // Markdown format
        let result = note.content;
        
        if (includeStat && formattedStats) {
          const statInfo = `\n\n---\n**File Statistics:**\n- Created: ${formattedStats.createdTime}\n- Modified: ${formattedStats.modifiedTime}\n- Size: ${formattedStats.size} bytes\n- Estimated tokens: ${formattedStats.tokenCountEstimate}`;
          result += statInfo;
        }
        
        return {
          content: [{
            type: 'text',
            text: result
          }]
        };
      }
    } else if (Array.isArray(target)) {
      // Multiple notes retrieval using obsidianAPI directly
      const notes = [];
      for (const path of target) {
        try {
          const note = await obsidianAPI.getNote(path);
          const noteResult: any = {
            path: note.path,
            content: options.includeContent !== false ? note.content : undefined,
            metadata: options.includeMetadata !== false ? {
              frontmatter: note.frontmatter,
              tags: note.tags,
              links: note.links,
              backlinks: note.backlinks
            } : undefined
          };

          // Add statistics if requested
          if (includeStat) {
            try {
              const stats = await this.getFileStatistics(note.path);
              noteResult.formattedStat = {
                ...stats.formattedStats,
                tokenCountEstimate: this.estimateTokenCount(note.content || '')
              };
            } catch (error) {
              noteResult.statError = `Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`;
            }
          }

          notes.push(noteResult);
        } catch (error) {
          notes.push({
            path,
            error: `Failed to read note: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
      
      // Handle format option for multiple files
      if (options.format === 'json') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ notes, totalNotes: notes.length }, null, 2)
          }]
        };
      } else {
        // Markdown format - concatenate all note contents with separators
        let result = '';
        for (let i = 0; i < notes.length; i++) {
          const note = notes[i];
          if (note.error) {
            result += `## Error reading ${note.path}\n${note.error}\n\n`;
          } else {
            result += `## ${note.path}\n`;
            if (note.content) {
              result += note.content;
            }
            if (note.formattedStat && includeStat) {
              result += `\n\n---\n**File Statistics:**\n- Created: ${note.formattedStat.createdTime}\n- Modified: ${note.formattedStat.modifiedTime}\n- Size: ${note.formattedStat.size} bytes\n- Estimated tokens: ${note.formattedStat.tokenCountEstimate}`;
            }
            result += '\n\n---\n\n';
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: result.trim()
          }]
        };
      }
    }
    
    throw new LoggedError('Invalid target type for obsidian_get_notes');
  }

  private async handleConsolidatedWriteNote(args: any) {
    // Additional validation specific to write content operations
    const validatedArgs = validateWriteContentParams(args);
    
    const { 
      targetType = 'path', 
      targetIdentifier, 
      content, 
      mode = 'whole-file', 
      wholeFileMode = 'overwrite', 
      relativeMode 
    } = validatedArgs;
    
    let targetPath: string;
    
    // Determine target path based on targetType
    switch (targetType) {
      case 'path':
        if (!targetIdentifier) {
          throw new LoggedError('targetIdentifier is required when targetType is "path"');
        }
        targetPath = targetIdentifier;
        break;
      case 'active':
        try {
          const activeNote = await obsidianAPI.getActiveNote();
          targetPath = activeNote.path;
        } catch (error) {
          throw new LoggedError('Failed to get active note for update', { error });
        }
        break;
      default:
        throw new LoggedError(`Unknown targetType: ${targetType}`);
    }

    if (mode === 'whole-file') {
      // Whole-file operations
      let finalContent: string;
      
      switch (wholeFileMode) {
        case 'overwrite':
          finalContent = content;
          break;
        case 'append':
          try {
            const existingContent = await obsidianAPI.getFileContent(targetPath);
            finalContent = existingContent + '\n' + content;
          } catch (error) {
            // File doesn't exist, create with content
            finalContent = content;
          }
          break;
        case 'prepend':
          try {
            const existingContent = await obsidianAPI.getFileContent(targetPath);
            
            // Parse frontmatter boundary to preserve YAML frontmatter
            const { hasFrontmatter, frontmatterEndIndex } = parseFrontmatterBoundary(existingContent);
            
            if (hasFrontmatter) {
              // Insert content after frontmatter block
              const frontmatter = existingContent.substring(0, frontmatterEndIndex);
              const bodyContent = existingContent.substring(frontmatterEndIndex);
              
              // Ensure proper spacing: frontmatter + newline + prepended content + newline + existing body
              finalContent = frontmatter + '\n\n' + content + '\n' + bodyContent;
            } else {
              // No frontmatter, use simple prepend
              finalContent = content + '\n' + existingContent;
            }
          } catch (error) {
            // File doesn't exist, create with content
            finalContent = content;
          }
          break;
        default:
          throw new LoggedError(`Unknown wholeFileMode: ${wholeFileMode}`);
      }
      
      await obsidianAPI.updateFileContent(targetPath, finalContent);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            path: targetPath,
            targetType,
            mode: wholeFileMode,
            message: `Note ${wholeFileMode === 'overwrite' ? 'overwritten' : wholeFileMode + 'ed'} successfully`,
          }, null, 2),
        }],
      };
      
    } else if (mode === 'relative') {
      // Relative positioning operations
      if (!relativeMode) {
        throw new LoggedError('relativeMode is required when mode is "relative"');
      }
      
      const { operation, targetType: relativeTargetType, target } = relativeMode;
      
      // Block reference operations are not supported
      if (relativeTargetType === 'block') {
        throw new LoggedError(
          `Block reference operations are not supported. Use targetType "heading", "frontmatter", or "line_range" instead.`
        );
      }
      
      await obsidianAPI.patchContent(targetPath, operation, relativeTargetType, target, content);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            path: targetPath,
            targetType,
            mode: 'relative',
            operation,
            relativeTargetType,
            target,
            message: `Content ${operation}ed relative to ${relativeTargetType}: ${target}`,
          }, null, 2),
        }],
      };
      
    } else {
      throw new LoggedError(`Unknown mode: ${mode}`);
    }
  }

  private async handleConsolidatedExplore(args: any) {
    const { mode = 'list', scope = {}, filters = {}, options = {} } = args;
    
    // Use obsidianAPI directly for exploration
    const { folder, recursive = true } = scope;
    let files = await obsidianAPI.listFiles(folder, recursive, true);
    
    // Apply filters to the file list
    files = this.applyExploreFilters(files, filters);
    
    if (mode === 'overview') {
      const notes = files.filter(f => f.name.endsWith('.md') && !f.isFolder);
      const folders = files.filter(f => f.isFolder);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            summary: {
              totalFiles: files.length,
              totalNotes: notes.length,
              totalFolders: folders.length
            },
            mode,
            scope,
            filters,
            options
          }, null, 2)
        }]
      };
    } else {
      // For list mode, return filtered file listing
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            mode,
            files: await Promise.all(files.slice(0, options.limit || 100).map(async f => {
              // Normalize folder paths to ensure single trailing slash
              const normalizedPath = f.isFolder 
                ? (f.path.endsWith('/') ? f.path : f.path + '/')
                : f.path;
              
              // Extract basename from path for comparison
              const filename = normalizedPath.split('/').filter(part => part.length > 0).pop() || '';
              const resultObj: any = {
                path: normalizedPath,
                mtime: f.mtime ? this.formatTimestamp(f.mtime) : 'No timestamp',
                ctime: f.ctime ? this.formatTimestamp(f.ctime) : 'No timestamp',
                size: f.size,
              };

              // Add content statistics for text files
              if (!f.isFolder && this.isTextFile(f)) {
                try {
                  const contentStats = await this.getContentStats(f.path);
                  resultObj.contentStats = contentStats;
                } catch (error) {
                  logger.debug('Failed to get content stats for file', { path: f.path, error });
                }
              }
              
              // For directories, compare name without trailing slash
              // For files, compare name as-is
              const nameToCompare = f.isFolder ? f.name.replace(/\/$/, '') : f.name;
              
              // Add name only if it's different from filename
              if (nameToCompare !== filename) {
                resultObj.name = f.name;
              }
              
              return resultObj;
            })),
            totalFiles: files.length,
            scope,
            filters,
            options
          }, null, 2)
        }]
      };
    }
  }

  private getFileType(file: any): string {
    if (file.isFolder) {
      return 'folder';
    }

    const extension = file.path.split('.').pop()?.toLowerCase() || '';
    
    // Define file type mappings
    const typeMap: Record<string, string> = {
      // Text files
      'md': 'markdown',
      'txt': 'text',
      'rtf': 'text',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      
      // Code files
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      
      // Images
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'gif': 'image',
      'svg': 'image',
      'webp': 'image',
      'ico': 'image',
      'bmp': 'image',
      
      // Documents
      'pdf': 'pdf',
      'doc': 'document',
      'docx': 'document',
      'odt': 'document',
      'xls': 'spreadsheet',
      'xlsx': 'spreadsheet',
      'ods': 'spreadsheet',
      'ppt': 'presentation',
      'pptx': 'presentation',
      'odp': 'presentation',
      
      // Archives
      'zip': 'archive',
      'rar': 'archive',
      'tar': 'archive',
      'gz': 'archive',
      '7z': 'archive',
      
      // Audio/Video
      'mp3': 'audio',
      'wav': 'audio',
      'flac': 'audio',
      'ogg': 'audio',
      'mp4': 'video',
      'avi': 'video',
      'mkv': 'video',
      'mov': 'video',
      'wmv': 'video',
    };

    return typeMap[extension] || 'unknown';
  }

  private isTextFile(file: any): boolean {
    if (file.isFolder) {
      return false;
    }

    const textTypes = ['markdown', 'text', 'json', 'xml', 'yaml', 'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'php', 'ruby', 'go', 'rust', 'html', 'css', 'scss', 'sass'];
    return textTypes.includes(this.getFileType(file));
  }

  private async getContentStats(filePath: string): Promise<{wordCount: number, lineCount: number, charCount: number}> {
    try {
      const note = await obsidianAPI.getNote(filePath);
      const content = note.content;
      
      const charCount = content.length;
      const lineCount = content.split('\n').length;
      const wordCount = content.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
      
      return {
        wordCount,
        lineCount, 
        charCount
      };
    } catch (error) {
      logger.debug('Failed to calculate content stats', { filePath, error });
      return {
        wordCount: 0,
        lineCount: 0,
        charCount: 0
      };
    }
  }

  private applyExploreFilters(files: any[], filters: any): any[] {
    let filteredFiles = files;

    // Handle null/undefined filters
    if (!filters) {
      return filteredFiles;
    }

    // Filter by extensions
    if (filters.extensions && Array.isArray(filters.extensions) && filters.extensions.length > 0) {
      filteredFiles = filteredFiles.filter(file => {
        // Only include folders if they might contain matching files (for navigation)
        // But when extensions are specified, we primarily want matching files
        if (file.isFolder) return false; // Exclude folders when extension filtering is active
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        return filters.extensions.some((ext: string) => ext.toLowerCase() === fileExt);
      });
    }

    // Filter by name pattern (regex)
    if (filters.namePattern && typeof filters.namePattern === 'string') {
      try {
        const nameRegex = new RegExp(filters.namePattern, 'i');
        logger.debug('Applying name pattern filter', { 
          pattern: filters.namePattern, 
          totalFiles: filteredFiles.length 
        });
        
        filteredFiles = filteredFiles.filter(file => {
          const matches = nameRegex.test(file.name);
          logger.debug('Name pattern test', { 
            fileName: file.name, 
            pattern: filters.namePattern, 
            matches 
          });
          return matches;
        });
        
        logger.debug('Name pattern filter result', { 
          pattern: filters.namePattern,
          filesRemaining: filteredFiles.length 
        });
      } catch (error) {
        logger.warn('Invalid namePattern regex in explore filters', { 
          pattern: filters.namePattern, 
          error: error instanceof Error ? error.message : String(error) 
        });
        // Don't filter if regex is invalid - return current filtered files
      }
    }

    // Filter by date range (modification time)
    if (filters.dateRange && typeof filters.dateRange === 'object') {
      const { start, end } = filters.dateRange;
      
      if (start || end) {
        filteredFiles = filteredFiles.filter(file => {
          // When date range filtering is active, exclude files without mtime info
          if (!file.mtime) return false;
          
          const fileDate = new Date(file.mtime);
          let includeFile = true;
          
          if (start) {
            try {
              const startDate = new Date(start);
              if (fileDate < startDate) includeFile = false;
            } catch (error) {
              logger.warn('Invalid start date in dateRange filter', { start, error });
              return false; // Exclude files with invalid start date processing
            }
          }
          
          if (end && includeFile) {
            try {
              const endDate = new Date(end);
              if (fileDate > endDate) includeFile = false;
            } catch (error) {
              logger.warn('Invalid end date in dateRange filter', { end, error });
              return false; // Exclude files with invalid end date processing
            }
          }
          
          return includeFile;
        });
      }
    }

    // Apply exclude patterns
    if (filters.excludePatterns && Array.isArray(filters.excludePatterns) && filters.excludePatterns.length > 0) {
      for (const excludePattern of filters.excludePatterns) {
        if (typeof excludePattern === 'string') {
          try {
            const excludeRegex = new RegExp(excludePattern, 'i');
            filteredFiles = filteredFiles.filter(file => !excludeRegex.test(file.name) && !excludeRegex.test(file.path));
          } catch (error) {
            logger.warn('Invalid excludePattern regex in explore filters', { 
              pattern: excludePattern, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
        }
      }
    }

    return filteredFiles;
  }

  private async handleConsolidatedRelationships(args: any) {
    const { 
      target, 
      relationshipTypes = ['backlinks'], 
      includeContext = true,
      maxResults,
      strengthThreshold = 0.0 
    } = args;
    
    // Handle both single target and array of targets
    const targets = Array.isArray(target) ? target : [target];
    
    // Expand 'all' to all available relationship types
    const types = relationshipTypes.includes('all') 
      ? ['backlinks', 'links', 'tags', 'mentions', 'embeds']
      : relationshipTypes;
    
    const fileRelationships = [];
    let totalRelationships = 0;
    
    for (const filePath of targets) {
      try {
        // Get basic file info
        const fileTitle = await this.extractFileTitle(filePath);
        const relationships = [];
        const summaryByType: Record<string, number> = {};
        
        // Analyze each relationship type
        for (const relType of types) {
          let typeRelationships: any[] = [];
          
          try {
            switch (relType) {
              case 'backlinks':
                if (includeContext) {
                  const backlinkRels = await backlinkIndex.getBacklinkRelationships(filePath);
                  if (Array.isArray(backlinkRels)) {
                    typeRelationships = [];
                    for (const rel of backlinkRels) {
                      // Create individual relationship for each context
                      for (const context of rel.contexts) {
                        typeRelationships.push({
                          type: 'backlinks',
                          targetPath: rel.source,
                          ...this.formatTargetTitle(rel.source),
                          strength: this.calculateLinkStrength([context]),
                          context: context.text,
                          lineNumber: context.line
                        });
                      }
                    }
                  }
                } else {
                  const backlinkRels = await backlinkIndex.getBacklinkRelationships(filePath);
                  if (Array.isArray(backlinkRels)) {
                    typeRelationships = [];
                    for (const rel of backlinkRels) {
                      // Create individual relationship for each context, but omit context field
                      for (const context of rel.contexts) {
                        typeRelationships.push({
                          type: 'backlinks',
                          targetPath: rel.source,
                          ...this.formatTargetTitle(rel.source),
                          strength: this.calculateLinkStrength([context]),
                          lineNumber: context.line
                        });
                      }
                    }
                  }
                }
                break;
                
              case 'links': {
                const forwardLinks = await backlinkIndex.getForwardLinks(filePath);
                if (Array.isArray(forwardLinks)) {
                  typeRelationships = [];
                  for (const path of forwardLinks) {
                    // Get all contexts for this link
                    const contexts = await this.getAllLinkContexts(filePath, path);
                    if (contexts.length > 0) {
                      // Create individual relationship for each context
                      for (const contextInfo of contexts) {
                        const relationship: any = {
                          type: 'links',
                          targetPath: path,
                          ...this.formatTargetTitle(path),
                          strength: 1.0,
                          lineNumber: contextInfo.lineNumber
                        };
                        if (includeContext) {
                          relationship.context = contextInfo.context;
                        }
                        typeRelationships.push(relationship);
                      }
                    } else {
                      // Fallback: create relationship without context if none found
                      const relationship: any = {
                        type: 'links',
                        targetPath: path,
                        ...this.formatTargetTitle(path),
                        strength: 1.0,
                        lineNumber: 0
                      };
                      if (includeContext) {
                        relationship.context = null;
                      }
                      typeRelationships.push(relationship);
                    }
                  }
                }
                break;
              }
                
              case 'tags': {
                const tagRels = await backlinkIndex.getTags(filePath);
                if (tagRels && Array.isArray(tagRels.tags) && Array.isArray(tagRels.contexts)) {
                  typeRelationships = [];
                  for (const tag of tagRels.tags) {
                    const tagContexts = tagRels.contexts.filter((c: any) => c.tag === tag);
                    // Create individual relationship for each context
                    for (const context of tagContexts) {
                      const relationship: any = {
                        type: 'tags',
                        targetPath: tag,
                        strength: this.calculateTagStrength([context]),
                        lineNumber: context.line
                      };
                      if (includeContext) {
                        relationship.context = context.text;
                      }
                      typeRelationships.push(relationship);
                    }
                  }
                }
                break;
              }
                
              case 'mentions': {
                const mentionRels = await backlinkIndex.findMentions(filePath);
                if (Array.isArray(mentionRels)) {
                  typeRelationships = [];
                  for (const mention of mentionRels) {
                    // Create individual relationship for each context
                    for (const context of mention.contexts) {
                      const relationship: any = {
                        type: 'mentions',
                        targetPath: mention.source,
                        ...this.formatTargetTitle(mention.source),
                        strength: this.calculateMentionStrength([context]),
                        lineNumber: context.line
                      };
                      if (includeContext) {
                        relationship.context = context.text;
                      }
                      typeRelationships.push(relationship);
                    }
                  }
                }
                break;
              }
                
              case 'embeds': {
                const embedRels = await backlinkIndex.getEmbeds(filePath);
                if (Array.isArray(embedRels)) {
                  typeRelationships = [];
                  for (const embed of embedRels) {
                    // Create individual relationship for each context
                    for (const context of embed.contexts) {
                      const relationship: any = {
                        type: 'embeds',
                        targetPath: embed.target,
                        ...this.formatTargetTitle(embed.target),
                        strength: 1.0,
                        lineNumber: context.line,
                        embedType: context.embedType || 'other'
                      };
                      if (includeContext) {
                        relationship.context = context.text;
                      }
                      typeRelationships.push(relationship);
                    }
                  }
                }
                break;
              }
            }
          } catch (error) {
            logger.warn(`Failed to analyze ${relType} relationships for ${filePath}`, { 
              relationshipType: relType,
              error: error instanceof Error ? error.message : String(error) 
            });
            // Continue with empty results for this relationship type
            typeRelationships = [];
          }
          
          // Apply strength threshold and maxResults filtering
          const filteredRels = typeRelationships
            .filter((rel: any) => rel.strength >= strengthThreshold)
            .slice(0, maxResults || 500);
          
          relationships.push(...filteredRels);
          summaryByType[relType] = filteredRels.length;
        }
        
        const totalRels = relationships.length;
        totalRelationships += totalRels;
        
        fileRelationships.push({
          path: filePath,
          ...(fileTitle !== this.extractBasename(filePath) ? { title: fileTitle } : {}),
          summary: {
            totalRelationships: totalRels,
            byType: summaryByType
          },
          relationships
        });
        
      } catch (error) {
        logger.error(`Failed to analyze relationships for ${filePath}`, { error });
        fileRelationships.push({
          path: filePath,
          // Don't include title in error case since we use basename as fallback
          summary: { totalRelationships: 0, byType: {} },
          relationships: [],
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          fileRelationships,
          overallSummary: {
            totalFiles: targets.length,
            totalRelationships,
            averageRelationships: targets.length > 0 ? 
              Math.round(totalRelationships / targets.length * 100) / 100 : 0
          }
        }, null, 2)
      }]
    };
  }

  private async extractFileTitle(filePath: string): Promise<string> {
    try {
      const content = await obsidianAPI.getFileContent(filePath);
      const lines = content.split('\n');
      
      // Look for H1 heading
      for (const line of lines.slice(0, 10)) {
        const h1Match = line.match(/^#\s+(.+)$/);
        if (h1Match) {
          return h1Match[1].trim();
        }
      }
      
      // Fallback to filename
      return this.extractBasename(filePath);
    } catch (error) {
      return this.extractBasename(filePath);
    }
  }

  private extractBasename(path: string): string {
    return path.split('/').pop()?.replace(/\.md$/, '') || path;
  }

  private formatTargetTitle(path: string): Record<string, any> {
    // Extract filename from path (same logic as extractBasename)
    const filename = path.split('/').pop()?.replace(/\.md$/i, '') || '';
    // Get the title using extractBasename
    const title = this.extractBasename(path);
    
    // Only include title in result if it differs from filename
    if (title !== filename) {
      return { targetTitle: title };
    }
    return {};
  }

  private calculateLinkStrength(contexts: any[]): number {
    if (!contexts || contexts.length === 0) return 0.5;
    
    // Base strength from number of contexts
    const baseStrength = Math.min(contexts.length / 5, 1);
    
    // Bonus for rich context (longer text)
    const avgContextLength = contexts.reduce((sum, c) => sum + (c.text?.length || 0), 0) / contexts.length;
    const contextBonus = Math.min(avgContextLength / 100, 0.3);
    
    return Math.min(baseStrength + contextBonus, 1);
  }

  private calculateTagStrength(contexts: any[]): number {
    if (!contexts || contexts.length === 0) return 0.7;
    
    // Tags are generally strong relationships
    return Math.min(0.7 + (contexts.length * 0.1), 1);
  }

  private calculateMentionStrength(contexts: any[]): number {
    if (!contexts || contexts.length === 0) return 0.3;
    
    // Mentions are weaker than links but still meaningful
    return Math.min(0.3 + (contexts.length * 0.1), 0.8);
  }

  private async getLinkContext(sourcePath: string, targetPath: string): Promise<{context: string | null, lineNumber: number}> {
    const contexts = await this.getAllLinkContexts(sourcePath, targetPath);
    return contexts.length > 0 ? contexts[0] : { context: null, lineNumber: 0 };
  }

  private async getAllLinkContexts(sourcePath: string, targetPath: string): Promise<Array<{context: string, lineNumber: number}>> {
    try {
      const content = await obsidianAPI.getFileContent(sourcePath);
      const lines = content.split('\n');
      const foundContexts: Array<{context: string, lineNumber: number}> = [];
      
      // Create multiple search patterns to improve link detection
      const searchPatterns: string[] = [];
      
      if (targetPath.includes('#')) {
        // Section link: try multiple variations
        searchPatterns.push(targetPath.replace('.md#', '#'));  // "Note#section"
        searchPatterns.push(targetPath);  // "Note.md#section"
        searchPatterns.push(this.extractBasename(targetPath));  // Just the basename part
      } else {
        // Regular link: try multiple variations
        const basename = this.extractBasename(targetPath);
        searchPatterns.push(basename);  // "Note"
        searchPatterns.push(targetPath);  // "Note.md" or full path
        searchPatterns.push(`[[${basename}]]`);  // Wikilink format
        searchPatterns.push(`[[${targetPath}]]`);  // Wikilink with extension
        searchPatterns.push(`](${basename})`);  // Markdown link format
        searchPatterns.push(`](${targetPath})`);  // Markdown link with extension
      }
      
      // Search for all patterns that match
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of searchPatterns) {
          if (line.includes(pattern)) {
            // Avoid duplicate line entries by checking if lineNumber already exists
            if (!foundContexts.some(ctx => ctx.lineNumber === i + 1)) {
              foundContexts.push({ context: line.trim(), lineNumber: i + 1 });
            }
            break; // Don't check other patterns for this line once we find a match
          }
        }
      }
      
      return foundContexts;
    } catch (error) {
      return [];
    }
  }

  private async handleConsolidatedAnalyze(args: any) {
    const { target, analysis = ['structure'], options = {}, sectionIdentifiers } = args;
    
    const paths = Array.isArray(target) ? target : [target];
    
    const results: any = {
      target,
      analysis: {},
      options
    };

    // If sectionIdentifiers are provided, prioritize sections analysis
    if (sectionIdentifiers && sectionIdentifiers.length > 0) {
      if (!analysis.includes('sections')) {
        analysis.push('sections');
      }
    }
    
    for (const analysisType of analysis) {
      switch (analysisType) {
        case 'sections':
          // Use section operations for advanced section targeting
          if (paths.length === 1) {
            // Single file section analysis
            const sectionsResult = await sectionOperationsManager.getNoteSections({
              path: paths[0],
              sectionIdentifiers: sectionIdentifiers || undefined,
              includeContext: options.includeSectionContext !== false,
              includeMetadata: options.includeMetadata !== false,
              contextWindow: options.contextWindow,
              minSectionLength: options.minSectionLength
            });
            results.analysis[analysisType] = sectionsResult;
          } else {
            // Multi-file section analysis
            const multiFileResults = [];
            for (const path of paths) {
              try {
                const sectionsResult = await sectionOperationsManager.getNoteSections({
                  path,
                  sectionIdentifiers: sectionIdentifiers || undefined,
                  includeContext: options.includeSectionContext !== false,
                  includeMetadata: options.includeMetadata !== false,
                  contextWindow: options.contextWindow,
                  minSectionLength: options.minSectionLength
                });
                multiFileResults.push(sectionsResult);
              } catch (error) {
                logger.warn(`Failed to analyze sections for ${path}`, { error });
                multiFileResults.push({
                  path,
                  error: error instanceof Error ? error.message : String(error),
                  sections: [],
                  outline: [],
                  summary: {
                    totalSections: 0,
                    totalWords: 0,
                    averageWordsPerSection: 0,
                    deepestLevel: 0,
                    longestSection: '',
                    shortestSection: ''
                  }
                });
              }
            }
            results.analysis[analysisType] = {
              files: multiFileResults,
              summary: {
                totalFiles: multiFileResults.length,
                totalSections: multiFileResults.reduce((sum, file) => sum + (file.summary?.totalSections || 0), 0),
                totalWords: multiFileResults.reduce((sum, file) => sum + (file.summary?.totalWords || 0), 0)
              }
            };
          }
          break;

        case 'structure':
        default: {
          // Use structure extractor for basic structural analysis
          const structure = await structureExtractor.extractStructure({
            paths,
            extractTypes: options.extractTypes || ['headings'],
            includeHierarchy: true,
            includeContext: options.includeContext || false,
            contextWindow: options.contextWindow || 1,
            minHeadingLevel: options.minHeadingLevel,
            maxHeadingLevel: options.maxHeadingLevel
          });
          results.analysis[analysisType] = structure;
          break;
        }
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2)
      }]
    };
  }

  private async handleConsolidatedManage(args: any) {
    const { operation, source, target, parameters = {}, options = {} } = args;
    
    // Validate operation type
    if (typeof operation !== 'string' || !operation.trim()) {
      const error = new Error(`Invalid operation type: expected non-empty string, got ${typeof operation}: "${operation}"`);
      logger.error('Operation validation failed', { 
        operation, 
        operationType: typeof operation,
        error: error.message
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            operation: operation,
            error: error.message,
            validationFailure: 'OPERATION_TYPE_INVALID'
          }, null, 2)
        }]
      };
    }
    
    // Normalize operation and validate
    const normalizedOperation = operation.toLowerCase().trim();
    const allowedOperations = ['move', 'rename', 'copy', 'delete', 'create-dir', 'delete-dir', 'find-replace'];
    
    if (!allowedOperations.includes(normalizedOperation)) {
      const error = new Error(`Unknown operation: "${operation}". Allowed operations: ${allowedOperations.join(', ')}`);
      logger.error('Operation validation failed', { 
        operation, 
        normalizedOperation,
        allowedOperations,
        error: error.message
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            operation: operation,
            error: error.message,
            validationFailure: 'OPERATION_NOT_ALLOWED'
          }, null, 2)
        }]
      };
    }
    
    // Dry run preview mode
    if (options.dryRun) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            operation: normalizedOperation,
            source,
            target,
            parameters,
            dryRun: true,
            message: `Preview: Would execute ${normalizedOperation} operation`,
            estimatedChanges: this.previewOperation(normalizedOperation, source, target, parameters)
          }, null, 2)
        }]
      };
    }

    try {
      switch (normalizedOperation) {
        case 'move':
        case 'rename': {
          if (!target) {
            throw new Error('Target path is required for move/rename operations');
          }
          
          // Use existing link updater for move operations
          const moveResult = await linkUpdater.updateLinks({
            oldPath: source,
            newPath: target,
            updateBacklinks: options.updateLinks !== false
          });
          
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                operation: normalizedOperation,
                source,
                target,
                success: moveResult.success,
                filesUpdated: moveResult.filesUpdated,
                linksUpdated: moveResult.linksUpdated,
                updatedFiles: moveResult.updatedFiles,
                errors: moveResult.errors,
                summary: moveResult.summary
              }, null, 2)
            }]
          };
        }
          
        case 'copy': {
          if (!target) {
            throw new Error('Target path is required for copy operations');
          }
          
          const content = await obsidianAPI.getFileContent(source);
          
          // Check if target exists and handle overwrite
          if (!parameters.overwrite) {
            try {
              await obsidianAPI.getFileContent(target);
              throw new Error(`Target file '${target}' already exists. Use overwrite: true to replace.`);
            } catch (error) {
              // If it's our deliberate error about file existing, re-throw it
              if (error instanceof Error && error.message.includes('already exists')) {
                throw error;
              }
              // File doesn't exist (other error), proceed with copy
            }
          }
          
          await obsidianAPI.createFile(target, content);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                operation: 'copy',
                source,
                target,
                success: true,
                message: 'File copied successfully'
              }, null, 2)
            }]
          };
        }
          
        case 'delete': {
          // Create backup if requested
          if (options.createBackup) {
            const content = await obsidianAPI.getFileContent(source);
            const backupPath = `${source}.backup.${Date.now()}`;
            await obsidianAPI.createFile(backupPath, content);
            logger.info(`Created backup at ${backupPath}`);
          }
          
          // Delete file and automatically clean up all broken links
          await obsidianAPI.deleteFile(source);
          
          // Use link updater to clean up broken links (mandatory for delete)
          const deleteResult = await this.cleanupLinksAfterDelete(source);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                operation: 'delete',
                source,
                success: true,
                message: 'File deleted successfully and links cleaned up',
                linksCleanedUp: deleteResult.linksCleanedUp,
                filesUpdated: deleteResult.filesUpdated,
                updatedFiles: deleteResult.updatedFiles
              }, null, 2)
            }]
          };
        }
          
        case 'create-dir': {
          // Create directory using temp file approach
          const tempFilePath = `${source}/.tmp_dir_creation_${Date.now()}.md`;
          try {
            await obsidianAPI.createFile(tempFilePath, '# Temporary file for directory creation');
            await obsidianAPI.deleteFile(tempFilePath);
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  operation: 'create-dir',
                  source,
                  success: true,
                  message: 'Directory created successfully'
                }, null, 2)
              }]
            };
          } catch (error) {
            throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
          
        case 'delete-dir':
          // For now, implement basic directory deletion
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                operation: 'delete-dir',
                source,
                status: 'not_implemented',
                message: 'Directory deletion not yet implemented - requires recursive file deletion'
              }, null, 2)
            }]
          };
          
        case 'find-replace': {
          if (!parameters.replacements || !Array.isArray(parameters.replacements)) {
            throw new Error('Replacements array is required for find-replace operations');
          }
          
          const replaceResult = await this.performFindReplace(parameters, options);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(replaceResult, null, 2)
            }]
          };
        }
          
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
    } catch (error) {
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            operation,
            source,
            target,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }]
      };
    }
  }

  private previewOperation(operation: string, source: string, target?: string, parameters?: any): string[] {
    const changes: string[] = [];
    
    switch (operation) {
      case 'move':
      case 'rename':
        changes.push(`Move file from '${source}' to '${target}'`);
        changes.push('Update all links pointing to this file');
        break;
      case 'copy':
        changes.push(`Copy file from '${source}' to '${target}'`);
        break;
      case 'delete':
        changes.push(`Delete file '${source}'`);
        changes.push('Remove all broken links to this file');
        break;
      case 'find-replace':
        changes.push(`Perform ${parameters?.replacements?.length || 0} text replacements`);
        if (parameters?.scope?.paths) {
          changes.push(`Target ${parameters.scope.paths.length} specific files`);
        }
        if (parameters?.scope?.folders) {
          changes.push(`Target files in ${parameters.scope.folders.length} folders`);
        }
        break;
    }
    
    return changes;
  }

  private async cleanupLinksAfterDelete(deletedPath: string): Promise<{linksCleanedUp: number, filesUpdated: number, updatedFiles: string[]}> {
    // Find all files that might link to the deleted file
    const allFiles = await obsidianAPI.listFiles(undefined, true);
    const markdownFiles = allFiles
      .filter(file => !file.isFolder && file.path.endsWith('.md'))
      .map(file => file.path);

    let linksCleanedUp = 0;
    let filesUpdated = 0;
    const updatedFiles: string[] = [];
    const deletedBasename = deletedPath.split('/').pop()?.replace(/\.md$/, '') || deletedPath;

    for (const filePath of markdownFiles) {
      try {
        const content = await obsidianAPI.getFileContent(filePath);
        let updatedContent = content;
        let fileHadChanges = false;

        // Remove wikilinks to deleted file
        const wikilinkRegex = new RegExp(`\\[\\[${deletedBasename}([#|][^\\]]*)?\\]\\]`, 'g');
        const newContent1 = updatedContent.replace(wikilinkRegex, (match) => {
          fileHadChanges = true;
          linksCleanedUp++;
          return `~~${match}~~ (deleted)`;
        });
        updatedContent = newContent1;

        // Remove embeds to deleted file
        const embedRegex = new RegExp(`!\\[\\[${deletedBasename}([#|][^\\]]*)?\\]\\]`, 'g');
        const newContent2 = updatedContent.replace(embedRegex, (match) => {
          fileHadChanges = true;
          linksCleanedUp++;
          return `~~${match}~~ (deleted)`;
        });
        updatedContent = newContent2;

        // Remove markdown links to deleted file
        const markdownLinkRegex = new RegExp(`\\[([^\\]]+)\\]\\(${deletedPath.replace(/\.md$/, '')}(\\.md)?([#][^)]*)?\\)`, 'g');
        const newContent3 = updatedContent.replace(markdownLinkRegex, (match, linkText) => {
          fileHadChanges = true;
          linksCleanedUp++;
          return `~~${linkText}~~ (deleted)`;
        });
        updatedContent = newContent3;

        if (fileHadChanges) {
          await obsidianAPI.updateFileContent(filePath, updatedContent);
          filesUpdated++;
          updatedFiles.push(filePath);
        }
      } catch (error) {
        logger.warn(`Failed to clean up links in ${filePath}`, { error });
      }
    }

    return { linksCleanedUp, filesUpdated, updatedFiles };
  }

  private async performFindReplace(parameters: any, _options: any): Promise<any> {
    const { replacements, useRegex = false, caseSensitive = false, preserveCase = true, scope } = parameters;
    
    // Get target files
    let targetFiles: string[] = [];
    
    if (scope?.paths) {
      targetFiles = scope.paths;
    } else if (scope?.folders) {
      // Get all markdown files in specified folders
      for (const folder of scope.folders) {
        const files = await obsidianAPI.listFiles(folder, true);
        const mdFiles = files
          .filter(f => !f.isFolder && f.path.endsWith('.md'))
          .map(f => f.path);
        targetFiles.push(...mdFiles);
      }
    } else {
      // Default to all markdown files in vault
      const allFiles = await obsidianAPI.listFiles(undefined, true);
      targetFiles = allFiles
        .filter(f => !f.isFolder && f.path.endsWith('.md'))
        .map(f => f.path);
    }

    let totalReplacements = 0;
    let filesUpdated = 0;
    const updatedFiles: string[] = [];
    const errors: Array<{file: string, error: string}> = [];

    for (const filePath of targetFiles) {
      try {
        const content = await obsidianAPI.getFileContent(filePath);
        let updatedContent = content;
        let fileHadChanges = false;

        for (const replacement of replacements) {
          const { search, replace } = replacement;
          
          if (useRegex) {
            const flags = caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(search, flags);
            const matches = updatedContent.match(regex);
            if (matches) {
              if (preserveCase && !caseSensitive) {
                // Use callback function to preserve case for each match
                updatedContent = updatedContent.replace(regex, (match) => {
                  return smartPreserveCase(match, replace);
                });
              } else {
                // Standard replacement without case preservation
                updatedContent = updatedContent.replace(regex, replace);
              }
              totalReplacements += matches.length;
              fileHadChanges = true;
            }
          } else {
            const searchTerm = caseSensitive ? search : search.toLowerCase();
            const contentToSearch = caseSensitive ? updatedContent : updatedContent.toLowerCase();
            
            if (contentToSearch.includes(searchTerm)) {
              const regex = new RegExp(escapeRegExp(search), caseSensitive ? 'g' : 'gi');
              const matches = updatedContent.match(regex);
              if (matches) {
                if (preserveCase && !caseSensitive) {
                  // Use callback function to preserve case for each match
                  updatedContent = updatedContent.replace(regex, (match) => {
                    return smartPreserveCase(match, replace);
                  });
                } else {
                  // Standard replacement without case preservation
                  updatedContent = updatedContent.replace(regex, replace);
                }
                totalReplacements += matches.length;
                fileHadChanges = true;
              }
            }
          }
        }

        if (fileHadChanges) {
          await obsidianAPI.updateFileContent(filePath, updatedContent);
          filesUpdated++;
          updatedFiles.push(filePath);
        }
      } catch (error) {
        errors.push({
          file: filePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      operation: 'find-replace',
      success: true,
      totalReplacements,
      filesUpdated,
      filesScanned: targetFiles.length,
      updatedFiles,
      errors,
      replacements: replacements.map((r: any) => ({ search: r.search, replace: r.replace }))
    };
  }
}

// Helper function to detect and parse YAML frontmatter boundaries
function parseFrontmatterBoundary(content: string): { hasFrontmatter: boolean; frontmatterEndIndex: number } {
  if (!content.startsWith('---')) {
    return { hasFrontmatter: false, frontmatterEndIndex: 0 };
  }
  
  const lines = content.split('\n');
  let frontmatterEndIndex = -1;
  
  // Look for closing --- delimiter (skip the opening ---)
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      // Calculate the index after the closing --- and its newline
      frontmatterEndIndex = lines.slice(0, i + 1).join('\n').length;
      break;
    }
  }
  
  // If we found a valid closing delimiter
  if (frontmatterEndIndex > 0) {
    return { hasFrontmatter: true, frontmatterEndIndex };
  }
  
  // Malformed frontmatter (no closing ---), treat as no frontmatter
  return { hasFrontmatter: false, frontmatterEndIndex: 0 };
}

// Utility function to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Smart case preservation utility for find-replace operations
function smartPreserveCase(originalMatch: string, replacementText: string): string {
  if (!originalMatch || !replacementText) {
    return replacementText;
  }

  // If original is all uppercase -> make replacement all uppercase
  if (originalMatch === originalMatch.toUpperCase() && originalMatch !== originalMatch.toLowerCase()) {
    return replacementText.toUpperCase();
  }
  
  // If original has first letter capitalized and rest lowercase -> capitalize replacement
  if (originalMatch[0] === originalMatch[0].toUpperCase() && 
      originalMatch.slice(1) === originalMatch.slice(1).toLowerCase() &&
      originalMatch !== originalMatch.toLowerCase()) {
    return replacementText.charAt(0).toUpperCase() + replacementText.slice(1).toLowerCase();
  }
  
  // If original is all lowercase or mixed case -> keep replacement as-is (lowercase)
  return replacementText.toLowerCase();
}

// Create and export server instance
export const server = new ObsidianResearchServer();