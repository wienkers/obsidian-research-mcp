import { describe, it, expect } from 'vitest';
import { YamlParser } from './yaml-parser.js';
describe('YamlParser', () => {
    const parser = new YamlParser();
    it('should extract frontmatter from markdown content', () => {
        const content = `---
title: Test Note
tags: [test, example]
created: 2024-01-01
---

# Content

This is the note content.`;
        const result = parser.extractFrontmatter(content);
        expect(result.hasFrontmatter).toBe(true);
        expect(result.frontmatter.title).toBe('Test Note');
        expect(result.frontmatter.tags).toEqual(['test', 'example']);
        expect(result.frontmatter.created).toBe('2024-01-01');
        expect(result.content).toContain('# Content');
    });
    it('should handle content without frontmatter', () => {
        const content = `# Just Content

No frontmatter here.`;
        const result = parser.extractFrontmatter(content);
        expect(result.hasFrontmatter).toBe(false);
        expect(result.frontmatter).toEqual({});
        expect(result.content).toBe(content);
    });
    it('should handle complex YAML frontmatter gracefully', () => {
        // The YAML parser is robust and can handle complex structures
        const content = `---
title: Test Note
complex:
  nested: value
  array: [1, 2, 3]
---

Content`;
        const result = parser.extractFrontmatter(content);
        expect(result.hasFrontmatter).toBe(true);
        expect(result.frontmatter.title).toBe('Test Note');
        expect(result.frontmatter.complex.nested).toBe('value');
        expect(result.frontmatter.complex.array).toEqual([1, 2, 3]);
        expect(result.content).toContain('Content');
    });
    it('should handle empty frontmatter', () => {
        const content = `---

---

Content only`;
        const result = parser.extractFrontmatter(content);
        expect(result.hasFrontmatter).toBe(true);
        expect(result.frontmatter).toEqual({});
        expect(result.content).toContain('Content only');
    });
});
