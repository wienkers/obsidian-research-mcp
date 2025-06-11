export interface RetryOptions {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
    retryableErrors?: (error: any) => boolean;
}
export interface CircuitBreakerOptions {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringWindow: number;
}
export declare class RetryError extends Error {
    readonly attempts: number;
    readonly lastError: Error;
    constructor(message: string, attempts: number, lastError: Error);
}
export declare class CircuitBreakerError extends Error {
    readonly state: CircuitBreakerState;
    constructor(message: string, state: CircuitBreakerState);
}
export declare enum CircuitBreakerState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
export declare class CircuitBreaker {
    private name;
    private options;
    private state;
    private failures;
    private lastFailureTime;
    private successes;
    constructor(name: string, options: CircuitBreakerOptions);
    execute<T>(operation: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    getState(): CircuitBreakerState;
    getStats(): {
        state: CircuitBreakerState;
        failures: number;
        successes: number;
        lastFailureTime: number;
    };
    reset(): void;
}
export declare class ErrorHandler {
    private circuitBreakers;
    /**
     * Execute operation with retry logic and exponential backoff
     */
    withRetry<T>(operation: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T>;
    /**
     * Execute operation with circuit breaker protection
     */
    withCircuitBreaker<T>(name: string, operation: () => Promise<T>, options?: Partial<CircuitBreakerOptions>): Promise<T>;
    /**
     * Execute operation with both retry and circuit breaker protection
     */
    withResilience<T>(name: string, operation: () => Promise<T>, retryOptions?: Partial<RetryOptions>, circuitBreakerOptions?: Partial<CircuitBreakerOptions>): Promise<T>;
    /**
     * Execute operation with fallback
     */
    withFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>, name?: string): Promise<T>;
    /**
     * Get circuit breaker statistics
     */
    getCircuitBreakerStats(): Record<string, any>;
    /**
     * Reset all circuit breakers
     */
    resetCircuitBreakers(): void;
    /**
     * Reset specific circuit breaker
     */
    resetCircuitBreaker(name: string): boolean;
    /**
     * Create an enhanced error with recovery suggestions
     */
    createEnhancedError(originalError: Error, context: string, suggestions?: string[]): Error;
    /**
     * Determine if an error is retryable
     */
    private isRetryableError;
    private delay;
}
export declare const errorHandler: ErrorHandler;
export declare const ErrorSuggestions: {
    OBSIDIAN_CONNECTION: string[];
    SMART_CONNECTIONS: string[];
    FILE_ACCESS: string[];
    MEMORY_USAGE: string[];
    CONFIGURATION: string[];
};
//# sourceMappingURL=error-handling.d.ts.map