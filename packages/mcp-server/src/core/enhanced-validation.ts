import { z } from 'zod';
import { ErrorFactory } from './structured-errors.js';
import { logger } from './logger.js';

// Enhanced validation schemas with security checks
export const SafePathSchema = z.string()
  .min(1, 'Path cannot be empty')
  .max(1000, 'Path too long (max 1000 characters)')
  .refine(path => !path.includes('\0'), 'Path cannot contain null bytes')
  .refine(path => !path.match(/\.\.[/\\]/), 'Path cannot contain directory traversal')
  .refine(path => !/[<>"|*?]/.test(path), 'Path contains invalid characters')
  .refine(path => !path.match(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i), 'Reserved filename');

export const SafeContentSchema = z.string()
  .max(10_000_000, 'Content too large (max 10MB)') // 10MB limit
  .refine(content => !content.includes('\0'), 'Content cannot contain null bytes');

export const RegexPatternSchema = z.string()
  .min(1, 'Pattern cannot be empty')
  .max(1000, 'Pattern too long')
  .refine(pattern => {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid regular expression');

export const TagSchema = z.string()
  .min(1, 'Tag cannot be empty')
  .max(100, 'Tag too long')
  .regex(/^[a-zA-Z0-9/_-]+$/, 'Tag contains invalid characters');

export const LinkedToPathSchema = z.string()
  .min(1, 'File path cannot be empty')
  .max(500, 'File path too long (max 500 characters)')
  .transform(path => {
    // Clean path first: remove query parameters and fragments
    return path.split('?')[0].split('#')[0].trim();
  })
  .refine(path => !path.includes('\0'), 'Path cannot contain null bytes')
  .refine(path => !path.match(/\.\.[/\\]/), 'Path cannot contain directory traversal')
  .refine(path => !/[<>"|*]/.test(path), 'Path contains invalid characters')
  .refine(path => {
    const basename = path.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    return !basename.match(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i);
  }, 'Reserved filename')
  .refine(path => !path.startsWith('/') && !path.match(/^[a-zA-Z]:/), 'Use relative paths within the vault')
  .transform(path => {
    // Normalize path: add .md extension if no extension present
    if (!path.endsWith('.md') && !path.includes('.')) {
      return path + '.md';
    }
    return path;
  });

export const LimitSchema = z.number()
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(1000, 'Limit too high (max 1000)');

export const DepthSchema = z.number()
  .int('Depth must be an integer')
  .min(0, 'Depth cannot be negative')
  .max(5, 'Depth too high (max 5)');

// Validation for consolidated tools
export const SearchInputSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(10000, 'Query too long'),
  mode: z.enum(['semantic', 'structural', 'hybrid', 'pattern']).default('hybrid'),
  filters: z.object({
    tags: z.array(TagSchema).optional(),
    folders: z.array(SafePathSchema).optional(),
    linkedTo: z.array(LinkedToPathSchema).optional(),
    dateRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional()
    }).refine(range => {
      if (range.start && range.end) {
        return new Date(range.start) <= new Date(range.end);
      }
      return true;
    }, 'End date must be after start date').optional(),
    hasProperty: z.record(z.any()).optional(),
    fileTypes: z.array(z.string().regex(/^\.[a-zA-Z0-9]+$/, 'Invalid file extension')).optional()
  }).optional(),
  options: z.object({
    expandSearch: z.boolean().default(false),
    searchDepth: DepthSchema.default(1),
    limit: LimitSchema.default(50),
    includeContext: z.boolean().default(true),
    useRegex: z.boolean().default(false),
    caseSensitive: z.boolean().default(false),
    contextWindow: z.number().int().min(0).max(10).default(2)
  }).optional()
}).refine(data => {
  // If using pattern mode or regex, validate pattern
  if (data.mode === 'pattern' || data.options?.useRegex) {
    try {
      new RegExp(data.query);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}, 'Invalid regex pattern in query');

export const GetNotesInputSchema = z.object({
  target: z.union([
    SafePathSchema,
    z.array(SafePathSchema).min(1, 'Target array cannot be empty').max(100, 'Too many paths (max 100)'),
    z.object({
      pattern: z.string().optional(),
      tags: z.array(TagSchema).optional(),
      folder: SafePathSchema.optional(),
      recent: z.number().int().min(1).max(1000).optional(),
      random: z.number().int().min(1).max(100).optional()
    }).refine(obj => {
      // At least one targeting method must be specified
      return !!(obj.pattern || obj.tags || obj.folder || obj.recent || obj.random);
    }, 'At least one targeting method must be specified')
  ]),
  options: z.object({
    format: z.enum(['markdown', 'json', 'chunks']).default('markdown'),
    includeContent: z.boolean().default(true),
    includeMetadata: z.boolean().default(true),
    includeBacklinks: z.boolean().default(false),
    includeForwardLinks: z.boolean().default(false),
    chunkOptions: z.object({
      minLength: z.number().int().min(10).max(10000).default(100),
      maxLength: z.number().int().min(100).max(50000).default(2000),
      preserveBoundaries: z.boolean().default(true),
      includeContext: z.boolean().default(true)
    }).optional(),
    sections: z.array(z.union([
      z.string(),
      z.object({
        type: z.enum(['heading', 'line_range', 'pattern']),
        value: z.union([
          z.string(),
          z.object({
            start: z.number().int().min(1),
            end: z.number().int().min(1)
          }).refine(range => range.end >= range.start, 'End line must be >= start line')
        ]),
        level: z.number().int().min(1).max(6).optional()
      })
    ])).max(50, 'Too many sections specified').optional()
  }).optional()
});

export const WriteNoteInputSchema = z.object({
  path: SafePathSchema,
  content: SafeContentSchema,
  mode: z.enum(['overwrite', 'append', 'prepend', 'insert']).default('overwrite'),
  target: z.object({
    type: z.enum(['heading', 'line', 'after', 'before', 'frontmatter']),
    value: z.string().min(1, 'Target value cannot be empty').max(1000, 'Target value too long'),
    createIfMissing: z.boolean().default(false)
  }).optional(),
  options: z.object({
    ensureDirectories: z.boolean().default(true),
    backup: z.boolean().default(false),
    templatePath: SafePathSchema.optional()
  }).optional()
}).refine(data => {
  // If mode is insert, target is required
  if (data.mode === 'insert' && !data.target) {
    return false;
  }
  return true;
}, 'Target is required for insert mode');

export const BatchOperationInputSchema = z.object({
  operation: z.enum(['find-replace', 'update-links', 'manage-metadata', 'rename', 'move', 'tag', 'cleanup']),
  target: z.object({
    paths: z.array(SafePathSchema).max(1000, 'Too many paths (max 1000)').optional(),
    pattern: z.string().max(1000).optional(),
    folder: SafePathSchema.optional(),
    tags: z.array(TagSchema).optional(),
    query: z.string().max(10000).optional()
  }).refine(obj => {
    // At least one targeting method must be specified
    return !!(obj.paths || obj.pattern || obj.folder || obj.tags || obj.query);
  }, 'At least one targeting method must be specified'),
  parameters: z.object({
    replacements: z.array(z.object({
      find: z.string().min(1).max(10000),
      replace: z.string().max(10000),
      useRegex: z.boolean().default(false)
    })).max(100, 'Too many replacements').optional(),
    oldPath: SafePathSchema.optional(),
    newPath: SafePathSchema.optional(),
    updateBacklinks: z.boolean().default(true),
    metadataOperation: z.enum(['add', 'remove', 'update', 'get']).optional(),
    key: z.string().max(100).optional(),
    value: z.any().optional(),
    tags: z.array(TagSchema).optional()
  }).optional(),
  options: z.object({
    dryRun: z.boolean().default(false),
    backup: z.boolean().default(true),
    continueOnError: z.boolean().default(true),
    maxFiles: z.number().int().min(1).max(10000).default(100)
  }).optional()
});

export const FileOperationInputSchema = z.object({
  operation: z.enum(['create', 'delete', 'move', 'copy', 'mkdir', 'exists', 'info']),
  source: SafePathSchema,
  target: SafePathSchema.optional(),
  options: z.object({
    recursive: z.boolean().default(false),
    overwrite: z.boolean().default(false),
    backup: z.boolean().default(true),
    safeDelete: z.boolean().default(true)
  }).optional()
}).refine(data => {
  // Operations that require target
  if (['move', 'copy'].includes(data.operation) && !data.target) {
    return false;
  }
  return true;
}, 'Target is required for move and copy operations');

// Rate limiting schemas
export const RateLimitSchema = z.object({
  windowMs: z.number().int().min(1000).max(3600000), // 1s to 1h
  maxRequests: z.number().int().min(1).max(10000),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false)
});

// Comprehensive input validator
export class InputValidator {
  /**
   * Validate and sanitize input for any tool
   */
  static validateInput<T>(schema: z.ZodSchema<T>, input: any, toolName: string): T {
    try {
      const result = schema.parse(input);
      
      logger.debug('Input validation successful', { 
        toolName, 
        inputKeys: Object.keys(input) 
      });
      
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        );
        
        logger.warn('Input validation failed', { 
          toolName, 
          issues,
          input: this.sanitizeForLogging(input)
        });
        
        throw ErrorFactory.validationFailed(
          'input',
          input,
          issues.join('; '),
          { operation: toolName }
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Validate file path with additional security checks
   */
  static validateFilePath(path: string, context: string = 'file operation'): string {
    try {
      const validated = SafePathSchema.parse(path);
      
      // Additional security checks
      this.checkPathSecurity(validated, context);
      
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ErrorFactory.validationFailed(
          'path',
          path,
          error.issues[0]?.message || 'Invalid path',
          { operation: context }
        );
      }
      throw error;
    }
  }
  
  /**
   * Validate array of paths
   */
  static validateFilePaths(paths: string[], context: string = 'batch operation'): string[] {
    if (paths.length === 0) {
      throw ErrorFactory.invalidInput('Path array cannot be empty', { operation: context });
    }
    
    if (paths.length > 1000) {
      throw ErrorFactory.invalidInput('Too many paths (max 1000)', { operation: context });
    }
    
    return paths.map(path => this.validateFilePath(path, context));
  }
  
  /**
   * Validate regex pattern
   */
  static validateRegexPattern(pattern: string, context: string = 'pattern matching'): RegExp {
    try {
      const validatedPattern = RegexPatternSchema.parse(pattern);
      return new RegExp(validatedPattern);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ErrorFactory.validationFailed(
          'regex pattern',
          pattern,
          error.issues[0]?.message || 'Invalid regex pattern',
          { operation: context }
        );
      }
      throw error;
    }
  }
  
  /**
   * Validate and sanitize search query
   */
  static validateSearchQuery(query: string, allowRegex: boolean = false): string {
    if (!query || typeof query !== 'string') {
      throw ErrorFactory.invalidInput('Query must be a non-empty string');
    }
    
    if (query.length > 10000) {
      throw ErrorFactory.invalidInput('Query too long (max 10000 characters)');
    }
    
    if (allowRegex) {
      try {
        new RegExp(query);
      } catch {
        throw ErrorFactory.validationFailed(
          'query',
          query,
          'Invalid regular expression',
          { operation: 'search' }
        );
      }
    }
    
    return query.trim();
  }
  
  /**
   * Additional security checks for paths
   */
  private static checkPathSecurity(path: string, context: string): void {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /etc\/passwd/,
      /etc\/shadow/,
      /proc\//,
      /sys\//,
      /dev\//,
      /\.ssh\//,
      /\.aws\//,
      /\.env/,
      /id_rsa/,
      /\.key$/,
      /\.pem$/
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(path.toLowerCase())) {
        logger.warn('Suspicious path pattern detected', { path, context, pattern: pattern.toString() });
        throw ErrorFactory.pathTraversal(path, { 
          operation: context,
          additionalData: { reason: 'suspicious_pattern', pattern: pattern.toString() }
        });
      }
    }
  }
  
  /**
   * Sanitize input for logging (remove sensitive data)
   */
  private static sanitizeForLogging(input: any): any {
    if (typeof input !== 'object' || input === null) {
      return input;
    }
    
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    const sanitized = { ...input };
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  /**
   * Validate content size and type
   */
  static validateContent(content: string, maxSize: number = 10_000_000): string {
    if (typeof content !== 'string') {
      throw ErrorFactory.invalidInput('Content must be a string');
    }
    
    if (content.length > maxSize) {
      throw ErrorFactory.invalidInput(`Content too large (max ${Math.floor(maxSize / 1000000)}MB)`);
    }
    
    if (content.includes('\0')) {
      throw ErrorFactory.invalidInput('Content cannot contain null bytes');
    }
    
    return content;
  }
  
  /**
   * Validate numerical limits
   */
  static validateLimit(limit: number, min: number = 1, max: number = 1000): number {
    if (!Number.isInteger(limit)) {
      throw ErrorFactory.invalidInput('Limit must be an integer');
    }
    
    if (limit < min) {
      throw ErrorFactory.invalidInput(`Limit must be at least ${min}`);
    }
    
    if (limit > max) {
      throw ErrorFactory.invalidInput(`Limit too high (max ${max})`);
    }
    
    return limit;
  }
}

// Export tool-specific validation functions
export const validateSearchInput = (input: any) => 
  InputValidator.validateInput(SearchInputSchema, input, 'search');

export const validateGetNotesInput = (input: any) => 
  InputValidator.validateInput(GetNotesInputSchema, input, 'get_notes');

export const validateWriteNoteInput = (input: any) => 
  InputValidator.validateInput(WriteNoteInputSchema, input, 'write_note');

export const validateBatchOperationInput = (input: any) => 
  InputValidator.validateInput(BatchOperationInputSchema, input, 'batch');

export const validateFileOperationInput = (input: any) => 
  InputValidator.validateInput(FileOperationInputSchema, input, 'files');