import { logger } from './logger.js';
export class RetryError extends Error {
    attempts;
    lastError;
    constructor(message, attempts, lastError) {
        super(message);
        this.attempts = attempts;
        this.lastError = lastError;
        this.name = 'RetryError';
    }
}
export class CircuitBreakerError extends Error {
    state;
    constructor(message, state) {
        super(message);
        this.state = state;
        this.name = 'CircuitBreakerError';
    }
}
export var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "CLOSED";
    CircuitBreakerState["OPEN"] = "OPEN";
    CircuitBreakerState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitBreakerState || (CircuitBreakerState = {}));
export class CircuitBreaker {
    name;
    options;
    state = CircuitBreakerState.CLOSED;
    failures = 0;
    lastFailureTime = 0;
    successes = 0;
    constructor(name, options) {
        this.name = name;
        this.options = options;
    }
    async execute(operation) {
        if (this.state === CircuitBreakerState.OPEN) {
            if (Date.now() - this.lastFailureTime < this.options.recoveryTimeout) {
                throw new CircuitBreakerError(`Circuit breaker '${this.name}' is OPEN`, this.state);
            }
            this.state = CircuitBreakerState.HALF_OPEN;
            logger.info(`Circuit breaker '${this.name}' transitioning to HALF_OPEN`);
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failures = 0;
        this.successes++;
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.state = CircuitBreakerState.CLOSED;
            logger.info(`Circuit breaker '${this.name}' transitioning to CLOSED`);
        }
    }
    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.options.failureThreshold) {
            this.state = CircuitBreakerState.OPEN;
            logger.warn(`Circuit breaker '${this.name}' transitioning to OPEN`, {
                failures: this.failures,
                threshold: this.options.failureThreshold,
            });
        }
    }
    getState() {
        return this.state;
    }
    getStats() {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime,
        };
    }
    reset() {
        this.state = CircuitBreakerState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = 0;
        logger.info(`Circuit breaker '${this.name}' reset`);
    }
}
export class ErrorHandler {
    circuitBreakers = new Map();
    /**
     * Execute operation with retry logic and exponential backoff
     */
    async withRetry(operation, options = {}) {
        const config = {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2,
            retryableErrors: this.isRetryableError,
            ...options,
        };
        let lastError;
        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt === config.maxAttempts || !config.retryableErrors(error)) {
                    break;
                }
                const delay = Math.min(config.baseDelay * Math.pow(config.backoffFactor, attempt - 1), config.maxDelay);
                logger.warn(`Operation failed, retrying in ${delay}ms`, {
                    attempt,
                    maxAttempts: config.maxAttempts,
                    error: lastError.message,
                });
                await this.delay(delay);
            }
        }
        throw new RetryError(`Operation failed after ${config.maxAttempts} attempts: ${lastError.message}`, config.maxAttempts, lastError);
    }
    /**
     * Execute operation with circuit breaker protection
     */
    async withCircuitBreaker(name, operation, options = {}) {
        let circuitBreaker = this.circuitBreakers.get(name);
        if (!circuitBreaker) {
            const config = {
                failureThreshold: 5,
                recoveryTimeout: 60000, // 1 minute
                monitoringWindow: 300000, // 5 minutes
                ...options,
            };
            circuitBreaker = new CircuitBreaker(name, config);
            this.circuitBreakers.set(name, circuitBreaker);
        }
        return circuitBreaker.execute(operation);
    }
    /**
     * Execute operation with both retry and circuit breaker protection
     */
    async withResilience(name, operation, retryOptions = {}, circuitBreakerOptions = {}) {
        return this.withCircuitBreaker(name, () => this.withRetry(operation, retryOptions), circuitBreakerOptions);
    }
    /**
     * Execute operation with fallback
     */
    async withFallback(primary, fallback, name) {
        try {
            return await primary();
        }
        catch (error) {
            logger.warn(`Primary operation failed, using fallback${name ? ` for ${name}` : ''}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            try {
                return await fallback();
            }
            catch (fallbackError) {
                logger.error(`Both primary and fallback operations failed${name ? ` for ${name}` : ''}`, {
                    primaryError: error instanceof Error ? error.message : String(error),
                    fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                });
                throw fallbackError;
            }
        }
    }
    /**
     * Get circuit breaker statistics
     */
    getCircuitBreakerStats() {
        const stats = {};
        for (const [name, breaker] of this.circuitBreakers) {
            stats[name] = breaker.getStats();
        }
        return stats;
    }
    /**
     * Reset all circuit breakers
     */
    resetCircuitBreakers() {
        for (const breaker of this.circuitBreakers.values()) {
            breaker.reset();
        }
    }
    /**
     * Reset specific circuit breaker
     */
    resetCircuitBreaker(name) {
        const breaker = this.circuitBreakers.get(name);
        if (breaker) {
            breaker.reset();
            return true;
        }
        return false;
    }
    /**
     * Create an enhanced error with recovery suggestions
     */
    createEnhancedError(originalError, context, suggestions = []) {
        const enhancedMessage = [
            `${context}: ${originalError.message}`,
            ...suggestions.map(s => `  • ${s}`),
        ].join('\n');
        const enhancedError = new Error(enhancedMessage);
        enhancedError.name = originalError.name;
        enhancedError.stack = originalError.stack;
        return enhancedError;
    }
    /**
     * Determine if an error is retryable
     */
    isRetryableError(error) {
        if (!error)
            return false;
        const retryablePatterns = [
            /ECONNRESET/,
            /ENOTFOUND/,
            /ECONNREFUSED/,
            /ETIMEDOUT/,
            /socket hang up/,
            /network timeout/,
            /request timeout/,
            /connection reset/,
            /temporary failure/,
            /service unavailable/,
            /rate limit/,
            /too many requests/,
        ];
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toLowerCase() || '';
        return retryablePatterns.some(pattern => pattern.test(errorMessage) || pattern.test(errorCode));
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
export const errorHandler = new ErrorHandler();
// Common error recovery suggestions
export const ErrorSuggestions = {
    OBSIDIAN_CONNECTION: [
        'Ensure Obsidian is running with the Local REST API plugin enabled',
        'Check that the API is accessible at the configured URL (default: https://127.0.0.1:27124)',
        'Verify the vault path is correct in your environment configuration',
        'Try restarting Obsidian and the Local REST API plugin',
    ],
    SMART_CONNECTIONS: [
        'Ensure the Smart Connections plugin is installed and enabled',
        'Check that embeddings have been generated for your vault',
        'Verify the Smart Connections API URL configuration',
        'Try regenerating embeddings in the Smart Connections settings',
    ],
    FILE_ACCESS: [
        'Check that the file exists and is accessible',
        'Verify file permissions allow reading',
        'Ensure the file path uses correct encoding for Unicode characters',
        'Check if the file is locked by another process',
    ],
    MEMORY_USAGE: [
        'Consider reducing the scope of your operation (fewer files, smaller date range)',
        'Enable caching to reduce redundant processing',
        'Try processing files in smaller batches',
        'Restart the MCP server to clear memory usage',
    ],
    CONFIGURATION: [
        'Check your .env file for required environment variables',
        'Verify all paths use absolute paths, not relative ones',
        'Ensure configuration values are within valid ranges',
        'Review the configuration schema in config.ts for valid options',
    ],
};
