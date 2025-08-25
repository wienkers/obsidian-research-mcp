import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObsidianResearchServer } from '../../src/server.js';
import { structureExtractor } from '../../src/features/analysis/structure-extractor.js';
import { sectionOperationsManager } from '../../src/features/analysis/section-operations.js';
import { logger } from '../../src/core/logger.js';

// Mock all external dependencies
vi.mock('../../src/features/analysis/structure-extractor.js', () => ({
  structureExtractor: {
    extractStructure: vi.fn()
  }
}));

vi.mock('../../src/features/analysis/section-operations.js', () => ({
  sectionOperationsManager: {
    getNoteSections: vi.fn()
  }
}));

vi.mock('../../src/core/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../src/core/rate-limiter.js', () => ({
  getRateLimiterForTool: vi.fn(() => ({
    checkLimit: vi.fn(() => ({ allowed: true, remaining: 10, resetTime: Date.now() + 60000 }))
  }))
}));

vi.mock('../../src/core/validation.js', () => ({
  validateToolInput: vi.fn((name, args) => args)
}));

describe('obsidian_analyze Integration Tests', () => {
  let server: ObsidianResearchServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new ObsidianResearchServer();
  });

  describe('basic structure analysis', () => {
    it('should perform structure analysis on single file', async () => {
      const mockStructureResult = {
        files: [{
          path: 'test.md',
          title: 'Test Document',
          hierarchy: {
            sections: [{
              heading: {
                type: 'headings',
                content: '## Introduction',
                lineNumber: 1,
                level: 2
              },
              level: 2,
              children: [],
              subsections: []
            }]
          },
          summary: {
            totalElements: 2,
            byType: {
              headings: 2,
              lists: 0,
              code_blocks: 0,
              tasks: 0,
              quotes: 0,
              tables: 0,
              links: 0,
              embeds: 0
            },
            headingLevels: { 2: 2 },
            taskCompletion: {
              total: 0,
              completed: 0,
              percentage: 0
            }
          }
        }],
        aggregatedSummary: {
          totalFiles: 1,
          totalElements: 2,
          byType: {
            headings: 2,
            lists: 0,
            code_blocks: 0,
            tasks: 0,
            quotes: 0,
            tables: 0,
            links: 0,
            embeds: 0
          },
          commonPatterns: []
        }
      };

      vi.mocked(structureExtractor.extractStructure).mockResolvedValue(mockStructureResult);

      // Simulate server request handling
      const request = {
        params: {
          name: 'obsidian_analyze',
          arguments: {
            target: 'test.md',
            analysis: ['structure'],
            options: {
              extractTypes: ['headings']
            }
          }
        }
      };

      // Access the private method through server instance
      const result = await (server as any).handleConsolidatedAnalyze(request.params.arguments);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.target).toBe('test.md');
      expect(responseData.analysis).toHaveProperty('structure');
      expect(responseData.analysis.structure).toEqual(mockStructureResult);

      expect(structureExtractor.extractStructure).toHaveBeenCalledWith({
        paths: ['test.md'],
        extractTypes: ['headings'],
        includeHierarchy: true,
        includeContext: false,
        contextWindow: 1,
        minHeadingLevel: undefined,
        maxHeadingLevel: undefined
      });
    });

    it('should perform structure analysis on multiple files', async () => {
      const mockStructureResult = {
        files: [
          {
            path: 'file1.md',
            title: 'File One',
            summary: {
              totalElements: 1,
              byType: { headings: 1, lists: 0, code_blocks: 0, tasks: 0, quotes: 0, tables: 0, links: 0, embeds: 0 },
              headingLevels: { 1: 1 },
              taskCompletion: { total: 0, completed: 0, percentage: 0 }
            }
          },
          {
            path: 'file2.md',
            title: 'File Two',
            summary: {
              totalElements: 2,
              byType: { headings: 2, lists: 0, code_blocks: 0, tasks: 0, quotes: 0, tables: 0, links: 0, embeds: 0 },
              headingLevels: { 1: 1, 2: 1 },
              taskCompletion: { total: 0, completed: 0, percentage: 0 }
            }
          }
        ],
        aggregatedSummary: {
          totalFiles: 2,
          totalElements: 3,
          byType: { headings: 3, lists: 0, code_blocks: 0, tasks: 0, quotes: 0, tables: 0, links: 0, embeds: 0 },
          commonPatterns: []
        }
      };

      vi.mocked(structureExtractor.extractStructure).mockResolvedValue(mockStructureResult);

      const result = await (server as any).handleConsolidatedAnalyze({
        target: ['file1.md', 'file2.md'],
        analysis: ['structure']
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.target).toEqual(['file1.md', 'file2.md']);
      expect(responseData.analysis.structure.aggregatedSummary.totalFiles).toBe(2);
    });

    it('should handle all extract types', async () => {
      const extractTypes = ['headings', 'lists', 'code_blocks', 'tasks', 'quotes', 'tables', 'links', 'embeds'];
      
      const mockResult = {
        files: [{
          path: 'comprehensive.md',
          title: 'Comprehensive Test',
          hierarchy: {
            sections: [{
              heading: {
                type: 'headings',
                content: '# Sample heading content',
                lineNumber: 1,
                level: 1
              },
              level: 1,
              children: extractTypes.filter(t => t !== 'headings').map(type => ({
                type,
                content: `Sample ${type}`,
                lineNumber: 2
              })),
              subsections: []
            }]
          },
          summary: {
            totalElements: extractTypes.length,
            byType: Object.fromEntries(extractTypes.map(t => [t, 1])),
            headingLevels: { 1: 1 },
            taskCompletion: { total: 1, completed: 0, percentage: 0 }
          }
        }],
        aggregatedSummary: {
          totalFiles: 1,
          totalElements: extractTypes.length,
          byType: Object.fromEntries(extractTypes.map(t => [t, 1])),
          commonPatterns: []
        }
      };

      vi.mocked(structureExtractor.extractStructure).mockResolvedValue(mockResult);

      const result = await (server as any).handleConsolidatedAnalyze({
        target: 'comprehensive.md',
        analysis: ['structure'],
        options: {
          extractTypes: extractTypes
        }
      });

      expect(structureExtractor.extractStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          extractTypes: extractTypes
        })
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.analysis.structure.files[0].summary.totalElements).toBe(extractTypes.length);
    });
  });

  describe('sections analysis with sectionIdentifiers', () => {
    it('should perform sections analysis when sectionIdentifiers provided', async () => {
      const mockSectionResult = {
        path: 'document.md',
        title: 'Test Document',
        sections: [{
          identifier: 'Introduction',
          title: 'Introduction',
          content: 'This is the introduction section with detailed content.',
          startLine: 3,
          endLine: 8,
          level: 2,
          context: {
            precedingSection: undefined,
            followingSection: 'Methodology',
            parentSection: undefined,
            subsections: []
          },
          metadata: {
            wordCount: 25,
            lineCount: 6,
            hasSubsections: false,
            contentTypes: ['text']
          }
        }],
        outline: [{
          title: 'Introduction',
          level: 2,
          lineNumber: 3,
          hasContent: true
        }],
        summary: {
          totalSections: 1,
          totalWords: 25,
          averageWordsPerSection: 25,
          deepestLevel: 2,
          longestSection: 'Introduction',
          shortestSection: 'Introduction'
        }
      };

      vi.mocked(sectionOperationsManager.getNoteSections).mockResolvedValue(mockSectionResult);

      const result = await (server as any).handleConsolidatedAnalyze({
        target: 'document.md',
        sectionIdentifiers: ['Introduction'],
        analysis: ['sections'],
        options: {
          includeMetadata: true,
          includeSectionContext: true
        }
      });

      expect(sectionOperationsManager.getNoteSections).toHaveBeenCalledWith({
        path: 'document.md',
        sectionIdentifiers: ['Introduction'],
        includeContext: true,
        includeMetadata: true,
        contextWindow: undefined,
        minSectionLength: undefined
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.analysis.sections).toEqual(mockSectionResult);
    });

    it('should handle complex section identifiers', async () => {
      const complexIdentifiers = [
        { type: 'heading', value: 'Results', level: 2 },
        { type: 'line_range', value: { start: 10, end: 20 } },
        { type: 'pattern', value: '^## Analysis' }
      ];

      const mockResult = {
        path: 'complex.md',
        title: 'Complex Document',
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
      };

      vi.mocked(sectionOperationsManager.getNoteSections).mockResolvedValue(mockResult);

      await (server as any).handleConsolidatedAnalyze({
        target: 'complex.md',
        sectionIdentifiers: complexIdentifiers,
        analysis: ['sections']
      });

      expect(sectionOperationsManager.getNoteSections).toHaveBeenCalledWith({
        path: 'complex.md',
        sectionIdentifiers: complexIdentifiers,
        includeContext: true,
        includeMetadata: true,
        contextWindow: undefined,
        minSectionLength: undefined
      });
    });

    it('should automatically add sections analysis when sectionIdentifiers provided', async () => {
      const mockSectionResult = {
        path: 'auto-sections.md',
        title: 'Auto Sections',
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
      };

      vi.mocked(sectionOperationsManager.getNoteSections).mockResolvedValue(mockSectionResult);

      // Don't explicitly request sections analysis, but provide sectionIdentifiers
      await (server as any).handleConsolidatedAnalyze({
        target: 'auto-sections.md',
        sectionIdentifiers: ['Introduction'],
        analysis: ['structure'] // Only structure requested initially
      });

      // Should automatically add sections analysis due to sectionIdentifiers
      expect(sectionOperationsManager.getNoteSections).toHaveBeenCalled();
    });
  });

  describe('multi-file sections analysis', () => {
    it('should handle sections analysis on multiple files', async () => {
      const mockResults = [
        {
          path: 'file1.md',
          title: 'File One',
          sections: [],
          outline: [],
          summary: { totalSections: 0, totalWords: 0, averageWordsPerSection: 0, deepestLevel: 0, longestSection: '', shortestSection: '' }
        },
        {
          path: 'file2.md',
          title: 'File Two',
          sections: [],
          outline: [],
          summary: { totalSections: 0, totalWords: 0, averageWordsPerSection: 0, deepestLevel: 0, longestSection: '', shortestSection: '' }
        }
      ];

      // Mock multiple calls to getNoteSections
      vi.mocked(sectionOperationsManager.getNoteSections)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await (server as any).handleConsolidatedAnalyze({
        target: ['file1.md', 'file2.md'],
        analysis: ['sections'],
        sectionIdentifiers: ['Introduction']
      });

      expect(sectionOperationsManager.getNoteSections).toHaveBeenCalledTimes(2);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.analysis.sections.files).toHaveLength(2);
      expect(responseData.analysis.sections.summary.totalFiles).toBe(2);
    });

    it('should handle errors in multi-file sections analysis', async () => {
      vi.mocked(sectionOperationsManager.getNoteSections)
        .mockResolvedValueOnce({
          path: 'file1.md',
          title: 'File One',
          sections: [],
          outline: [],
          summary: { totalSections: 0, totalWords: 0, averageWordsPerSection: 0, deepestLevel: 0, longestSection: '', shortestSection: '' }
        })
        .mockRejectedValueOnce(new Error('File not found'));

      const result = await (server as any).handleConsolidatedAnalyze({
        target: ['file1.md', 'file2.md'],
        analysis: ['sections']
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to analyze sections for file2.md',
        expect.any(Object)
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.analysis.sections.files).toHaveLength(2);
      // Second file should have error info
      const errorFile = responseData.analysis.sections.files[1];
      expect(errorFile.error).toContain('File not found');
    });
  });

  describe('mixed analysis types', () => {
    it('should handle multiple analysis types in single request', async () => {
      const mockStructureResult = {
        files: [],
        aggregatedSummary: { totalFiles: 0, totalElements: 0, byType: {}, commonPatterns: [] }
      };
      
      const mockSectionResult = {
        path: 'mixed.md',
        title: 'Mixed Analysis',
        sections: [],
        outline: [],
        summary: { totalSections: 0, totalWords: 0, averageWordsPerSection: 0, deepestLevel: 0, longestSection: '', shortestSection: '' }
      };

      vi.mocked(structureExtractor.extractStructure).mockResolvedValue(mockStructureResult);
      vi.mocked(sectionOperationsManager.getNoteSections).mockResolvedValue(mockSectionResult);

      const result = await (server as any).handleConsolidatedAnalyze({
        target: 'mixed.md',
        analysis: ['structure', 'sections'],
        sectionIdentifiers: ['Introduction']
      });

      // Should call both structure extractor and section operations
      expect(structureExtractor.extractStructure).toHaveBeenCalled();
      expect(sectionOperationsManager.getNoteSections).toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.analysis).toHaveProperty('structure');
      expect(responseData.analysis).toHaveProperty('sections');
    });
  });

  describe('options handling', () => {
    it('should pass through all structure extractor options', async () => {
      const options = {
        extractTypes: ['headings', 'lists'],
        includeHierarchy: true,
        includeContext: true,
        contextWindow: 3,
        minHeadingLevel: 2,
        maxHeadingLevel: 4
      };

      const mockResult = {
        files: [],
        aggregatedSummary: { totalFiles: 0, totalElements: 0, byType: {}, commonPatterns: [] }
      };

      vi.mocked(structureExtractor.extractStructure).mockResolvedValue(mockResult);

      await (server as any).handleConsolidatedAnalyze({
        target: 'test.md',
        analysis: ['structure'],
        options
      });

      expect(structureExtractor.extractStructure).toHaveBeenCalledWith({
        paths: ['test.md'],
        extractTypes: ['headings', 'lists'],
        includeHierarchy: true,
        includeContext: true,
        contextWindow: 3,
        minHeadingLevel: 2,
        maxHeadingLevel: 4
      });
    });

    it('should pass through all section operations options', async () => {
      const options = {
        includeSectionContext: false,
        includeMetadata: false,
        contextWindow: 2,
        minSectionLength: 100
      };

      const mockResult = {
        path: 'test.md',
        title: 'Test',
        sections: [],
        outline: [],
        summary: { totalSections: 0, totalWords: 0, averageWordsPerSection: 0, deepestLevel: 0, longestSection: '', shortestSection: '' }
      };

      vi.mocked(sectionOperationsManager.getNoteSections).mockResolvedValue(mockResult);

      await (server as any).handleConsolidatedAnalyze({
        target: 'test.md',
        analysis: ['sections'],
        options
      });

      expect(sectionOperationsManager.getNoteSections).toHaveBeenCalledWith({
        path: 'test.md',
        sectionIdentifiers: undefined,
        includeContext: false,
        includeMetadata: false,
        contextWindow: 2,
        minSectionLength: 100
      });
    });
  });

  describe('default values', () => {
    it('should use default values when options not provided', async () => {
      const mockResult = {
        files: [],
        aggregatedSummary: { totalFiles: 0, totalElements: 0, byType: {}, commonPatterns: [] }
      };

      vi.mocked(structureExtractor.extractStructure).mockResolvedValue(mockResult);

      await (server as any).handleConsolidatedAnalyze({
        target: 'test.md'
        // No analysis or options provided
      });

      expect(structureExtractor.extractStructure).toHaveBeenCalledWith({
        paths: ['test.md'],
        extractTypes: ['headings'], // Default
        includeHierarchy: true, // Default
        includeContext: false, // Default
        contextWindow: 1, // Default
        minHeadingLevel: undefined,
        maxHeadingLevel: undefined
      });
    });
  });
});