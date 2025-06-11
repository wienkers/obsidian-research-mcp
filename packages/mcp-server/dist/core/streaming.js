import { Readable, Transform } from 'stream';
import { logger } from './logger.js';
export class StreamingProcessor {
    defaultOptions = {
        chunkSize: 50,
        maxConcurrent: 3,
        yieldEvery: 10,
        timeoutMs: 30000,
    };
    /**
     * Process array in chunks with progress tracking
     */
    async *processInChunks(items, processor, options = {}, onProgress) {
        const opts = { ...this.defaultOptions, ...options };
        const startTime = Date.now();
        let processed = 0;
        for (let i = 0; i < items.length; i += opts.chunkSize) {
            const chunk = items.slice(i, i + opts.chunkSize);
            const promises = chunk.map((item, chunkIndex) => this.withTimeout(processor(item, i + chunkIndex), opts.timeoutMs));
            const results = await Promise.allSettled(promises);
            const successfulResults = [];
            for (let j = 0; j < results.length; j++) {
                const result = results[j];
                if (result.status === 'fulfilled') {
                    successfulResults.push(result.value);
                }
                else {
                    logger.warn('Item processing failed in chunk', {
                        chunkIndex: i + j,
                        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                    });
                }
            }
            processed += chunk.length;
            if (onProgress) {
                const elapsed = Date.now() - startTime;
                const rate = processed / elapsed * 1000; // items per second
                const remaining = items.length - processed;
                const estimatedRemaining = remaining > 0 ? remaining / rate * 1000 : 0;
                onProgress({
                    processed,
                    total: items.length,
                    percentage: (processed / items.length) * 100,
                    startTime,
                    estimatedRemaining,
                });
            }
            yield successfulResults;
            // Yield control periodically to prevent blocking
            if (processed % opts.yieldEvery === 0) {
                await this.yield();
            }
        }
    }
    /**
     * Stream large result sets as readable stream
     */
    createResultStream(dataSource, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        let generator = null;
        let isReading = false;
        return new Readable({
            objectMode: true,
            highWaterMark: opts.chunkSize,
            async read() {
                if (isReading)
                    return;
                isReading = true;
                try {
                    if (!generator) {
                        generator = dataSource();
                    }
                    const { value, done } = await generator.next();
                    if (done) {
                        this.push(null); // End stream
                    }
                    else {
                        this.push(JSON.stringify(value) + '\n');
                    }
                }
                catch (error) {
                    this.emit('error', error);
                }
                finally {
                    isReading = false;
                }
            },
            destroy(error, callback) {
                if (generator) {
                    generator.return();
                }
                callback(error);
            },
        });
    }
    /**
     * Create transform stream for processing data
     */
    createProcessingStream(processor, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        let activeProcessing = 0;
        const queue = [];
        const processNext = async () => {
            if (activeProcessing >= opts.maxConcurrent || queue.length === 0) {
                return;
            }
            const { data, callback } = queue.shift();
            activeProcessing++;
            try {
                const result = await this.withTimeout(processor(data), opts.timeoutMs);
                callback(undefined, result);
            }
            catch (error) {
                callback(error instanceof Error ? error : new Error(String(error)));
            }
            finally {
                activeProcessing--;
                setImmediate(processNext);
            }
        };
        return new Transform({
            objectMode: true,
            highWaterMark: opts.chunkSize,
            transform(chunk, encoding, callback) {
                queue.push({
                    data: chunk,
                    callback: (error, result) => {
                        if (error) {
                            callback(error);
                        }
                        else {
                            callback(null, result);
                        }
                    },
                });
                processNext();
            },
            flush(callback) {
                const checkCompletion = () => {
                    if (activeProcessing === 0 && queue.length === 0) {
                        callback();
                    }
                    else {
                        setTimeout(checkCompletion, 10);
                    }
                };
                checkCompletion();
            },
        });
    }
    /**
     * Process large file operations with streaming
     */
    async *streamFileOperations(filePaths, operation, options = {}, onProgress) {
        yield* this.processInChunks(filePaths, async (path, index) => {
            try {
                const result = await operation(path);
                return { path, result, error: undefined };
            }
            catch (error) {
                logger.debug('File operation failed', {
                    path,
                    error: error instanceof Error ? error.message : String(error),
                });
                return {
                    path,
                    result: null,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        }, options, onProgress);
    }
    /**
     * Batch process with memory-aware chunking
     */
    async *memoryAwareProcessing(items, processor, estimateSize, maxMemoryMB, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        const maxMemoryBytes = maxMemoryMB * 1024 * 1024;
        let currentMemory = 0;
        let currentChunk = [];
        for (const item of items) {
            const itemSize = estimateSize(item);
            if (currentMemory + itemSize > maxMemoryBytes && currentChunk.length > 0) {
                // Process current chunk
                const results = await this.processChunk(currentChunk, processor, opts);
                yield results;
                // Reset for next chunk
                currentChunk = [];
                currentMemory = 0;
            }
            currentChunk.push(item);
            currentMemory += itemSize;
            // Also respect chunk size limits
            if (currentChunk.length >= opts.chunkSize) {
                const results = await this.processChunk(currentChunk, processor, opts);
                yield results;
                currentChunk = [];
                currentMemory = 0;
            }
        }
        // Process remaining items
        if (currentChunk.length > 0) {
            const results = await this.processChunk(currentChunk, processor, opts);
            yield results;
        }
    }
    /**
     * Create backpressure-aware stream
     */
    async processWithBackpressure(items, processor, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        const results = [];
        let activePromises = 0;
        let index = 0;
        return new Promise((resolve, reject) => {
            const processNext = () => {
                while (activePromises < opts.maxConcurrent && index < items.length) {
                    const currentIndex = index++;
                    const item = items[currentIndex];
                    activePromises++;
                    this.withTimeout(processor(item), opts.timeoutMs)
                        .then(result => {
                        results[currentIndex] = result;
                        activePromises--;
                        if (index >= items.length && activePromises === 0) {
                            resolve(results);
                        }
                        else {
                            processNext();
                        }
                    })
                        .catch(error => {
                        activePromises--;
                        reject(error);
                    });
                }
            };
            processNext();
        });
    }
    async processChunk(chunk, processor, options) {
        const results = await Promise.allSettled(chunk.map(item => this.withTimeout(processor(item), options.timeoutMs)));
        return results
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value);
    }
    async withTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)),
        ]);
    }
    async yield() {
        return new Promise(resolve => setImmediate(resolve));
    }
}
export const streamingProcessor = new StreamingProcessor();
