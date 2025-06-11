import { obsidianAPI } from '../../integrations/obsidian-api.js';
import { cache } from '../../core/cache.js';
import { logger } from '../../core/logger.js';
export class BacklinkIndexManager {
    index = null;
    CACHE_DURATION = 300000; // 5 minutes
    INDEX_KEY = 'backlink-index';
    buildingPromise = null;
    /**
     * Get backlinks for a target path with O(1) lookup
     */
    async getBacklinks(targetPath) {
        const index = await this.ensureIndexExists();
        const normalizedTarget = this.normalizeLinkPath(targetPath);
        // Try exact match first
        let backlinks = index.backLinks.get(normalizedTarget);
        // If no exact match, try basename matching
        if (!backlinks || backlinks.size === 0) {
            const targetBasename = this.extractBasename(normalizedTarget);
            for (const [indexedPath, links] of index.backLinks.entries()) {
                if (this.extractBasename(indexedPath) === targetBasename) {
                    backlinks = links;
                    break;
                }
            }
        }
        return backlinks ? Array.from(backlinks) : [];
    }
    /**
     * Get forward links (outgoing links) for a source path
     */
    async getForwardLinks(sourcePath) {
        const index = await this.ensureIndexExists();
        const normalizedSource = this.normalizeLinkPath(sourcePath);
        const forwardLinks = index.forwardLinks.get(normalizedSource);
        return forwardLinks ? Array.from(forwardLinks) : [];
    }
    /**
     * Get detailed backlink relationships with context
     */
    async getBacklinkRelationships(targetPath) {
        const backlinks = await this.getBacklinks(targetPath);
        const relationships = [];
        // For each backlink, get the context
        for (const sourcePath of backlinks) {
            try {
                const content = await obsidianAPI.getFileContent(sourcePath);
                const contexts = this.extractLinkContexts(content, targetPath);
                if (contexts.length > 0) {
                    relationships.push({
                        source: sourcePath,
                        target: targetPath,
                        contexts
                    });
                }
            }
            catch (error) {
                logger.debug(`Failed to get context for backlink ${sourcePath} -> ${targetPath}`, { error });
            }
        }
        return relationships;
    }
    /**
     * Get tags for a specific file with context
     */
    async getTags(filePath) {
        const index = await this.ensureIndexExists();
        const normalizedPath = this.normalizeLinkPath(filePath);
        const tags = index.tagIndex.get(normalizedPath);
        if (!tags || tags.size === 0) {
            return null;
        }
        try {
            const content = await obsidianAPI.getFileContent(filePath);
            const contexts = this.extractTagContexts(content, Array.from(tags));
            return {
                filePath,
                tags: Array.from(tags),
                contexts
            };
        }
        catch (error) {
            logger.debug(`Failed to get tag context for file ${filePath}`, { error });
            return {
                filePath,
                tags: Array.from(tags),
                contexts: []
            };
        }
    }
    /**
     * Find unlinked mentions of a target file across the vault
     */
    async findMentions(targetPath) {
        const index = await this.ensureIndexExists();
        const targetBasename = this.extractBasename(targetPath);
        const mentions = [];
        // Get all files except the target itself
        const allFiles = Array.from(index.forwardLinks.keys());
        for (const sourcePath of allFiles) {
            if (sourcePath === targetPath)
                continue;
            try {
                const content = await obsidianAPI.getFileContent(sourcePath);
                const mentionContexts = this.extractMentionContexts(content, targetPath, targetBasename);
                if (mentionContexts.length > 0) {
                    mentions.push({
                        source: sourcePath,
                        target: targetPath,
                        contexts: mentionContexts
                    });
                }
            }
            catch (error) {
                logger.debug(`Failed to check mentions in file ${sourcePath}`, { error });
            }
        }
        return mentions;
    }
    /**
     * Get embed relationships for a specific file
     */
    async getEmbeds(filePath) {
        const index = await this.ensureIndexExists();
        const normalizedPath = this.normalizeLinkPath(filePath);
        const embeds = index.embedLinks.get(normalizedPath);
        if (!embeds || embeds.size === 0) {
            return [];
        }
        const embedRelationships = [];
        try {
            const content = await obsidianAPI.getFileContent(filePath);
            for (const targetPath of embeds) {
                const contexts = this.extractEmbedContexts(content, targetPath);
                if (contexts.length > 0) {
                    embedRelationships.push({
                        source: filePath,
                        target: targetPath,
                        contexts
                    });
                }
            }
        }
        catch (error) {
            logger.debug(`Failed to get embed context for file ${filePath}`, { error });
        }
        return embedRelationships;
    }
    /**
     * Rebuild the entire backlink index
     */
    async rebuildIndex() {
        const startTime = Date.now();
        logger.info('Starting backlink index rebuild');
        // Prevent multiple concurrent builds
        if (this.buildingPromise) {
            logger.debug('Index build already in progress, waiting...');
            return this.buildingPromise;
        }
        this.buildingPromise = this.buildIndexInternal();
        try {
            const newIndex = await this.buildingPromise;
            this.index = newIndex;
            // Cache the index
            await cache.set(this.INDEX_KEY, newIndex, this.CACHE_DURATION, ['vault-files']);
            const duration = Date.now() - startTime;
            logger.info('Backlink index rebuild complete', {
                duration,
                totalFiles: newIndex.totalFiles,
                totalLinks: newIndex.totalLinks,
                avgLinksPerFile: newIndex.totalFiles > 0 ? Math.round(newIndex.totalLinks / newIndex.totalFiles * 100) / 100 : 0
            });
            return newIndex;
        }
        finally {
            this.buildingPromise = null;
        }
    }
    /**
     * Check if index needs updating and rebuild if necessary
     */
    async ensureIndexExists() {
        // Try to get cached index first
        if (!this.index) {
            const cached = await cache.get(this.INDEX_KEY);
            if (cached && Date.now() - cached.lastUpdated < this.CACHE_DURATION) {
                this.index = cached;
                logger.debug('Loaded backlink index from cache');
            }
        }
        // Check if index exists and is recent
        if (this.index && Date.now() - this.index.lastUpdated < this.CACHE_DURATION) {
            return this.index;
        }
        // Rebuild index
        return this.rebuildIndex();
    }
    /**
     * Internal method to build the index
     */
    async buildIndexInternal() {
        const forwardLinks = new Map();
        const backLinks = new Map();
        const embedLinks = new Map();
        const tagIndex = new Map();
        try {
            // Get all markdown files
            const allFiles = await obsidianAPI.listFiles(undefined, true);
            const markdownFiles = allFiles.filter(f => !f.isFolder && f.path.endsWith('.md'));
            logger.info(`Building backlink index for ${markdownFiles.length} files`);
            let totalLinks = 0;
            let totalEmbeds = 0;
            let totalTags = 0;
            let processedFiles = 0;
            const BATCH_SIZE = 20;
            // Process files in batches to avoid overwhelming the system
            for (let i = 0; i < markdownFiles.length; i += BATCH_SIZE) {
                const batch = markdownFiles.slice(i, i + BATCH_SIZE);
                const batchPromises = batch.map(async (file) => {
                    try {
                        const content = await obsidianAPI.getFileContent(file.path);
                        const links = this.extractAllLinks(content);
                        const embeds = this.extractAllEmbeds(content);
                        const tags = this.extractAllTags(content);
                        if (links.length > 0) {
                            // Update forward links
                            forwardLinks.set(file.path, new Set(links));
                            // Update backward links
                            for (const targetPath of links) {
                                const normalizedTarget = this.normalizeLinkPath(targetPath);
                                if (!backLinks.has(normalizedTarget)) {
                                    backLinks.set(normalizedTarget, new Set());
                                }
                                backLinks.get(normalizedTarget).add(file.path);
                            }
                            totalLinks += links.length;
                        }
                        if (embeds.length > 0) {
                            // Update embed links
                            embedLinks.set(file.path, new Set(embeds));
                            totalEmbeds += embeds.length;
                        }
                        if (tags.length > 0) {
                            // Update tag index
                            tagIndex.set(file.path, new Set(tags));
                            totalTags += tags.length;
                        }
                        return true;
                    }
                    catch (error) {
                        logger.debug(`Failed to process file for backlink index: ${file.path}`, { error });
                        return false;
                    }
                });
                const results = await Promise.allSettled(batchPromises);
                processedFiles += results.filter(r => r.status === 'fulfilled' && r.value).length;
                // Progress logging every 100 files
                if (processedFiles % 100 === 0) {
                    logger.debug(`Backlink index progress: ${processedFiles}/${markdownFiles.length} files processed`);
                }
                // Small delay between batches to prevent overwhelming
                if (i + BATCH_SIZE < markdownFiles.length) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            const index = {
                forwardLinks,
                backLinks,
                embedLinks,
                tagIndex,
                lastUpdated: Date.now(),
                totalFiles: markdownFiles.length,
                totalLinks,
                totalEmbeds,
                totalTags
            };
            logger.info('Backlink index build complete', {
                processedFiles,
                totalFiles: markdownFiles.length,
                totalLinks,
                totalEmbeds,
                totalTags,
                uniqueTargets: backLinks.size
            });
            return index;
        }
        catch (error) {
            logger.error('Failed to build backlink index', { error });
            throw error;
        }
    }
    /**
     * Extract all links from content (excluding embeds)
     */
    extractAllLinks(content) {
        const links = new Set();
        // Extract wiki links [[filename]] or [[filename|alias]] (but not embeds)
        const wikiLinkRegex = /(?<!!)\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;
        let match;
        while ((match = wikiLinkRegex.exec(content)) !== null) {
            const linkText = match[1].trim();
            const normalizedLink = this.normalizeLinkPath(linkText);
            links.add(normalizedLink);
        }
        // Extract markdown links [text](filename.md)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        while ((match = markdownLinkRegex.exec(content)) !== null) {
            const linkPath = match[2].trim();
            // Only include internal links (not URLs)
            if (!linkPath.startsWith('http') && !linkPath.startsWith('mailto:')) {
                const normalizedLink = this.normalizeLinkPath(linkPath);
                links.add(normalizedLink);
            }
        }
        return Array.from(links);
    }
    /**
     * Extract all embeds from content
     */
    extractAllEmbeds(content) {
        const embeds = new Set();
        // Extract embeds ![[filename]]
        const embedRegex = /!\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;
        let match;
        while ((match = embedRegex.exec(content)) !== null) {
            const linkText = match[1].trim();
            const normalizedLink = this.normalizeLinkPath(linkText);
            embeds.add(normalizedLink);
        }
        return Array.from(embeds);
    }
    /**
     * Extract all tags from content
     */
    extractAllTags(content) {
        const tags = new Set();
        // Extract hashtags (including nested tags like #tag/subtag)
        const hashtagRegex = /#([a-zA-Z0-9_\/-]+)/g;
        let match;
        while ((match = hashtagRegex.exec(content)) !== null) {
            const tag = match[1].trim();
            tags.add(tag);
        }
        // Extract frontmatter tags
        const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            // Extract tags from frontmatter (both 'tags:' and 'tag:' formats)
            const tagMatches = frontmatter.match(/^\s*tags?:\s*(.*)$/gm);
            if (tagMatches) {
                for (const tagMatch of tagMatches) {
                    const tagLine = tagMatch.replace(/^\s*tags?:\s*/, '').trim();
                    // Handle different tag formats
                    if (tagLine.startsWith('[') && tagLine.endsWith(']')) {
                        // Array format: [tag1, tag2]
                        const arrayTags = tagLine.slice(1, -1).split(',').map(t => t.trim().replace(/["']/g, ''));
                        arrayTags.forEach(tag => tag && tags.add(tag));
                    }
                    else {
                        // Space or comma separated
                        const spaceTags = tagLine.split(/[,\s]+/).map(t => t.trim().replace(/["']/g, ''));
                        spaceTags.forEach(tag => tag && tags.add(tag));
                    }
                }
            }
        }
        return Array.from(tags);
    }
    /**
     * Extract link contexts (the surrounding text for each link)
     */
    extractLinkContexts(content, targetPath) {
        const contexts = [];
        const lines = content.split('\n');
        const targetBasename = this.extractBasename(targetPath);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check for wiki links
            const wikiLinkRegex = new RegExp(`\\[\\[([^\\]|]*${targetBasename}[^\\]|]*)([|]([^\\]]+))?\\]\\]`, 'gi');
            if (wikiLinkRegex.test(line)) {
                contexts.push({
                    line: i + 1,
                    text: line.trim(),
                    linkType: 'wikilink'
                });
            }
            // Check for embeds
            const embedRegex = new RegExp(`!\\[\\[([^\\]|]*${targetBasename}[^\\]|]*)([|]([^\\]]+))?\\]\\]`, 'gi');
            if (embedRegex.test(line)) {
                contexts.push({
                    line: i + 1,
                    text: line.trim(),
                    linkType: 'embed'
                });
            }
            // Check for markdown links
            if (line.includes(targetPath) || line.includes(targetBasename)) {
                const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                let match;
                while ((match = markdownLinkRegex.exec(line)) !== null) {
                    const linkPath = match[2].trim();
                    if (linkPath.includes(targetBasename) || linkPath === targetPath) {
                        contexts.push({
                            line: i + 1,
                            text: line.trim(),
                            linkType: 'markdown'
                        });
                    }
                }
            }
        }
        return contexts;
    }
    /**
     * Normalize link paths for consistent indexing
     */
    normalizeLinkPath(linkPath) {
        // Remove query parameters and fragments
        const cleanPath = linkPath.split('?')[0].split('#')[0].trim();
        // Add .md extension if not already present
        if (!cleanPath.endsWith('.md') && !cleanPath.includes('.')) {
            return cleanPath + '.md';
        }
        return cleanPath;
    }
    /**
     * Extract basename from path
     */
    extractBasename(path) {
        return path.split('/').pop()?.replace(/\.md$/, '') || path;
    }
    /**
     * Extract tag contexts from content
     */
    extractTagContexts(content, tags) {
        const contexts = [];
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check for hashtag occurrences
            for (const tag of tags) {
                const hashtagRegex = new RegExp(`#${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zA-Z0-9_/-])`, 'gi');
                if (hashtagRegex.test(line)) {
                    contexts.push({
                        line: i + 1,
                        text: line.trim(),
                        tag
                    });
                }
            }
        }
        // Check frontmatter for tags
        const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
        if (frontmatterMatch) {
            const frontmatterLines = frontmatterMatch[1].split('\n');
            for (let i = 0; i < frontmatterLines.length; i++) {
                const line = frontmatterLines[i];
                for (const tag of tags) {
                    if (line.includes(tag)) {
                        contexts.push({
                            line: i + 2, // +2 to account for opening ---
                            text: line.trim(),
                            tag
                        });
                    }
                }
            }
        }
        return contexts;
    }
    /**
     * Extract mention contexts (unlinked references)
     */
    extractMentionContexts(content, targetPath, targetBasename) {
        const contexts = [];
        const lines = content.split('\n');
        // Create regex to find mentions that are NOT already linked
        const basenameRegex = new RegExp(`\\b${targetBasename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip lines that already contain links to this file
            if (line.includes(`[[${targetBasename}]]`) ||
                line.includes(`[[${targetPath}]]`) ||
                line.includes(`[](${targetPath})`) ||
                line.includes(`![[${targetBasename}]]`) ||
                line.includes(`![[${targetPath}]]`)) {
                continue;
            }
            // Check for basename mentions
            if (basenameRegex.test(line)) {
                contexts.push({
                    line: i + 1,
                    text: line.trim(),
                    mentionType: 'basename'
                });
            }
        }
        return contexts;
    }
    /**
     * Extract embed contexts from content
     */
    extractEmbedContexts(content, targetPath) {
        const contexts = [];
        const lines = content.split('\n');
        const targetBasename = this.extractBasename(targetPath);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check for embeds
            const embedRegex = new RegExp(`!\\[\\[([^\\]|]*${targetBasename}[^\\]|]*)([|]([^\\]]+))?\\]\\]`, 'gi');
            let match;
            while ((match = embedRegex.exec(line)) !== null) {
                const embedPath = match[1].trim();
                let embedType = 'other';
                // Determine embed type based on file extension
                const extension = embedPath.split('.').pop()?.toLowerCase();
                if (extension) {
                    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
                        embedType = 'image';
                    }
                    else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
                        embedType = 'audio';
                    }
                    else if (['mp4', 'avi', 'mkv', 'mov', 'webm'].includes(extension)) {
                        embedType = 'video';
                    }
                    else if (extension === 'pdf') {
                        embedType = 'pdf';
                    }
                    else if (extension === 'md') {
                        embedType = 'note';
                    }
                }
                else {
                    // No extension, assume it's a note
                    embedType = 'note';
                }
                contexts.push({
                    line: i + 1,
                    text: line.trim(),
                    embedType
                });
            }
        }
        return contexts;
    }
    /**
     * Clear the index and cache
     */
    async clearIndex() {
        this.index = null;
        await cache.invalidate(this.INDEX_KEY);
        logger.info('Backlink index cleared');
    }
    /**
     * Get index statistics
     */
    getIndexStats() {
        if (!this.index) {
            return null;
        }
        return {
            exists: true,
            age: Date.now() - this.index.lastUpdated,
            totalFiles: this.index.totalFiles,
            totalLinks: this.index.totalLinks,
            totalEmbeds: this.index.totalEmbeds,
            totalTags: this.index.totalTags,
            avgLinksPerFile: this.index.totalFiles > 0 ?
                Math.round(this.index.totalLinks / this.index.totalFiles * 100) / 100 : 0,
            avgEmbedsPerFile: this.index.totalFiles > 0 ?
                Math.round(this.index.totalEmbeds / this.index.totalFiles * 100) / 100 : 0,
            avgTagsPerFile: this.index.totalFiles > 0 ?
                Math.round(this.index.totalTags / this.index.totalFiles * 100) / 100 : 0
        };
    }
}
export const backlinkIndex = new BacklinkIndexManager();
