import { obsidianAPI } from '../../integrations/obsidian-api.js';
import { fileOperationsManager, BatchReadResult } from '../../core/file-operations.js';
import { logger, logPerformance } from '../../core/logger.js';

export interface BatchReadOptions {
  includeContent: boolean;
  includeMetadata: boolean;
}

export class BatchReader {
  async readMultipleNotes(
    paths: string[],
    options: BatchReadOptions = { includeContent: true, includeMetadata: true }
  ): Promise<BatchReadResult[]> {
    return logPerformance('batch-read-notes', async () => {
      logger.info('Reading multiple notes with unified operations', { 
        count: paths.length, 
        options 
      });

      // Use the unified file operations manager
      return fileOperationsManager.readMultipleNotes(paths, {
        includeContent: options.includeContent,
        includeMetadata: options.includeMetadata,
        includeFrontmatter: options.includeMetadata,
        includeStructure: false,
        useCache: true,
      });
    });
  }

  async getNoteSummaries(paths: string[]): Promise<BatchReadResult[]> {
    return this.readMultipleNotes(paths, {
      includeContent: false,
      includeMetadata: true
    });
  }

  async getFullNotes(paths: string[]): Promise<BatchReadResult[]> {
    return this.readMultipleNotes(paths, {
      includeContent: true,
      includeMetadata: true
    });
  }

  async validatePaths(paths: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const valid: string[] = [];
    const invalid: string[] = [];

    // Check in smaller batches to avoid overwhelming
    const batchSize = 50;
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      
      const validationPromises = batch.map(async (path) => {
        try {
          // Try to get basic file info without reading content
          const files = await obsidianAPI.listFiles(undefined, true);
          const exists = files.some(file => file.path === path && !file.isFolder);
          return { path, exists };
        } catch (error) {
          return { path, exists: false };
        }
      });

      const results = await Promise.allSettled(validationPromises);
      
      results.forEach((result, index) => {
        const path = batch[index];
        if (result.status === 'fulfilled' && result.value.exists) {
          valid.push(path);
        } else {
          invalid.push(path);
        }
      });
    }

    return { valid, invalid };
  }

  async getContentPreview(
    paths: string[],
    maxLength: number = 200
  ): Promise<Array<{ path: string; preview: string; error?: string }>> {
    const results = await this.readMultipleNotes(paths, {
      includeContent: true,
      includeMetadata: false
    });

    return results.map(result => {
      if (!result.success || !result.note?.content) {
        return {
          path: result.path,
          preview: '',
          error: result.error || 'No content available'
        };
      }

      // Extract preview from content
      const content = result.note.content;
      let preview = content.substring(0, maxLength);
      
      if (content.length > maxLength) {
        preview += '...';
      }

      // Clean up preview (remove excessive whitespace, etc.)
      preview = preview
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .replace(/^\s+|\s+$/g, '') // Trim
        .substring(0, maxLength);

      return {
        path: result.path,
        preview
      };
    });
  }
}

export const batchReader = new BatchReader();