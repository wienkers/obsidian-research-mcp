import { obsidianAPI } from '../../integrations/obsidian-api.js';
import { logger, logPerformance } from '../../core/logger.js';
export class LinkUpdater {
    /**
     * Comprehensive regex patterns for all Obsidian link types
     */
    linkPatterns = {
        // Wiki links: [[file]], [[file|alias]], [[file#section]], [[file#^block]], [[path/file#section|alias]]
        wikiLink: /\[\[([^\]]+?)\]\]/g,
        // Embeds: ![[file]], ![[file#section]], ![[path/file#section]]
        embed: /!\[\[([^\]]+?)\]\]/g,
        // Markdown links: [text](file.md), [text](path/file.md#section)
        markdown: /\[([^\]]+?)\]\(([^)]+?)\)/g,
    };
    async updateLinks(options) {
        return logPerformance('update-links', async () => {
            logger.info('Moving file and updating links', options);
            const result = {
                success: true,
                filesUpdated: 0,
                linksUpdated: 0,
                updatedFiles: [],
                errors: [],
                summary: '',
            };
            try {
                // STEP 1: Perform the actual file move
                await obsidianAPI.moveFile(options.oldPath, options.newPath);
                // STEP 2: Update backlinks in other files
                if (options.updateBacklinks) {
                    await this.updateBacklinks(options, result);
                }
                // STEP 3: Update forward links within the moved file
                await this.updateForwardLinks(options, result);
                result.summary = this.generateSummary(result);
            }
            catch (error) {
                result.success = false;
                result.errors.push({
                    file: 'general',
                    error: error instanceof Error ? error.message : String(error)
                });
                logger.error('Move and link update failed', { error, options });
            }
            return result;
        });
    }
    async updateBacklinks(options, result) {
        // Find all files that might link to the old path
        const allFiles = await obsidianAPI.listFiles(undefined, true);
        const markdownFiles = allFiles
            .filter(file => !file.isFolder && file.path.endsWith('.md'))
            .map(file => file.path);
        const oldBasename = this.getBasename(options.oldPath);
        const newBasename = this.getBasename(options.newPath);
        for (const filePath of markdownFiles) {
            if (filePath === options.oldPath || filePath === options.newPath) {
                continue; // Skip the moved file itself
            }
            try {
                const content = await obsidianAPI.getFileContent(filePath);
                const linkMatches = this.findLinksToFile(content, oldBasename, options.oldPath, newBasename, options.newPath);
                if (linkMatches.length > 0) {
                    const updatedContent = this.replaceLinks(content, linkMatches);
                    if (updatedContent !== content) {
                        await obsidianAPI.updateFileContent(filePath, updatedContent);
                        result.filesUpdated++;
                        result.linksUpdated += linkMatches.length;
                        result.updatedFiles.push(filePath);
                        logger.debug(`Updated ${linkMatches.length} links in ${filePath}`);
                    }
                }
            }
            catch (error) {
                result.errors.push({
                    file: filePath,
                    error: `Failed to update links: ${error instanceof Error ? error.message : String(error)}`
                });
                logger.warn(`Failed to update links in ${filePath}`, { error });
            }
        }
    }
    async updateForwardLinks(options, result) {
        // If the file was moved to a different folder, we need to update relative links within it
        const oldDir = this.getDirectory(options.oldPath);
        const newDir = this.getDirectory(options.newPath);
        if (oldDir === newDir) {
            return; // No need to update if staying in same directory
        }
        try {
            // Read from NEW path since file has been moved
            const content = await obsidianAPI.getFileContent(options.newPath);
            const relativeLinks = this.findRelativeLinks(content);
            if (relativeLinks.length > 0) {
                const updatedContent = this.updateRelativeLinks(content, relativeLinks, oldDir, newDir);
                if (updatedContent !== content) {
                    await obsidianAPI.updateFileContent(options.newPath, updatedContent);
                    result.linksUpdated += relativeLinks.length;
                    if (!result.updatedFiles.includes(options.newPath)) {
                        result.filesUpdated++;
                        result.updatedFiles.push(options.newPath);
                    }
                    logger.debug(`Updated ${relativeLinks.length} relative links in moved file`);
                }
            }
        }
        catch (error) {
            result.errors.push({
                file: options.newPath,
                error: `Failed to update internal links: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    /**
     * Parse a link string into its components
     */
    parseLink(linkContent, isEmbed = false, startIndex = 0) {
        // Split on | to separate alias
        const [mainPart, alias] = linkContent.split('|').map(part => part.trim());
        // Split on # to separate file path from section/block
        const hashIndex = mainPart.indexOf('#');
        let filePath;
        let section;
        let blockId;
        if (hashIndex === -1) {
            // No section or block reference
            filePath = mainPart;
        }
        else {
            filePath = mainPart.substring(0, hashIndex);
            const afterHash = mainPart.substring(hashIndex + 1);
            if (afterHash.startsWith('^')) {
                // Block reference
                blockId = afterHash.substring(1);
            }
            else {
                // Section reference
                section = afterHash;
            }
        }
        return {
            type: isEmbed ? 'embed' : 'wikilink',
            fullMatch: linkContent,
            filePath: filePath.trim(),
            section,
            blockId,
            alias,
            isEmbed,
            startIndex,
        };
    }
    /**
     * Parse markdown link into components
     */
    parseMarkdownLink(linkText, linkTarget, startIndex = 0) {
        // Handle sections in markdown links
        const hashIndex = linkTarget.indexOf('#');
        let filePath;
        let section;
        if (hashIndex === -1) {
            filePath = linkTarget;
        }
        else {
            filePath = linkTarget.substring(0, hashIndex);
            section = linkTarget.substring(hashIndex + 1);
        }
        return {
            type: 'markdown',
            fullMatch: linkTarget,
            filePath: filePath.trim(),
            section,
            alias: linkText,
            isEmbed: false,
            startIndex,
        };
    }
    /**
     * Check if a parsed link points to the target file
     */
    isLinkToTargetFile(parsedLink, targetBasename, targetPath) {
        const linkFilePath = parsedLink.filePath;
        // Remove .md extension for comparison
        const linkWithoutExt = linkFilePath.replace(/\.md$/, '');
        const targetWithoutExt = targetBasename.replace(/\.md$/, '');
        const targetPathWithoutExt = targetPath.replace(/\.md$/, '');
        // Direct basename match (most common case)
        if (linkWithoutExt === targetWithoutExt) {
            return true;
        }
        // Full path match
        if (linkWithoutExt === targetPathWithoutExt) {
            return true;
        }
        // Check if link is a relative path that matches target
        // Handle cases like "Folder/Note" matching "Folder/Note.md"
        if (linkFilePath === targetPath || linkWithoutExt === targetPathWithoutExt) {
            return true;
        }
        // Check if the link contains the target as a basename
        // This handles cases where the link has a different path structure
        const linkBasename = linkFilePath.split('/').pop()?.replace(/\.md$/, '') || '';
        if (linkBasename === targetWithoutExt) {
            return true;
        }
        return false;
    }
    /**
     * Create replacement text for a parsed link
     */
    createReplacement(parsedLink, newBasename, newPath) {
        // Determine the new file reference
        let newFileRef;
        if (parsedLink.type === 'markdown') {
            // For markdown links, keep the .md extension
            newFileRef = newBasename;
        }
        else {
            // For wiki links and embeds, remove .md extension
            newFileRef = newBasename.replace(/\.md$/, '');
        }
        // Preserve directory structure if the original link had it
        if (parsedLink.filePath.includes('/')) {
            // The original link had a path, we might want to preserve the relative structure
            // For now, just use the new basename, but this could be enhanced
            // to maintain relative path relationships
            newFileRef = newFileRef;
        }
        // Build the replacement
        let replacement;
        if (parsedLink.type === 'markdown') {
            // Markdown link: [alias](file.md#section)
            let target = newFileRef;
            if (parsedLink.section) {
                target += `#${parsedLink.section}`;
            }
            replacement = `[${parsedLink.alias || newFileRef}](${target})`;
        }
        else {
            // Wiki link or embed: [[file#section|alias]] or ![[file#section]]
            let target = newFileRef;
            if (parsedLink.section) {
                target += `#${parsedLink.section}`;
            }
            else if (parsedLink.blockId) {
                target += `#^${parsedLink.blockId}`;
            }
            if (parsedLink.alias) {
                target += `|${parsedLink.alias}`;
            }
            if (parsedLink.isEmbed) {
                replacement = `![[${target}]]`;
            }
            else {
                replacement = `[[${target}]]`;
            }
        }
        return replacement;
    }
    /**
     * Find all links to a target file in content using comprehensive parsing
     */
    findLinksToFile(content, targetBasename, targetPath, newBasename, newPath) {
        const matches = [];
        // Find wiki links
        this.linkPatterns.wikiLink.lastIndex = 0;
        let match;
        while ((match = this.linkPatterns.wikiLink.exec(content)) !== null) {
            const parsedLink = this.parseLink(match[1], false, match.index);
            if (this.isLinkToTargetFile(parsedLink, targetBasename, targetPath)) {
                const replacement = this.createReplacement(parsedLink, newBasename, newPath);
                matches.push({
                    ...parsedLink,
                    original: match[0],
                    replacement,
                    linkText: parsedLink.filePath,
                });
            }
        }
        // Find embeds
        this.linkPatterns.embed.lastIndex = 0;
        while ((match = this.linkPatterns.embed.exec(content)) !== null) {
            const parsedLink = this.parseLink(match[1], true, match.index);
            if (this.isLinkToTargetFile(parsedLink, targetBasename, targetPath)) {
                const replacement = this.createReplacement(parsedLink, newBasename, newPath);
                matches.push({
                    ...parsedLink,
                    original: match[0],
                    replacement,
                    linkText: parsedLink.filePath,
                });
            }
        }
        // Find markdown links
        this.linkPatterns.markdown.lastIndex = 0;
        while ((match = this.linkPatterns.markdown.exec(content)) !== null) {
            const linkText = match[1];
            const linkTarget = match[2];
            const parsedLink = this.parseMarkdownLink(linkText, linkTarget, match.index);
            // Skip URLs and external links
            if (linkTarget.startsWith('http') || linkTarget.startsWith('mailto:') || linkTarget.includes('://')) {
                continue;
            }
            if (this.isLinkToTargetFile(parsedLink, targetBasename, targetPath)) {
                const replacement = this.createReplacement(parsedLink, newBasename, newPath);
                matches.push({
                    ...parsedLink,
                    original: match[0],
                    replacement,
                    linkText: parsedLink.filePath,
                });
            }
        }
        return matches;
    }
    findRelativeLinks(content) {
        const matches = [];
        // Find relative markdown links [text](../folder/file.md)
        const relativeLinkRegex = /\[([^\]]+)\]\(([^)]*[./][^)]*)\)/g;
        let match;
        while ((match = relativeLinkRegex.exec(content)) !== null) {
            const linkText = match[1];
            const linkTarget = match[2];
            if (linkTarget.includes('/') || linkTarget.startsWith('./') || linkTarget.startsWith('../')) {
                const parsedLink = this.parseMarkdownLink(linkText, linkTarget, match.index);
                matches.push({
                    ...parsedLink,
                    original: match[0],
                    replacement: '', // Will be calculated based on new path
                    linkText: linkTarget,
                });
            }
        }
        return matches;
    }
    replaceLinks(content, matches) {
        let updatedContent = content;
        // Sort matches by position (descending) to avoid position shifts during replacement
        const sortedMatches = matches.sort((a, b) => b.startIndex - a.startIndex);
        for (const match of sortedMatches) {
            updatedContent = updatedContent.replace(match.original, match.replacement);
        }
        return updatedContent;
    }
    updateRelativeLinks(content, matches, oldDir, newDir) {
        let updatedContent = content;
        for (const match of matches) {
            // Calculate new relative path
            const oldRelativePath = match.linkText;
            const newRelativePath = this.adjustRelativePath(oldRelativePath, oldDir, newDir);
            const newLink = match.original.replace(oldRelativePath, newRelativePath);
            updatedContent = updatedContent.replace(match.original, newLink);
        }
        return updatedContent;
    }
    adjustRelativePath(relativePath, oldDir, newDir) {
        // This is a simplified implementation
        // In a full implementation, you'd need proper path resolution
        // Count directory levels difference
        const oldDepth = oldDir.split('/').filter(p => p).length;
        const newDepth = newDir.split('/').filter(p => p).length;
        if (oldDepth === newDepth) {
            return relativePath; // Same depth, no change needed
        }
        // Add or remove ../ based on depth difference
        if (newDepth > oldDepth) {
            // Moved deeper, need more ../
            const additionalLevels = '../'.repeat(newDepth - oldDepth);
            return additionalLevels + relativePath.replace(/^\.\//, '');
        }
        else {
            // Moved shallower, need fewer ../
            const levelsToRemove = oldDepth - newDepth;
            return relativePath.replace(new RegExp(`^(${'../'.repeat(levelsToRemove)})`), '');
        }
    }
    getBasename(path) {
        return path.split('/').pop() || path;
    }
    getDirectory(path) {
        const parts = path.split('/');
        return parts.slice(0, -1).join('/');
    }
    generateSummary(result) {
        let summary = `Link update completed:\n`;
        summary += `- ${result.filesUpdated} files updated\n`;
        summary += `- ${result.linksUpdated} links updated\n`;
        if (result.errors.length > 0) {
            summary += `- ${result.errors.length} errors occurred\n`;
        }
        if (result.updatedFiles.length > 0) {
            summary += `\nUpdated files:\n`;
            result.updatedFiles.forEach(file => {
                summary += `  - ${file}\n`;
            });
        }
        if (result.errors.length > 0) {
            summary += `\nErrors:\n`;
            result.errors.forEach(error => {
                summary += `  - ${error.file}: ${error.error}\n`;
            });
        }
        return summary;
    }
    async previewLinkUpdates(options) {
        // This would implement a dry-run version that shows what would be changed
        // For brevity, returning a placeholder
        return {
            success: true,
            filesUpdated: 0,
            linksUpdated: 0,
            updatedFiles: [],
            errors: [],
            summary: 'Preview functionality not yet implemented',
        };
    }
}
export const linkUpdater = new LinkUpdater();
