import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler } from './error-handling.js';
describe('ErrorHandler', () => {
    let errorHandler;
    beforeEach(() => {
        errorHandler = new ErrorHandler();
    });
    it('should retry failed operations with exponential backoff', async () => {
        let attempts = 0;
        const failingOperation = vi.fn(async () => {
            attempts++;
            if (attempts < 3) {
                throw new Error(`Attempt ${attempts} failed`);
            }
            return 'success';
        });
        const result = await errorHandler.withRetry(failingOperation, {
            maxAttempts: 3,
            baseDelay: 10,
            retryableErrors: () => true, // Retry all errors for testing
        });
        expect(result).toBe('success');
        expect(failingOperation).toHaveBeenCalledTimes(3);
    });
    it('should fail after max attempts', async () => {
        const alwaysFailingOperation = vi.fn(async () => {
            throw new Error('Always fails');
        });
        await expect(errorHandler.withRetry(alwaysFailingOperation, {
            maxAttempts: 2,
            baseDelay: 1,
            retryableErrors: () => true, // Retry all errors for testing
        })).rejects.toThrow('Always fails');
        expect(alwaysFailingOperation).toHaveBeenCalledTimes(2);
    });
    it('should handle circuit breaker pattern', async () => {
        let attempts = 0;
        const failingOperation = vi.fn(async () => {
            attempts++;
            throw new Error('Service unavailable');
        });
        // Configure circuit breaker with low threshold for testing
        const circuitBreakerOptions = { failureThreshold: 3, recoveryTimeout: 1000 };
        // First few calls should fail and increment failure count
        await expect(errorHandler.withCircuitBreaker('test-service', failingOperation, circuitBreakerOptions)).rejects.toThrow('Service unavailable');
        await expect(errorHandler.withCircuitBreaker('test-service', failingOperation, circuitBreakerOptions)).rejects.toThrow('Service unavailable');
        await expect(errorHandler.withCircuitBreaker('test-service', failingOperation, circuitBreakerOptions)).rejects.toThrow('Service unavailable');
        // Circuit should now be open, subsequent calls should fail fast
        await expect(errorHandler.withCircuitBreaker('test-service', failingOperation, circuitBreakerOptions)).rejects.toThrow('Circuit breaker \'test-service\' is OPEN');
        // Should fail fast without calling the operation
        expect(failingOperation).toHaveBeenCalledTimes(3);
    });
    it('should recover from circuit breaker open state after timeout', async () => {
        const failingOperation = vi.fn(async () => {
            throw new Error('Service unavailable');
        });
        const circuitBreakerOptions = { failureThreshold: 3, recoveryTimeout: 100 }; // Short timeout for testing
        // Trip the circuit breaker
        for (let i = 0; i < 3; i++) {
            try {
                await errorHandler.withCircuitBreaker('recovery-test', failingOperation, circuitBreakerOptions);
            }
            catch (e) {
                // Expected to fail
            }
        }
        // Should be open
        await expect(errorHandler.withCircuitBreaker('recovery-test', failingOperation, circuitBreakerOptions)).rejects.toThrow('Circuit breaker \'recovery-test\' is OPEN');
        // Wait for recovery timeout
        await new Promise(resolve => setTimeout(resolve, 150));
        const successOperation = vi.fn(async () => 'recovered');
        // Should allow one test call
        const result = await errorHandler.withCircuitBreaker('recovery-test', successOperation, circuitBreakerOptions);
        expect(result).toBe('recovered');
        expect(successOperation).toHaveBeenCalledTimes(1);
    });
});
