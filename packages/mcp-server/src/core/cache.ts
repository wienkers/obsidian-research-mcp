import { logger } from './logger.js';
import { config } from './config.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  dependencies?: string[];
}

export class IntelligentCache {
  private cache = new Map<string, CacheEntry<any>>();
  private dependencyGraph = new Map<string, Set<string>>();
  
  async get<T>(key: string): Promise<T | null> {
    if (!config.cacheEnabled) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      await this.invalidate(key);
      return null;
    }

    if (await this.hasDependencyChanged(entry)) {
      await this.invalidate(key);
      return null;
    }

    logger.debug(`Cache hit for key: ${key}`);
    return entry.data;
  }

  async set<T>(
    key: string, 
    data: T, 
    ttl: number = config.cacheTtl,
    dependencies?: string[]
  ): Promise<void> {
    if (!config.cacheEnabled) {
      return;
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      dependencies,
    };

    this.cache.set(key, entry);

    // Update dependency graph
    if (dependencies) {
      for (const dep of dependencies) {
        if (!this.dependencyGraph.has(dep)) {
          this.dependencyGraph.set(dep, new Set());
        }
        this.dependencyGraph.get(dep)!.add(key);
      }
    }

    logger.debug(`Cache set for key: ${key}`, { ttl, dependencies });
  }

  async invalidate(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (!entry) {
      return;
    }

    this.cache.delete(key);

    // Remove from dependency graph
    if (entry.dependencies) {
      for (const dep of entry.dependencies) {
        const dependents = this.dependencyGraph.get(dep);
        if (dependents) {
          dependents.delete(key);
          if (dependents.size === 0) {
            this.dependencyGraph.delete(dep);
          }
        }
      }
    }

    logger.debug(`Cache invalidated for key: ${key}`);
  }

  async invalidateByDependency(dependency: string): Promise<void> {
    const dependents = this.dependencyGraph.get(dependency);
    if (!dependents) {
      return;
    }

    const keysToInvalidate = Array.from(dependents);
    await Promise.all(keysToInvalidate.map(key => this.invalidate(key)));

    logger.debug(`Cache invalidated for dependency: ${dependency}`, {
      invalidatedKeys: keysToInvalidate,
    });
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.dependencyGraph.clear();
    logger.info('Cache cleared');
  }

  getStats() {
    return {
      size: this.cache.size,
      dependencies: this.dependencyGraph.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        expired: this.isExpired(entry),
        dependencies: entry.dependencies,
      })),
    };
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private async hasDependencyChanged(entry: CacheEntry<any>): Promise<boolean> {
    if (!entry.dependencies) {
      return false;
    }

    // Check if any dependency has been modified
    // This would typically check file modification times or other change indicators
    // Simple dependency validation - could be enhanced with file system watching
    for (const dep of entry.dependencies) {
      // OPTIMIZATION OPPORTUNITY: File mtime checking, database timestamps, or FS watchers
      // Current implementation uses conservative time-based invalidation for simplicity
      logger.debug('Dependency check', { dependency: dep });
    }

    return false;
  }
}

export const cache = new IntelligentCache();