import { logger } from '../../core/logger.js';
export class ContentChunker {
    defaultOptions = {
        minLength: 100,
        maxLength: 2000,
        overlapLength: 200,
        preserveBoundaries: true,
        includeContext: true,
        contextWindow: 512
    };
    /**
     * Main chunking method that preserves semantic boundaries while maintaining context
     */
    chunk(content, path, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        logger.debug('Starting semantic chunking', {
            path,
            contentLength: content.length,
            options: config
        });
        // Step 1: Identify semantic units
        const semanticUnits = this.identifySemanticUnits(content);
        // Step 2: Build heading hierarchy
        const headingHierarchy = this.buildHeadingHierarchy(content);
        // Step 3: Create chunks with context
        const chunks = this.createChunksWithContext(content, semanticUnits, headingHierarchy, path, config);
        // Step 4: Post-process chunks (merge small, split large)
        const processedChunks = this.postProcessChunks(chunks, config);
        logger.debug('Chunking complete', {
            path,
            originalUnits: semanticUnits.length,
            finalChunks: processedChunks.length,
            avgChunkSize: processedChunks.reduce((sum, c) => sum + c.content.length, 0) / processedChunks.length
        });
        return processedChunks;
    }
    /**
     * Identify semantic units in the content
     */
    identifySemanticUnits(content) {
        const units = [];
        const lines = content.split('\n');
        let currentIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineStart = currentIndex;
            const lineEnd = currentIndex + line.length;
            // Heading (section boundary)
            if (/^#{1,6}\s+/.test(line)) {
                // Find the end of this section (next heading of same or higher level or end of document)
                const currentLevel = line.match(/^(#{1,6})/)?.[1].length || 1;
                let sectionEnd = content.length;
                let endLine = lines.length - 1;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    const nextHeadingMatch = nextLine.match(/^(#{1,6})\s+/);
                    if (nextHeadingMatch) {
                        const nextLevel = nextHeadingMatch[1].length;
                        if (nextLevel <= currentLevel) {
                            // Calculate position of this next heading
                            sectionEnd = content.split('\n').slice(0, j).join('\n').length;
                            if (j > 0)
                                sectionEnd += 1; // Add newline
                            endLine = j - 1;
                            break;
                        }
                    }
                }
                units.push({
                    type: 'section',
                    start: lineStart,
                    end: sectionEnd,
                    startLine: i,
                    endLine
                });
            }
            // Code blocks
            else if (line.startsWith('```')) {
                let blockEnd = lineEnd;
                let endLineNum = i;
                // Find the closing ```
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    const nextLineStart = blockEnd + 1; // +1 for newline
                    blockEnd = nextLineStart + nextLine.length;
                    if (nextLine.startsWith('```')) {
                        endLineNum = j;
                        break;
                    }
                }
                units.push({
                    type: 'codeblock',
                    start: lineStart,
                    end: blockEnd,
                    startLine: i,
                    endLine: endLineNum
                });
                i = endLineNum; // Skip to end of code block
            }
            // Lists (consecutive list items)
            else if (/^(\s*[-*+]\s+|\s*\d+\.\s+)/.test(line)) {
                const listStart = lineStart;
                let listEnd = lineEnd;
                let endLineNum = i;
                // Continue until we find a non-list line
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    // Empty line or continuation of list
                    if (nextLine.trim() === '' || /^(\s*[-*+]\s+|\s*\d+\.\s+|\s{2,})/.test(nextLine)) {
                        const nextLineStart = listEnd + 1; // +1 for newline
                        listEnd = nextLineStart + nextLine.length;
                        endLineNum = j;
                    }
                    else {
                        break;
                    }
                }
                units.push({
                    type: 'list',
                    start: listStart,
                    end: listEnd,
                    startLine: i,
                    endLine: endLineNum
                });
                i = endLineNum; // Skip to end of list
            }
            // Quotes (blockquotes)
            else if (line.startsWith('>')) {
                const quoteStart = lineStart;
                let quoteEnd = lineEnd;
                let endLineNum = i;
                // Continue while lines start with > or are empty
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    if (nextLine.startsWith('>') || nextLine.trim() === '') {
                        const nextLineStart = quoteEnd + 1; // +1 for newline
                        quoteEnd = nextLineStart + nextLine.length;
                        endLineNum = j;
                    }
                    else {
                        break;
                    }
                }
                units.push({
                    type: 'quote',
                    start: quoteStart,
                    end: quoteEnd,
                    startLine: i,
                    endLine: endLineNum
                });
                i = endLineNum; // Skip to end of quote
            }
            // Tables
            else if (line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|')) {
                const tableStart = lineStart;
                let tableEnd = lineEnd;
                let endLineNum = i;
                // Continue while lines look like table rows
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    if ((nextLine.includes('|') && nextLine.trim().startsWith('|') && nextLine.trim().endsWith('|')) ||
                        nextLine.match(/^\s*[|:\-\s]+\s*$/)) { // Table separator line
                        const nextLineStart = tableEnd + 1; // +1 for newline
                        tableEnd = nextLineStart + nextLine.length;
                        endLineNum = j;
                    }
                    else {
                        break;
                    }
                }
                units.push({
                    type: 'table',
                    start: tableStart,
                    end: tableEnd,
                    startLine: i,
                    endLine: endLineNum
                });
                i = endLineNum; // Skip to end of table
            }
            // Regular paragraphs
            else if (line.trim() !== '') {
                const paragraphStart = lineStart;
                let paragraphEnd = lineEnd;
                let endLineNum = i;
                // Continue until empty line or special element
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    // Stop at empty line or special markdown elements
                    if (nextLine.trim() === '' ||
                        /^#{1,6}\s+/.test(nextLine) ||
                        nextLine.startsWith('```') ||
                        /^(\s*[-*+]\s+|\s*\d+\.\s+)/.test(nextLine) ||
                        nextLine.startsWith('>') ||
                        (nextLine.includes('|') && nextLine.trim().startsWith('|') && nextLine.trim().endsWith('|'))) {
                        break;
                    }
                    const nextLineStart = paragraphEnd + 1; // +1 for newline
                    paragraphEnd = nextLineStart + nextLine.length;
                    endLineNum = j;
                }
                units.push({
                    type: 'paragraph',
                    start: paragraphStart,
                    end: paragraphEnd,
                    startLine: i,
                    endLine: endLineNum
                });
                i = endLineNum; // Skip to end of paragraph
            }
            currentIndex = lineEnd + 1; // +1 for newline character
        }
        return units;
    }
    /**
     * Build heading hierarchy for context
     */
    buildHeadingHierarchy(content) {
        const hierarchy = [];
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                hierarchy.push({
                    level: headingMatch[1].length,
                    text: headingMatch[2].trim(),
                    line: i
                });
            }
        }
        return hierarchy;
    }
    /**
     * Create chunks with context preservation
     */
    createChunksWithContext(content, semanticUnits, headingHierarchy, path, config) {
        const chunks = [];
        for (let i = 0; i < semanticUnits.length; i++) {
            const unit = semanticUnits[i];
            const unitContent = content.slice(unit.start, unit.end);
            // Skip if too small and not preserving boundaries
            if (unitContent.trim().length < config.minLength && !config.preserveBoundaries) {
                continue;
            }
            // Build context
            const preceding = config.includeContext
                ? content.slice(Math.max(0, unit.start - config.contextWindow), unit.start)
                : '';
            const following = config.includeContext
                ? content.slice(unit.end, Math.min(content.length, unit.end + config.contextWindow))
                : '';
            // Find relevant headings for this chunk
            const relevantHeadings = headingHierarchy.filter(h => h.line <= unit.startLine).slice(-6); // Keep up to 6 levels of hierarchy
            // Create chunk
            const chunk = {
                id: `${path}:${unit.startLine}-${unit.endLine}`,
                content: unitContent,
                boundaries: {
                    start: {
                        line: unit.startLine,
                        column: 0,
                        type: unit.type
                    },
                    end: {
                        line: unit.endLine,
                        column: content.split('\n')[unit.endLine]?.length || 0,
                        type: unit.type
                    },
                    semantic: unit.type
                },
                context: {
                    preceding: preceding.slice(-config.contextWindow),
                    following: following.slice(0, config.contextWindow),
                    hierarchy: relevantHeadings,
                    metadata: {
                        unitIndex: i,
                        totalUnits: semanticUnits.length,
                        path: path
                    }
                },
                tokens: this.estimateTokenCount(unitContent)
            };
            chunks.push(chunk);
        }
        return chunks;
    }
    /**
     * Post-process chunks: merge small ones, split large ones
     */
    postProcessChunks(chunks, config) {
        const processed = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            // If chunk is too large, split it
            if (chunk.content.length > config.maxLength) {
                const splitChunks = this.splitLargeChunk(chunk, config);
                processed.push(...splitChunks);
                continue;
            }
            // If chunk is too small, try to merge with next
            if (chunk.content.length < config.minLength && i < chunks.length - 1) {
                const nextChunk = chunks[i + 1];
                const mergedContent = chunk.content + '\n\n' + nextChunk.content;
                if (mergedContent.length <= config.maxLength) {
                    // Create merged chunk
                    const mergedChunk = {
                        id: `${chunk.id}+${nextChunk.id}`,
                        content: mergedContent,
                        boundaries: {
                            start: chunk.boundaries.start,
                            end: nextChunk.boundaries.end,
                            semantic: 'paragraph' // Merged chunks become paragraphs
                        },
                        context: {
                            preceding: chunk.context.preceding,
                            following: nextChunk.context.following,
                            hierarchy: [...chunk.context.hierarchy, ...nextChunk.context.hierarchy]
                                .filter((h, idx, arr) => arr.findIndex(h2 => h2.line === h.line) === idx)
                                .sort((a, b) => a.line - b.line),
                            metadata: {
                                ...chunk.context.metadata,
                                merged: true,
                                originalChunks: [chunk.id, nextChunk.id]
                            }
                        },
                        tokens: this.estimateTokenCount(mergedContent)
                    };
                    processed.push(mergedChunk);
                    i++; // Skip next chunk since we merged it
                    continue;
                }
            }
            processed.push(chunk);
        }
        return processed;
    }
    /**
     * Split a large chunk while preserving semantic boundaries
     */
    splitLargeChunk(chunk, config) {
        const parts = [];
        const sentences = this.splitIntoSentences(chunk.content);
        let currentPart = '';
        let startIndex = 0;
        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            const testContent = currentPart + (currentPart ? ' ' : '') + sentence;
            if (testContent.length > config.maxLength && currentPart.length > 0) {
                // Create a chunk from current part
                const partChunk = {
                    id: `${chunk.id}:split-${parts.length}`,
                    content: currentPart.trim(),
                    boundaries: {
                        start: chunk.boundaries.start,
                        end: chunk.boundaries.end,
                        semantic: chunk.boundaries.semantic
                    },
                    context: {
                        ...chunk.context,
                        metadata: {
                            ...chunk.context.metadata,
                            split: true,
                            splitIndex: parts.length,
                            originalChunk: chunk.id
                        }
                    },
                    tokens: this.estimateTokenCount(currentPart)
                };
                parts.push(partChunk);
                currentPart = sentence;
            }
            else {
                currentPart = testContent;
            }
        }
        // Add the remaining part
        if (currentPart.trim().length > 0) {
            const partChunk = {
                id: `${chunk.id}:split-${parts.length}`,
                content: currentPart.trim(),
                boundaries: {
                    start: chunk.boundaries.start,
                    end: chunk.boundaries.end,
                    semantic: chunk.boundaries.semantic
                },
                context: {
                    ...chunk.context,
                    metadata: {
                        ...chunk.context.metadata,
                        split: true,
                        splitIndex: parts.length,
                        originalChunk: chunk.id
                    }
                },
                tokens: this.estimateTokenCount(currentPart)
            };
            parts.push(partChunk);
        }
        return parts;
    }
    /**
     * Split text into sentences
     */
    splitIntoSentences(text) {
        // Simple sentence splitting - can be enhanced with more sophisticated NLP
        return text
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(s => s + '.');
    }
    /**
     * Estimate token count (rough approximation)
     */
    estimateTokenCount(text) {
        // Rough approximation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }
}
export const contentChunker = new ContentChunker();
