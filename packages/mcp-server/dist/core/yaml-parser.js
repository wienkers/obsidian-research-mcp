import { parse as yamlParse, stringify as yamlStringify } from 'yaml';
import { logger } from './logger.js';
export class YamlParser {
    /**
     * Extract and parse frontmatter from markdown content
     */
    extractFrontmatter(content) {
        // Try to match frontmatter at the beginning first (preferred format)
        let frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        // If not found at the beginning, try to find frontmatter anywhere in the document
        // This handles cases where content was prepended before the frontmatter
        if (!frontmatterMatch) {
            frontmatterMatch = content.match(/^([\s\S]*?)\r?\n---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
            if (frontmatterMatch) {
                // Found frontmatter in the middle - rearrange to extract it properly
                const [, prefixContent, frontmatterText, suffixContent] = frontmatterMatch;
                const bodyContent = (prefixContent.trim() + '\n\n' + suffixContent.trim()).trim();
                try {
                    const frontmatter = this.parseYaml(frontmatterText);
                    return {
                        frontmatter: frontmatter || {},
                        content: bodyContent,
                        hasFrontmatter: true,
                    };
                }
                catch (error) {
                    logger.warn('Failed to parse frontmatter YAML (middle position)', {
                        error: error instanceof Error ? error.message : String(error),
                        frontmatterText: frontmatterText.substring(0, 200) + '...'
                    });
                    return {
                        frontmatter: {},
                        content,
                        hasFrontmatter: false,
                    };
                }
            }
        }
        if (!frontmatterMatch) {
            return {
                frontmatter: {},
                content,
                hasFrontmatter: false,
            };
        }
        const [, frontmatterText, bodyContent] = frontmatterMatch;
        try {
            const frontmatter = this.parseYaml(frontmatterText);
            return {
                frontmatter: frontmatter || {},
                content: bodyContent,
                hasFrontmatter: true,
            };
        }
        catch (error) {
            logger.warn('Failed to parse frontmatter YAML', {
                error: error instanceof Error ? error.message : String(error),
                frontmatterText: frontmatterText.substring(0, 200) + '...'
            });
            return {
                frontmatter: {},
                content,
                hasFrontmatter: false,
            };
        }
    }
    /**
     * Parse YAML string to object with proper error handling
     */
    parseYaml(yamlString) {
        if (!yamlString || yamlString.trim() === '') {
            return {};
        }
        try {
            const parsed = yamlParse(yamlString, {
                // Handle various YAML edge cases
                merge: true,
                schema: 'core',
                strict: false,
                uniqueKeys: false,
                maxAliasCount: 100,
            });
            // Ensure we return an object
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                return this.normalizeYamlValues(parsed);
            }
            if (parsed === null || parsed === undefined) {
                return {};
            }
            // If parsed value is not an object, wrap it
            return { value: parsed };
        }
        catch (error) {
            logger.debug('YAML parsing failed', {
                error: error instanceof Error ? error.message : String(error),
                yamlString: yamlString.substring(0, 100)
            });
            return null;
        }
    }
    /**
     * Stringify object to YAML with consistent formatting
     */
    stringifyYaml(obj) {
        try {
            return yamlStringify(obj, {
                indent: 2,
                lineWidth: 80,
                minContentWidth: 20,
                doubleQuotedAsJSON: false,
                doubleQuotedMinMultiLineLength: 40,
                blockQuote: 'literal',
                defaultKeyType: null,
                defaultStringType: 'PLAIN',
            });
        }
        catch (error) {
            logger.warn('Failed to stringify to YAML', {
                error: error instanceof Error ? error.message : String(error)
            });
            return '';
        }
    }
    /**
     * Normalize YAML values for consistent handling
     */
    normalizeYamlValues(obj) {
        const normalized = {};
        for (const [key, value] of Object.entries(obj)) {
            normalized[key] = this.normalizeValue(value);
        }
        return normalized;
    }
    normalizeValue(value) {
        if (value === null || value === undefined) {
            return null;
        }
        if (Array.isArray(value)) {
            return value.map(item => this.normalizeValue(item));
        }
        if (typeof value === 'object' && value !== null) {
            if (value instanceof Date) {
                return value.toISOString();
            }
            // Handle nested objects
            const normalized = {};
            for (const [key, val] of Object.entries(value)) {
                normalized[key] = this.normalizeValue(val);
            }
            return normalized;
        }
        // Handle string values
        if (typeof value === 'string') {
            // Normalize line endings
            value = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            // Handle special YAML string values
            if (value === 'true' || value === 'false') {
                return value === 'true';
            }
            // Try to parse numbers
            if (/^\d+$/.test(value)) {
                const num = parseInt(value, 10);
                if (!isNaN(num)) {
                    return num;
                }
            }
            if (/^\d*\.\d+$/.test(value)) {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    return num;
                }
            }
        }
        return value;
    }
    /**
     * Update frontmatter in markdown content
     */
    updateFrontmatter(content, newFrontmatter) {
        const { content: bodyContent, hasFrontmatter } = this.extractFrontmatter(content);
        if (Object.keys(newFrontmatter).length === 0) {
            return bodyContent;
        }
        const yamlString = this.stringifyYaml(newFrontmatter);
        if (!yamlString) {
            return content; // Return original if YAML stringification fails
        }
        return `---\n${yamlString}---\n${bodyContent}`;
    }
    /**
     * Merge frontmatter with new values
     */
    mergeFrontmatter(content, updates) {
        const { frontmatter, content: bodyContent } = this.extractFrontmatter(content);
        const merged = { ...frontmatter, ...updates };
        return this.updateFrontmatter(content, merged);
    }
    /**
     * Extract tags from frontmatter with normalization
     */
    extractTags(frontmatter) {
        const tags = [];
        // Handle various tag field names
        const tagFields = ['tags', 'tag', 'categories', 'category'];
        for (const field of tagFields) {
            const value = frontmatter[field];
            if (typeof value === 'string') {
                // Handle comma-separated tags
                if (value.includes(',')) {
                    tags.push(...value.split(',').map(tag => tag.trim()).filter(Boolean));
                }
                else {
                    // Handle space-separated tags
                    tags.push(...value.split(/\s+/).filter(Boolean));
                }
            }
            else if (Array.isArray(value)) {
                // Handle array of tags
                for (const tag of value) {
                    if (typeof tag === 'string') {
                        tags.push(tag.trim());
                    }
                    else if (tag !== null && tag !== undefined) {
                        tags.push(String(tag).trim());
                    }
                }
            }
        }
        // Normalize tags: remove duplicates, clean up format
        return [...new Set(tags)]
            .map(tag => tag.replace(/^#/, '')) // Remove leading #
            .filter(tag => tag.length > 0)
            .sort();
    }
    /**
     * Extract date fields from frontmatter
     */
    extractDates(frontmatter) {
        const dates = {};
        const dateFields = {
            created: ['created', 'date', 'created_at', 'creation_date'],
            modified: ['modified', 'updated', 'modified_at', 'update_date', 'last_modified'],
            published: ['published', 'publish_date', 'published_at', 'publication_date'],
        };
        for (const [key, fields] of Object.entries(dateFields)) {
            for (const field of fields) {
                const value = frontmatter[field];
                if (value) {
                    const date = this.parseDate(value);
                    if (date) {
                        dates[key] = date;
                        break; // Use first valid date found
                    }
                }
            }
        }
        return dates;
    }
    parseDate(value) {
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        if (typeof value === 'number') {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        return null;
    }
}
export const yamlParser = new YamlParser();
