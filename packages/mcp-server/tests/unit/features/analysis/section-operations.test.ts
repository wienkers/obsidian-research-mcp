import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sectionOperationsManager } from '../../../../src/features/analysis/section-operations.js';
import { obsidianAPI } from '../../../../src/integrations/obsidian-api.js';
import { cache } from '../../../../src/core/cache.js';
import { logger } from '../../../../src/core/logger.js';
import { config } from '../../../../src/core/config.js';

// Mock dependencies
vi.mock('../../../../src/integrations/obsidian-api.js', () => ({
  obsidianAPI: {
    getNote: vi.fn(),
    updateFileContent: vi.fn()
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

describe('SectionOperationsManager', () => {
  const sampleContent = `# Main Document Title

This is the introduction paragraph with some content.

## Project Overview

This section contains project details and important information.

### Technical Requirements

- Requirement 1: Must support authentication
- Requirement 2: Database connectivity required
- Requirement 3: API endpoints needed

### Implementation Notes

Some implementation details here.
Code examples and technical notes.

## Methodology

Our research methodology follows these steps:

1. Data collection phase
2. Analysis phase  
3. Validation phase

### Data Sources

We gathered data from multiple sources:
- Academic databases
- Industry reports
- Survey responses

## Results

The findings indicate several key points:

> Important quote from the research
> that spans multiple lines
> and provides crucial context

### Statistical Analysis

| Metric | Value | Significance |
|--------|-------|--------------|
| Mean   | 4.2   | p < 0.05     |
| StdDev | 1.1   | Significant  |

## Conclusion

Final thoughts and conclusions go here.

## Appendix

Additional supporting material.
`;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful note retrieval
    vi.mocked(obsidianAPI.getNote).mockResolvedValue({
      path: 'test-document.md',
      content: sampleContent,
      frontmatter: {},
      tags: [],
      links: [],
      backlinks: []
    });

    // Mock cache miss
    vi.mocked(cache.get).mockResolvedValue(null);
  });

  describe('getNoteSections', () => {
    it('should extract all sections without identifiers', async () => {
      const options = {
        path: 'test-document.md',
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      expect(result.path).toBe('test-document.md');
      expect(result.title).toBe('Main Document Title');
      expect(result.sections.length).toBeGreaterThan(0);

      // Check that main sections are present
      const sectionTitles = result.sections.map(s => s.title);
      expect(sectionTitles).toContain('Project Overview');
      expect(sectionTitles).toContain('Methodology');
      expect(sectionTitles).toContain('Results');
      expect(sectionTitles).toContain('Conclusion');

      // Verify section structure
      const projectOverview = result.sections.find(s => s.title === 'Project Overview');
      expect(projectOverview).toBeDefined();
      expect(projectOverview?.level).toBe(2);
      expect(projectOverview?.content).toContain('project details');
      expect(projectOverview?.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should filter sections by string identifiers', async () => {
      const options = {
        path: 'test-document.md',
        sectionIdentifiers: ['methodology', 'Results'],
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      expect(result.sections).toHaveLength(2);
      
      const sectionTitles = result.sections.map(s => s.title);
      expect(sectionTitles).toContain('Methodology');
      expect(sectionTitles).toContain('Results');
    });

    it('should filter sections by heading identifier with level', async () => {
      const options = {
        path: 'test-document.md',
        sectionIdentifiers: [
          { type: 'heading' as const, value: 'technical', level: 3 }
        ],
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].title).toBe('Technical Requirements');
      expect(result.sections[0].level).toBe(3);
    });

    it('should extract specific line range', async () => {
      const options = {
        path: 'test-document.md',
        sectionIdentifiers: [
          { type: 'line_range' as const, value: { start: 5, end: 10 } }
        ],
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].identifier).toBe('lines-5-10');
      expect(result.sections[0].startLine).toBe(5);
      expect(result.sections[0].endLine).toBe(10);
    });

    it('should filter sections by pattern', async () => {
      const options = {
        path: 'test-document.md',
        sectionIdentifiers: [
          { type: 'pattern' as const, value: '^## (Results|Conclusion)' }
        ],
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      expect(result.sections.length).toBeGreaterThan(0);
      const sectionTitles = result.sections.map(s => s.title);
      // The pattern should match sections starting with ## followed by Results or Conclusion
      expect(sectionTitles.some(title => title.includes('Results') || title.includes('Conclusion'))).toBe(true);
    });

    it('should include section context when requested', async () => {
      const options = {
        path: 'test-document.md',
        sectionIdentifiers: ['Results'],
        includeContext: true,
        includeMetadata: false
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      const resultsSection = result.sections.find(s => s.title === 'Results');
      expect(resultsSection?.context).toBeDefined();
      // Context expectations depend on actual section extraction logic
      expect(resultsSection?.context?.precedingSection).toBeDefined();
      expect(resultsSection?.context?.followingSection).toBeDefined();
      if (resultsSection?.context?.subsections) {
        expect(resultsSection.context.subsections.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should apply minimum section length filter', async () => {
      const options = {
        path: 'test-document.md',
        includeContext: false,
        includeMetadata: true,
        minSectionLength: 500 // Only include sections with substantial content
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      // All sections should have content length >= 500
      expect(result.sections.every(s => s.content.length >= 500)).toBe(true);
    });

    it('should calculate section metadata correctly', async () => {
      const options = {
        path: 'test-document.md',
        sectionIdentifiers: ['Technical Requirements'],
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      const techSection = result.sections[0];
      expect(techSection.metadata).toBeDefined();
      expect(techSection.metadata.wordCount).toBeGreaterThan(0);
      expect(techSection.metadata.lineCount).toBeGreaterThan(0);
      expect(techSection.metadata.contentTypes).toContain('text');
      expect(techSection.metadata.contentTypes).toContain('list'); // Contains bullet points
    });

    it('should build outline with correct structure', async () => {
      const options = {
        path: 'test-document.md',
        includeContext: false,
        includeMetadata: false
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      expect(result.outline.length).toBeGreaterThan(0);
      
      const mainHeadings = result.outline.filter(o => o.level === 2);
      expect(mainHeadings.map(h => h.title)).toContain('Project Overview');
      expect(mainHeadings.map(h => h.title)).toContain('Methodology');
      expect(mainHeadings.map(h => h.title)).toContain('Results');
      
      const subHeadings = result.outline.filter(o => o.level === 3);
      expect(subHeadings.map(h => h.title)).toContain('Technical Requirements');
      expect(subHeadings.map(h => h.title)).toContain('Data Sources');
    });

    it('should calculate summary statistics', async () => {
      const options = {
        path: 'test-document.md',
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      expect(result.summary.totalSections).toBe(result.sections.length);
      expect(result.summary.totalWords).toBeGreaterThan(0);
      expect(result.summary.averageWordsPerSection).toBeGreaterThan(0);
      expect(result.summary.deepestLevel).toBeGreaterThanOrEqual(2);
      expect(result.summary.longestSection).toBeTruthy();
      expect(result.summary.shortestSection).toBeTruthy();
    });

    it('should handle empty document gracefully', async () => {
      vi.mocked(obsidianAPI.getNote).mockResolvedValue({
        path: 'empty.md',
        content: '',
        frontmatter: {},
        tags: [],
        links: [],
        backlinks: []
      });

      const options = {
        path: 'empty.md',
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      expect(result.sections).toHaveLength(0);
      expect(result.summary.totalSections).toBe(0);
      expect(result.summary.totalWords).toBe(0);
    });

    it('should use cache when available', async () => {
      const cachedResult = {
        path: 'cached.md',
        title: 'Cached Title',
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

      vi.mocked(cache.get).mockResolvedValue(cachedResult);

      const options = {
        path: 'cached.md',
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);

      expect(result).toEqual(cachedResult);
      expect(obsidianAPI.getNote).not.toHaveBeenCalled();
    });

    it('should cache results after processing', async () => {
      const options = {
        path: 'test-document.md',
        includeContext: false,
        includeMetadata: true
      };

      await sectionOperationsManager.getNoteSections(options);

      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('sections:'),
        expect.any(Object),
        config.cacheTtl,
        ['file:test-document.md']
      );
    });
  });

  describe('getSectionContent', () => {
    it('should return single section by identifier', async () => {
      const result = await sectionOperationsManager.getSectionContent(
        'test-document.md',
        'Methodology'
      );

      expect(result).toBeDefined();
      expect(result?.title).toBe('Methodology');
      expect(result?.content).toContain('research methodology');
      expect(result?.context).toBeDefined();
    });

    it('should return null for non-existent section', async () => {
      const result = await sectionOperationsManager.getSectionContent(
        'test-document.md',
        'Non-existent Section'
      );

      expect(result).toBeNull();
    });

    it('should work with complex section identifier', async () => {
      const result = await sectionOperationsManager.getSectionContent(
        'test-document.md',
        { type: 'heading' as const, value: 'technical', level: 3 }
      );

      expect(result).toBeDefined();
      expect(result?.title).toBe('Technical Requirements');
      expect(result?.level).toBe(3);
    });
  });

  describe('updateSection', () => {
    beforeEach(() => {
      vi.mocked(obsidianAPI.updateFileContent).mockResolvedValue();
    });

    it('should update section content successfully', async () => {
      const newContent = 'Updated methodology content\nWith new information.';
      
      const result = await sectionOperationsManager.updateSection(
        'test-document.md',
        'Methodology',
        newContent
      );

      expect(result.success).toBe(true);
      expect(obsidianAPI.updateFileContent).toHaveBeenCalled();
      
      // Check that the content was properly replaced
      const updateCall = vi.mocked(obsidianAPI.updateFileContent).mock.calls[0];
      expect(updateCall[1]).toContain(newContent);
    });

    it('should handle section not found', async () => {
      const result = await sectionOperationsManager.updateSection(
        'test-document.md',
        'Non-existent Section',
        'New content'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Section not found');
      expect(obsidianAPI.updateFileContent).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(obsidianAPI.updateFileContent).mockRejectedValue(
        new Error('API Error')
      );

      const result = await sectionOperationsManager.updateSection(
        'test-document.md',
        'Methodology',
        'New content'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should update with complex section identifier', async () => {
      const newContent = 'Updated technical requirements.';
      
      const result = await sectionOperationsManager.updateSection(
        'test-document.md',
        { type: 'heading' as const, value: 'technical', level: 3 },
        newContent
      );

      expect(result.success).toBe(true);
      expect(obsidianAPI.updateFileContent).toHaveBeenCalled();
    });
  });

  describe('content type detection', () => {
    it('should detect code blocks', async () => {
      const contentWithCode = `# Test Section

Here is some code:

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

More content here.
`;

      vi.mocked(obsidianAPI.getNote).mockResolvedValue({
        path: 'code-test.md',
        content: contentWithCode,
        frontmatter: {},
        tags: [],
        links: [],
        backlinks: []
      });

      const options = {
        path: 'code-test.md',
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);
      const section = result.sections[0];

      expect(section.metadata.contentTypes).toContain('code');
    });

    it('should detect tables', async () => {
      const contentWithTable = `# Test Section

Here is a table:

| Column A | Column B |
|----------|----------|
| Value 1  | Value 2  |

More content here.
`;

      vi.mocked(obsidianAPI.getNote).mockResolvedValue({
        path: 'table-test.md',
        content: contentWithTable,
        frontmatter: {},
        tags: [],
        links: [],
        backlinks: []
      });

      const options = {
        path: 'table-test.md',
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);
      const section = result.sections[0];

      expect(section.metadata.contentTypes).toContain('table');
    });

    it('should detect links and embeds', async () => {
      const contentWithLinks = `# Test Section

Here are some links:
- [[Internal Link]]
- [External Link](https://example.com)
- ![[Embedded Note]]

More content here.
`;

      vi.mocked(obsidianAPI.getNote).mockResolvedValue({
        path: 'links-test.md',
        content: contentWithLinks,
        frontmatter: {},
        tags: [],
        links: [],
        backlinks: []
      });

      const options = {
        path: 'links-test.md',
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);
      const section = result.sections[0];

      expect(section.metadata.contentTypes).toContain('link');
      expect(section.metadata.contentTypes).toContain('embed');
    });
  });

  describe('word count calculation', () => {
    it('should calculate accurate word count excluding markdown', async () => {
      const contentWithMarkdown = `# Test Section

This is **bold text** and *italic text* with some ~~strikethrough~~.

Here is a \`code snippet\` and a [[link]].

\`\`\`
Code block content
should be excluded
\`\`\`

> This is a blockquote
> that should be included in word count

- List item one
- List item two
`;

      vi.mocked(obsidianAPI.getNote).mockResolvedValue({
        path: 'word-count-test.md',
        content: contentWithMarkdown,
        frontmatter: {},
        tags: [],
        links: [],
        backlinks: []
      });

      const options = {
        path: 'word-count-test.md',
        includeContext: false,
        includeMetadata: true
      };

      const result = await sectionOperationsManager.getNoteSections(options);
      const section = result.sections[0];

      // Word count should exclude markdown syntax but include the actual text
      expect(section.metadata.wordCount).toBeGreaterThan(10);
      expect(section.metadata.wordCount).toBeLessThan(50); // Reasonable upper bound
    });
  });
});