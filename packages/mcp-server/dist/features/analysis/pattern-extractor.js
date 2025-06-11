import { obsidianAPI } from '../../integrations/obsidian-api.js';
import { batchReader } from '../batch-operations/batch-reader.js';
import { cache } from '../../core/cache.js';
import { logger, logPerformance } from '../../core/logger.js';
import { config } from '../../core/config.js';
export class PatternExtractor {
    async extractPatterns(options) {
        return logPerformance('pattern-extraction', async () => {
            const cacheKey = `patterns:${JSON.stringify(options)}`;
            const startTime = Date.now();
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            logger.info('Extracting patterns from vault', {
                patternCount: options.patterns.length,
                scope: options.scope
            });
            // Get files to search
            const filesToSearch = await this.getFilesToSearch(options.scope);
            // Extract matches for all patterns
            const allMatches = await this.extractAllMatches(filesToSearch, options);
            // Calculate statistics if requested
            const statistics = options.includeStatistics
                ? this.calculateStatistics(allMatches, options.patterns)
                : [];
            // Calculate summary
            const summary = this.calculateSummary(allMatches, options.patterns, Date.now() - startTime, filesToSearch.length);
            const result = {
                patterns: options.patterns,
                matches: allMatches,
                statistics,
                summary,
            };
            // Cache the result
            await cache.set(cacheKey, result, config.cacheTtl, [
                ...filesToSearch.map(path => `file:${path}`),
                'pattern-extraction'
            ]);
            return result;
        });
    }
    async getFilesToSearch(scope) {
        const allFiles = await obsidianAPI.listFiles(undefined, true);
        let markdownFiles = allFiles
            .filter(file => !file.isFolder && file.path.endsWith('.md'))
            .map(file => file.path);
        if (!scope)
            return markdownFiles;
        // Apply path filters
        if (scope.paths && scope.paths.length > 0) {
            markdownFiles = markdownFiles.filter(path => scope.paths.some(includePath => path.includes(includePath)));
        }
        // Apply folder filters
        if (scope.folders && scope.folders.length > 0) {
            markdownFiles = markdownFiles.filter(path => scope.folders.some(folder => path.startsWith(folder)));
        }
        // Apply file pattern filter
        if (scope.filePattern) {
            const pattern = new RegExp(scope.filePattern, 'i');
            markdownFiles = markdownFiles.filter(path => pattern.test(path));
        }
        // Apply exclusion filters
        if (scope.excludePaths && scope.excludePaths.length > 0) {
            markdownFiles = markdownFiles.filter(path => !scope.excludePaths.some(excludePath => path.includes(excludePath)));
        }
        if (scope.excludeFolders && scope.excludeFolders.length > 0) {
            markdownFiles = markdownFiles.filter(path => !scope.excludeFolders.some(folder => path.startsWith(folder)));
        }
        // Apply date range filter if specified
        if (scope.dateRange) {
            const startTime = scope.dateRange.start ? new Date(scope.dateRange.start).getTime() : 0;
            const endTime = scope.dateRange.end ? new Date(scope.dateRange.end).getTime() : Date.now();
            const filesWithDates = await Promise.all(markdownFiles.map(async (path) => {
                try {
                    const file = allFiles.find(f => f.path === path);
                    return {
                        path,
                        inRange: file && file.mtime !== undefined && file.mtime >= startTime && file.mtime <= endTime
                    };
                }
                catch {
                    return { path, inRange: false };
                }
            }));
            markdownFiles = filesWithDates
                .filter(item => item.inRange)
                .map(item => item.path);
        }
        // Apply tag filter if specified
        if (scope.tags && scope.tags.length > 0) {
            const filesWithTags = await Promise.allSettled(markdownFiles.map(async (path) => {
                try {
                    const note = await obsidianAPI.getNote(path);
                    const noteTags = note.tags || [];
                    const hasRequiredTags = scope.tags.some(tag => noteTags.includes(tag) || noteTags.some((noteTag) => noteTag.includes(tag)));
                    return hasRequiredTags ? path : null;
                }
                catch {
                    return null;
                }
            }));
            markdownFiles = filesWithTags
                .filter((result) => result.status === 'fulfilled' && result.value !== null)
                .map(result => result.value);
        }
        return markdownFiles;
    }
    async extractAllMatches(filePaths, options) {
        const allMatches = [];
        const batchSize = 20;
        // Process files in batches to avoid overwhelming the system
        for (let i = 0; i < filePaths.length; i += batchSize) {
            const batch = filePaths.slice(i, i + batchSize);
            const batchResults = await batchReader.readMultipleNotes(batch, {
                includeContent: true,
                includeMetadata: false,
            });
            for (const result of batchResults) {
                if (!result.success || !result.note?.content)
                    continue;
                try {
                    const fileMatches = this.extractMatchesFromContent(result.path, result.note.content, options);
                    allMatches.push(...fileMatches);
                    // Respect max matches limit
                    if (options.maxMatches && allMatches.length >= options.maxMatches) {
                        return allMatches.slice(0, options.maxMatches);
                    }
                }
                catch (error) {
                    logger.debug(`Failed to extract patterns from ${result.path}`, { error });
                }
            }
        }
        return allMatches;
    }
    extractMatchesFromContent(filePath, content, options) {
        const matches = [];
        const lines = content.split('\n');
        for (const patternString of options.patterns) {
            try {
                // Build regex flags
                let flags = 'g';
                if (!options.caseSensitive)
                    flags += 'i';
                if (options.wholeWord) {
                    // Wrap pattern in word boundaries if not already present
                    const wrappedPattern = patternString.startsWith('\\b') || patternString.endsWith('\\b')
                        ? patternString
                        : `\\b${patternString}\\b`;
                    var regex = new RegExp(wrappedPattern, flags);
                }
                else {
                    var regex = new RegExp(patternString, flags);
                }
                // Search through each line
                for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                    const line = lines[lineIndex];
                    let match;
                    // Reset regex lastIndex for each line
                    regex.lastIndex = 0;
                    while ((match = regex.exec(line)) !== null) {
                        const patternMatch = {
                            pattern: patternString,
                            match: match[0],
                            file: filePath,
                            lineNumber: lineIndex + 1,
                            line: line,
                            groups: match.length > 1 ? match.slice(1) : undefined,
                        };
                        // Only include metadata if explicitly requested
                        // Metadata includes precise timing and positioning information for debugging
                        if (options.includeMetadata) {
                            patternMatch.metadata = {
                                timestamp: Date.now(), // JavaScript millisecond timestamp (e.g., 1756105054639 = Aug 25, 2025)
                                length: match[0].length,
                                startIndex: match.index,
                                endIndex: match.index + match[0].length,
                            };
                        }
                        // Add context if requested
                        if (options.contextWindow && options.contextWindow > 0) {
                            // Extract context lines - collect lines with content up to contextWindow count
                            // Include all blank lines in between to preserve document structure
                            const beforeLines = [];
                            let contentLinesBefore = 0;
                            for (let i = lineIndex - 1; i >= 0 && contentLinesBefore < options.contextWindow; i--) {
                                beforeLines.unshift(lines[i]);
                                // Count non-blank lines as content lines
                                if (lines[i].trim().length > 0) {
                                    contentLinesBefore++;
                                }
                            }
                            const afterLines = [];
                            let contentLinesAfter = 0;
                            for (let i = lineIndex + 1; i < lines.length && contentLinesAfter < options.contextWindow; i++) {
                                afterLines.push(lines[i]);
                                // Count non-blank lines as content lines
                                if (lines[i].trim().length > 0) {
                                    contentLinesAfter++;
                                }
                            }
                            patternMatch.context = {
                                before: beforeLines,
                                after: afterLines,
                            };
                        }
                        matches.push(patternMatch);
                        // Prevent infinite loop on zero-width matches
                        if (match[0].length === 0) {
                            regex.lastIndex++;
                        }
                    }
                }
            }
            catch (error) {
                logger.warn(`Invalid regex pattern: ${patternString}`, { error });
            }
        }
        return matches;
    }
    calculateStatistics(matches, patterns) {
        const statistics = [];
        for (const pattern of patterns) {
            const patternMatches = matches.filter(m => m.pattern === pattern);
            if (patternMatches.length === 0) {
                statistics.push({
                    pattern,
                    totalMatches: 0,
                    uniqueFiles: 0,
                    avgMatchesPerFile: 0,
                    mostCommonMatch: '',
                    fileDistribution: [],
                    matchFrequency: {},
                });
                continue;
            }
            // Calculate file distribution
            const fileMatchCounts = new Map();
            const matchFrequency = new Map();
            for (const match of patternMatches) {
                fileMatchCounts.set(match.file, (fileMatchCounts.get(match.file) || 0) + 1);
                matchFrequency.set(match.match, (matchFrequency.get(match.match) || 0) + 1);
            }
            const fileDistribution = Array.from(fileMatchCounts.entries())
                .map(([file, matches]) => ({
                file,
                matches,
                percentage: (matches / patternMatches.length) * 100,
            }))
                .sort((a, b) => b.matches - a.matches);
            // Find most common match
            const mostCommonEntry = Array.from(matchFrequency.entries())
                .sort(([, a], [, b]) => b - a)[0];
            statistics.push({
                pattern,
                totalMatches: patternMatches.length,
                uniqueFiles: fileMatchCounts.size,
                avgMatchesPerFile: patternMatches.length / fileMatchCounts.size,
                mostCommonMatch: mostCommonEntry ? mostCommonEntry[0] : '',
                fileDistribution,
                matchFrequency: Object.fromEntries(matchFrequency),
            });
        }
        return statistics;
    }
    calculateSummary(matches, patterns, executionTime, filesProcessed) {
        const uniqueMatches = new Set(matches.map(m => m.match)).size;
        const patternCounts = new Map();
        for (const match of matches) {
            patternCounts.set(match.pattern, (patternCounts.get(match.pattern) || 0) + 1);
        }
        const sortedPatterns = Array.from(patternCounts.entries()).sort(([, a], [, b]) => b - a);
        const mostProductivePattern = sortedPatterns[0]?.[0] || '';
        const leastProductivePattern = sortedPatterns[sortedPatterns.length - 1]?.[0] || '';
        return {
            totalMatches: matches.length,
            filesProcessed,
            executionTime,
            uniqueMatches,
            mostProductivePattern,
            leastProductivePattern,
        };
    }
}
export const patternExtractor = new PatternExtractor();
