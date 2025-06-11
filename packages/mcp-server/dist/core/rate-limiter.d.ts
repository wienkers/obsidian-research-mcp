export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    message?: string;
}
export interface RateLimitResult {
    allowed: boolean;
    resetTime: number;
    remaining: number;
    message?: string;
}
/**
 * Simple in-memory rate limiter for MCP server
 * Tracks requests per client/tool combination
 */
export declare class RateLimiter {
    private requests;
    private readonly config;
    constructor(config: RateLimitConfig);
    /**
     * Check if request should be allowed
     * @param key - Unique identifier for rate limiting (e.g., "client-id:tool-name")
     * @returns Rate limit result
     */
    checkLimit(key: string): RateLimitResult;
    /**
     * Clean up old entries to prevent memory leaks
     */
    private cleanup;
    /**
     * Get current stats for monitoring
     */
    getStats(): {
        activeKeys: number;
        totalRequests: number;
    };
    /**
     * Reset rate limiter (useful for testing)
     */
    reset(): void;
}
/**
 * Pre-configured rate limiters for different operations
 */
export declare const rateLimiters: {
    api: RateLimiter;
    search: RateLimiter;
    files: RateLimiter;
    bulk: RateLimiter;
};
/**
 * Determine which rate limiter to use based on tool name
 */
export declare function getRateLimiterForTool(toolName: string): RateLimiter;
//# sourceMappingURL=rate-limiter.d.ts.map