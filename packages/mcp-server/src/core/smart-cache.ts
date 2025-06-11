import { logger } from './logger.js';
import { config } from './config.js';

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

export class SmartCache {
  private cache = new Map<string, CacheEntry<any>>();
  private dependencies = new Map<string, Set<string>>();
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;
  private accessOrder: string[] = [];
  private memoryUsage = 0;

  constructor(private options: CacheOptions) {
    if (this.options.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }
    
    // Defer warmup to avoid blocking initialization
    // this.warmupCache();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      this.missCount++;
      return null;
    }

    // Update LRU order
    if (this.options.enableLRU) {
      this.updateAccessOrder(key);
    }
    
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hitCount++;
    
    return entry.value;
  }

  /**
   * Set value in cache with dependencies
   */
  async set<T>(
    key: string, 
    value: T, 
    ttl: number = this.options.defaultTtl,
    dependencies: string[] = []
  ): Promise<void> {
    const size = this.estimateSize(value);
    
    // Check memory limits
    if (this.options.enableMemoryMonitoring && 
        this.memoryUsage + size > this.options.maxMemoryMB * 1024 * 1024) {
      await this.evictToFitMemory(size);
    }

    // Check size limits
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      dependencies: new Set(dependencies),
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
    };

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.removeDependencyMappings(key);
      const oldEntry = this.cache.get(key)!;
      this.memoryUsage -= oldEntry.size;
    }

    this.cache.set(key, entry);
    this.memoryUsage += size;
    
    // Update dependency mappings
    this.updateDependencyMappings(key, dependencies);
    
    // Update LRU order
    if (this.options.enableLRU) {
      this.updateAccessOrder(key);
    }

    logger.debug('Cache entry set', { key, dependencies, size, ttl });
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.memoryUsage -= entry.size;
    this.removeDependencyMappings(key);
    this.removeFromAccessOrder(key);
    
    logger.debug('Cache entry deleted', { key });
    return true;
  }

  /**
   * Invalidate all entries that depend on a specific dependency
   */
  invalidateDependency(dependency: string): number {
    const dependentKeys = this.dependencies.get(dependency);
    if (!dependentKeys) {
      return 0;
    }

    let invalidatedCount = 0;
    for (const key of dependentKeys) {
      if (this.delete(key)) {
        invalidatedCount++;
      }
    }

    this.dependencies.delete(dependency);
    
    logger.debug('Cache dependency invalidated', { dependency, invalidatedCount });
    return invalidatedCount;
  }

  /**
   * Invalidate all entries that match a pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidatedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        if (this.delete(key)) {
          invalidatedCount++;
        }
      }
    }

    logger.debug('Cache pattern invalidated', { pattern: pattern.source, invalidatedCount });
    return invalidatedCount;
  }

  /**
   * Partial invalidation for file changes
   */
  invalidateFile(filePath: string): number {
    const patterns = [
      new RegExp(`file:${this.escapeRegex(filePath)}`),
      new RegExp(`path:${this.escapeRegex(filePath)}`),
      new RegExp(`content:${this.escapeRegex(filePath)}`),
    ];

    let totalInvalidated = 0;
    for (const pattern of patterns) {
      totalInvalidated += this.invalidatePattern(pattern);
    }

    // Also invalidate general patterns that might include this file
    totalInvalidated += this.invalidatePattern(/^search:/);
    totalInvalidated += this.invalidatePattern(/^graph:/);
    totalInvalidated += this.invalidatePattern(/^relationships:/);

    logger.info('File cache invalidation', { filePath, totalInvalidated });
    return totalInvalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      evictionCount: this.evictionCount,
      memoryUsage: this.memoryUsage,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.dependencies.clear();
    this.accessOrder = [];
    this.memoryUsage = 0;
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
    
    logger.info('Cache cleared');
  }

  /**
   * Get all cache keys (for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Preload frequently accessed data
   */
  private async warmupCache(): Promise<void> {
    if (!this.options.warmupKeys.length) {
      return;
    }

    logger.info('Starting cache warmup', { keys: this.options.warmupKeys });
    
    // This would be implemented based on specific warmup strategies
    // For now, just log the intent
    for (const key of this.options.warmupKeys) {
      logger.debug('Warmup key identified', { key });
    }
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const keyToEvict = this.accessOrder[0];
    this.delete(keyToEvict);
    this.evictionCount++;
    
    logger.debug('LRU eviction', { evictedKey: keyToEvict });
  }

  /**
   * Evict entries to fit new data within memory limits
   */
  private async evictToFitMemory(requiredSize: number): Promise<void> {
    const targetMemory = this.options.maxMemoryMB * 1024 * 1024 * 0.8; // 80% of max
    
    while (this.memoryUsage + requiredSize > targetMemory && this.cache.size > 0) {
      // Evict largest entries first, then LRU
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => {
        // Sort by size descending, then by last accessed ascending
        const sizeDiff = b[1].size - a[1].size;
        if (sizeDiff !== 0) return sizeDiff;
        return a[1].lastAccessed - b[1].lastAccessed;
      });

      if (entries.length > 0) {
        const [keyToEvict] = entries[0];
        this.delete(keyToEvict);
        this.evictionCount++;
        
        logger.debug('Memory-based eviction', { evictedKey: keyToEvict });
      } else {
        break;
      }
    }
  }

  /**
   * Update dependency mappings
   */
  private updateDependencyMappings(key: string, dependencies: string[]): void {
    for (const dep of dependencies) {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep)!.add(key);
    }
  }

  /**
   * Remove dependency mappings for a key
   */
  private removeDependencyMappings(key: string): void {
    for (const [dep, keys] of this.dependencies) {
      keys.delete(key);
      if (keys.size === 0) {
        this.dependencies.delete(dep);
      }
    }
  }

  /**
   * Estimate memory size of an object
   */
  private estimateSize(obj: any): number {
    if (obj === null || obj === undefined) {
      return 8;
    }

    if (typeof obj === 'string') {
      return obj.length * 2; // UTF-16 encoding
    }

    if (typeof obj === 'number') {
      return 8;
    }

    if (typeof obj === 'boolean') {
      return 4;
    }

    if (Array.isArray(obj)) {
      return obj.reduce((size, item) => size + this.estimateSize(item), 24);
    }

    if (typeof obj === 'object') {
      return Object.entries(obj).reduce(
        (size, [key, value]) => size + this.estimateSize(key) + this.estimateSize(value),
        24
      );
    }

    return 16; // Default size for unknown types
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const stats = this.getStats();
      
      if (stats.memoryUsage > this.options.maxMemoryMB * 1024 * 1024 * 0.9) {
        logger.warn('Cache memory usage high', {
          memoryUsage: stats.memoryUsage,
          maxMemory: this.options.maxMemoryMB * 1024 * 1024,
          cacheSize: stats.size,
        });
      }

      logger.debug('Cache stats', stats);
    }, 60000); // Check every minute
  }
}

// Create global cache instance with configuration - optimized for fast startup
export const smartCache = new SmartCache({
  maxSize: 500, // Reduced for faster startup
  maxMemoryMB: 25, // Reduced memory footprint
  defaultTtl: (config.cacheTtl || 300) * 1000, // Default 5 minutes if not set
  enableLRU: true,
  enableMemoryMonitoring: false, // Disabled for faster startup
  warmupKeys: [], // No warmup keys for instant startup
});