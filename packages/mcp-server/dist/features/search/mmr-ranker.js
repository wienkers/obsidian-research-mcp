import { logger } from '../../core/logger.js';
export class MMRRanker {
    defaultOptions = {
        lambda: 0.7, // Favor relevance slightly over diversity
        maxResults: 50,
        diversityThreshold: 0.1, // Minimum diversity required
        useSemanticSimilarity: false,
        contentSimilarityWeight: 0.5,
        pathSimilarityWeight: 0.3,
        tagSimilarityWeight: 0.2
    };
    /**
     * Apply MMR ranking to search results
     */
    rankWithMMR(results, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        if (results.length <= 1) {
            return results;
        }
        logger.debug('Starting MMR ranking', {
            inputResults: results.length,
            lambda: config.lambda,
            maxResults: config.maxResults
        });
        // Step 1: Pre-process results and extract features
        const processedResults = this.preprocessResults(results);
        // Step 2: Apply MMR selection algorithm
        const rankedResults = this.selectWithMMR(processedResults, config);
        logger.debug('MMR ranking complete', {
            outputResults: rankedResults.length,
            diversityImproved: this.calculateDiversityImprovement(results, rankedResults)
        });
        return rankedResults;
    }
    /**
     * Pre-process results to extract features needed for similarity computation
     */
    preprocessResults(results) {
        return results.map(result => ({
            ...result,
            features: {
                contentTokens: this.extractContentTokens(result.content || ''),
                pathComponents: this.extractPathComponents(result.path),
                tags: this.extractTags(result.metadata?.tags || []),
                title: result.title.toLowerCase().trim()
            }
        }));
    }
    /**
     * Core MMR selection algorithm
     */
    selectWithMMR(results, config) {
        const selected = [];
        const remaining = [...results];
        // Start with highest relevance result
        if (remaining.length > 0) {
            const firstResult = remaining.reduce((best, current) => current.score > best.score ? current : best);
            selected.push(firstResult);
            remaining.splice(remaining.indexOf(firstResult), 1);
        }
        // Iteratively select results using MMR
        while (selected.length < config.maxResults && remaining.length > 0) {
            let bestResult = null;
            let bestMMRScore = -Infinity;
            let bestIndex = -1;
            for (let i = 0; i < remaining.length; i++) {
                const candidate = remaining[i];
                // Calculate relevance score (normalized)
                const relevanceScore = this.normalizeScore(candidate.score, results);
                // Calculate maximum similarity to already selected results
                const maxSimilarity = this.calculateMaxSimilarityToSelected(candidate, selected, config);
                // Calculate MMR score
                const mmrScore = config.lambda * relevanceScore - (1 - config.lambda) * maxSimilarity;
                if (mmrScore > bestMMRScore) {
                    bestMMRScore = mmrScore;
                    bestResult = candidate;
                    bestIndex = i;
                }
            }
            // Add best result if it meets diversity threshold
            if (bestResult && (1 - bestMMRScore) >= config.diversityThreshold) {
                selected.push(bestResult);
                remaining.splice(bestIndex, 1);
            }
            else {
                // No more diverse results available
                break;
            }
        }
        return selected;
    }
    /**
     * Calculate maximum similarity between a candidate and all selected results
     */
    calculateMaxSimilarityToSelected(candidate, selected, config) {
        if (selected.length === 0) {
            return 0;
        }
        let maxSimilarity = 0;
        for (const selectedResult of selected) {
            const similarity = this.calculateSimilarity(candidate, selectedResult, config);
            maxSimilarity = Math.max(maxSimilarity, similarity.overallSimilarity);
        }
        return maxSimilarity;
    }
    /**
     * Calculate comprehensive similarity between two results
     */
    calculateSimilarity(result1, result2, config) {
        // Content similarity (Jaccard similarity of tokens)
        const contentSim = this.calculateContentSimilarity(result1, result2);
        // Path similarity (based on folder structure)
        const pathSim = this.calculatePathSimilarity(result1.path, result2.path);
        // Tag similarity (Jaccard similarity of tags)
        const tagSim = this.calculateTagSimilarity(result1, result2);
        // Semantic similarity (if available from embeddings)
        let semanticSim;
        if (config.useSemanticSimilarity && result1.metadata?.embeddings && result2.metadata?.embeddings) {
            semanticSim = this.calculateCosineSimilarity(result1.metadata.embeddings, result2.metadata.embeddings);
        }
        // Weighted overall similarity
        let overallSimilarity = config.contentSimilarityWeight * contentSim +
            config.pathSimilarityWeight * pathSim +
            config.tagSimilarityWeight * tagSim;
        if (semanticSim !== undefined) {
            // If semantic similarity is available, give it more weight
            overallSimilarity = 0.4 * semanticSim + 0.6 * overallSimilarity;
        }
        return {
            contentSimilarity: contentSim,
            pathSimilarity: pathSim,
            tagSimilarity: tagSim,
            semanticSimilarity: semanticSim,
            overallSimilarity: Math.min(1.0, overallSimilarity)
        };
    }
    /**
     * Calculate content similarity using Jaccard index of tokens
     */
    calculateContentSimilarity(result1, result2) {
        const tokens1 = this.extractContentTokens(result1.content || '');
        const tokens2 = this.extractContentTokens(result2.content || '');
        return this.jaccardSimilarity(tokens1, tokens2);
    }
    /**
     * Calculate path similarity based on shared folder structure
     */
    calculatePathSimilarity(path1, path2) {
        const components1 = this.extractPathComponents(path1);
        const components2 = this.extractPathComponents(path2);
        // Higher similarity for files in same folder
        let similarity = 0;
        const minLength = Math.min(components1.length, components2.length);
        for (let i = 0; i < minLength - 1; i++) { // Exclude filename
            if (components1[i] === components2[i]) {
                similarity += 1 / (components1.length + components2.length - 2);
            }
            else {
                break;
            }
        }
        return similarity;
    }
    /**
     * Calculate tag similarity using Jaccard index
     */
    calculateTagSimilarity(result1, result2) {
        const tags1 = new Set(this.extractTags(result1.metadata?.tags || []));
        const tags2 = new Set(this.extractTags(result2.metadata?.tags || []));
        return this.jaccardSimilarity(tags1, tags2);
    }
    /**
     * Calculate cosine similarity between embedding vectors
     */
    calculateCosineSimilarity(vector1, vector2) {
        if (vector1.length !== vector2.length) {
            return 0;
        }
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
            norm1 += vector1[i] * vector1[i];
            norm2 += vector2[i] * vector2[i];
        }
        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        return magnitude > 0 ? dotProduct / magnitude : 0;
    }
    /**
     * Calculate Jaccard similarity between two sets
     */
    jaccardSimilarity(set1, set2) {
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    }
    /**
     * Extract meaningful tokens from content
     */
    extractContentTokens(content) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        ]);
        return new Set(content
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(token => token.length > 2 && !stopWords.has(token))
            .slice(0, 100) // Limit tokens for performance
        );
    }
    /**
     * Extract path components for similarity calculation
     */
    extractPathComponents(path) {
        return path.split('/').filter(component => component.length > 0);
    }
    /**
     * Extract and normalize tags
     */
    extractTags(tags) {
        if (!Array.isArray(tags)) {
            return [];
        }
        return tags
            .filter(tag => typeof tag === 'string')
            .map(tag => tag.toLowerCase().trim())
            .filter(tag => tag.length > 0);
    }
    /**
     * Normalize search scores to [0, 1] range
     */
    normalizeScore(score, allResults) {
        if (allResults.length <= 1) {
            return 1;
        }
        const scores = allResults.map(r => r.score);
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);
        if (maxScore === minScore) {
            return 1;
        }
        return (score - minScore) / (maxScore - minScore);
    }
    /**
     * Calculate diversity improvement metric
     */
    calculateDiversityImprovement(original, ranked) {
        if (original.length <= 1 || ranked.length <= 1) {
            return 0;
        }
        // Simple diversity metric: average pairwise difference in content length
        const originalDiversity = this.calculateAveragePairwiseDifference(original);
        const rankedDiversity = this.calculateAveragePairwiseDifference(ranked);
        return rankedDiversity - originalDiversity;
    }
    /**
     * Calculate average pairwise difference (simple diversity metric)
     */
    calculateAveragePairwiseDifference(results) {
        if (results.length <= 1) {
            return 0;
        }
        let totalDifference = 0;
        let pairs = 0;
        for (let i = 0; i < results.length; i++) {
            for (let j = i + 1; j < results.length; j++) {
                const len1 = results[i].content?.length || 0;
                const len2 = results[j].content?.length || 0;
                totalDifference += Math.abs(len1 - len2);
                pairs++;
            }
        }
        return pairs > 0 ? totalDifference / pairs : 0;
    }
    /**
     * Get adaptive lambda value based on query characteristics
     */
    getAdaptiveLambda(query, resultCount) {
        // For very specific queries, favor relevance
        if (query.length < 10 || query.includes('"')) {
            return 0.9;
        }
        // For exploratory queries with many results, favor diversity
        if (resultCount > 50) {
            return 0.5;
        }
        // Default balanced approach
        return 0.7;
    }
}
export const mmrRanker = new MMRRanker();
