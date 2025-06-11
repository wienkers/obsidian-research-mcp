import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ObsidianResearchServer } from '../../src/server.js';
import { obsidianAPI } from '../../src/integrations/obsidian-api.js';
import { batchReader } from '../../src/features/batch-operations/batch-reader.js';
import { cache } from '../../src/core/cache.js';
import { patternExtractor } from '../../src/features/analysis/pattern-extractor.js';

// Mock dependencies
vi.mock('../../src/integrations/obsidian-api.js');
vi.mock('../../src/features/batch-operations/batch-reader.js');
vi.mock('../../src/core/cache.js');
vi.mock('../../src/core/rate-limiter.js', () => ({
  getRateLimiterForTool: vi.fn(() => ({
    checkRequest: vi.fn(() => ({ 
      allowed: true, 
      remaining: 100, 
      resetTime: Date.now() + 60000 
    }))
  }))
}));
vi.mock('../../src/core/validation.js', () => ({
  validateToolInput: vi.fn((name, args) => args)
}));
vi.mock('../../src/core/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logPerformance: vi.fn((name, fn) => fn()),
  LoggedError: class extends Error {
    constructor(message: string) {
      super(message);
    }
  }
}));
vi.mock('../../src/core/config.js', () => ({
  config: { 
    cacheTtl: 300000,
    obsidianApiUrl: 'https://127.0.0.1:27124',
    obsidianApiKey: 'test-key'
  }
}));

