export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl: number;
    dependencies: Set<string>;
    accessCount: number;
    lastAccessed: number;
    size: number;
}
export interface CacheStats {
    size: number;
    maxSize: number;
    hitCount: number;
    missCount: number;
    evictionCount: number;
    memoryUsage: number;
    hitRate: number;
}
export interface CacheOptions {
    maxSize: number;
    maxMemoryMB: number;
    defaultTtl: number;
    enableLRU: boolean;
    enableMemoryMonitoring: boolean;
    warmupKeys: string[];
}
export declare class SmartCache {
    private options;
    private cache;
    private dependencies;
    private hitCount;
    private missCount;
    private evictionCount;
    private accessOrder;
    private memoryUsage;
    constructor(options: CacheOptions);
    /**
     * Get value from cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache with dependencies
     */
    set<T>(key: string, value: T, ttl?: number, dependencies?: string[]): Promise<void>;
    /**
     * Delete specific key
     */
    delete(key: string): boolean;
    /**
     * Invalidate all entries that depend on a specific dependency
     */
    invalidateDependency(dependency: string): number;
    /**
     * Invalidate all entries that match a pattern
     */
    invalidatePattern(pattern: RegExp): number;
    /**
     * Partial invalidation for file changes
     */
    invalidateFile(filePath: string): number;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get all cache keys (for debugging)
     */
    getKeys(): string[];
    /**
     * Preload frequently accessed data
     */
    private warmupCache;
    /**
     * Update LRU access order
     */
    private updateAccessOrder;
    /**
     * Remove key from access order
     */
    private removeFromAccessOrder;
    /**
     * Evict least recently used entries
     */
    private evictLRU;
    /**
     * Evict entries to fit new data within memory limits
     */
    private evictToFitMemory;
    /**
     * Update dependency mappings
     */
    private updateDependencyMappings;
    /**
     * Remove dependency mappings for a key
     */
    private removeDependencyMappings;
    /**
     * Estimate memory size of an object
     */
    private estimateSize;
    /**
     * Escape regex special characters
     */
    private escapeRegex;
    /**
     * Start memory monitoring
     */
    private startMemoryMonitoring;
}
export declare const smartCache: SmartCache;
//# sourceMappingURL=smart-cache.d.ts.map