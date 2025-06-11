import { obsidianAPI } from '../integrations/obsidian-api.js';
import { yamlParser } from './yaml-parser.js';
import { errorHandler, ErrorSuggestions } from './error-handling.js';
import { smartCache } from './smart-cache.js';
import { streamingProcessor } from './streaming.js';
import { logger } from './logger.js';
import { config } from './config.js';
import path from 'path';
export class FileOperationsManager {
    /**
     * Read multiple notes with unified processing
     */
    async readMultipleNotes(paths, options = {}) {
        const opts = {
            includeContent: true,
            includeMetadata: true,
            includeFrontmatter: true,
            includeStructure: false,
            useCache: true,
            ...options,
        };
        const results = [];
        for await (const batch of streamingProcessor.streamFileOperations(paths, (path) => this.readSingleNote(path, opts), { chunkSize: 20, maxConcurrent: 5 }, opts.onProgress)) {
            for (const item of batch) {
                results.push({
                    path: item.path,
                    success: item.result !== null,
                    note: item.result || undefined,
                    error: item.error,
                });
            }
        }
        return results;
    }
    /**
     * Read a single note with comprehensive processing
     */
    async readSingleNote(filePath, options = {}) {
        const cacheKey = `enhanced-note:${filePath}:${JSON.stringify(options)}`;
        if (options.useCache !== false) {
            const cached = await smartCache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        try {
            const note = await errorHandler.withResilience('obsidian-read-note', () => obsidianAPI.getNote(filePath), { maxAttempts: 3, baseDelay: 1000 }, { failureThreshold: 5, recoveryTimeout: 30000 });
            if (!note || !note.content) {
                throw new Error('Note content is empty or unavailable');
            }
            const enhancedNote = await this.processNoteContent(note, filePath, options);
            // Cache the result
            if (options.useCache !== false) {
                await smartCache.set(cacheKey, enhancedNote, config.cacheTtl * 1000, [`file:${filePath}`]);
            }
            return enhancedNote;
        }
        catch (error) {
            const enhancedError = errorHandler.createEnhancedError(error instanceof Error ? error : new Error(String(error)), `Failed to read note: ${filePath}`, ErrorSuggestions.FILE_ACCESS);
            logger.warn('Failed to read note', {
                path: filePath,
                error: enhancedError.message,
            });
            throw enhancedError;
        }
    }
    /**
     * Extract comprehensive metadata from file content
     */
    extractFileMetadata(fileInfo, content, frontmatterResult) {
        const lines = content.split('\n');
        // Content analysis
        const wordCount = this.calculateWordCount(content);
        const headingCount = (content.match(/^#{1,6}\s+/gm) || []).length;
        const taskMatches = content.match(/^[\s]*[-*+]\s+\[[ xX]\]/gm) || [];
        const taskCount = taskMatches.length;
        const completedTaskCount = (content.match(/^[\s]*[-*+]\s+\[xX\]/gm) || []).length;
        const codeBlockCount = (content.match(/```[\s\S]*?```/g) || []).length;
        const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length +
            (content.match(/!\[\[.*?\]\]/g) || []).length;
        const tableCount = lines.filter((line) => line.includes('|') && line.trim().length > 0).length > 0 ? 1 : 0;
        // Link analysis
        const wikiLinks = this.extractWikiLinks(content);
        const markdownLinks = this.extractMarkdownLinks(content);
        const outgoingLinks = [...wikiLinks, ...markdownLinks];
        // Content type detection
        const contentTypes = this.detectContentTypes(content);
        // Extract tags from frontmatter and content
        const frontmatterTags = yamlParser.extractTags(frontmatterResult.frontmatter);
        const contentTags = this.extractContentTags(content);
        const allTags = this.mergeAndInheritTags([...frontmatterTags, ...contentTags]);
        return {
            path: fileInfo.path || '',
            title: this.extractTitle(fileInfo.path || '', content, frontmatterResult.frontmatter),
            created: fileInfo.ctime || Date.now(),
            modified: fileInfo.mtime || Date.now(),
            size: fileInfo.size || content.length,
            tags: allTags,
            frontmatter: frontmatterResult.frontmatter,
            wordCount,
            linkCount: outgoingLinks.length,
            backlinksCount: 0, // Will be populated by relationship analysis
            headingCount,
            taskCount,
            completedTaskCount,
            codeBlockCount,
            imageCount,
            tableCount,
            outgoingLinks,
            incomingLinks: [], // Will be populated by relationship analysis
            contentTypes,
        };
    }
    /**
     * Process note content into enhanced structure
     */
    async processNoteContent(note, filePath, options) {
        const frontmatterResult = yamlParser.extractFrontmatter(note.content);
        let metadata;
        if (options.includeMetadata) {
            metadata = this.extractFileMetadata({ path: filePath, ctime: note.ctime, mtime: note.mtime, size: note.size }, note.content, frontmatterResult);
        }
        let structure;
        if (options.includeStructure) {
            structure = this.extractNoteStructure(note.content);
        }
        return {
            path: filePath,
            content: options.includeContent ? note.content : '',
            frontmatter: options.includeFrontmatter ? frontmatterResult.frontmatter : {},
            metadata: metadata || {},
            structure: structure || { headings: [], links: [], tags: [], tasks: [] },
        };
    }
    /**
     * Extract note structure (headings, links, tags, tasks)
     */
    extractNoteStructure(content) {
        const lines = content.split('\n');
        const structure = {
            headings: [],
            links: [],
            tags: [],
            tasks: [],
        };
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            // Extract headings
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                structure.headings.push({
                    level: headingMatch[1].length,
                    text: headingMatch[2].trim(),
                    line: lineNumber,
                });
            }
            // Extract wiki links
            const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
            let wikiMatch;
            while ((wikiMatch = wikiLinkRegex.exec(line)) !== null) {
                const [, target] = wikiMatch;
                const [linkTarget, displayText] = target.split('|');
                structure.links.push({
                    type: 'wiki',
                    text: displayText || linkTarget,
                    target: linkTarget.trim(),
                    line: lineNumber,
                });
            }
            // Extract markdown links
            const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
            let markdownMatch;
            while ((markdownMatch = markdownLinkRegex.exec(line)) !== null) {
                const [, text, target] = markdownMatch;
                structure.links.push({
                    type: 'markdown',
                    text: text.trim(),
                    target: target.trim(),
                    line: lineNumber,
                });
            }
            // Extract inline tags
            const tagRegex = /#([a-zA-Z0-9_\-/]+)/g;
            let tagMatch;
            while ((tagMatch = tagRegex.exec(line)) !== null) {
                const tag = tagMatch[1];
                structure.tags.push({
                    tag,
                    line: lineNumber,
                    inherited: false,
                });
            }
            // Extract tasks
            const taskMatch = line.match(/^[\s]*[-*+]\s+\[([ xX])\]\s+(.+)$/);
            if (taskMatch) {
                structure.tasks.push({
                    text: taskMatch[2].trim(),
                    completed: taskMatch[1].toLowerCase() === 'x',
                    line: lineNumber,
                });
            }
        }
        return structure;
    }
    /**
     * Calculate accurate word count
     */
    calculateWordCount(content) {
        const cleanContent = content
            .replace(/!\[\[.*?\]\]/g, '') // Remove embeds
            .replace(/\[\[.*?\]\]/g, '') // Remove wiki links
            .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
            .replace(/^#{1,6}\s+/gm, '') // Remove headings
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`.*?`/g, '') // Remove inline code
            .replace(/^[\s]*[-*+]\s+/gm, '') // Remove list markers
            .replace(/^[\s]*\d+\.\s+/gm, '') // Remove numbered list markers
            .replace(/^>\s+/gm, '') // Remove blockquotes
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
            .replace(/---\n[\s\S]*?\n---/g, '') // Remove frontmatter
            .trim();
        const words = cleanContent.split(/\s+/).filter(word => word.length > 0);
        return words.length;
    }
    /**
     * Extract wiki links from content
     */
    extractWikiLinks(content) {
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        const links = [];
        let match;
        while ((match = wikiLinkRegex.exec(content)) !== null) {
            const [, target] = match;
            const [linkTarget] = target.split('|'); // Remove display text
            links.push(linkTarget.trim());
        }
        return links;
    }
    /**
     * Extract markdown links from content
     */
    extractMarkdownLinks(content) {
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const links = [];
        let match;
        while ((match = markdownLinkRegex.exec(content)) !== null) {
            const [, , target] = match;
            links.push(target.trim());
        }
        return links;
    }
    /**
     * Extract tags from content (not frontmatter)
     */
    extractContentTags(content) {
        const tagRegex = /#([a-zA-Z0-9_\-/]+)/g;
        const tags = [];
        let match;
        while ((match = tagRegex.exec(content)) !== null) {
            tags.push(match[1]);
        }
        return [...new Set(tags)]; // Remove duplicates
    }
    /**
     * Merge tags and handle inheritance for nested tags
     */
    mergeAndInheritTags(tags) {
        const allTags = new Set();
        for (const tag of tags) {
            allTags.add(tag);
            // Add parent tags for nested tags (e.g., "research/ai" adds "research")
            const parts = tag.split('/');
            for (let i = 1; i < parts.length; i++) {
                const parentTag = parts.slice(0, i).join('/');
                allTags.add(parentTag);
            }
        }
        return Array.from(allTags).sort();
    }
    /**
     * Detect content types in the document
     */
    detectContentTypes(content) {
        const types = new Set();
        if (/```[\s\S]*?```/.test(content))
            types.add('code');
        if (/^[\s]*[-*+]\s+/m.test(content) || /^[\s]*\d+\.\s+/m.test(content))
            types.add('list');
        if (/\|.*\|/.test(content))
            types.add('table');
        if (/\[\[.*?\]\]|\[.*?\]\(.*?\)/.test(content))
            types.add('link');
        if (/!\[\[.*?\]\]/.test(content))
            types.add('embed');
        if (/^[\s]*[-*+]\s+\[[ xX]\]/.test(content))
            types.add('task');
        if (/^>\s+/m.test(content))
            types.add('quote');
        // Always include text if there's any content
        if (content.trim().length > 0)
            types.add('text');
        return Array.from(types);
    }
    /**
     * Extract title from various sources
     */
    extractTitle(filePath, content, frontmatter) {
        // 1. Check frontmatter for title
        if (frontmatter.title && typeof frontmatter.title === 'string') {
            return frontmatter.title.trim();
        }
        // 2. Check for first heading
        const headingMatch = content.match(/^#\s+(.+)$/m);
        if (headingMatch) {
            return headingMatch[1].trim();
        }
        // 3. Use filename without extension
        const fileName = path.basename(filePath, path.extname(filePath));
        // 4. Handle Unicode file names properly
        try {
            return decodeURIComponent(fileName);
        }
        catch {
            return fileName;
        }
    }
    /**
     * Update file with proper Unicode handling
     */
    async updateFile(filePath, content) {
        try {
            // Ensure proper Unicode encoding
            const normalizedPath = this.normalizeUnicodePath(filePath);
            await errorHandler.withResilience('obsidian-update-file', () => obsidianAPI.updateFileContent(normalizedPath, content), { maxAttempts: 3, baseDelay: 1000 }, { failureThreshold: 5, recoveryTimeout: 30000 });
            // Invalidate cache for this file
            smartCache.invalidateFile(filePath);
        }
        catch (error) {
            const enhancedError = errorHandler.createEnhancedError(error instanceof Error ? error : new Error(String(error)), `Failed to update file: ${filePath}`, ErrorSuggestions.FILE_ACCESS);
            logger.error('Failed to update file', {
                path: filePath,
                error: enhancedError.message,
            });
            throw enhancedError;
        }
    }
    /**
     * Normalize Unicode file paths for proper handling
     */
    normalizeUnicodePath(filePath) {
        try {
            // Normalize Unicode characters (NFC normalization)
            return filePath.normalize('NFC');
        }
        catch (error) {
            logger.warn('Failed to normalize Unicode path', {
                path: filePath,
                error: error instanceof Error ? error.message : String(error),
            });
            return filePath;
        }
    }
    /**
     * Extract backlink context from referring file
     */
    async extractBacklinkContext(referencingFile, targetFile, contextWindow = 2) {
        try {
            const note = await this.readSingleNote(referencingFile, {
                includeContent: true,
                useCache: true
            });
            if (!note) {
                return [];
            }
            const lines = note.content.split('\n');
            const contexts = [];
            const targetBasename = path.basename(targetFile, path.extname(targetFile));
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Check for wiki link or markdown link to target
                if (line.includes(`[[${targetBasename}]]`) ||
                    line.includes(`[[${targetFile}]]`) ||
                    line.includes(`](${targetFile})`)) {
                    const start = Math.max(0, i - contextWindow);
                    const end = Math.min(lines.length, i + contextWindow + 1);
                    const context = lines.slice(start, end).join('\n').trim();
                    if (context) {
                        contexts.push(context);
                    }
                }
            }
            return contexts;
        }
        catch (error) {
            logger.debug('Failed to extract backlink context', {
                referencingFile,
                targetFile,
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }
}
export const fileOperationsManager = new FileOperationsManager();
