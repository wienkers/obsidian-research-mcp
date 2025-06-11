import { describe, it, expect, vi } from 'vitest';
import { StreamingProcessor } from './streaming.js';
describe('StreamingProcessor', () => {
    const processor = new StreamingProcessor();
    it('should process items in chunks', async () => {
        const items = Array.from({ length: 10 }, (_, i) => i);
        const doubleValue = vi.fn(async (x) => x * 2);
        const results = [];
        for await (const chunk of processor.processInChunks(items, doubleValue, { chunkSize: 3 })) {
            results.push(chunk);
        }
        // Should have processed all items
        expect(doubleValue).toHaveBeenCalledTimes(10);
        // Results should be chunked
        expect(results).toHaveLength(4); // 10 items with chunkSize 3 = 4 chunks (3,3,3,1)
        expect(results.flat()).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    });
    it('should handle memory-aware processing', async () => {
        const items = Array.from({ length: 5 }, (_, i) => ({ id: i, data: 'test' }));
        const processorFn = vi.fn(async (item) => ({
            ...item,
            processed: true
        }));
        const estimateSize = (item) => JSON.stringify(item).length;
        const results = [];
        for await (const batch of processor.memoryAwareProcessing(items, processorFn, estimateSize, 1 // 1MB limit, should be plenty for test data
        )) {
            results.push(...batch);
        }
        expect(processorFn).toHaveBeenCalledTimes(5);
        expect(results).toHaveLength(5);
        expect(results.every(r => r.processed)).toBe(true);
    });
    it('should handle progress tracking', async () => {
        const items = Array.from({ length: 5 }, (_, i) => i);
        const asyncDouble = vi.fn(async (x) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return x * 2;
        });
        const progressUpdates = [];
        const onProgress = vi.fn((progress) => {
            progressUpdates.push(progress);
        });
        const results = [];
        for await (const chunk of processor.processInChunks(items, asyncDouble, { chunkSize: 2 }, onProgress)) {
            results.push(chunk);
        }
        expect(progressUpdates.length).toBeGreaterThan(0);
        expect(progressUpdates[progressUpdates.length - 1].processed).toBe(5);
        expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });
    it('should handle timeouts in processing', async () => {
        const items = [1, 2, 3];
        const slowProcessor = vi.fn(async (x) => {
            if (x === 2) {
                await new Promise(resolve => setTimeout(resolve, 100)); // This will timeout
            }
            return x * 2;
        });
        const results = [];
        for await (const chunk of processor.processInChunks(items, slowProcessor, { chunkSize: 1, timeoutMs: 50 })) {
            results.push(chunk);
        }
        // Should process items 1 and 3, but timeout on item 2
        expect(results.flat()).toHaveLength(2); // Only 2 successful results
        expect(results.flat()).toContain(2); // 1 * 2
        expect(results.flat()).toContain(6); // 3 * 2
    });
});
