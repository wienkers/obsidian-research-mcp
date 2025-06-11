import { describe, it, expect, beforeEach } from 'vitest';
import { SmartCache } from './smart-cache.js';
describe('SmartCache', () => {
    let cache;
    beforeEach(() => {
        cache = new SmartCache({
            maxMemoryMB: 100,
            enableMemoryMonitoring: false, // Disable for tests
            maxSize: 1000,
            defaultTtl: 300000,
            enableLRU: true,
            warmupKeys: [] // Empty array for tests
        });
    });
    it('should store and retrieve values', async () => {
        await cache.set('test-key', { data: 'test value' });
        const result = await cache.get('test-key');
        expect(result).toEqual({ data: 'test value' });
    });
    it('should return null for non-existent keys', async () => {
        const result = await cache.get('non-existent');
        expect(result).toBeNull();
    });
    it('should handle dependencies and invalidation', async () => {
        await cache.set('key1', { data: 'value1' }, 300000, ['file1.md']);
        await cache.set('key2', { data: 'value2' }, 300000, ['file2.md']);
        // Verify both values exist
        expect(await cache.get('key1')).toEqual({ data: 'value1' });
        expect(await cache.get('key2')).toEqual({ data: 'value2' });
        // Invalidate file1.md dependencies
        const invalidatedCount = cache.invalidateDependency('file1.md');
        expect(invalidatedCount).toBe(1);
        // key1 should be gone, key2 should remain
        expect(await cache.get('key1')).toBeNull();
        expect(await cache.get('key2')).toEqual({ data: 'value2' });
    });
    it('should handle TTL expiration', async () => {
        await cache.set('ttl-key', { data: 'expires soon' }, 50);
        // Should exist immediately
        expect(await cache.get('ttl-key')).toEqual({ data: 'expires soon' });
        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 100));
        // Should be expired
        expect(await cache.get('ttl-key')).toBeNull();
    });
    it('should track memory usage', async () => {
        const initialStats = cache.getStats();
        // Add some data
        await cache.set('memory-test', {
            largeData: 'x'.repeat(1000)
        });
        const afterStats = cache.getStats();
        expect(afterStats.memoryUsage).toBeGreaterThan(initialStats.memoryUsage);
        expect(afterStats.size).toBe(initialStats.size + 1);
    });
});
