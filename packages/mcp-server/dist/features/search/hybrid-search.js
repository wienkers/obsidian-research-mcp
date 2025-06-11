import { obsidianAPI } from '../../integrations/obsidian-api.js';
import { smartConnectionsAPI } from '../../integrations/smart-connections.js';
import { cache } from '../../core/cache.js';
import { logger, logPerformance } from '../../core/logger.js';
import { config } from '../../core/config.js';
import { backlinkIndex } from './backlink-index.js';
import { mmrRanker } from './mmr-ranker.js';
// Backlink operations are now handled by the BacklinkIndexManager
export class HybridSearchEngine {
    async search(params) {
        return logPerformance('hybrid-search', async () => {
            const cacheKey = this.generateCacheKey(params);
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            logger.info('Performing hybrid search', { params });
            let combinedResults;
            if (params.semanticOnly) {
                // Pure semantic search mode - only use Smart Connections
                logger.info('Performing semantic-only search');
                const semanticResults = await this.performSemanticSearch(params);
                combinedResults = semanticResults;
            }
            else {
                // Hybrid mode - combine semantic and structural
                // Step 1: Semantic search via Smart Connections
                const semanticResults = await this.performSemanticSearch(params);
                // Step 2: Structural search via Obsidian API  
                const structuralResults = await this.performStructuralSearch(params);
                // Step 3: Combine and rank results
                combinedResults = this.combineResults(semanticResults, structuralResults, params.semanticQuery);
            }
            // Step 4: Apply additional filters
            const filteredResults = await this.applyFilters(combinedResults, params.structuralFilters);
            // Step 5: OPTIMIZED expansion with limits
            const finalResults = params.expandSearch
                ? await this.expandSearchOptimized(filteredResults, params.searchDepth)
                : filteredResults;
            // Step 6: Apply MMR ranking for diversity and final limiting
            const diversityRanked = mmrRanker.rankWithMMR(finalResults, {
                lambda: mmrRanker.getAdaptiveLambda(params.semanticQuery, finalResults.length),
                maxResults: params.limit,
                useSemanticSimilarity: config.smartConnectionsEnabled,
                diversityThreshold: 0.1
            });
            // Step 7: Final relevance ranking within diverse results
            const rankedResults = this.rankResults(diversityRanked);
            // Cache results
            await cache.set(cacheKey, rankedResults, config.cacheTtl, [
                'vault-files',
                'search-index'
            ]);
            return rankedResults;
        });
    }
    // OPTIMIZATION: Completely rewritten expansion with performance limits
    async expandSearchOptimized(results, depth, currentDepth = 0) {
        const startTime = Date.now();
        const TIMEOUT_MS = 5000; // 5 second timeout
        const MAX_EXPANSION_NOTES = 10; // Limit expansion to max 10 additional notes
        if (depth <= 0 || currentDepth >= depth || results.length === 0) {
            return results;
        }
        logger.info(`Expanding search with timeout protection - depth ${currentDepth + 1}/${depth}`, {
            inputResults: results.length,
            timeout: TIMEOUT_MS
        });
        const allResults = new Map();
        // Initialize with input results
        results.forEach(result => allResults.set(result.path, result));
        let expansionCount = 0;
        // Use iterative approach with timeout and expansion limits
        for (let level = currentDepth; level < depth; level++) {
            // Check timeout
            if (Date.now() - startTime > TIMEOUT_MS) {
                logger.warn('Search expansion timed out', {
                    elapsed: Date.now() - startTime,
                    level,
                    totalResults: allResults.size
                });
                break;
            }
            // Check expansion limit
            if (expansionCount >= MAX_EXPANSION_NOTES) {
                logger.info('Expansion limit reached', {
                    expansionCount,
                    maxExpansion: MAX_EXPANSION_NOTES
                });
                break;
            }
            // Circuit breaker for total results
            if (allResults.size >= 50) { // Reduced from 100
                logger.info('Circuit breaker: maximum results reached', { size: allResults.size });
                break;
            }
            // Get results to expand at this level (reduced limit)
            const currentLevelResults = Array.from(allResults.values())
                .filter(r => r.metadata?.expansionDepth === level)
                .slice(0, 3); // Reduced from 5
            if (currentLevelResults.length === 0) {
                logger.debug('No results to expand at level', { level });
                break;
            }
            logger.info(`Expanding search level ${level + 1}/${depth}`, {
                resultsToExpand: currentLevelResults.length,
                totalResults: allResults.size
            });
            // Process in small batches with timeout protection
            const BATCH_SIZE = 2; // Reduced batch size for faster response
            const resultsToExpand = currentLevelResults;
            // Temporary expanded results for this level
            const expanded = new Map();
            for (let i = 0; i < resultsToExpand.length && expansionCount < MAX_EXPANSION_NOTES; i += BATCH_SIZE) {
                // Check timeout before each batch
                if (Date.now() - startTime > TIMEOUT_MS) {
                    logger.warn('Batch processing timed out');
                    break;
                }
                const batch = resultsToExpand.slice(i, i + BATCH_SIZE);
                // Process batch with timeout protection
                const batchPromises = batch.map(async (result) => {
                    try {
                        // OPTIMIZATION: Use cached note reading
                        const cacheKey = `note-content:${result.path}`;
                        let note = await cache.get(cacheKey);
                        if (!note) {
                            note = await Promise.race([
                                obsidianAPI.getNote(result.path),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('Note read timeout')), 5000))
                            ]);
                            await cache.set(cacheKey, note, 300000, [`file:${result.path}`]);
                        }
                        // OPTIMIZATION: Use indexed backlinks
                        const backlinks = await backlinkIndex.getBacklinks(result.path);
                        // Process forward and backward links with limits
                        const forwardLinks = (note.links || []).slice(0, 3); // Limit forward links
                        const limitedBacklinks = backlinks.slice(0, 3); // Limit backlinks
                        const linkedPaths = [...forwardLinks, ...limitedBacklinks];
                        logger.debug(`Expanding ${result.path}`, {
                            forwardLinks: forwardLinks.length,
                            backlinks: limitedBacklinks.length,
                            totalLinks: linkedPaths.length
                        });
                        // Process only first few links per result to prevent explosion
                        for (const linkedPath of linkedPaths) {
                            if (allResults.has(linkedPath) || expanded.has(linkedPath)) {
                                continue; // Skip if already processed
                            }
                            if (expansionCount >= MAX_EXPANSION_NOTES) {
                                break; // Stop if we've reached the expansion limit
                            }
                            try {
                                const linkedNote = await Promise.race([
                                    obsidianAPI.getNote(linkedPath),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('Linked note read timeout')), 3000))
                                ]);
                                const expandedResult = {
                                    path: linkedNote.path,
                                    title: this.extractTitle(linkedNote.path, linkedNote.content),
                                    content: linkedNote.content,
                                    score: result.score * 0.3, // Reduce score for expanded results
                                    relevanceType: 'hybrid',
                                    metadata: {
                                        expandedFrom: result.path,
                                        expansionDepth: level + 1,
                                    }
                                };
                                expanded.set(linkedNote.path, expandedResult);
                                expansionCount++;
                            }
                            catch (error) {
                                logger.debug(`Failed to expand to ${linkedPath}`, { error });
                            }
                        }
                    }
                    catch (error) {
                        logger.warn(`Failed to expand search for ${result.path}`, { error });
                    }
                });
                // Execute batch with timeout
                await Promise.allSettled(batchPromises);
                // Add delay between batches to prevent overwhelming
                if (i + BATCH_SIZE < resultsToExpand.length) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            // Merge expanded results into allResults for the next level
            expanded.forEach((result, path) => {
                if (!allResults.has(path)) {
                    allResults.set(path, result);
                }
            });
        }
        const finalResults = Array.from(allResults.values());
        logger.info(`Expansion complete at depth ${currentDepth}`, {
            inputResults: results.length,
            totalResults: finalResults.length,
            newlyAdded: finalResults.length - results.length
        });
        // OPTIMIZATION 7: Limit recursive expansion and add circuit breaker
        if (currentDepth + 1 < depth && finalResults.length < 100) {
            const newResults = finalResults.filter(r => r.metadata?.expansionDepth === currentDepth + 1).slice(0, 5); // Only expand top 5 new results
            if (newResults.length > 0) {
                // 🔧 FIX: Only pass new results, not all results
                const expandedNewResults = await this.expandSearchOptimized(newResults, depth, currentDepth + 1);
                // Merge with existing results, avoiding duplicates
                const mergedResults = new Map();
                finalResults.forEach(r => mergedResults.set(r.path, r));
                expandedNewResults.forEach(r => mergedResults.set(r.path, r));
                return Array.from(mergedResults.values());
            }
        }
        return finalResults;
    }
    // OPTIMIZATION: Faster backlink finding using indexed lookup
    async findBacklinksOptimized(targetPath) {
        return backlinkIndex.getBacklinks(targetPath);
    }
    async performSemanticSearch(params) {
        try {
            const threshold = params.threshold || config.semanticSimilarityThreshold;
            logger.info('Starting semantic search', {
                query: params.semanticQuery,
                limit: Math.min(params.limit * 2, config.maxSearchResults),
                threshold,
                folders: params.structuralFilters?.folders
            });
            const results = await smartConnectionsAPI.searchSemantic(params.semanticQuery, {
                limit: Math.min(params.limit * 2, config.maxSearchResults),
                threshold,
                folders: params.structuralFilters?.folders,
            });
            logger.info(`Semantic search completed: ${results.length} results`);
            return results;
        }
        catch (error) {
            logger.error('Semantic search failed, continuing with structural only', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            return [];
        }
    }
    async performStructuralSearch(params) {
        try {
            logger.info('Starting structural search', { query: params.semanticQuery });
            // Use searchFiles() when structural filters are provided for better performance
            let allFiles;
            const hasStructuralFilters = params.structuralFilters && (params.structuralFilters.dateRange ||
                params.structuralFilters.fileTypes ||
                (params.structuralFilters.folders && params.structuralFilters.folders.length > 0) ||
                (params.structuralFilters.tags && params.structuralFilters.tags.length > 0));
            let preFilteredByTags = false;
            if (hasStructuralFilters) {
                logger.info('Using filtered search approach', { filters: params.structuralFilters });
                if (params.structuralFilters?.tags && params.structuralFilters.tags.length > 0 &&
                    !params.structuralFilters.folders && !params.structuralFilters.fileTypes && !params.structuralFilters.dateRange) {
                    allFiles = await this.getFilesWithTags(params.structuralFilters.tags);
                    preFilteredByTags = true;
                    logger.info(`Tag filtering returned ${allFiles.length} files`);
                }
                else {
                    const filteredPaths = await obsidianAPI.searchFiles(params.structuralFilters);
                    logger.info(`searchFiles() returned ${filteredPaths.length} filtered paths`);
                    const allFilesFromAPI = await obsidianAPI.listFiles(undefined, true);
                    const allFilesMap = new Map(allFilesFromAPI.map(f => [f.path, f]));
                    allFiles = filteredPaths.map(path => allFilesMap.get(path)).filter(Boolean);
                    logger.info(`Mapped to ${allFiles.length} file objects`);
                }
            }
            else {
                logger.info('Using listFiles() - no structural filters applied');
                allFiles = await obsidianAPI.listFiles(undefined, true);
                logger.info(`Total files found (including folders): ${allFiles.length}`);
            }
            // Filter to markdown files only
            allFiles = allFiles.filter(file => !file.isFolder && file.path.endsWith('.md'));
            logger.info(`Markdown files found: ${allFiles.length}`);
            // Apply tag filtering if not already done and tags are specified
            let finalFiles = allFiles;
            if (!preFilteredByTags && params.structuralFilters?.tags && params.structuralFilters.tags.length > 0) {
                logger.info('Applying tag filtering to already filtered files', { tags: params.structuralFilters.tags });
                finalFiles = await this.filterFilesByTags(allFiles, params.structuralFilters.tags);
                logger.info(`After tag filtering: ${finalFiles.length} files`);
            }
            // Search all available files - no arbitrary limits
            logger.info(`Searching ${finalFiles.length} files`);
            const results = [];
            const searchTerms = this.extractSearchTerms(params.semanticQuery);
            const originalQuery = params.semanticQuery.toLowerCase();
            // Process files in batches for better performance
            const BATCH_SIZE = 20; // Reduced batch size
            for (let i = 0; i < finalFiles.length; i += BATCH_SIZE) {
                const batch = finalFiles.slice(i, i + BATCH_SIZE);
                const batchPromises = batch.map(file => this.searchInFile(file, searchTerms, originalQuery));
                const batchResults = await Promise.allSettled(batchPromises);
                for (const result of batchResults) {
                    if (result.status === 'fulfilled' && result.value) {
                        results.push(result.value);
                    }
                }
                // Early exit if we have enough high-quality results
                if (results.filter(r => r.score > 5).length >= params.limit) {
                    logger.info('Early exit: found enough high-quality results');
                    break;
                }
                // Add small delay between batches
                if (i + BATCH_SIZE < finalFiles.length) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            return results
                .sort((a, b) => b.score - a.score)
                .slice(0, params.limit);
        }
        catch (error) {
            logger.error('Structural search failed', { error });
            return [];
        }
    }
    async getFilesWithTags(requiredTags) {
        const allFiles = await obsidianAPI.listFiles(undefined, true);
        const markdownFiles = allFiles.filter(file => !file.isFolder && file.path.endsWith('.md'));
        return await this.filterFilesByTags(markdownFiles, requiredTags);
    }
    async filterFilesByTags(files, requiredTags) {
        const matchingFiles = [];
        // Process in batches to avoid overwhelming the system
        const BATCH_SIZE = 20;
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (file) => {
                try {
                    const note = await obsidianAPI.getNote(file.path);
                    if (note.tags && note.tags.length > 0) {
                        const hasMatchingTag = requiredTags.some(filterTag => note.tags.includes(filterTag));
                        if (hasMatchingTag) {
                            return file;
                        }
                    }
                    return null;
                }
                catch (error) {
                    logger.debug(`Failed to check tags for ${file.path}`, { error });
                    return null;
                }
            });
            const batchResults = await Promise.allSettled(batchPromises);
            for (const result of batchResults) {
                if (result.status === 'fulfilled' && result.value) {
                    matchingFiles.push(result.value);
                }
            }
        }
        return matchingFiles;
    }
    async searchInFile(file, searchTerms, originalQuery) {
        try {
            const content = await obsidianAPI.getFileContent(file.path);
            const contentLower = content.toLowerCase();
            // Check for exact phrase match first
            const hasExactMatch = contentLower.includes(originalQuery);
            // Calculate term-based score
            const termScore = this.calculateTextScore(content, searchTerms, originalQuery, file.path);
            // Boost score significantly if exact phrase is found
            let finalScore = hasExactMatch ? termScore + 10 : termScore;
            if (finalScore > 0) {
                const matchedTerms = searchTerms.filter(term => contentLower.includes(term.toLowerCase()));
                if (hasExactMatch && !matchedTerms.includes(originalQuery)) {
                    matchedTerms.push(originalQuery);
                }
                return {
                    path: file.path,
                    title: this.extractTitle(file.path, content),
                    content,
                    score: finalScore,
                    relevanceType: 'structural',
                    matchedTerms,
                    contextSnippets: this.extractContextSnippets(content, [...searchTerms, originalQuery]),
                    metadata: {
                        // Store raw data needed for dynamic scoring
                        rawStructuralScore: finalScore,
                        termScore: termScore,
                        hasExactMatch: hasExactMatch,
                        contentLength: content.length
                    }
                };
            }
            return null;
        }
        catch (error) {
            logger.debug(`Failed to search in file: ${file.path}`, { error });
            return null;
        }
    }
    combineResults(semantic, structural, originalQuery) {
        const resultMap = new Map();
        // First pass: Add semantic results (primary ranking)
        for (const result of semantic) {
            resultMap.set(result.path, {
                ...result,
                score: result.score, // Use semantic score directly
                relevanceType: 'semantic'
            });
        }
        // Extract original query terms for consistent bonus calculation
        const originalSearchTerms = this.extractSearchTerms(originalQuery);
        // Second pass: Process structural results and apply title/header bonuses
        for (const result of structural) {
            const existing = resultMap.get(result.path);
            if (existing) {
                // File has both semantic and structural matches
                const titleHeaderBonus = this.calculateTitleHeaderBonus(result.path, result.content || '', originalSearchTerms, originalQuery);
                resultMap.set(result.path, {
                    ...existing,
                    score: existing.score + titleHeaderBonus,
                    relevanceType: titleHeaderBonus > 0 ? 'hybrid' : 'semantic',
                    matchedTerms: [
                        ...(existing.matchedTerms || []),
                        ...(result.matchedTerms || [])
                    ].filter((term, index, arr) => arr.indexOf(term) === index),
                    contextSnippets: [
                        ...(existing.contextSnippets || []),
                        ...(result.contextSnippets || [])
                    ].slice(0, 5)
                });
            }
            else {
                // Structural-only result - apply minimal scoring
                const titleHeaderBonus = this.calculateTitleHeaderBonus(result.path, result.content || '', originalSearchTerms, originalQuery);
                // Only include structural-only results if they have title/header matches
                if (titleHeaderBonus > 0) {
                    resultMap.set(result.path, {
                        ...result,
                        score: titleHeaderBonus,
                        relevanceType: 'structural'
                    });
                }
            }
        }
        return Array.from(resultMap.values());
    }
    async applyFilters(results, filters) {
        if (!filters)
            return results;
        let filtered = results;
        // Linked to filter - Enhanced with better path matching
        if (filters.linkedTo && filters.linkedTo.length > 0) {
            const linkedFiles = new Set();
            let skippedFiles = 0;
            let processedFiles = 0;
            logger.debug(`Applying linkedTo filter`, {
                targetFiles: filters.linkedTo,
                candidateCount: filtered.length
            });
            for (const result of filtered) {
                try {
                    const note = await obsidianAPI.getNote(result.path);
                    processedFiles++;
                    if (note.links && note.links.length > 0) {
                        // Check for matches using multiple strategies
                        const hasMatch = filters.linkedTo.some(targetLink => {
                            // Strategy 1: Direct match
                            if (note.links.includes(targetLink)) {
                                return true;
                            }
                            // Strategy 2: Basename match (handle cases where links don't include full paths)
                            const targetBasename = targetLink.split('/').pop()?.replace(/\.md$/, '') || '';
                            const normalizedTargetBasename = targetBasename.toLowerCase();
                            return note.links.some(noteLink => {
                                const noteLinkBasename = noteLink.split('/').pop()?.replace(/\.md$/, '') || '';
                                const normalizedNoteLinkBasename = noteLinkBasename.toLowerCase();
                                return normalizedNoteLinkBasename === normalizedTargetBasename;
                            });
                        });
                        if (hasMatch) {
                            linkedFiles.add(result.path);
                            logger.debug(`Found linkedTo match`, {
                                file: result.path,
                                fileLinks: note.links.slice(0, 5), // Show first 5 links
                                targetLinks: filters.linkedTo
                            });
                        }
                    }
                }
                catch (error) {
                    skippedFiles++;
                    logger.debug(`Skipping file in linkedTo filter: ${result.path}`, {
                        error: error instanceof Error ? error.message : String(error),
                        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
                    });
                }
            }
            const beforeCount = filtered.length;
            filtered = filtered.filter(result => linkedFiles.has(result.path));
            const afterCount = filtered.length;
            logger.info(`LinkedTo filter applied`, {
                processedFiles,
                skippedFiles,
                beforeCount,
                afterCount,
                filteredOut: beforeCount - afterCount,
                targetLinks: filters.linkedTo
            });
        }
        // Property filter
        if (filters.hasProperty) {
            logger.info('Applying hasProperty filter', {
                filterProperties: filters.hasProperty,
                candidateFiles: filtered.length
            });
            const propertyFiles = new Set();
            let matchedFiles = 0;
            let checkedFiles = 0;
            for (const result of filtered) {
                try {
                    // Strip fragment identifiers from path (Smart Connections returns paths with #fragments)
                    const cleanPath = result.path.split('#')[0];
                    const note = await obsidianAPI.getNote(cleanPath);
                    checkedFiles++;
                    logger.debug(`Checking properties for ${result.path} (clean: ${cleanPath})`, {
                        hasFrontmatter: !!note.frontmatter,
                        frontmatterKeys: note.frontmatter ? Object.keys(note.frontmatter) : [],
                        frontmatterValues: note.frontmatter || null,
                        filterProperties: filters.hasProperty
                    });
                    if (note.frontmatter && this.matchesProperties(note.frontmatter, filters.hasProperty)) {
                        propertyFiles.add(result.path);
                        matchedFiles++;
                        logger.info(`Property match found: ${result.path}`, {
                            matchedProperties: note.frontmatter
                        });
                    }
                    else {
                        logger.debug(`Property match failed for ${result.path}`, {
                            hasFrontmatter: !!note.frontmatter,
                            frontmatter: note.frontmatter,
                            expected: filters.hasProperty
                        });
                    }
                }
                catch (error) {
                    logger.debug(`Skipping file in property filter: ${result.path}`, { error });
                }
            }
            filtered = filtered.filter(result => propertyFiles.has(result.path));
            logger.info('hasProperty filter completed', {
                checkedFiles,
                matchedFiles,
                filteredCount: filtered.length
            });
        }
        return filtered;
    }
    rankResults(results) {
        return results.sort((a, b) => {
            if (Math.abs(a.score - b.score) > 0.01) {
                return b.score - a.score;
            }
            const typeScore = (type) => {
                switch (type) {
                    case 'hybrid': return 3;
                    case 'semantic': return 2;
                    case 'structural': return 1;
                    default: return 0;
                }
            };
            return typeScore(b.relevanceType) - typeScore(a.relevanceType);
        });
    }
    generateCacheKey(params) {
        const key = {
            query: params.semanticQuery,
            folders: params.structuralFilters?.folders?.sort(),
            tags: params.structuralFilters?.tags?.sort(),
            limit: params.limit,
            expandSearch: params.expandSearch,
            searchDepth: params.searchDepth
        };
        return `hybrid-search:${JSON.stringify(key)}`;
    }
    extractTitle(path, content) {
        const headingMatch = content.match(/^#\s+(.+)$/m);
        if (headingMatch) {
            return headingMatch[1].trim();
        }
        return path.split('/').pop()?.replace(/\.[^/.]+$/, '') || path;
    }
    extractSearchTerms(query) {
        return query
            .toLowerCase()
            .split(/\s+/)
            .filter(term => term.length > 2)
            .filter(term => !this.isStopWord(term));
    }
    calculateTextScore(content, searchTerms, originalQuery, filePath) {
        const contentLower = content.toLowerCase();
        let score = 0;
        // Extract titles for matching
        const contentTitle = this.extractTitle('', content);
        const filename = filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
        const contentTitleLower = contentTitle.toLowerCase();
        const filenameLower = filename.toLowerCase();
        const originalQueryLower = originalQuery.toLowerCase();
        const lengthNormalizationFactor = Math.max(0.5, Math.sqrt(content.length / 1000));
        // Calculate base content score with existing logic
        for (const term of searchTerms) {
            const termLower = term.toLowerCase();
            const escapedTerm = termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const matches = (contentLower.match(new RegExp(escapedTerm, 'g')) || []).length;
            let termScore = 0;
            // Content matches
            if (matches > 0) {
                termScore += matches * 2;
                // Header matches bonus
                const headerMatches = (content.match(new RegExp(`^#+.*${escapedTerm}.*$`, 'gmi')) || []).length;
                termScore += headerMatches * 3;
            }
            // Title matches (check even if no content matches)
            if (contentTitleLower.includes(termLower)) {
                termScore += 10;
            }
            if (filenameLower.includes(termLower)) {
                termScore += 10;
            }
            // Apply length normalization to all term-based scoring
            if (termScore > 0) {
                termScore = termScore / lengthNormalizationFactor;
                score += termScore;
            }
        }
        // Add exact title match bonus (unnormalized)
        if (contentTitleLower === originalQueryLower || filenameLower === originalQueryLower) {
            score += 15;
        }
        return score;
    }
    extractContextSnippets(content, searchTerms) {
        const snippets = [];
        const contentLower = content.toLowerCase();
        const uniqueSnippets = new Set();
        for (const term of searchTerms.slice(0, 5)) {
            const termLower = term.toLowerCase();
            let searchIndex = 0;
            for (let occurrence = 0; occurrence < 2; occurrence++) {
                const index = contentLower.indexOf(termLower, searchIndex);
                if (index !== -1) {
                    const start = Math.max(0, index - 80);
                    const end = Math.min(content.length, index + term.length + 80);
                    let snippet = content.substring(start, end).trim();
                    if (start > 0)
                        snippet = '...' + snippet;
                    if (end < content.length)
                        snippet = snippet + '...';
                    if (!uniqueSnippets.has(snippet)) {
                        uniqueSnippets.add(snippet);
                        snippets.push(snippet);
                    }
                    searchIndex = index + term.length;
                }
                else {
                    break;
                }
            }
        }
        return snippets.slice(0, 5);
    }
    matchesProperties(frontmatter, properties) {
        logger.debug('Matching properties', {
            frontmatterKeys: Object.keys(frontmatter),
            expectedProperties: properties
        });
        for (const [key, expectedValue] of Object.entries(properties)) {
            const actualValue = frontmatter[key];
            logger.debug(`Checking property ${key}`, {
                actualValue,
                actualType: typeof actualValue,
                expectedValue,
                expectedType: typeof expectedValue,
                exists: actualValue !== undefined
            });
            if (actualValue === undefined) {
                logger.debug(`Property ${key} not found in frontmatter`);
                return false;
            }
            let matches = false;
            if (typeof expectedValue === 'object' && expectedValue !== null) {
                matches = this.deepEqual(actualValue, expectedValue);
            }
            else {
                // Enhanced comparison with type normalization
                matches = this.compareValues(actualValue, expectedValue);
            }
            logger.debug(`Property ${key} comparison result: ${matches}`, {
                actualValue,
                expectedValue,
                normalizedActual: this.normalizeValue(actualValue),
                normalizedExpected: this.normalizeValue(expectedValue)
            });
            if (!matches) {
                return false;
            }
        }
        logger.debug('All properties matched successfully');
        return true;
    }
    compareValues(actualValue, expectedValue) {
        // Direct equality check first
        if (actualValue === expectedValue) {
            return true;
        }
        // Normalize and compare
        const normalizedActual = this.normalizeValue(actualValue);
        const normalizedExpected = this.normalizeValue(expectedValue);
        return normalizedActual === normalizedExpected;
    }
    normalizeValue(value) {
        if (value === null || value === undefined) {
            return value;
        }
        // Handle string representations of booleans
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            if (lowerValue === 'true')
                return true;
            if (lowerValue === 'false')
                return false;
            // Handle quoted strings - remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                return value.slice(1, -1);
            }
            return value.trim();
        }
        // Handle boolean representations
        if (typeof value === 'boolean') {
            return value;
        }
        // Handle numbers
        if (typeof value === 'number') {
            return value;
        }
        return value;
    }
    deepEqual(a, b) {
        if (a === b)
            return true;
        if (a == null || b == null)
            return a === b;
        if (typeof a !== typeof b)
            return false;
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length)
                return false;
            return a.every((item, index) => this.deepEqual(item, b[index]));
        }
        if (typeof a === 'object') {
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            if (keysA.length !== keysB.length)
                return false;
            return keysA.every(key => this.deepEqual(a[key], b[key]));
        }
        return false;
    }
    /**
     * Calculate bonus for title and header matches only
     * Only applies bonus if ≥50% of search terms are found in titles/headers
     */
    calculateTitleHeaderBonus(filePath, content, searchTerms, originalQuery) {
        if (searchTerms.length === 0) {
            return 0;
        }
        // Extract title texts
        const contentTitle = this.extractTitle('', content);
        const filename = filePath.split('/').pop()?.replace(/\.md$/, '') || '';
        const titleText = `${contentTitle} ${filename}`.toLowerCase();
        // Get unique words for matching and counting
        const queryUniqueWords = this.getUniqueWords(originalQuery);
        const titleUniqueWords = this.getUniqueWords(titleText);
        // Count unique matches in title
        const uniqueTitleMatches = this.countUniqueMatches(queryUniqueWords, titleUniqueWords);
        // Calculate min-normalized fraction for title
        const titleFraction = queryUniqueWords.length > 0 && titleUniqueWords.length > 0
            ? uniqueTitleMatches / Math.min(queryUniqueWords.length, titleUniqueWords.length)
            : 0;
        // Calculate header coverage using the same logic
        const headerUniqueWords = this.getUniqueWordsFromHeaders(content);
        const uniqueHeaderMatches = this.countUniqueMatches(queryUniqueWords, headerUniqueWords);
        const headerFraction = queryUniqueWords.length > 0 && headerUniqueWords.length > 0
            ? uniqueHeaderMatches / Math.min(queryUniqueWords.length, headerUniqueWords.length)
            : 0;
        // Apply bonus only if ≥50% fraction in titles or headers
        let bonus = 0;
        if (titleFraction >= 0.5) {
            // Get full word lists for order checking (including repeats)
            const queryAllWords = originalQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
            const titleAllWords = titleText.split(/\s+/).filter(w => w.length > 0);
            const matchedWords = queryUniqueWords.filter(word => titleUniqueWords.includes(word));
            const orderBonus = this.checkWordOrder(queryAllWords, titleAllWords, matchedWords) ? 0.1 : 0;
            bonus = Math.max(bonus, (0.3 * titleFraction) + orderBonus);
        }
        if (headerFraction >= 0.5) {
            const headerWords = content.match(/^#+.*$/gmi)?.join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 0) || [];
            const queryAllWords = originalQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
            const matchedWords = queryUniqueWords.filter(word => headerUniqueWords.includes(word));
            const orderBonus = this.checkWordOrder(queryAllWords, headerWords, matchedWords) ? 0.05 : 0;
            bonus = Math.max(bonus, (0.2 * headerFraction) + orderBonus);
        }
        // Special case: exact string match gets maximum bonus
        const originalQueryLower = originalQuery.toLowerCase();
        if (titleText.includes(originalQueryLower) ||
            contentTitle.toLowerCase() === originalQueryLower ||
            filename.toLowerCase() === originalQueryLower) {
            bonus = Math.max(bonus, 0.5); // Ensure perfect matches get high priority
        }
        return bonus;
    }
    /**
     * Extract unique words from text (case-insensitive)
     */
    getUniqueWords(text) {
        const words = text.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 0);
        return [...new Set(words)];
    }
    /**
     * Count unique word matches between query and title word sets
     */
    countUniqueMatches(queryWords, titleWords) {
        const titleWordSet = new Set(titleWords);
        return queryWords.filter(word => titleWordSet.has(word)).length;
    }
    /**
     * Extract unique words from all headers in content
     */
    getUniqueWordsFromHeaders(content) {
        const headers = content.match(/^#+.*$/gmi) || [];
        const headerText = headers.join(' ').toLowerCase();
        return this.getUniqueWords(headerText);
    }
    /**
     * Check if matched words maintain the same relative order
     * Uses full word lists including repeats for context
     */
    checkWordOrder(queryWords, titleWords, matchedWords) {
        if (matchedWords.length < 2) {
            return true; // Single word or no matches always preserve order
        }
        // Find positions of matched words in both sequences
        const queryPositions = [];
        const titlePositions = [];
        for (const word of matchedWords) {
            const queryIndex = queryWords.indexOf(word);
            const titleIndex = titleWords.indexOf(word);
            if (queryIndex !== -1 && titleIndex !== -1) {
                queryPositions.push(queryIndex);
                titlePositions.push(titleIndex);
            }
        }
        // Check if relative order is preserved
        for (let i = 1; i < queryPositions.length; i++) {
            const queryOrder = queryPositions[i] > queryPositions[i - 1];
            const titleOrder = titlePositions[i] > titlePositions[i - 1];
            if (queryOrder !== titleOrder) {
                return false; // Order not preserved
            }
        }
        return true;
    }
    isStopWord(word) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        ]);
        return stopWords.has(word.toLowerCase());
    }
}
export const hybridSearchEngine = new HybridSearchEngine();
