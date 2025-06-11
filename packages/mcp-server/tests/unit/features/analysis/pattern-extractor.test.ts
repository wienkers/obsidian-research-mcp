import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { PatternExtractor, PatternExtractionOptions, PatternMatch, PatternStatistics } from '../../../../src/features/analysis/pattern-extractor.js';
import { obsidianAPI } from '../../../../src/integrations/obsidian-api.js';
import { batchReader } from '../../../../src/features/batch-operations/batch-reader.js';
import { cache } from '../../../../src/core/cache.js';

// Mock dependencies
vi.mock('../../../../src/integrations/obsidian-api.js');
vi.mock('../../../../src/features/batch-operations/batch-reader.js');
vi.mock('../../../../src/core/cache.js');
vi.mock('../../../../src/core/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logPerformance: vi.fn((name, fn) => fn()),
}));
vi.mock('../../../../src/core/config.js', () => ({
  config: { 
    cacheTtl: 300000,
    obsidianApiUrl: 'https://127.0.0.1:27124',
    obsidianApiKey: 'test-key'
  }
}));

describe('PatternExtractor', () => {
  let patternExtractor: PatternExtractor;
  let mockObsidianAPI: any;
  let mockBatchReader: any;
  let mockCache: any;

  beforeEach(() => {
    vi.clearAllMocks();
    patternExtractor = new PatternExtractor();
    
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

  describe('Core Pattern Matching', () => {
    beforeEach(() => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test1.md', isFolder: false, mtime: Date.now() },
        { path: 'test2.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test1.md',
          note: {
            content: 'This is a TODO: finish the task\nAnother line with @user2024\nFinal line'
          }
        },
        {
          success: true,
          path: 'test2.md',
          note: {
            content: 'Meeting TODO: review documentation\n@admin2024 will handle this'
          }
        }
      ]);
    });

    it('should extract basic patterns correctly', async () => {
      const options: PatternExtractionOptions = {
        patterns: ['TODO:', '@\\w+\\d{4}'],
        includeStatistics: false,
      };

      const result = await patternExtractor.extractPatterns(options);

      expect(result.patterns).toEqual(['TODO:', '@\\w+\\d{4}']);
      expect(result.matches).toHaveLength(4);
      
      // Check TODO matches
      const todoMatches = result.matches.filter(m => m.pattern === 'TODO:');
      expect(todoMatches).toHaveLength(2);
      expect(todoMatches[0].match).toBe('TODO:');
      expect(todoMatches[0].file).toBe('test1.md');
      expect(todoMatches[0].lineNumber).toBe(1);
      
      // Check user pattern matches
      const userMatches = result.matches.filter(m => m.pattern === '@\\w+\\d{4}');
      expect(userMatches).toHaveLength(2);
      expect(userMatches[0].match).toBe('@user2024');
      expect(userMatches[1].match).toBe('@admin2024');
    });

    it('should handle case sensitivity correctly', async () => {
      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test1.md',
          note: { content: 'TODO: task\ntodo: another task' }
        }
      ]);

      // Case insensitive (default)
      const caseInsensitiveResult = await patternExtractor.extractPatterns({
        patterns: ['todo:'],
        includeStatistics: false,
        caseSensitive: false
      });

      expect(caseInsensitiveResult.matches).toHaveLength(2);

      // Case sensitive
      const caseSensitiveResult = await patternExtractor.extractPatterns({
        patterns: ['todo:'],
        includeStatistics: false,
        caseSensitive: true
      });

      expect(caseSensitiveResult.matches).toHaveLength(1);
      expect(caseSensitiveResult.matches[0].match).toBe('todo:');
    });

    it('should handle whole word matching correctly', async () => {
      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test1.md',
          note: { content: 'test testing tested' }
        }
      ]);

      // Without whole word
      const partialResult = await patternExtractor.extractPatterns({
        patterns: ['test'],
        includeStatistics: false,
        wholeWord: false
      });

      expect(partialResult.matches).toHaveLength(3);

      // With whole word
      const wholeWordResult = await patternExtractor.extractPatterns({
        patterns: ['test'],
        includeStatistics: false,
        wholeWord: true
      });

      expect(wholeWordResult.matches).toHaveLength(1);
      expect(wholeWordResult.matches[0].match).toBe('test');
    });

    it('should include context windows when requested', async () => {
      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test1.md',
          note: {
            content: 'Line 1\nLine 2\nTODO: task\nLine 4\nLine 5'
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        contextWindow: 2
      });

      expect(result.matches).toHaveLength(1);
      const match = result.matches[0];
      expect(match.context).toBeDefined();
      expect(match.context!.before).toEqual(['Line 1', 'Line 2']);
      expect(match.context!.after).toEqual(['Line 4', 'Line 5']);
    });

    it('should respect maxMatches limit', async () => {
      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test1.md',
          note: { content: 'TODO: 1\nTODO: 2\nTODO: 3\nTODO: 4\nTODO: 5' }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        maxMatches: 3
      });

      expect(result.matches).toHaveLength(3);
    });

    it('should handle regex groups correctly', async () => {
      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test1.md',
          note: { content: 'User: john@example.com' }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['User: (\\w+)@(\\w+\\.com)'],
        includeStatistics: false,
      });

      expect(result.matches).toHaveLength(1);
      const match = result.matches[0];
      expect(match.groups).toBeDefined();
      expect(match.groups).toEqual(['john', 'example.com']);
    });

    it('should handle invalid regex patterns gracefully', async () => {
      const result = await patternExtractor.extractPatterns({
        patterns: ['[invalid', 'valid.*pattern'],
        includeStatistics: false,
      });

      // Should continue with valid patterns and not crash
      expect(result.patterns).toEqual(['[invalid', 'valid.*pattern']);
      // Only matches from valid pattern should be included
      expect(result.matches.every(m => m.pattern === 'valid.*pattern')).toBe(true);
    });
  });

  describe('Scope Filtering', () => {
    beforeEach(() => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'notes/project1.md', isFolder: false, mtime: Date.now() },
        { path: 'notes/project2.md', isFolder: false, mtime: Date.now() },
        { path: 'drafts/idea1.md', isFolder: false, mtime: Date.now() },
        { path: 'archive/old.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockImplementation((paths) => 
        Promise.resolve(paths.map((path: string) => ({
          success: true,
          path,
          note: { content: 'TODO: test content' }
        })))
      );
    });

    it('should filter by specific paths', async () => {
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        scope: {
          paths: ['notes/project1.md', 'drafts/idea1.md']
        },
        includeStatistics: false,
      });

      const uniqueFiles = [...new Set(result.matches.map(m => m.file))];
      expect(uniqueFiles).toEqual(expect.arrayContaining(['notes/project1.md', 'drafts/idea1.md']));
      expect(uniqueFiles).not.toContain('notes/project2.md');
      expect(uniqueFiles).not.toContain('archive/old.md');
    });

    it('should filter by folders', async () => {
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        scope: {
          folders: ['notes']
        },
        includeStatistics: false,
      });

      const uniqueFiles = [...new Set(result.matches.map(m => m.file))];
      expect(uniqueFiles).toEqual(expect.arrayContaining(['notes/project1.md', 'notes/project2.md']));
      expect(uniqueFiles).not.toContain('drafts/idea1.md');
      expect(uniqueFiles).not.toContain('archive/old.md');
    });

    it('should filter by file pattern', async () => {
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        scope: {
          filePattern: 'project.*\\.md'
        },
        includeStatistics: false,
      });

      const uniqueFiles = [...new Set(result.matches.map(m => m.file))];
      expect(uniqueFiles).toEqual(expect.arrayContaining(['notes/project1.md', 'notes/project2.md']));
      expect(uniqueFiles).not.toContain('drafts/idea1.md');
    });

    it('should exclude specific paths', async () => {
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        scope: {
          excludePaths: ['notes/project2.md', 'archive/old.md']
        },
        includeStatistics: false,
      });

      const uniqueFiles = [...new Set(result.matches.map(m => m.file))];
      expect(uniqueFiles).toEqual(expect.arrayContaining(['notes/project1.md', 'drafts/idea1.md']));
      expect(uniqueFiles).not.toContain('notes/project2.md');
      expect(uniqueFiles).not.toContain('archive/old.md');
    });

    it('should exclude folders', async () => {
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        scope: {
          excludeFolders: ['archive', 'drafts']
        },
        includeStatistics: false,
      });

      const uniqueFiles = [...new Set(result.matches.map(m => m.file))];
      expect(uniqueFiles).toEqual(expect.arrayContaining(['notes/project1.md', 'notes/project2.md']));
      expect(uniqueFiles).not.toContain('drafts/idea1.md');
      expect(uniqueFiles).not.toContain('archive/old.md');
    });

    it('should filter by date range', async () => {
      const now = Date.now();
      const oldTime = now - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      const newTime = now - (1 * 24 * 60 * 60 * 1000); // 1 day ago

      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'old.md', isFolder: false, mtime: oldTime },
        { path: 'new.md', isFolder: false, mtime: newTime },
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        scope: {
          dateRange: {
            start: new Date(now - (3 * 24 * 60 * 60 * 1000)).toISOString(), // 3 days ago
            end: new Date(now).toISOString()
          }
        },
        includeStatistics: false,
      });

      const uniqueFiles = [...new Set(result.matches.map(m => m.file))];
      expect(uniqueFiles).toContain('new.md');
      expect(uniqueFiles).not.toContain('old.md');
    });

    it('should filter by tags', async () => {
      mockObsidianAPI.getNote.mockImplementation((path: string) => {
        if (path === 'tagged.md') {
          return Promise.resolve({ tags: ['project', 'urgent'] });
        } else {
          return Promise.resolve({ tags: ['misc'] });
        }
      });

      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'tagged.md', isFolder: false, mtime: Date.now() },
        { path: 'untagged.md', isFolder: false, mtime: Date.now() },
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        scope: {
          tags: ['project']
        },
        includeStatistics: false,
      });

      const uniqueFiles = [...new Set(result.matches.map(m => m.file))];
      expect(uniqueFiles).toContain('tagged.md');
      expect(uniqueFiles).not.toContain('untagged.md');
    });
  });

  describe('Statistics Calculation', () => {
    beforeEach(() => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'file1.md', isFolder: false, mtime: Date.now() },
        { path: 'file2.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'file1.md',
          note: { content: 'TODO: task1\nTODO: task2\nNOTE: info' }
        },
        {
          success: true,
          path: 'file2.md',
          note: { content: 'TODO: task1\nNOTE: info\nNOTE: more info' }
        }
      ]);
    });

    it('should calculate correct statistics', async () => {
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:', 'NOTE:'],
        includeStatistics: true,
      });

      expect(result.statistics).toHaveLength(2);

      // Check TODO statistics
      const todoStats = result.statistics.find(s => s.pattern === 'TODO:');
      expect(todoStats).toBeDefined();
      expect(todoStats!.totalMatches).toBe(3);
      expect(todoStats!.uniqueFiles).toBe(2);
      expect(todoStats!.avgMatchesPerFile).toBe(1.5);

      // Check NOTE statistics  
      const noteStats = result.statistics.find(s => s.pattern === 'NOTE:');
      expect(noteStats).toBeDefined();
      expect(noteStats!.totalMatches).toBe(3);
      expect(noteStats!.uniqueFiles).toBe(2);
    });

    it('should calculate file distribution correctly', async () => {
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: true,
      });

      const todoStats = result.statistics.find(s => s.pattern === 'TODO:');
      expect(todoStats!.fileDistribution).toHaveLength(2);
      
      const file1Stats = todoStats!.fileDistribution.find(d => d.file === 'file1.md');
      expect(file1Stats!.matches).toBe(2);
      expect(file1Stats!.percentage).toBeCloseTo(66.67, 1);

      const file2Stats = todoStats!.fileDistribution.find(d => d.file === 'file2.md');
      expect(file2Stats!.matches).toBe(1);
      expect(file2Stats!.percentage).toBeCloseTo(33.33, 1);
    });

    it('should calculate match frequency correctly', async () => {
      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'file1.md',
          note: { content: 'task1 task1 task2' }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['task\\d+'],
        includeStatistics: true,
      });

      const stats = result.statistics[0];
      expect(stats.matchFrequency['task1']).toBe(2);
      expect(stats.matchFrequency['task2']).toBe(1);
      expect(stats.mostCommonMatch).toBe('task1');
    });

    it('should handle patterns with no matches', async () => {
      const result = await patternExtractor.extractPatterns({
        patterns: ['NONEXISTENT:'],
        includeStatistics: true,
      });

      expect(result.statistics).toHaveLength(1);
      const stats = result.statistics[0];
      expect(stats.totalMatches).toBe(0);
      expect(stats.uniqueFiles).toBe(0);
      expect(stats.avgMatchesPerFile).toBe(0);
      expect(stats.mostCommonMatch).toBe('');
      expect(stats.fileDistribution).toEqual([]);
      expect(stats.matchFrequency).toEqual({});
    });
  });


  describe('Summary Generation', () => {
    beforeEach(() => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'file1.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'file1.md',
          note: { content: 'TODO: task1\nNOTE: info\nTODO: task2' }
        }
      ]);
    });

    it('should generate correct summary', async () => {
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:', 'NOTE:'],
        includeStatistics: false,
      });

      expect(result.summary.totalMatches).toBe(3);
      expect(result.summary.filesProcessed).toBe(1);
      expect(result.summary.uniqueMatches).toBe(2); // 'TODO:' and 'NOTE:'
      expect(result.summary.mostProductivePattern).toBe('TODO:'); // 2 matches
      expect(result.summary.leastProductivePattern).toBe('NOTE:'); // 1 match
      expect(typeof result.summary.executionTime).toBe('number');
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'file1.md', isFolder: false, mtime: Date.now() },
      ]);
    });

    it('should return cached results when available', async () => {
      const cachedResult = {
        patterns: ['cached'],
        matches: [],
        statistics: [],
        summary: {} as any
      };

      mockCache.get.mockResolvedValue(cachedResult);

      const result = await patternExtractor.extractPatterns({
        patterns: ['test'],
        includeStatistics: false,
      });

      expect(result).toBe(cachedResult);
      expect(mockBatchReader.readMultipleNotes).not.toHaveBeenCalled();
    });

    it('should cache results after processing', async () => {
      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'file1.md',
          note: { content: 'test content' }
        }
      ]);

      await patternExtractor.extractPatterns({
        patterns: ['test'],
        includeStatistics: false,
      });

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('patterns:'),
        expect.any(Object),
        300000,
        expect.arrayContaining(['file:file1.md', 'pattern-extraction'])
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle failed file reads gracefully', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'file1.md', isFolder: false, mtime: Date.now() },
        { path: 'file2.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'file1.md',
          note: { content: 'TODO: task' }
        },
        {
          success: false,
          path: 'file2.md',
          error: 'File not found'
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].file).toBe('file1.md');
    });

    it('should skip files without content', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'file1.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'file1.md',
          note: { content: null }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
      });

      expect(result.matches).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large content efficiently', async () => {
      // Create large content with many potential matches
      const largeContent = Array.from({ length: 10000 }, (_, i) => 
        `Line ${i}: TODO: task ${i} with @user${i % 100}`
      ).join('\n');

      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'large.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'large.md',
          note: { content: largeContent }
        }
      ]);

      const startTime = Date.now();
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:', '@user\\d+'],
        includeStatistics: true,
      });
      const endTime = Date.now();

      expect(result.matches.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle many files efficiently with batching', async () => {
      // Create 200 files
      const files = Array.from({ length: 200 }, (_, i) => ({
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
      mockBatchReader.readMultipleNotes.mockImplementation((paths) => 
        Promise.resolve(readResults.filter(r => paths.includes(r.path)))
      );

      const startTime = Date.now();
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
      });
      const endTime = Date.now();

      expect(result.matches).toHaveLength(200);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle complex regex patterns efficiently', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: {
            content: Array.from({ length: 1000 }, (_, i) => 
              `Line ${i}: Contact john.doe${i}@example${i % 10}.com for details`
            ).join('\n')
          }
        }
      ]);

      const complexPattern = '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b';

      const startTime = Date.now();
      const result = await patternExtractor.extractPatterns({
        patterns: [complexPattern],
        includeStatistics: true,
      });
      const endTime = Date.now();

      expect(result.matches).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(3000); // Complex regex should still be fast
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-width matches', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { content: 'wordwordword' }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['(?=word)'], // Zero-width lookahead
        includeStatistics: false,
      });

      // Should handle zero-width matches without infinite loops
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches.length).toBeLessThan(20); // Reasonable upper bound
    });

    it('should handle empty lines and whitespace-only content', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { content: 'Content before\nLine 1\n\n   \n\nTODO: task\n\n  \nLine after\nMore content' }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        contextWindow: 5
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].lineNumber).toBe(6); // Should be on the correct line (adjusted for new content)
      // With contextWindow: 5, should include all available content lines plus blank lines
      // Before: "Content before", "Line 1" (2 content lines) + blank lines "", "   ", ""
      expect(result.matches[0].context?.before).toEqual(['Content before', 'Line 1', '', '   ', '']);
      // After: "Line after", "More content" (2 content lines) + blank lines "", "  "  
      expect(result.matches[0].context?.after).toEqual(['', '  ', 'Line after', 'More content']);
    });

    it('should handle unicode and special characters', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: 'TODO: 📝 write docs\n待办事项: complete task\nТОДО: проверить код\n🔍 pattern: émoji_ünicode' 
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:', '📝', '待办事项:', 'ТОДО:', 'émoji_ünicode'],
        includeStatistics: false,
      });

      expect(result.matches.length).toBe(5);
      expect(result.matches.some(m => m.match === '📝')).toBe(true);
      expect(result.matches.some(m => m.match === '待办事项:')).toBe(true);
      expect(result.matches.some(m => m.match === 'ТОДО:')).toBe(true);
      expect(result.matches.some(m => m.match === 'émoji_ünicode')).toBe(true);
    });

    it('should handle very long lines without performance issues', async () => {
      const veryLongLine = 'TODO: ' + 'x'.repeat(100000) + ' end';
      
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { content: veryLongLine }
        }
      ]);

      const startTime = Date.now();
      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:', 'end'],
        includeStatistics: false,
      });
      const endTime = Date.now();

      expect(result.matches).toHaveLength(2);
      expect(endTime - startTime).toBeLessThan(1000); // Should handle long lines quickly
    });

    it('should handle patterns with special regex characters', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: 'Price: $10.99\nMatch [brackets] and (parentheses)\nStar * and plus + chars\nQuestion? mark!' 
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: [
          '\\$\\d+\\.\\d+',        // Price pattern
          '\\[\\w+\\]',           // Brackets
          '\\(\\w+\\)',           // Parentheses
          '\\*',                  // Star
          '\\+',                  // Plus
          '\\?'                   // Question mark
        ],
        includeStatistics: false,
      });

      expect(result.matches).toHaveLength(6);
      expect(result.matches.some(m => m.match === '$10.99')).toBe(true);
      expect(result.matches.some(m => m.match === '[brackets]')).toBe(true);
      expect(result.matches.some(m => m.match === '(parentheses)')).toBe(true);
      expect(result.matches.some(m => m.match === '*')).toBe(true);
      expect(result.matches.some(m => m.match === '+')).toBe(true);
      expect(result.matches.some(m => m.match === '?')).toBe(true);
    });

    it('should handle multiline patterns correctly', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: 'Line 1\nLine 2\nLine 3\nAnother line\nFinal line'
          }
        }
      ]);

      // Test patterns that match within single lines
      const result = await patternExtractor.extractPatterns({
        patterns: ['Line \\d+'],
        includeStatistics: false,
      });

      expect(result.matches).toHaveLength(3);
      expect(result.matches.every(m => m.lineNumber > 0)).toBe(true);
    });

    it('should handle context windows at file boundaries', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: 'TODO: first line\nMiddle line\nTODO: last line'
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        contextWindow: 5 // Larger than file length
      });

      expect(result.matches).toHaveLength(2);
      
      // First match should have empty before context
      const firstMatch = result.matches.find(m => m.lineNumber === 1);
      expect(firstMatch?.context?.before).toEqual([]);
      expect(firstMatch?.context?.after).toEqual(['Middle line', 'TODO: last line']);
      
      // Last match should have empty after context
      const lastMatch = result.matches.find(m => m.lineNumber === 3);
      expect(lastMatch?.context?.before).toEqual(['TODO: first line', 'Middle line']);
      expect(lastMatch?.context?.after).toEqual([]);
    });

    it('should handle patterns that match entire lines', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: '# Header 1\n## Header 2\n### Header 3\nRegular line'
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['^#{1,3} .*$'], // Match header lines
        includeStatistics: false,
      });

      expect(result.matches).toHaveLength(3);
      expect(result.matches[0].match).toBe('# Header 1');
      expect(result.matches[1].match).toBe('## Header 2');
      expect(result.matches[2].match).toBe('### Header 3');
    });

    it('should handle overlapping matches correctly', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: 'ababab'
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['ab', 'ba'],
        includeStatistics: false,
      });

      // Should find 3 'ab' matches and 2 'ba' matches
      const abMatches = result.matches.filter(m => m.pattern === 'ab');
      const baMatches = result.matches.filter(m => m.pattern === 'ba');
      
      expect(abMatches).toHaveLength(3);
      expect(baMatches).toHaveLength(2);
    });

    it('should handle empty pattern results in statistics', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { content: 'TODO: task' }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:', 'NONEXISTENT'],
        includeStatistics: true,
      });

      expect(result.statistics).toHaveLength(2);
      
      const todoStats = result.statistics.find(s => s.pattern === 'TODO:');
      const nonexistentStats = result.statistics.find(s => s.pattern === 'NONEXISTENT');
      
      expect(todoStats?.totalMatches).toBe(1);
      expect(nonexistentStats?.totalMatches).toBe(0);
      expect(nonexistentStats?.uniqueFiles).toBe(0);
      expect(nonexistentStats?.fileDistribution).toEqual([]);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle single character files', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'tiny.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'tiny.md',
          note: { content: 'a' }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['a', 'b'],
        includeStatistics: true,
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].match).toBe('a');
      expect(result.matches[0].lineNumber).toBe(1);
    });

    it('should handle files with only newlines', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'newlines.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'newlines.md',
          note: { content: '\n\n\n' }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['\\n', '^$'], // Newline and empty line patterns
        includeStatistics: false,
      });

      // Should handle without crashing
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it('should handle maximum context window correctly', async () => {
      const lines = Array.from({ length: 30 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');
      const targetLineIndex = 15; // Middle line
      
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { content }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: [`Line ${targetLineIndex + 1}`], // Line 16
        includeStatistics: false,
        contextWindow: 10 // Maximum context
      });

      expect(result.matches).toHaveLength(1);
      const match = result.matches[0];
      
      // With contextWindow: 10, should get 10 content lines before and after
      // Before: Lines 6-15 (10 content lines)
      expect(match.context?.before).toHaveLength(10);
      expect(match.context?.before[0]).toBe('Line 6');
      expect(match.context?.before[9]).toBe('Line 15');
      // After: Lines 17-26 (10 content lines)  
      expect(match.context?.after).toHaveLength(10);
      expect(match.context?.after[0]).toBe('Line 17');
      expect(match.context?.after[9]).toBe('Line 26');
    });

    it('should handle context window of 0', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { content: 'Before\nTODO: task\nAfter' }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        contextWindow: 0
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].context).toBeUndefined();
    });
  });

  describe('Context Window Validation', () => {
    it('should respect contextWindow: 1', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: 'Line A\nLine B\nLine C\nTODO: task\nLine D\nLine E\nLine F'
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        contextWindow: 1
      });

      expect(result.matches).toHaveLength(1);
      const match = result.matches[0];
      expect(match.context?.before).toEqual(['Line C']);
      expect(match.context?.after).toEqual(['Line D']);
    });

    it('should respect contextWindow: 3', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nTODO: task\nLine 7\nLine 8\nLine 9\nLine 10\nLine 11'
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        contextWindow: 3
      });

      expect(result.matches).toHaveLength(1);
      const match = result.matches[0];
      expect(match.context?.before).toEqual(['Line 3', 'Line 4', 'Line 5']);
      expect(match.context?.after).toEqual(['Line 7', 'Line 8', 'Line 9']);
    });

    it('should handle contextWindow with mixed blank and content lines', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: 'Content 1\n\nContent 2\n   \nContent 3\nTODO: task\nContent 4\n\nContent 5\n  \nContent 6'
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        contextWindow: 3
      });

      expect(result.matches).toHaveLength(1);
      const match = result.matches[0];
      // Should get 3 content lines: "Content 1", "Content 2", "Content 3" plus blank lines
      expect(match.context?.before).toEqual(['Content 1', '', 'Content 2', '   ', 'Content 3']);
      // Should get 3 content lines: "Content 4", "Content 5", "Content 6" plus blank lines
      expect(match.context?.after).toEqual(['Content 4', '', 'Content 5', '  ', 'Content 6']);
    });

    it('should handle contextWindow larger than available lines', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: 'Only line\nTODO: task\nAnother line'
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        contextWindow: 5 // Larger than available lines
      });

      expect(result.matches).toHaveLength(1);
      const match = result.matches[0];
      // Should return all available lines
      expect(match.context?.before).toEqual(['Only line']);
      expect(match.context?.after).toEqual(['Another line']);
    });

    it('should handle contextWindow at file boundaries', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: 'TODO: first\nMiddle\nTODO: last'
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        contextWindow: 2
      });

      expect(result.matches).toHaveLength(2);
      
      // First match at beginning of file
      const firstMatch = result.matches.find(m => m.lineNumber === 1);
      expect(firstMatch?.context?.before).toEqual([]);
      expect(firstMatch?.context?.after).toEqual(['Middle', 'TODO: last']);
      
      // Last match at end of file
      const lastMatch = result.matches.find(m => m.lineNumber === 3);
      expect(lastMatch?.context?.before).toEqual(['TODO: first', 'Middle']);
      expect(lastMatch?.context?.after).toEqual([]);
    });

    it('should handle contextWindow with only blank lines available', async () => {
      mockObsidianAPI.listFiles.mockResolvedValue([
        { path: 'test.md', isFolder: false, mtime: Date.now() },
      ]);

      mockBatchReader.readMultipleNotes.mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: { 
            content: '\n  \n\nTODO: task\n\n   \n'
          }
        }
      ]);

      const result = await patternExtractor.extractPatterns({
        patterns: ['TODO:'],
        includeStatistics: false,
        contextWindow: 2
      });

      expect(result.matches).toHaveLength(1);
      const match = result.matches[0];
      // Should include blank lines when no content lines are available
      expect(match.context?.before).toEqual(['', '  ', '']);
      expect(match.context?.after).toEqual(['', '   ', '']);
    });
  });
});