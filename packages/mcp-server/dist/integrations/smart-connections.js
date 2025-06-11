import fetch from 'node-fetch';
import https from 'https';
import { config } from '../core/config.js';
import { logger, LoggedError } from '../core/logger.js';
export class SmartConnectionsAPI {
    baseUrl;
    headers;
    isEnabled;
    agent;
    constructor() {
        this.isEnabled = config.smartConnectionsEnabled;
        // Use custom endpoints registered by Research MCP Bridge plugin
        this.baseUrl = config.obsidianApiUrl.replace(/\/$/, '');
        this.headers = {
            'Content-Type': 'application/json',
        };
        if (config.obsidianApiKey) {
            this.headers['Authorization'] = `Bearer ${config.obsidianApiKey}`;
        }
        // Create HTTPS agent to bypass SSL verification for self-signed certificates
        if (this.baseUrl.startsWith('https')) {
            this.agent = new https.Agent({
                rejectUnauthorized: false
            });
        }
    }
    async isAvailable() {
        if (!this.isEnabled) {
            logger.debug('Smart Connections disabled in configuration');
            return false;
        }
        try {
            // Test custom /search/smart endpoint registered by Research MCP Bridge plugin
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(`${this.baseUrl}/search/smart`, {
                method: 'POST',
                headers: this.headers,
                agent: this.agent,
                signal: controller.signal,
                body: JSON.stringify({
                    query: "test",
                    filter: { limit: 1 }
                }),
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                logger.info('✅ Smart Connections available via custom endpoint');
                return true;
            }
            else if (response.status === 503) {
                logger.info('⚠️ Custom endpoint available but Smart Connections plugin not ready');
                return false; // Plugin loaded but Smart Connections not available
            }
            else if (response.status === 404) {
                logger.warn('❌ Custom endpoint not found - Research MCP Bridge plugin may not be loaded');
                return false;
            }
            else {
                logger.warn('Smart Connections endpoint error', {
                    status: response.status,
                    statusText: response.statusText
                });
                return false;
            }
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                logger.warn('Smart Connections API timeout - check plugin and Smart Connections installation');
            }
            else {
                logger.debug('Smart Connections custom endpoint not available', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
            return false;
        }
    }
    async searchSemantic(query, options = {}) {
        if (!this.isEnabled) {
            logger.debug('Smart Connections disabled');
            return [];
        }
        try {
            logger.info('Performing Smart Connections semantic search via custom endpoint', { query, options });
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            // Build filter object with only defined values to avoid validation issues
            const filter = {
                limit: options.limit || config.maxSearchResults,
            };
            if (options.folders && options.folders.length > 0) {
                filter.folders = options.folders;
            }
            // Only add excludeFolders if it has actual values
            if (options.folders && Array.isArray(options.folders) && options.folders.length === 0) {
                // If folders is explicitly set to empty array, don't exclude anything
            }
            else if (!options.folders) {
                // If no folders specified, we might want to exclude certain folders
                // Leave excludeFolders undefined for now
            }
            const response = await fetch(`${this.baseUrl}/search/smart`, {
                method: 'POST',
                headers: this.headers,
                agent: this.agent,
                signal: controller.signal,
                body: JSON.stringify({
                    query,
                    filter,
                    threshold: options.threshold || config.semanticSimilarityThreshold
                }),
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                if (response.status === 503) {
                    logger.warn('Smart Connections plugin not available in Obsidian');
                }
                else if (response.status === 404) {
                    logger.warn('Custom endpoint not available - Research MCP Bridge plugin may not be loaded');
                }
                else {
                    logger.error('Smart Connections search failed', {
                        status: response.status,
                        statusText: response.statusText,
                        query
                    });
                }
                return [];
            }
            const data = await response.json();
            if (!data.results || !Array.isArray(data.results)) {
                logger.warn('Invalid response from Smart Connections custom endpoint', { data });
                return [];
            }
            const threshold = options.threshold || config.semanticSimilarityThreshold;
            // Apply client-side threshold filtering to ensure results meet minimum similarity
            const filteredResults = data.results.filter(result => result.score >= threshold);
            logger.info(`✅ Smart Connections search completed: ${data.results.length} raw results, ${filteredResults.length} after threshold filtering (≥${threshold})`, { query, threshold });
            return filteredResults.map(result => ({
                path: result.path,
                title: result.path.split('/').pop()?.replace(/\.md$/, '') || result.path,
                content: result.text || '',
                score: result.score || 0,
                relevanceType: 'semantic',
                matchedTerms: [query],
                contextSnippets: result.text ? [this.extractSnippet(result.text, query)] : undefined,
                metadata: {
                    similarity: result.score,
                    breadcrumbs: result.breadcrumbs,
                }
            }));
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                logger.warn('Smart Connections search timeout', { query });
            }
            else {
                logger.error('Smart Connections semantic search failed', {
                    error: error instanceof Error ? error.message : String(error),
                    query,
                    options
                });
            }
            return [];
        }
    }
    async findSimilar(notePath, options = {}) {
        if (!this.isEnabled || !await this.isAvailable()) {
            return [];
        }
        try {
            const response = await fetch(`${this.baseUrl}/similar`, {
                method: 'POST',
                headers: this.headers,
                agent: this.agent,
                body: JSON.stringify({
                    path: notePath,
                    limit: options.limit || 10,
                    threshold: options.threshold || config.semanticSimilarityThreshold,
                    filter: {
                        folders: options.folders,
                    }
                }),
            });
            if (!response.ok) {
                throw new LoggedError(`Smart Connections similarity search failed: ${response.statusText}`);
            }
            const data = await response.json();
            const threshold = options.threshold || config.semanticSimilarityThreshold;
            // Apply client-side threshold filtering for similarity search too
            const filteredResults = data.results.filter(result => result.similarity >= threshold);
            logger.info(`✅ Smart Connections similarity search completed: ${data.results.length} raw results, ${filteredResults.length} after threshold filtering (≥${threshold})`, { notePath, threshold });
            return filteredResults.map(result => ({
                path: result.path,
                title: result.title,
                content: result.content,
                score: result.similarity,
                relevanceType: 'semantic',
                matchedTerms: [], // Similar doesn't have specific terms
                metadata: {
                    similarity: result.similarity,
                    sourceNote: notePath,
                }
            }));
        }
        catch (error) {
            throw new LoggedError('Smart Connections similarity search failed', { error, notePath, options });
        }
    }
    async getEmbedding(text) {
        if (!this.isEnabled || !await this.isAvailable()) {
            throw new LoggedError('Smart Connections not available for embeddings');
        }
        try {
            const response = await fetch(`${this.baseUrl}/embed`, {
                method: 'POST',
                headers: this.headers,
                agent: this.agent,
                body: JSON.stringify({ text }),
            });
            if (!response.ok) {
                throw new LoggedError(`Smart Connections embedding failed: ${response.statusText}`);
            }
            const data = await response.json();
            return data.embedding;
        }
        catch (error) {
            throw new LoggedError('Smart Connections embedding failed', { error, text: text.substring(0, 100) });
        }
    }
    async calculateSimilarity(text1, text2) {
        try {
            const [embedding1, embedding2] = await Promise.all([
                this.getEmbedding(text1),
                this.getEmbedding(text2)
            ]);
            return this.cosineSimilarity(embedding1, embedding2);
        }
        catch (error) {
            throw new LoggedError('Failed to calculate semantic similarity', { error });
        }
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    extractSnippet(content, query, maxLength = 200) {
        const queryLower = query.toLowerCase();
        const contentLower = content.toLowerCase();
        const index = contentLower.indexOf(queryLower);
        if (index === -1) {
            return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
        }
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + query.length + 50);
        let snippet = content.substring(start, end);
        if (start > 0)
            snippet = '...' + snippet;
        if (end < content.length)
            snippet = snippet + '...';
        return snippet;
    }
}
export const smartConnectionsAPI = new SmartConnectionsAPI();
