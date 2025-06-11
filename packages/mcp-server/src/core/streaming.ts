import { Readable, Transform } from 'stream';
import { logger } from './logger.js';

export interface StreamingOptions {
  chunkSize: number;
  maxConcurrent: number;
  yieldEvery: number;
  timeoutMs: number;
}

export interface ProgressInfo {
  processed: number;
  total: number;
  percentage: number;
  startTime: number;
  estimatedRemaining: number;
}

export type ProgressCallback = (progress: ProgressInfo) => void;

export class StreamingProcessor {
  private defaultOptions: StreamingOptions = {
    chunkSize: 50,
    maxConcurrent: 3,
    yieldEvery: 10,
    timeoutMs: 30000,
  };

  /**
   * Process array in chunks with progress tracking
   */
  async *processInChunks<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: Partial<StreamingOptions> = {},
    onProgress?: ProgressCallback
  ): AsyncGenerator<R[], void, unknown> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    let processed = 0;

    for (let i = 0; i < items.length; i += opts.chunkSize) {
      const chunk = items.slice(i, i + opts.chunkSize);
      const promises = chunk.map((item, chunkIndex) => 
        this.withTimeout(
          processor(item, i + chunkIndex),
          opts.timeoutMs
        )
      );

      const results = await Promise.allSettled(promises);
      const successfulResults: R[] = [];

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
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
  createResultStream<T>(
    dataSource: () => AsyncGenerator<T[], void, unknown>,
    options: Partial<StreamingOptions> = {}
  ): Readable {
    const opts = { ...this.defaultOptions, ...options };
    let generator: AsyncGenerator<T[], void, unknown> | null = null;
    let isReading = false;

    return new Readable({
      objectMode: true,
      highWaterMark: opts.chunkSize,
      
      async read() {
        if (isReading) return;
        isReading = true;

        try {
          if (!generator) {
            generator = dataSource();
          }

          const { value, done } = await generator.next();
          
          if (done) {
            this.push(null); // End stream
          } else {
            this.push(JSON.stringify(value) + '\n');
          }
        } catch (error) {
          this.emit('error', error);
        } finally {
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
  createProcessingStream<T, R>(
    processor: (data: T) => Promise<R>,
    options: Partial<StreamingOptions> = {}
  ): Transform {
    const opts = { ...this.defaultOptions, ...options };
    let activeProcessing = 0;
    const queue: Array<{ data: T; callback: (error?: Error, result?: R) => void }> = [];

    const processNext = async () => {
      if (activeProcessing >= opts.maxConcurrent || queue.length === 0) {
        return;
      }

      const { data, callback } = queue.shift()!;
      activeProcessing++;

      try {
        const result = await this.withTimeout(processor(data), opts.timeoutMs);
        callback(undefined, result);
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      } finally {
        activeProcessing--;
        setImmediate(processNext);
      }
    };

    return new Transform({
      objectMode: true,
      highWaterMark: opts.chunkSize,

      transform(chunk: T, encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void) {
        queue.push({
          data: chunk,
          callback: (error, result) => {
            if (error) {
              callback(error);
            } else {
              callback(null, result);
            }
          },
        });

        processNext();
      },

      flush(callback: (error?: Error | null) => void) {
        const checkCompletion = () => {
          if (activeProcessing === 0 && queue.length === 0) {
            callback();
          } else {
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
  async *streamFileOperations<T>(
    filePaths: string[],
    operation: (path: string) => Promise<T>,
    options: Partial<StreamingOptions> = {},
    onProgress?: ProgressCallback
  ): AsyncGenerator<{ path: string; result: T | null; error?: string }[], void, unknown> {
    yield* this.processInChunks(
      filePaths,
      async (path: string, index: number) => {
        try {
          const result = await operation(path);
          return { path, result, error: undefined };
        } catch (error) {
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
      },
      options,
      onProgress
    );
  }

  /**
   * Batch process with memory-aware chunking
   */
  async *memoryAwareProcessing<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    estimateSize: (item: T | R) => number,
    maxMemoryMB: number,
    options: Partial<StreamingOptions> = {}
  ): AsyncGenerator<R[], void, unknown> {
    const opts = { ...this.defaultOptions, ...options };
    const maxMemoryBytes = maxMemoryMB * 1024 * 1024;
    let currentMemory = 0;
    let currentChunk: T[] = [];

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
  async processWithBackpressure<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: Partial<StreamingOptions> = {}
  ): Promise<R[]> {
    const opts = { ...this.defaultOptions, ...options };
    const results: R[] = [];
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
              } else {
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

  private async processChunk<T, R>(
    chunk: T[],
    processor: (item: T) => Promise<R>,
    options: StreamingOptions
  ): Promise<R[]> {
    const results = await Promise.allSettled(
      chunk.map(item => this.withTimeout(processor(item), options.timeoutMs))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<Awaited<R>> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  private async yield(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
  }
}

export const streamingProcessor = new StreamingProcessor();