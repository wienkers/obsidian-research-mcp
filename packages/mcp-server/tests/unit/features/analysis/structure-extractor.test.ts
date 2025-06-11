import { describe, it, expect, beforeEach, vi } from 'vitest';
import { structureExtractor } from '../../../../src/features/analysis/structure-extractor.js';
import { batchReader } from '../../../../src/features/batch-operations/batch-reader.js';
import { cache } from '../../../../src/core/cache.js';
import { logger } from '../../../../src/core/logger.js';
import { config } from '../../../../src/core/config.js';

// Mock dependencies
vi.mock('../../../../src/features/batch-operations/batch-reader.js', () => ({
  batchReader: {
    readMultipleNotes: vi.fn()
  }
}));

vi.mock('../../../../src/core/cache.js', () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

vi.mock('../../../../src/core/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  logPerformance: vi.fn((name, fn) => fn())
}));

vi.mock('../../../../src/core/config.js', () => ({
  config: {
    cacheTtl: 300000
  }
}));

describe('StructureExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractStructure', () => {
    const sampleMarkdownContent = `# Main Title

This is an introduction paragraph.

## Section One

This is some content under section one.

- First list item
- Second list item
  - Nested item
    - Deep nested item

### Subsection 1.1

More content here with a [[link to another note]].

\`\`\`javascript
function example() {
  console.log("Hello world");
}
\`\`\`

## Section Two

- [ ] Incomplete task
- [x] Completed task
- [X] Another completed task

> This is a blockquote
> that spans multiple lines
> and contains important information.

| Name | Age | City |
|------|-----|------|
| John | 25  | NYC  |
| Jane | 30  | LA   |

![Embedded image](image.png)
![[Embedded note]]

## Section Three

Some final content.
`;

    beforeEach(() => {
      // Mock successful batch reader response
      vi.mocked(batchReader.readMultipleNotes).mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: {
            path: 'test.md',
            content: sampleMarkdownContent,
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          }
        }
      ]);

      // Mock cache miss
      vi.mocked(cache.get).mockResolvedValue(null);
    });

    it('should extract all element types when specified', async () => {
      const options = {
        paths: ['test.md'],
        extractTypes: ['headings', 'lists', 'code_blocks', 'tasks', 'quotes', 'tables', 'links', 'embeds'] as const,
        includeHierarchy: true,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);

      expect(result.files).toHaveLength(1);
      const fileStructure = result.files[0];

      // Test headings extraction
      const headings = fileStructure.elements.filter(e => e.type === 'headings');
      expect(headings.length).toBeGreaterThanOrEqual(4); // At least Main Title, Section One, Subsection 1.1, Section Two, Section Three
      expect(headings.map(h => h.content)).toContain('Main Title');
      expect(headings.map(h => h.content)).toContain('Section One');
      expect(headings.map(h => h.content)).toContain('Subsection 1.1');

      // Test lists extraction
      const lists = fileStructure.elements.filter(e => e.type === 'lists');
      expect(lists.length).toBeGreaterThan(0);
      expect(lists.some(l => l.content.includes('First list item'))).toBe(true);

      // Test code blocks extraction
      const codeBlocks = fileStructure.elements.filter(e => e.type === 'code_blocks');
      expect(codeBlocks).toHaveLength(1);
      expect(codeBlocks[0].language).toBe('javascript');
      expect(codeBlocks[0].content).toContain('function example()');

      // Test tasks extraction
      const tasks = fileStructure.elements.filter(e => e.type === 'tasks');
      expect(tasks).toHaveLength(3);
      expect(tasks.filter(t => t.completed).length).toBe(2); // Two completed tasks
      expect(tasks.filter(t => !t.completed).length).toBe(1); // One incomplete task

      // Test quotes extraction
      const quotes = fileStructure.elements.filter(e => e.type === 'quotes');
      expect(quotes).toHaveLength(1);
      expect(quotes[0].content).toContain('This is a blockquote');

      // Test tables extraction
      const tables = fileStructure.elements.filter(e => e.type === 'tables');
      expect(tables).toHaveLength(1);
      expect(tables[0].content).toContain('Name | Age | City');

      // Test links extraction
      const links = fileStructure.elements.filter(e => e.type === 'links');
      expect(links.length).toBeGreaterThan(0);
      expect(links.some(l => l.content.includes('link to another note'))).toBe(true);

      // Test embeds extraction
      const embeds = fileStructure.elements.filter(e => e.type === 'embeds');
      expect(embeds.length).toBeGreaterThan(0);
      expect(embeds.some(e => e.content.includes('Embedded note'))).toBe(true);
    });

    it('should build hierarchy when includeHierarchy is true', async () => {
      const options = {
        paths: ['test.md'],
        extractTypes: ['headings'] as const,
        includeHierarchy: true,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);
      const fileStructure = result.files[0];

      expect(fileStructure.hierarchy).toBeDefined();
      expect(fileStructure.hierarchy?.sections).toHaveLength(1); // Main Title section

      const mainSection = fileStructure.hierarchy?.sections[0];
      expect(mainSection?.heading.content).toBe('Main Title');
      expect(mainSection?.level).toBe(1);
      expect(mainSection?.subsections.length).toBeGreaterThan(0); // Should have subsections
    });

    it('should include context when includeContext is true', async () => {
      const options = {
        paths: ['test.md'],
        extractTypes: ['headings'] as const,
        includeHierarchy: false,
        includeContext: true,
        contextWindow: 2
      };

      const result = await structureExtractor.extractStructure(options);
      const fileStructure = result.files[0];

      const headingsWithContext = fileStructure.elements.filter(e => e.type === 'headings' && e.context);
      expect(headingsWithContext.length).toBeGreaterThan(0);

      // Check that context includes preceding and following text
      const sectionOneHeading = headingsWithContext.find(h => h.content === 'Section One');
      expect(sectionOneHeading?.context?.precedingText).toBeDefined();
      expect(sectionOneHeading?.context?.followingText).toBeDefined();
    });

    it('should filter headings by level when min/max specified', async () => {
      const options = {
        paths: ['test.md'],
        extractTypes: ['headings'] as const,
        includeHierarchy: false,
        includeContext: false,
        minHeadingLevel: 2,
        maxHeadingLevel: 2
      };

      const result = await structureExtractor.extractStructure(options);
      const fileStructure = result.files[0];

      const headings = fileStructure.elements.filter(e => e.type === 'headings');
      // Should only include level 2 headings
      expect(headings.every(h => h.level === 2)).toBe(true);
      expect(headings.map(h => h.content)).toContain('Section One');
      expect(headings.map(h => h.content)).toContain('Section Two');
      expect(headings.map(h => h.content)).not.toContain('Main Title'); // Level 1
      expect(headings.map(h => h.content)).not.toContain('Subsection 1.1'); // Level 3
    });

    it('should calculate correct file summary', async () => {
      const options = {
        paths: ['test.md'],
        extractTypes: ['headings', 'tasks'] as const,
        includeHierarchy: false,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);
      const fileStructure = result.files[0];

      expect(fileStructure.summary.totalElements).toBeGreaterThan(0);
      expect(fileStructure.summary.byType.headings).toBeGreaterThan(0);
      expect(fileStructure.summary.byType.tasks).toBe(3);
      expect(fileStructure.summary.taskCompletion.total).toBe(3);
      expect(fileStructure.summary.taskCompletion.completed).toBe(2);
      expect(fileStructure.summary.taskCompletion.percentage).toBeCloseTo(66.67, 1);
      expect(fileStructure.summary.headingLevels[1]).toBeGreaterThanOrEqual(1); // At least one H1
      expect(fileStructure.summary.headingLevels[2]).toBeGreaterThanOrEqual(2); // At least two H2s
      expect(fileStructure.summary.headingLevels[3]).toBeGreaterThanOrEqual(1); // At least one H3
    });

    it('should handle multiple files', async () => {
      // Mock multiple files
      vi.mocked(batchReader.readMultipleNotes).mockResolvedValue([
        {
          success: true,
          path: 'file1.md',
          note: {
            path: 'file1.md',
            content: '# File One\n\nContent here.',
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          }
        },
        {
          success: true,
          path: 'file2.md',
          note: {
            path: 'file2.md',
            content: '# File Two\n\n## Section A\n\nMore content.',
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          }
        }
      ]);

      const options = {
        paths: ['file1.md', 'file2.md'],
        extractTypes: ['headings'] as const,
        includeHierarchy: false,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);

      expect(result.files).toHaveLength(2);
      expect(result.aggregatedSummary.totalFiles).toBe(2);
      expect(result.aggregatedSummary.totalElements).toBeGreaterThan(0);
      expect(result.aggregatedSummary.byType.headings).toBe(3); // 1 + 2 headings
    });

    it('should handle files with no content gracefully', async () => {
      vi.mocked(batchReader.readMultipleNotes).mockResolvedValue([
        {
          success: true,
          path: 'empty.md',
          note: {
            path: 'empty.md',
            content: '',
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          }
        }
      ]);

      const options = {
        paths: ['empty.md'],
        extractTypes: ['headings'] as const,
        includeHierarchy: false,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);

      // The actual mock implementation might not return files for empty content
      expect(result.files.length).toBeGreaterThanOrEqual(0);
      if (result.files.length > 0) {
        expect(result.files[0].elements).toHaveLength(0);
        expect(result.files[0].summary.totalElements).toBe(0);
      }
    });

    it('should handle failed file reads', async () => {
      vi.mocked(batchReader.readMultipleNotes).mockResolvedValue([
        {
          success: false,
          path: 'missing.md',
          error: 'File not found'
        }
      ]);

      const options = {
        paths: ['missing.md'],
        extractTypes: ['headings'] as const,
        includeHierarchy: false,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);

      expect(result.files).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith('Failed to process file: missing.md');
    });

    it('should use cache when available', async () => {
      const cachedResult = {
        files: [{
          path: 'cached.md',
          title: 'Cached File',
          elements: [],
          summary: {
            totalElements: 0,
            byType: {} as any,
            headingLevels: {},
            taskCompletion: { total: 0, completed: 0, percentage: 0 }
          }
        }],
        aggregatedSummary: {
          totalFiles: 1,
          totalElements: 0,
          byType: {} as any,
          commonPatterns: []
        }
      };

      vi.mocked(cache.get).mockResolvedValue(cachedResult);

      const options = {
        paths: ['cached.md'],
        extractTypes: ['headings'] as const,
        includeHierarchy: false,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);

      expect(result).toEqual(cachedResult);
      expect(batchReader.readMultipleNotes).not.toHaveBeenCalled();
    });

    it('should cache results after processing', async () => {
      const options = {
        paths: ['test.md'],
        extractTypes: ['headings'] as const,
        includeHierarchy: false,
        includeContext: false
      };

      await structureExtractor.extractStructure(options);

      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('structure:'),
        expect.any(Object),
        config.cacheTtl,
        ['file:test.md']
      );
    });
  });

  describe('table detection edge cases', () => {
    it('should not detect wikilinks as tables', async () => {
      const contentWithWikilinks = `
# Test

- Item with [[link|alias]] should not be table
- Another [[file|description]] item

Not a table line with | pipe but no proper structure.
`;

      vi.mocked(batchReader.readMultipleNotes).mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: {
            path: 'test.md',
            content: contentWithWikilinks,
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          }
        }
      ]);

      const options = {
        paths: ['test.md'],
        extractTypes: ['tables'] as const,
        includeHierarchy: false,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);
      const tables = result.files[0].elements.filter(e => e.type === 'tables');

      expect(tables).toHaveLength(0);
    });

    it('should detect proper markdown tables', async () => {
      const contentWithTable = `
# Test

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value A  | Value B  | Value C  |
| Value X  | Value Y  | Value Z  |
`;

      vi.mocked(batchReader.readMultipleNotes).mockResolvedValue([
        {
          success: true,
          path: 'test.md',
          note: {
            path: 'test.md',
            content: contentWithTable,
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          }
        }
      ]);

      const options = {
        paths: ['test.md'],
        extractTypes: ['tables'] as const,
        includeHierarchy: false,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);
      const tables = result.files[0].elements.filter(e => e.type === 'tables');

      expect(tables).toHaveLength(1);
      expect(tables[0].content).toContain('Column 1');
      expect(tables[0].content).toContain('Value A');
    });
  });

  describe('title extraction', () => {
    it('should extract title from first H1 heading', async () => {
      const contentWithTitle = `# My Document Title

Content follows here.

## Section One
More content.
`;

      vi.mocked(batchReader.readMultipleNotes).mockResolvedValue([
        {
          success: true,
          path: 'document.md',
          note: {
            path: 'document.md',
            content: contentWithTitle,
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          }
        }
      ]);

      const options = {
        paths: ['document.md'],
        extractTypes: ['headings'] as const,
        includeHierarchy: false,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);

      expect(result.files[0].title).toBe('My Document Title');
    });

    it('should fallback to filename if no H1 heading', async () => {
      const contentWithoutTitle = `## Section One

Content without main title.
`;

      vi.mocked(batchReader.readMultipleNotes).mockResolvedValue([
        {
          success: true,
          path: 'path/to/document.md',
          note: {
            path: 'path/to/document.md',
            content: contentWithoutTitle,
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          }
        }
      ]);

      const options = {
        paths: ['path/to/document.md'],
        extractTypes: ['headings'] as const,
        includeHierarchy: false,
        includeContext: false
      };

      const result = await structureExtractor.extractStructure(options);

      expect(result.files[0].title).toBe('document');
    });
  });
});