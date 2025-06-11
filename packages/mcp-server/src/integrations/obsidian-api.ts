import fetch from 'node-fetch';
import https from 'https';
import * as fs from 'fs/promises';
import path from 'path';
import { config } from '../core/config.js';
import { logger, LoggedError } from '../core/logger.js';
import { YamlParser } from '../core/yaml-parser.js';
import { SearchFilters } from '@obsidian-research-mcp/shared';
import { StructuredError, ErrorFactory, ErrorCode } from '../core/structured-errors.js';

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

export class ObsidianAPI {
  private baseUrl: string;
  private headers: Record<string, string>;
  private agent: https.Agent | undefined;
  private fileListCache: { files: ObsidianFile[], timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private yamlParser = new YamlParser();

  constructor() {
    // Remove trailing slash to avoid double slashes in URL construction
    this.baseUrl = config.obsidianApiUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
    };

    if (config.obsidianApiKey) {
      this.headers['Authorization'] = `Bearer ${config.obsidianApiKey}`;
    }

    // Create HTTPS agent to bypass SSL verification for self-signed certificates
    if (this.baseUrl.startsWith('https')) {
      this.agent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    logger.info('ObsidianAPI initialized', { 
      baseUrl: this.baseUrl, 
      hasApiKey: !!config.obsidianApiKey,
      vaultPath: config.obsidianVaultPath 
    });
  }

  private getFetchOptions(options: any = {}): any {
    return {
      headers: this.headers,
      agent: this.agent,
      ...options,
    };
  }

  private normalizePath(filePath: string): string {
    // Input validation
    if (!filePath || typeof filePath !== 'string') {
      throw new LoggedError('Invalid path: path must be a non-empty string');
    }

    // Check for null bytes (another security risk)
    if (filePath.includes('\0')) {
      throw new LoggedError('Invalid path: null bytes detected');
    }

    // Decode URL encoding to catch encoded traversal attempts
    let decodedPath = filePath;
    try {
      decodedPath = decodeURIComponent(filePath);
    } catch (error) {
      throw new LoggedError('Invalid path: malformed URL encoding');
    }

    // Check for directory traversal patterns (including encoded versions)
    const traversalPatterns = [
      '../', '..\\', 
      '%2e%2e%2f', '%2e%2e%5c', // URL encoded ../
      '%2E%2E%2F', '%2E%2E%5C', // Upper case URL encoded
      '..%2f', '..%5c',         // Mixed encoding
      '..%252f', '..%252c',     // Double encoded
      '..../', '....\\'         // Bypass attempt with extra dots
    ];
    
    const pathLower = decodedPath.toLowerCase();
    for (const pattern of traversalPatterns) {
      if (pathLower.includes(pattern.toLowerCase())) {
        throw ErrorFactory.pathTraversal(filePath, { operation: 'normalizePath' });
      }
    }
    
    // Remove leading slash if present
    let normalized = decodedPath.startsWith('/') ? decodedPath.substring(1) : decodedPath;
    
    // Ensure .md extension for notes (only for files without extensions)
    if (!normalized.includes('.')) {
      normalized += '.md';
    }
    
    // Normalize slashes to forward slashes
    normalized = normalized.replace(/\\/g, '/');
    
    // Use path.posix.resolve for secure path resolution
    // This resolves .. components and ensures the path stays within bounds
    const resolved = path.posix.resolve('/', normalized);
    
    // Ensure resolved path starts with / (should always be true with resolve)
    if (!resolved.startsWith('/')) {
      throw new LoggedError('Invalid path: path resolution failed');
    }
    
    // Remove the leading slash we added for resolution
    const finalPath = resolved.substring(1);
    
    // Final check: ensure no .. components remain
    if (finalPath.includes('..')) {
      throw new LoggedError('Invalid path: directory traversal detected after normalization');
    }
    
    // Validate path length (prevent extremely long paths)
    if (finalPath.length > 1000) {
      throw new LoggedError('Invalid path: path too long (max 1000 characters)');
    }
    
    // Validate path contains only safe characters
    // Allow alphanumeric, spaces, hyphens, underscores, dots, and forward slashes
    if (!/^[a-zA-Z0-9\s\-_./]+$/.test(finalPath)) {
      throw new LoggedError('Invalid path: contains unsafe characters');
    }
    
    return finalPath;
  }

  async getVaultInfo(): Promise<{ name: string; path: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/vault/`, this.getFetchOptions());

      if (!response.ok) {
        throw ErrorFactory.obsidianConnectionFailed(
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          { operation: 'getVaultInfo' }
        );
      }

      return await response.json() as { name: string; path: string };
    } catch (error) {
      if (error instanceof StructuredError) {
        throw error;
      }
      throw ErrorFactory.obsidianConnectionFailed(error as Error, { operation: 'getVaultInfo' });
    }
  }

  async listFiles(folder?: string, recursive: boolean = false, includeMetadata: boolean = false): Promise<ObsidianFile[]> {
    // Check cache for recursive root folder requests (folder === undefined && recursive)
    if (folder === undefined && recursive && this.fileListCache && 
        Date.now() - this.fileListCache.timestamp < this.CACHE_DURATION) {
      logger.debug('Using cached file list');
      return this.fileListCache.files;
    }

    try {
      const url = folder 
        ? `${this.baseUrl}/vault/${encodeURIComponent(folder.endsWith('/') ? folder.slice(0, -1) : folder)}/`
        : `${this.baseUrl}/vault/`;

      logger.info('Listing files', { url, folder, baseUrl: this.baseUrl });

      const response = await fetch(url, this.getFetchOptions());

      if (!response.ok) {
        logger.error('Failed to list files', { 
          status: response.status, 
          statusText: response.statusText,
          url,
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new LoggedError(`Failed to list files: ${response.statusText}`);
      }

      const data = await response.json() as { files: string[] };
      
      // Convert string array to ObsidianFile objects with detailed info
      const files = await Promise.all(data.files.map(async (filePath) => {
        const isFolder = filePath.endsWith('/');
        
        // If we're in a subfolder, prepend the folder path to the file path
        const fullPath = folder ? `${folder.endsWith('/') ? folder : folder + '/'}${filePath}` : filePath;
        
        const fileObj: ObsidianFile = {
          path: fullPath,
          name: filePath.split('/').pop() || filePath,
          isFolder,
        };

        // Add metadata if requested and it's a file (not folder)
        if (includeMetadata && !isFolder) {
          try {
            const metadata = await this.getFileMetadata(fullPath);
            fileObj.size = metadata.size;
            fileObj.mtime = metadata.mtime;
            fileObj.ctime = metadata.ctime;
          } catch (error) {
            logger.warn(`Failed to get metadata for file ${fullPath}`, { error });
            // Continue without metadata rather than failing entirely
          }
        }
        
        return fileObj;
      }));
      
      // Only recurse if explicitly requested
      if (recursive) {
        const subfolders = files.filter(f => f.isFolder);
        
        for (const subfolder of subfolders) {
          try {
            const subfolderFiles = await this.listFiles(subfolder.path, recursive, includeMetadata);
            files.push(...subfolderFiles);
          } catch (error) {
            logger.warn(`Failed to list files in subfolder ${subfolder.path}`, { error });
          }
        }
      }
      
      // Cache result if recursive root folder request
      if (folder === undefined && recursive) {
        this.fileListCache = { files, timestamp: Date.now() };
        logger.debug('Cached file list', { fileCount: files.length });
      }
      
      return files;
    } catch (error) {
      throw new LoggedError('Failed to list vault files', { error, folder });
    }
  }

  async getDirectoryFileCount(folderPath: string): Promise<number> {
    try {
      const files = await this.listFiles(folderPath, false);
      return files.filter(f => !f.isFolder).length;
    } catch (error) {
      logger.warn(`Failed to get file count for ${folderPath}`, { error });
      return 0;
    }
  }

  async getFileMetadata(filePath: string): Promise<{size: number, mtime: number, ctime: number}> {
    let size = 0;
    let mtime = 0;
    let ctime = 0;
    
    // Try to get file stats from filesystem if vault path is available
    if (config.obsidianVaultPath) {
      try {
        const localPath = path.join(config.obsidianVaultPath, filePath);
        const stats = await fs.stat(localPath);
        size = stats.size;
        mtime = stats.mtime.getTime();
        ctime = stats.ctime.getTime();
      } catch (error) {
        // If filesystem access fails, fall back to API method for size
        try {
          const fileUrl = `${this.baseUrl}/vault/${encodeURIComponent(filePath)}`;
          const headResponse = await fetch(fileUrl, this.getFetchOptions({ method: 'HEAD' }));
          
          if (headResponse.ok) {
            const contentLength = headResponse.headers.get('content-length');
            if (contentLength) {
              size = parseInt(contentLength, 10);
            }
          }
        } catch (apiError) {
          logger.warn(`Failed to get file details for ${filePath}`, { error: apiError });
        }
      }
    } else {
      // Fall back to API method if no vault path
      try {
        const fileUrl = `${this.baseUrl}/vault/${encodeURIComponent(filePath)}`;
        const headResponse = await fetch(fileUrl, this.getFetchOptions({ method: 'HEAD' }));
        
        if (headResponse.ok) {
          const contentLength = headResponse.headers.get('content-length');
          if (contentLength) {
            size = parseInt(contentLength, 10);
          }
        }
      } catch (error) {
        logger.warn(`Failed to get file details for ${filePath}`, { error });
      }
    }
    
    return { size, mtime, ctime };
  }

  async getFileContent(path: string): Promise<string> {
    const normalizedPath = this.normalizePath(path);
    try {
      const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(normalizedPath)}`, this.getFetchOptions());

      if (!response.ok) {
        if (response.status === 404) {
          throw ErrorFactory.fileNotFound(path, { operation: 'getFileContent' });
        }
        throw ErrorFactory.obsidianConnectionFailed(
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          { operation: 'getFileContent', filePath: path }
        );
      }

      return await response.text();
    } catch (error) {
      if (error instanceof StructuredError) {
        throw error;
      }
      throw new StructuredError(
        ErrorCode.FILE_ACCESS_DENIED,
        `Failed to get file content: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'getFileContent', filePath: path },
        { cause: error as Error }
      );
    }
  }

  async getNote(path: string): Promise<ObsidianNote> {
    const normalizedPath = this.normalizePath(path);
    logger.debug(`getNote called with path: ${path}, normalized: ${normalizedPath}`);
    
    try {
      // Try direct path first
      let actualPath = path;
      
      try {
        logger.debug(`Trying direct path: ${actualPath}`);
        const content = await this.getFileContent(actualPath);
        logger.debug(`Direct path successful for: ${actualPath}`);
        const note = this.parseNoteContent(actualPath, content);
        
        // Get backlinks
        note.backlinks = await this.getBacklinks(actualPath);
        
        return note;
      } catch (directError) {
        // If direct path fails, try to resolve the link across the vault
        logger.debug(`Direct path failed for ${path}, attempting resolution`);
        const resolvedPath = await this.resolveLinkPath(path);
        logger.debug(`Resolution result for ${path}: ${resolvedPath}`);
        
        if (resolvedPath) {
          actualPath = resolvedPath;
          logger.debug(`Trying resolved path: ${actualPath}`);
          const content = await this.getFileContent(actualPath);
          logger.debug(`Resolved path successful for: ${actualPath}`);
          const note = this.parseNoteContent(actualPath, content);
          
          // Get backlinks
          note.backlinks = await this.getBacklinks(actualPath);
          
          return note;
        }
        
        // If resolution also fails, throw the original error
        logger.debug(`Resolution failed for ${path}, throwing original error`);
        throw directError;
      }
    } catch (error) {
      throw new LoggedError('Failed to get note', { error, path });
    }
  }

  private async resolveLinkPath(linkText: string): Promise<string | null> {
    try {
      // Approach 1: Try to find file in vault API listing
      const allFiles = await this.listFiles();
      
      const candidateFiles = allFiles.filter(file => {
        if (file.isFolder) return false;
        
        const fileName = file.path.split('/').pop() || '';
        const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        const linkWithoutExt = linkText.replace(/\.md$/, '');
        
        // Exact filename match
        if (fileName === linkText) return true;
        
        // Filename without extension match
        if (fileNameWithoutExt === linkWithoutExt) return true;
        
        // Case-insensitive match
        if (fileName.toLowerCase() === linkText.toLowerCase()) return true;
        if (fileNameWithoutExt.toLowerCase() === linkWithoutExt.toLowerCase()) return true;
        
        return false;
      });
      
      if (candidateFiles.length > 0) {
        // Prefer exact matches, then case-sensitive, then case-insensitive
        const exactMatch = candidateFiles.find(f => 
          f.path.split('/').pop() === linkText || 
          f.path.split('/').pop()?.replace(/\.[^/.]+$/, '') === linkText.replace(/\.md$/, '')
        );
        
        return exactMatch?.path || candidateFiles[0].path;
      }
      
      // Approach 2: If not found in API listing and we have vault path, try filesystem search
      if (config.obsidianVaultPath && !linkText.includes('/')) {
        try {
          logger.debug('Searching filesystem for basename', { linkText, vaultPath: config.obsidianVaultPath });
          
          // Recursively search the vault directory for files matching the basename
          const foundPath = await this.searchFilesystemForBasename(config.obsidianVaultPath, linkText);
          
          if (foundPath) {
            // Convert absolute path to relative path from vault root
            const relativePath = path.relative(config.obsidianVaultPath, foundPath);
            // Normalize path separators to forward slashes
            const normalizedPath = relativePath.replace(/\\/g, '/');
            
            logger.debug('Found file via filesystem search', { 
              linkText, 
              foundPath, 
              relativePath: normalizedPath 
            });
            
            return normalizedPath;
          }
        } catch (fsError) {
          logger.debug('Filesystem search failed', { error: fsError, linkText });
        }
      }
      
      return null;
    } catch (error) {
      logger.debug('Failed to resolve link path', { error, linkText });
      return null;
    }
  }

  private async searchFilesystemForBasename(dir: string, basename: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      // First, check files in current directory
      for (const entry of entries) {
        if (entry.isFile()) {
          const fileName = entry.name;
          const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
          const basenameWithoutExt = basename.replace(/\.md$/, '');
          
          // Check for matches
          if (fileName === basename || 
              fileNameWithoutExt === basenameWithoutExt ||
              fileName.toLowerCase() === basename.toLowerCase() ||
              fileNameWithoutExt.toLowerCase() === basenameWithoutExt.toLowerCase()) {
            return path.join(dir, fileName);
          }
        }
      }
      
      // Then, recursively search subdirectories
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subdirPath = path.join(dir, entry.name);
          const found = await this.searchFilesystemForBasename(subdirPath, basename);
          if (found) {
            return found;
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.debug('Error searching directory', { error, dir, basename });
      return null;
    }
  }

  async getBacklinks(notePath: string): Promise<string[]> {
    try {
      // Use custom /backlinks/{notePath} endpoint registered by Research MCP Bridge plugin
      const encodedPath = encodeURIComponent(notePath);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/backlinks/${encodedPath}`, {
        ...this.getFetchOptions(),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new LoggedError(`Backlinks endpoint error: ${response.status} ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText,
          notePath
        });
      }

      const data = await response.json() as { 
        targetPath: string; 
        backlinks: Array<{ path: string; name: string }>; 
        count: number 
      };
      
      if (!data.backlinks || !Array.isArray(data.backlinks)) {
        throw new LoggedError('Invalid response from backlinks endpoint', { data, notePath });
      }
      
      logger.info(`✅ Backlinks retrieved via custom endpoint: ${data.count} found for ${notePath}`);
      
      return data.backlinks.map(backlink => backlink.path);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LoggedError('Backlinks endpoint timeout', { notePath });
      } else if (error instanceof LoggedError) {
        throw error;
      } else {
        throw new LoggedError('Backlinks endpoint request failed', { 
          error: error instanceof Error ? error.message : String(error),
          notePath
        });
      }
    }
  }


  async searchFiles(filters: SearchFilters): Promise<string[]> {
    try {
      const allFiles = await this.listFiles();
      let filteredFiles = allFiles.filter(file => !file.isFolder);

      // Apply folder filter
      if (filters.folders && filters.folders.length > 0) {
        filteredFiles = filteredFiles.filter(file => 
          filters.folders!.some(folder => file.path.startsWith(folder))
        );
      }

      // Apply file type filter
      if (filters.fileTypes && filters.fileTypes.length > 0) {
        filteredFiles = filteredFiles.filter(file =>
          filters.fileTypes!.some(type => file.path.endsWith(type))
        );
      }

      // Apply date range filter
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        
        if (start) {
          const startTime = new Date(start).getTime();
          filteredFiles = filteredFiles.filter(file => file.mtime !== undefined && file.mtime >= startTime);
        }
        
        if (end) {
          const endTime = new Date(end).getTime();
          filteredFiles = filteredFiles.filter(file => file.mtime !== undefined && file.mtime <= endTime);
        }
      }

      // Add tag filtering support
      if (filters.tags && filters.tags.length > 0) {
        logger.info(`Applying tag filtering in searchFiles`, { tags: filters.tags });
        
        const tagFilteredFiles: string[] = [];
        
        // Process in batches to avoid overwhelming the system
        const BATCH_SIZE = 20;
        for (let i = 0; i < filteredFiles.length; i += BATCH_SIZE) {
          const batch = filteredFiles.slice(i, i + BATCH_SIZE);
          
          const batchPromises = batch.map(async (file) => {
            try {
              // Only check .md files for tags
              if (!file.path.endsWith('.md')) {
                return null;
              }
              
              const note = await this.getNote(file.path);
              if (note.tags && note.tags.length > 0) {
                const hasMatchingTag = filters.tags!.some(filterTag => 
                  note.tags!.includes(filterTag)
                );
                if (hasMatchingTag) {
                  logger.debug(`Found tagged file in searchFiles: ${file.path} with tags: ${JSON.stringify(note.tags)}`);
                  return file.path;
                }
              }
              return null;
            } catch (error) {
              logger.debug(`Failed to check tags for ${file.path} in searchFiles`, { error });
              return null;
            }
          });
          
          const batchResults = await Promise.allSettled(batchPromises);
          for (const result of batchResults) {
            if (result.status === 'fulfilled' && result.value) {
              tagFilteredFiles.push(result.value);
            }
          }
        }
        
        logger.info(`Tag filtering in searchFiles found ${tagFilteredFiles.length} files`);
        return tagFilteredFiles;
      }

      return filteredFiles.map(file => file.path);
    } catch (error) {
      throw new LoggedError('Failed to search files', { error, filters });
    }
  }

  async updateFileContent(path: string, content: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    try {
      const options = this.getFetchOptions({
        method: 'PUT',
        body: content,
      });
      
      // Override Content-Type for file updates - use text/plain instead of application/json
      options.headers = {
        ...options.headers,
        'Content-Type': 'text/plain',
      };

      const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(normalizedPath)}`, options);

      if (!response.ok) {
        throw new LoggedError(`Failed to update file: ${response.statusText}`);
      }
    } catch (error) {
      throw new LoggedError('Failed to update file content', { error, path });
    }
  }

  async createFile(path: string, content: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    try {
      const url = `${this.baseUrl}/vault/${encodeURIComponent(normalizedPath)}`;
      logger.info('Creating file', { url, path, contentLength: content.length });

      const options = this.getFetchOptions({
        method: 'POST',
        body: content,
      });
      
      // Override Content-Type for file creation - use text/plain instead of application/json
      options.headers = {
        ...options.headers,
        'Content-Type': 'text/plain',
      };

      const response = await fetch(url, options);

      if (!response.ok) {
        const responseText = await response.text();
        logger.error('Failed to create file', { 
          status: response.status, 
          statusText: response.statusText,
          url,
          path,
          responseText,
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new LoggedError(`Failed to create file: ${response.statusText} - ${responseText}`);
      }
    } catch (error) {
      throw new LoggedError('Failed to create file', { error, path });
    }
  }

  async moveFile(oldPath: string, newPath: string): Promise<void> {
    try {
      logger.info('Moving file', { oldPath, newPath });
      
      // First ensure target directory exists
      await this.ensureDirectoryExists(newPath);
      
      // Get current content
      const content = await this.getFileContent(oldPath);
      
      // Create file at new location
      await this.createFile(newPath, content);
      
      // Delete old file
      await this.deleteFile(oldPath);
      
      logger.info('File moved successfully', { oldPath, newPath });
    } catch (error) {
      throw new LoggedError('Failed to move file', { error, oldPath, newPath });
    }
  }

  private async ensureDirectoryExists(filePath: string): Promise<void> {
    try {
      // Extract directory path from file path
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      
      // If no directory path (file is in root), no need to create anything
      if (!dirPath) {
        return;
      }
      
      logger.debug('Ensuring directory exists', { dirPath, filePath });
      
      // Check if directory exists by trying to list files in it
      try {
        await this.listFiles(dirPath);
        logger.debug('Directory already exists', { dirPath });
        return;
      } catch (error) {
        // Directory doesn't exist, we need to create it
        // Since Obsidian REST API doesn't have a direct "create directory" endpoint,
        // we'll create the directory structure by creating a temporary file and deleting it
        const tempFilePath = `${dirPath}/.tmp_dir_creation_${Date.now()}.md`;
        
        try {
          await this.createFile(tempFilePath, '# Temporary file for directory creation');
          await this.deleteFile(tempFilePath);
          logger.debug('Directory created via temp file', { dirPath });
        } catch (createError) {
          // If even the temp file creation fails, the directory structure might be invalid
          throw new LoggedError(`Failed to create directory structure: ${dirPath}`, { 
            error: createError, 
            dirPath, 
            filePath 
          });
        }
      }
    } catch (error) {
      throw new LoggedError('Failed to ensure directory exists', { error, filePath });
    }
  }

  async deleteFile(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    try {
      // First try to delete with exact path
      let targetPath = normalizedPath;
      
      try {
        await this.deleteFileExact(targetPath);
        return;
      } catch (exactError) {
        // If exact path fails, try case-insensitive search for safety
        logger.debug(`Exact path deletion failed for ${path}, attempting case-insensitive search`);
        const resolvedPath = await this.resolveLinkPath(path);
        
        if (resolvedPath && resolvedPath !== path) {
          targetPath = resolvedPath;
          logger.debug(`Resolved ${path} to ${targetPath} for deletion`);
          await this.deleteFileExact(targetPath);
          return;
        }
        
        // If resolution also fails, throw the original error
        throw exactError;
      }
    } catch (error) {
      throw new LoggedError('Failed to delete file', { error, path });
    }
  }

  private async deleteFileExact(path: string): Promise<void> {
    const url = `${this.baseUrl}/vault/${encodeURIComponent(path)}`;
    logger.info('Deleting file', { url, path });

    const response = await fetch(url, this.getFetchOptions({
      method: 'DELETE',
    }));

    if (!response.ok) {
      if (response.status === 404) {
        throw new LoggedError(`File not found: ${path}`);
      }
      const responseText = await response.text();
      logger.error('Failed to delete file', { 
        status: response.status, 
        statusText: response.statusText,
        url,
        path,
        responseText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new LoggedError(`Failed to delete file: ${response.statusText} - ${responseText}`);
    }
  }

  private parseNoteContent(path: string, content: string): ObsidianNote {
    const note: ObsidianNote = {
      path,
      content,
    };

    // Parse frontmatter
    // Parse frontmatter using proper YAML parser
    const frontmatterResult = this.yamlParser.extractFrontmatter(content);
    if (frontmatterResult.hasFrontmatter) {
      note.frontmatter = frontmatterResult.frontmatter;
    }

    // Extract tags from both YAML frontmatter and inline content
    const allTags = this.extractAllTags(content);
    
    // Set the tags array
    if (allTags.length > 0) {
      note.tags = allTags;
    }

    // Extract links (improved to handle multiple formats)
    const allLinks = new Set<string>();
    
    // 1. Extract wiki links [[filename]] or [[filename|alias]]
    const wikiLinkRegex = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;
    let wikiMatch;
    while ((wikiMatch = wikiLinkRegex.exec(content)) !== null) {
      const linkText = wikiMatch[1].trim();
      const cleanLinkText = this.normalizeLinkPath(linkText);
      allLinks.add(cleanLinkText);
    }
    
    // 2. Extract markdown links [text](filename.md)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let markdownMatch;
    while ((markdownMatch = markdownLinkRegex.exec(content)) !== null) {
      const linkPath = markdownMatch[2].trim();
      // Only include internal links (not URLs)
      if (!linkPath.startsWith('http') && !linkPath.startsWith('mailto:')) {
        const cleanLinkText = this.normalizeLinkPath(linkPath);
        allLinks.add(cleanLinkText);
      }
    }
    
    // 3. Extract embeds ![[filename]]
    const embedRegex = /!\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;
    let embedMatch;
    while ((embedMatch = embedRegex.exec(content)) !== null) {
      const linkText = embedMatch[1].trim();
      const cleanLinkText = this.normalizeLinkPath(linkText);
      allLinks.add(cleanLinkText);
    }
    
    if (allLinks.size > 0) {
      note.links = Array.from(allLinks);
    }

    return note;
  }

  private normalizeLinkPath(linkPath: string): string {
    // Remove query parameters and fragments
    const cleanPath = linkPath.split('?')[0].split('#')[0].trim();
    
    // Add .md extension if not already present and not already an extension
    if (!cleanPath.endsWith('.md') && !cleanPath.includes('.')) {
      return cleanPath + '.md';
    }
    
    return cleanPath;
  }

  // Enhanced method to extract all tags from content (frontmatter + inline)
  private extractAllTags(content: string): string[] {
    const allTags = new Set<string>();
    
    // 1. Extract tags from YAML frontmatter
    const frontmatterTags = this.extractFrontmatterTags(content);
    logger.debug('Frontmatter tags extracted', { 
      frontmatterTags, 
      contentStart: content.substring(0, 100)
    });
    frontmatterTags.forEach(tag => allTags.add(tag));
    
    // 2. Extract inline tags (#tag format) - but not from code blocks or comments
    const inlineTags = this.extractInlineTags(content);
    logger.debug('Inline tags extracted', { inlineTags });
    inlineTags.forEach(tag => allTags.add(tag));
    
    logger.debug('All tags combined', { allTags: Array.from(allTags) });
    return Array.from(allTags).sort();
  }

  // Extract tags from YAML frontmatter with comprehensive format support
  private extractFrontmatterTags(content: string): string[] {
    const tags: string[] = [];
    
    // More flexible frontmatter regex that handles different line endings and spacing
    const frontmatterMatch = content.match(/^---\r?\n?([\s\S]*?)\r?\n?---/);
    if (!frontmatterMatch) {
      logger.debug('No frontmatter found', { contentStart: content.substring(0, 50) });
      return tags;
    }
    
    logger.debug('Frontmatter found', { 
      frontmatterContent: frontmatterMatch[1].substring(0, 200)
    });
    
    const frontmatterContent = frontmatterMatch[1];
    
    // Format 1: tags: [tag1, tag2, tag3] or tags: ["tag1", "tag2", "tag3"]
    const arrayFormatMatch = frontmatterContent.match(/^tags:\s*\[(.*?)\]/m);
    if (arrayFormatMatch) {
      const tagString = arrayFormatMatch[1];
      const yamlTags = tagString.split(',').map(tag => 
        tag.trim().replace(/^["']|["']$/g, '') // Remove surrounding quotes
      ).filter(tag => tag.length > 0);
      tags.push(...yamlTags);
    }
    
    // Format 2: tags:\n  - tag1\n  - tag2 (YAML list format)
    const listFormatRegex = /^tags:\s*\n((?:\s*-\s*.+\n?)*)/m;
    const listFormatMatch = frontmatterContent.match(listFormatRegex);
    logger.debug('List format match attempt', { 
      found: !!listFormatMatch, 
      arrayFormatAlreadyFound: !!arrayFormatMatch 
    });
    
    if (listFormatMatch && !arrayFormatMatch) {
      const listContent = listFormatMatch[1];
      logger.debug('List content found', { listContent });
      
      const yamlTags = listContent.match(/^\s*-\s*(.+)$/gm);
      logger.debug('YAML tag lines found', { yamlTags });
      
      if (yamlTags) {
        yamlTags.forEach(tagLine => {
          const tag = tagLine.replace(/^\s*-\s*/, '').replace(/^["']|["']$/g, '').trim();
          if (tag.length > 0) {
            logger.debug('Adding tag from list format', { tag });
            tags.push(tag);
          }
        });
      }
    }
    
    // Format 3: tags: single_tag or tag: single_tag (single tag format)
    const singleTagMatch = frontmatterContent.match(/^tags?:\s*([^[\n]+)$/m);
    if (singleTagMatch && !arrayFormatMatch && !listFormatMatch) {
      const tag = singleTagMatch[1].trim().replace(/^["']|["']$/g, '');
      if (tag.length > 0) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  // Extract inline tags (#tag format) with proper context awareness
  private extractInlineTags(content: string): string[] {
    const tags: string[] = [];
    
    // Remove frontmatter from content to avoid duplicate extraction
    const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    
    // Remove code blocks to avoid extracting tags from code
    const contentWithoutCodeBlocks = contentWithoutFrontmatter
      .replace(/```[\s\S]*?```/g, '') // Remove fenced code blocks
      .replace(/`[^`\n]*`/g, ''); // Remove inline code
    
    // Enhanced regex for Obsidian tags that supports:
    // - Basic tags: #tag
    // - Nested/hierarchical tags: #project/subfolder/item
    // - Tags with underscores: #my_tag
    // - Tags with numbers: #tag123, #2024/january
    // But excludes:
    // - Headers: # Header (has space after #)
    // - Hashtags in URLs: http://example.com#anchor
    const tagRegex = /#(?![\s#])([a-zA-Z0-9_][a-zA-Z0-9_/-]*[a-zA-Z0-9_]|[a-zA-Z0-9_])/g;
    
    let match;
    while ((match = tagRegex.exec(contentWithoutCodeBlocks)) !== null) {
      const fullTag = match[1]; // The tag without the #
      
      // Additional validation to ensure it's a proper tag
      if (this.isValidObsidianTag(fullTag)) {
        tags.push(fullTag);
      }
    }
    
    // Remove duplicates and sort
    return [...new Set(tags)].sort();
  }

  // Validate if a string is a proper Obsidian tag
  private isValidObsidianTag(tag: string): boolean {
    // Must not be empty
    if (!tag || tag.length === 0) return false;
    
    // Must not start or end with slash or hyphen
    if (tag.startsWith('/') || tag.endsWith('/') || 
        tag.startsWith('-') || tag.endsWith('-')) return false;
    
    // Must not contain consecutive slashes
    if (tag.includes('//')) return false;
    
    // Must not be just numbers (to avoid #123 being treated as a tag in most contexts)
    if (/^\d+$/.test(tag)) return false;
    
    // Must contain valid characters only
    if (!/^[a-zA-Z0-9_/-]+$/.test(tag)) return false;
    
    return true;
  }

  async patchContent(
    path: string, 
    operation: 'append' | 'prepend' | 'replace',
    targetType: 'heading' | 'frontmatter' | 'block',
    target: string,
    content: string
  ): Promise<void> {
    try {
      // Block reference operations are not supported
      if (targetType === 'block') {
        throw new LoggedError(
          `Block reference operations are not supported. Use targetType "heading" or "frontmatter" instead.`
        );
      }
      
      // First, check if the file exists and get its content
      const fileNote = await this.getNote(path).catch(() => null);
      if (!fileNote) {
        throw new LoggedError(`Target file does not exist: ${path}`);
      }
      
      // Build URL without additional encoding
      const url = `${this.baseUrl}/vault/${path}`;
      
      // For headings, we need to try different target formats based on the API spec
      let targetFormats: string[] = [];
      
      if (targetType === 'heading') {
        // Parse the file content to find the heading hierarchy
        const lines = fileNote.content.split('\n');
        const headings: Array<{level: number, text: string}> = [];
        
        for (const line of lines) {
          const match = line.match(/^(#{1,6})\s+(.+)$/);
          if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            headings.push({ level, text });
          }
        }
        
        // Find target heading and build hierarchical path
        let targetPath = '';
        let targetFound = false;
        for (let i = 0; i < headings.length; i++) {
          if (headings[i].text === target) {
            targetFound = true;
            // Build the hierarchical path
            const pathParts: string[] = [];
            let currentLevel = headings[i].level;
            
            // Go backwards to find parent headings
            for (let j = i; j >= 0; j--) {
              if (headings[j].level < currentLevel) {
                pathParts.unshift(headings[j].text);
                currentLevel = headings[j].level;
              }
            }
            
            // Add the target heading itself
            pathParts.push(target);
            targetPath = pathParts.join('::');
            break;
          }
        }
        
        // Check if heading exists in the file
        if (!targetFound) {
          const availableHeadings = headings.map(h => `"${h.text}"`).join(', ');
          throw new LoggedError(
            `Heading "${target}" not found in file "${path}". Available headings: ${availableHeadings || 'none'}`
          );
        }
        
        if (targetPath) {
          targetFormats.push(targetPath);
        }
        
        // Also try the simple target as fallback
        targetFormats.push(target);
      } else if (targetType === 'frontmatter') {
        // For frontmatter, use target as-is - field existence check happens in the loop
        targetFormats.push(target);
      } else {
        // other target types - use as-is
        targetFormats.push(target);
      }
      
      // Try each target format
      let lastError: any = null;
      
      for (const targetValue of targetFormats) {
        try {
          // Ensure proper spacing for content based on operation
          let processedContent = content;
          if (targetType === 'heading') {
            if (operation === 'replace') {
              // For replace operations, ensure content ends with newline but don't add extra spacing to avoid doubling headers
              if (!processedContent.endsWith('\n')) {
                processedContent = processedContent + '\n';
              }
            } else if (operation === 'append') {
              // Ensure content starts with a newline and ends with double newline for proper spacing
              if (!processedContent.startsWith('\n')) {
                processedContent = '\n' + processedContent;
              }
              if (!processedContent.endsWith('\n\n')) {
                if (processedContent.endsWith('\n')) {
                  processedContent = processedContent + '\n';
                } else {
                  processedContent = processedContent + '\n\n';
                }
              }
            } else if (operation === 'prepend') {
              // Ensure content ends with double newline for proper spacing
              if (!processedContent.endsWith('\n\n')) {
                if (processedContent.endsWith('\n')) {
                  processedContent = processedContent + '\n';
                } else {
                  processedContent = processedContent + '\n\n';
                }
              }
            }
          }
          
          // Build headers based on target type
          const headers: Record<string, string> = {
            ...this.headers,
            'Content-Type': 'text/markdown',
            'Operation': operation,
            'Target-Type': targetType,
            'Target': encodeURIComponent(targetValue),
          };
          
          // For frontmatter operations, check if we need Create-Target-If-Missing
          if (targetType === 'frontmatter') {
            const frontmatterMatch = fileNote.content.match(/^---\s*\n([\s\S]*?)\n---/);
            let fieldExists = false;
            
            if (frontmatterMatch) {
              const frontmatterContent = frontmatterMatch[1];
              const fieldPattern = new RegExp(`^${targetValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'm');
              fieldExists = fieldPattern.test(frontmatterContent);
            }
            
            if (!fieldExists) {
              headers['Create-Target-If-Missing'] = 'true';
              logger.debug('Added Create-Target-If-Missing header for new frontmatter field', { targetValue });
            }
          }
          
          const options = this.getFetchOptions({
            method: 'PATCH',
            body: processedContent,
            headers,
          });

          logger.debug('PATCH request attempt', {
            url,
            method: 'PATCH',
            headers,
            originalContentLength: content.length,
            processedContentLength: processedContent.length,
            path,
            operation,
            targetType,
            originalTarget: target,
            attemptedTarget: targetValue,
          });

          const response = await fetch(url, options);

          if (response.ok) {
            logger.debug('PATCH request successful', { targetValue });
            return;
          }
          
          const responseText = await response.text().catch(() => 'Unable to read response');
          lastError = {
            status: response.status,
            statusText: response.statusText,
            responseText,
            targetValue,
          };
          
          logger.debug('PATCH attempt failed', lastError);
          
        } catch (error) {
          lastError = { error, targetValue };
          logger.debug('PATCH attempt error', lastError);
        }
      }
      
      // If we get here, all attempts failed
      logger.error('All PATCH attempts failed', { 
        lastError, 
        path, 
        operation, 
        targetType, 
        target,
        attemptedFormats: targetFormats 
      });
      
      const errorMessage = lastError?.responseText || lastError?.error?.message || 'Unknown error';
      throw new LoggedError(`Failed to patch file content after trying ${targetFormats.length} target formats: ${errorMessage}`);
      
    } catch (error) {
      logger.error('PATCH request error', { error, path, operation, targetType, target });
      
      // If it's already a LoggedError with a specific message (like "Heading not found"), preserve it
      if (error instanceof LoggedError) {
        throw error;
      }
      
      throw new LoggedError('Failed to patch file content', { error, path, operation, targetType, target });
    }
  }

  async getActiveNote(): Promise<{ path: string; content: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/active/`, this.getFetchOptions({
        headers: {
          ...this.headers,
          'Accept': 'application/vnd.olrapi.note+json',
        },
      }));

      if (!response.ok) {
        if (response.status === 404) {
          throw new LoggedError('No active note found in Obsidian');
        }
        throw new LoggedError(`Failed to get active note: ${response.statusText}`);
      }

      const data = await response.json() as {
        path: string;
        content: string;
        frontmatter?: Record<string, any>;
        tags?: string[];
        links?: string[];
      };

      return {
        path: data.path,
        content: data.content,
      };
    } catch (error) {
      throw new LoggedError('Failed to get active note', { error });
    }
  }
}

export const obsidianAPI = new ObsidianAPI();