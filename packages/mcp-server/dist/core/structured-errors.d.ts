export declare enum ErrorCode {
    INVALID_INPUT = 1000,
    VALIDATION_FAILED = 1001,
    MISSING_PARAMETER = 1002,
    INVALID_PATH = 1003,
    INVALID_PATTERN = 1004,
    UNAUTHORIZED = 1100,
    FORBIDDEN = 1103,
    API_KEY_INVALID = 1104,
    RATE_LIMITED = 1105,
    FILE_NOT_FOUND = 1200,
    FILE_ACCESS_DENIED = 1201,
    FILE_TOO_LARGE = 1202,
    DIRECTORY_NOT_FOUND = 1203,
    PATH_TRAVERSAL = 1204,
    FILE_LOCKED = 1205,
    OBSIDIAN_CONNECTION_FAILED = 1300,
    OBSIDIAN_API_ERROR = 1301,
    VAULT_NOT_FOUND = 1302,
    PLUGIN_NOT_AVAILABLE = 1303,
    SEARCH_FAILED = 1400,
    SEMANTIC_SEARCH_UNAVAILABLE = 1401,
    INDEX_NOT_READY = 1402,
    SEARCH_TIMEOUT = 1403,
    PARSING_FAILED = 1500,
    CONTENT_TOO_LARGE = 1501,
    INVALID_MARKDOWN = 1502,
    ENCODING_ERROR = 1503,
    OUT_OF_MEMORY = 1600,
    TIMEOUT = 1601,
    RESOURCE_EXHAUSTED = 1602,
    CONCURRENT_LIMIT_EXCEEDED = 1603,
    CONFIGURATION_ERROR = 1700,
    MISSING_CONFIGURATION = 1701,
    INVALID_CONFIGURATION = 1702,
    INTERNAL_ERROR = 1800,
    NOT_IMPLEMENTED = 1801,
    DEPENDENCY_ERROR = 1802,
    SMART_CONNECTIONS_ERROR = 1900,
    ZOTERO_ERROR = 1901,
    NETWORK_ERROR = 1902
}
export interface ErrorContext {
    operation?: string;
    filePath?: string;
    query?: string;
    userId?: string;
    requestId?: string;
    timestamp?: number;
    additionalData?: Record<string, any>;
}
export interface ErrorRecoveryStrategy {
    type: 'retry' | 'fallback' | 'skip' | 'manual' | 'none';
    description: string;
    automated: boolean;
    maxAttempts?: number;
    fallbackAction?: () => Promise<any>;
}
export declare class StructuredError extends Error {
    readonly code: ErrorCode;
    readonly context: ErrorContext;
    readonly recoveryStrategies: ErrorRecoveryStrategy[];
    readonly userMessage: string;
    readonly recoverable: boolean;
    readonly timestamp: number;
    constructor(code: ErrorCode, message: string, context?: ErrorContext, options?: {
        cause?: Error;
        userMessage?: string;
        recoverable?: boolean;
        recoveryStrategies?: ErrorRecoveryStrategy[];
    });
    private isRecoverableByDefault;
    private generateUserMessage;
    private getDefaultRecoveryStrategies;
    private logError;
    /**
     * Convert to JSON for API responses
     */
    toJSON(): {
        error: {
            code: ErrorCode;
            message: string;
            technical_message: string;
            recoverable: boolean;
            context: ErrorContext;
            recovery_strategies: ErrorRecoveryStrategy[];
            timestamp: number;
        };
    };
    /**
     * Get recovery suggestion for Claude
     */
    getRecoverySuggestion(): string;
}
export declare class ErrorFactory {
    static invalidInput(message: string, context?: ErrorContext): StructuredError;
    static fileNotFound(filePath: string, context?: ErrorContext): StructuredError;
    static obsidianConnectionFailed(cause?: Error, context?: ErrorContext): StructuredError;
    static pathTraversal(path: string, context?: ErrorContext): StructuredError;
    static searchTimeout(query: string, timeout: number, context?: ErrorContext): StructuredError;
    static semanticSearchUnavailable(context?: ErrorContext): StructuredError;
    static validationFailed(field: string, value: any, constraint: string, context?: ErrorContext): StructuredError;
}
export declare class BatchErrorAggregator {
    private errors;
    private successCount;
    addError(error: StructuredError): void;
    addSuccess(): void;
    hasErrors(): boolean;
    getErrorSummary(): {
        totalOperations: number;
        successCount: number;
        errorCount: number;
        errors: StructuredError[];
        recoverableErrors: StructuredError[];
        criticalErrors: StructuredError[];
    };
    generateReport(): string;
}
//# sourceMappingURL=structured-errors.d.ts.map