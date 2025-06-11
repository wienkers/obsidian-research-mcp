import { logger } from './logger.js';
/**
 * Simple in-memory rate limiter for MCP server
 * Tracks requests per client/tool combination
 */
export class RateLimiter {
    requests = new Map();
    config;
    constructor(config) {
        this.config = {
            message: 'Rate limit exceeded. Please slow down your requests.',
            ...config
        };
        // Clean up old entries periodically
        setInterval(() => this.cleanup(), this.config.windowMs);
    }
    /**
     * Check if request should be allowed
     * @param key - Unique identifier for rate limiting (e.g., "client-id:tool-name")
     * @returns Rate limit result
     */
    checkLimit(key) {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        // Get or create request history for this key
        let requestTimes = this.requests.get(key) || [];
        // Remove old requests outside the window
        requestTimes = requestTimes.filter(time => time > windowStart);
        // Check if limit exceeded
        if (requestTimes.length >= this.config.maxRequests) {
            const oldestRequest = Math.min(...requestTimes);
            const resetTime = oldestRequest + this.config.windowMs;
            logger.warn('Rate limit exceeded', {
                key,
                requests: requestTimes.length,
                maxRequests: this.config.maxRequests,
                windowMs: this.config.windowMs,
                resetTime
            });
            return {
                allowed: false,
                resetTime,
                remaining: 0,
                message: this.config.message
            };
        }
        // Add current request
        requestTimes.push(now);
        this.requests.set(key, requestTimes);
        const remaining = this.config.maxRequests - requestTimes.length;
        const resetTime = now + this.config.windowMs;
        return {
            allowed: true,
            resetTime,
            remaining
        };
    }
    /**
     * Clean up old entries to prevent memory leaks
     */
    cleanup() {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        let cleanedKeys = 0;
        for (const [key, requestTimes] of this.requests.entries()) {
            const validRequests = requestTimes.filter(time => time > windowStart);
            if (validRequests.length === 0) {
                this.requests.delete(key);
                cleanedKeys++;
            }
            else if (validRequests.length < requestTimes.length) {
                this.requests.set(key, validRequests);
            }
        }
        if (cleanedKeys > 0) {
            logger.debug('Rate limiter cleanup completed', {
                cleanedKeys,
                activeKeys: this.requests.size
            });
        }
    }
    /**
     * Get current stats for monitoring
     */
    getStats() {
        let totalRequests = 0;
        for (const requests of this.requests.values()) {
            totalRequests += requests.length;
        }
        return {
            activeKeys: this.requests.size,
            totalRequests
        };
    }
    /**
     * Reset rate limiter (useful for testing)
     */
    reset() {
        this.requests.clear();
        logger.info('Rate limiter reset');
    }
}
/**
 * Pre-configured rate limiters for different operations
 */
export const rateLimiters = {
    // General API rate limiter - 30 requests per minute
    api: new RateLimiter({
        maxRequests: 30,
        windowMs: 60 * 1000, // 1 minute
        message: 'API rate limit exceeded. Maximum 30 requests per minute.'
    }),
    // Search operations - 10 requests per minute (more expensive)
    search: new RateLimiter({
        maxRequests: 10,
        windowMs: 60 * 1000, // 1 minute  
        message: 'Search rate limit exceeded. Maximum 10 searches per minute.'
    }),
    // File operations - 50 requests per minute
    files: new RateLimiter({
        maxRequests: 50,
        windowMs: 60 * 1000, // 1 minute
        message: 'File operation rate limit exceeded. Maximum 50 operations per minute.'
    }),
    // Bulk operations - 5 requests per minute (very expensive)
    bulk: new RateLimiter({
        maxRequests: 5,
        windowMs: 60 * 1000, // 1 minute
        message: 'Bulk operation rate limit exceeded. Maximum 5 bulk operations per minute.'
    })
};
/**
 * Determine which rate limiter to use based on tool name
 */
export function getRateLimiterForTool(toolName) {
    // Search operations - includes semantic and pattern search
    if (toolName.includes('search') || toolName.includes('semantic') || toolName.includes('pattern')) {
        return rateLimiters.search;
    }
    // Bulk operations
    if (toolName.includes('multiple') || toolName.includes('batch') ||
        toolName.includes('extract_structure') || toolName.includes('extract_patterns')) {
        return rateLimiters.bulk;
    }
    // File operations
    if (toolName.includes('file') || toolName.includes('note') ||
        toolName.includes('list') || toolName.includes('get_') ||
        toolName.includes('update') || toolName.includes('write')) {
        return rateLimiters.files;
    }
    // Default to general API rate limiter
    return rateLimiters.api;
}