describe('Pattern Search Integration Tests', () => {
  let server: ObsidianResearchServer;
  let mockObsidianAPI: any;
  let mockBatchReader: any;
  let mockCache: any;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new ObsidianResearchServer();
    
    mockObsidianAPI = obsidianAPI as any;
    mockBatchReader = batchReader as any;
    mockCache = cache as any;

    // Default mock implementations
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handlePatternSearch Integration', () => {
    beforeEach(() => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'project/tasks.md', isFolder: false, mtime: Date.now() },
        { path: 'project/notes.md', isFolder: false, mtime: Date.now() },
        { path: 'archive/old.md', isFolder: false, mtime: Date.now() },
      ]);

      // Define all possible file content
      const allFileData = [
        {
          success: true,
          path: 'project/tasks.md',
          note: {
            content: `# Project Tasks
TODO: Implement user authentication @john2024
TODO: Write unit tests @jane2024
DONE: Setup project structure

## Notes
- Meeting scheduled for next week
- Review code with @admin2024`
          }
        },
        {
          success: true,
          path: 'project/notes.md',
          note: {
            content: `# Project Notes
Important findings from research.
TODO: Document API endpoints
NOTE: Performance issue in search function`
          }
        },
        {
          success: true,
          path: 'archive/old.md',
          note: {
            content: `# Old Project
TODO: This is archived
Legacy code needs @maintenance2024`
          }
        }
      ];

      // Make batchReader implementation-aware - only return data for requested files
      mockBatchReader.readMultipleNotes.mockImplementation((requestedPaths: string[]) => {
        const results = allFileData.filter(fileData => 
          requestedPaths.includes(fileData.path)
        );
        return Promise.resolve(results);
      });
    });

    it('should handle basic pattern search request', async () => {
      const result = await (server as any).handlePatternSearch({
        patterns: ['TODO:', '@\\w+\\d{4}']
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text);
      expect(response.patterns).toEqual(['TODO:', '@\\w+\\d{4}']);
      expect(response.results.matches.length).toBeGreaterThan(0);
      
      // Check that both patterns found matches
      const todoMatches = response.results.matches.filter((m: any) => m.pattern === 'TODO:');
      const userMatches = response.results.matches.filter((m: any) => m.pattern === '@\\w+\\d{4}');
      expect(todoMatches.length).toBeGreaterThan(0);
      expect(userMatches.length).toBeGreaterThan(0);
    });

    it('should handle pattern search with scope filtering', async () => {
      const result = await (server as any).handlePatternSearch({
        patterns: ['TODO:'],
        scope: {
          folders: ['project']
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      // Should only find matches in project folder
      const files = [...new Set(response.results.matches.map((m: any) => m.file))];
      expect(files.every((file: string) => file.startsWith('project/'))).toBe(true);
      expect(files).not.toContain('archive/old.md');
    });

    it('should handle pattern search with exclusion filters', async () => {
      const result = await (server as any).handlePatternSearch({
        patterns: ['TODO:'],
        scope: {
          excludeFolders: ['archive']
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      // Should not find matches in archive folder
      const files = [...new Set(response.results.matches.map((m: any) => m.file))];
      expect(files).not.toContain('archive/old.md');
      expect(files).toEqual(expect.arrayContaining(['project/tasks.md', 'project/notes.md']));
    });

    it('should handle pattern search with specific file paths', async () => {
      const result = await (server as any).handlePatternSearch({
        patterns: ['TODO:'],
        scope: {
          paths: ['project/tasks.md']
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      // Should only search in specified file
      const files = [...new Set(response.results.matches.map((m: any) => m.file))];
      expect(files).toEqual(['project/tasks.md']);
    });

    it('should handle pattern search with options', async () => {
      const result = await (server as any).handlePatternSearch({
        patterns: ['todo:', 'TODO:'],
        options: {
          caseSensitive: true,
          contextWindow: 1,
          maxMatches: 2,
          includeStatistics: true
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      // Should respect case sensitivity
      const todoMatches = response.results.matches.filter((m: any) => m.pattern === 'todo:');
      const TODOMatches = response.results.matches.filter((m: any) => m.pattern === 'TODO:');
      expect(todoMatches.length).toBe(0); // No lowercase 'todo:' in content
      expect(TODOMatches.length).toBeGreaterThan(0);
      
      // Should respect maxMatches
      expect(response.results.matches.length).toBeLessThanOrEqual(2);
      
      // Should include context
      expect(response.results.matches[0].context).toBeDefined();
      
      // Should include statistics
      expect(response.results.statistics).toBeDefined();
    });

    it('should handle whole word matching', async () => {
      // Add test.md to the file list for this test
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockImplementation((requestedPaths: string[]) => {
        const allData = [
          {
            success: true,
            path: 'test.md',
            note: { content: 'test testing tested' }
          }
        ];
        return Promise.resolve(allData.filter(data => requestedPaths.includes(data.path)));
      });

      const result = await (server as any).handlePatternSearch({
        patterns: ['test'],
        options: {
          wholeWord: true
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      // Should only match whole word 'test', not 'testing' or 'tested'
      expect(response.results.matches).toHaveLength(1);
      expect(response.results.matches[0].match).toBe('test');
    });

    it('should include search parameters in response', async () => {
      const scope = {
        folders: ['project'],
        excludePaths: ['archive/old.md']
      };
      const options = {
        caseSensitive: true,
        contextWindow: 2,
        includeStatistics: false
      };

      const result = await (server as any).handlePatternSearch({
        patterns: ['TODO:'],
        scope,
        options
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.searchParams.scope).toEqual(scope);
      expect(response.searchParams.options).toEqual(options);
    });

    it('should handle empty results gracefully', async () => {
      const result = await (server as any).handlePatternSearch({
        patterns: ['NONEXISTENT_PATTERN_12345']
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.results.matches).toEqual([]);
      expect(response.results.summary.totalMatches).toBe(0);
    });

    it('should handle file read failures gracefully', async () => {
      mockBatchReader.readMultipleNotes.mockImplementation((requestedPaths: string[]) => {
        const allData = [
          {
            success: true,
            path: 'project/tasks.md',
            note: { content: 'TODO: working file' }
          },
          {
            success: false,
            path: 'project/broken.md',
            error: 'File not found'
          }
        ];
        return Promise.resolve(allData.filter(data => requestedPaths.includes(data.path)));
      });

      const result = await (server as any).handlePatternSearch({
        patterns: ['TODO:']
      });

      const response = JSON.parse(result.content[0].text);
      
      // Should still return results from successful files
      expect(response.results.matches.length).toBeGreaterThan(0);
      expect(response.results.matches[0].file).toBe('project/tasks.md');
    });

    it('should handle complex regex patterns', async () => {
      // Add test.md to the file list for this test
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockImplementation((requestedPaths: string[]) => {
        const allData = [
          {
            success: true,
            path: 'test.md',
            note: { 
              content: `Email: john@example.com
Phone: +1-555-123-4567
Date: 2024-03-15
URL: https://example.com/path?param=value` 
            }
          }
        ];
        return Promise.resolve(allData.filter(data => requestedPaths.includes(data.path)));
      });

      const result = await (server as any).handlePatternSearch({
        patterns: [
          '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', // Email
          '\\+?1?-?\\d{3}-?\\d{3}-?\\d{4}', // Phone
          '\\d{4}-\\d{2}-\\d{2}', // Date
          'https?://[^\\s]+' // URL
        ]
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.results.matches).toHaveLength(4);
      expect(response.results.matches.some((m: any) => m.match === 'john@example.com')).toBe(true);
      expect(response.results.matches.some((m: any) => m.match.includes('555-123-4567'))).toBe(true);
      expect(response.results.matches.some((m: any) => m.match === '2024-03-15')).toBe(true);
      expect(response.results.matches.some((m: any) => m.match.startsWith('https://example.com'))).toBe(true);
    });

    it('should handle tag filtering integration', async () => {
      mockObsidianAPI.getNote.mockImplementation((path: string) => {
        if (path === 'project/tasks.md') {
          return Promise.resolve({ tags: ['work', 'urgent'] });
        } else if (path === 'project/notes.md') {
          return Promise.resolve({ tags: ['work', 'documentation'] });
        } else {
          return Promise.resolve({ tags: ['archive'] });
        }
      });

      const result = await (server as any).handlePatternSearch({
        patterns: ['TODO:'],
        scope: {
          tags: ['urgent']
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      // Should only find matches in files with 'urgent' tag
      const files = [...new Set(response.results.matches.map((m: any) => m.file))];
      expect(files).toEqual(['project/tasks.md']);
    });

    it('should return statistics when requested', async () => {
      const result = await (server as any).handlePatternSearch({
        patterns: ['TODO:', '@\\w+\\d{4}'],
        options: {
          includeStatistics: true
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.results.statistics).toBeDefined();
      expect(response.results.statistics).toHaveLength(2);
      
      const todoStats = response.results.statistics.find((s: any) => s.pattern === 'TODO:');
      expect(todoStats).toBeDefined();
      expect(todoStats.totalMatches).toBeGreaterThan(0);
      expect(todoStats.uniqueFiles).toBeGreaterThan(0);
      expect(todoStats.fileDistribution).toBeDefined();
    });

  });

  describe('Error Handling Integration', () => {
    it('should handle validation errors from validatePatternSearchParams', async () => {
      // Test with invalid patterns
      await expect(
        (server as any).handlePatternSearch({
          patterns: [] // Empty array should trigger validation error
        })
      ).rejects.toThrow();
    });

    it('should handle obsidianAPI failures gracefully', async () => {
      mockObsidianAPI.listFiles.mockRejectedValue(new Error('API connection failed'));

      await expect(
        (server as any).handlePatternSearch({
          patterns: ['TODO:']
        })
      ).rejects.toThrow('API connection failed');
    });

    it('should handle batchReader failures gracefully', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() }
      ]);
      
      mockBatchReader.readMultipleNotes.mockRejectedValue(new Error('Batch read failed'));

      await expect(
        (server as any).handlePatternSearch({
          patterns: ['TODO:']
        })
      ).rejects.toThrow('Batch read failed');
    });
  });

  describe('Performance Integration', () => {
    it('should handle large numbers of files efficiently', async () => {
      // Create mock data for 100 files
      const files = Array.from({ length: 100 }, (_, i) => ({
        path: `file${i}.md`,
        isFolder: false,
        mtime: Date.now()
      }));

      const readResults = files.map(file => ({
        success: true,
        path: file.path,
        note: { content: `TODO: task in ${file.path}` }
      }));

      mockObsidianAPI.listFiles.mockResolvedValue(files);
      
      // Make batchReader implementation-aware for this test too
      mockBatchReader.readMultipleNotes.mockImplementation((requestedPaths: string[]) => {
        const results = readResults.filter(result => 
          requestedPaths.includes(result.path)
        );
        return Promise.resolve(results);
      });

      const startTime = Date.now();
      const result = await (server as any).handlePatternSearch({
        patterns: ['TODO:']
      });
      const endTime = Date.now();

      const response = JSON.parse(result.content[0].text);
      
      // Should find matches in all files
      expect(response.results.matches).toHaveLength(100);
      
      // Should complete in reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });

    it('should respect maxMatches limit for performance', async () => {
      // Create content with many matches
      const content = Array.from({ length: 1000 }, (_, i) => `TODO: task ${i}`).join('\n');
      
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'large.md', isFolder: false, mtime: Date.now() }
      ]);
      
      mockBatchReader.readMultipleNotes.mockImplementation((requestedPaths: string[]) => {
        const allData = [
          {
            success: true,
            path: 'large.md',
            note: { content }
          }
        ];
        return Promise.resolve(allData.filter(data => requestedPaths.includes(data.path)));
      });

      const result = await (server as any).handlePatternSearch({
        patterns: ['TODO:'],
        options: {
          maxMatches: 50
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      // Should limit results to maxMatches
      expect(response.results.matches).toHaveLength(50);
    });
  });
});