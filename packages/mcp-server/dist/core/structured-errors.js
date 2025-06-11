import { logger } from './logger.js';
export var ErrorCode;
(function (ErrorCode) {
    // Input/Validation Errors (1000-1099)
    ErrorCode[ErrorCode["INVALID_INPUT"] = 1000] = "INVALID_INPUT";
    ErrorCode[ErrorCode["VALIDATION_FAILED"] = 1001] = "VALIDATION_FAILED";
    ErrorCode[ErrorCode["MISSING_PARAMETER"] = 1002] = "MISSING_PARAMETER";
    ErrorCode[ErrorCode["INVALID_PATH"] = 1003] = "INVALID_PATH";
    ErrorCode[ErrorCode["INVALID_PATTERN"] = 1004] = "INVALID_PATTERN";
    // Authentication/Authorization (1100-1199) 
    ErrorCode[ErrorCode["UNAUTHORIZED"] = 1100] = "UNAUTHORIZED";
    ErrorCode[ErrorCode["FORBIDDEN"] = 1103] = "FORBIDDEN";
    ErrorCode[ErrorCode["API_KEY_INVALID"] = 1104] = "API_KEY_INVALID";
    ErrorCode[ErrorCode["RATE_LIMITED"] = 1105] = "RATE_LIMITED";
    // File System Operations (1200-1299)
    ErrorCode[ErrorCode["FILE_NOT_FOUND"] = 1200] = "FILE_NOT_FOUND";
    ErrorCode[ErrorCode["FILE_ACCESS_DENIED"] = 1201] = "FILE_ACCESS_DENIED";
    ErrorCode[ErrorCode["FILE_TOO_LARGE"] = 1202] = "FILE_TOO_LARGE";
    ErrorCode[ErrorCode["DIRECTORY_NOT_FOUND"] = 1203] = "DIRECTORY_NOT_FOUND";
    ErrorCode[ErrorCode["PATH_TRAVERSAL"] = 1204] = "PATH_TRAVERSAL";
    ErrorCode[ErrorCode["FILE_LOCKED"] = 1205] = "FILE_LOCKED";
    // Obsidian API Integration (1300-1399)
    ErrorCode[ErrorCode["OBSIDIAN_CONNECTION_FAILED"] = 1300] = "OBSIDIAN_CONNECTION_FAILED";
    ErrorCode[ErrorCode["OBSIDIAN_API_ERROR"] = 1301] = "OBSIDIAN_API_ERROR";
    ErrorCode[ErrorCode["VAULT_NOT_FOUND"] = 1302] = "VAULT_NOT_FOUND";
    ErrorCode[ErrorCode["PLUGIN_NOT_AVAILABLE"] = 1303] = "PLUGIN_NOT_AVAILABLE";
    // Search Operations (1400-1499)
    ErrorCode[ErrorCode["SEARCH_FAILED"] = 1400] = "SEARCH_FAILED";
    ErrorCode[ErrorCode["SEMANTIC_SEARCH_UNAVAILABLE"] = 1401] = "SEMANTIC_SEARCH_UNAVAILABLE";
    ErrorCode[ErrorCode["INDEX_NOT_READY"] = 1402] = "INDEX_NOT_READY";
    ErrorCode[ErrorCode["SEARCH_TIMEOUT"] = 1403] = "SEARCH_TIMEOUT";
    // Content Processing (1500-1599)
    ErrorCode[ErrorCode["PARSING_FAILED"] = 1500] = "PARSING_FAILED";
    ErrorCode[ErrorCode["CONTENT_TOO_LARGE"] = 1501] = "CONTENT_TOO_LARGE";
    ErrorCode[ErrorCode["INVALID_MARKDOWN"] = 1502] = "INVALID_MARKDOWN";
    ErrorCode[ErrorCode["ENCODING_ERROR"] = 1503] = "ENCODING_ERROR";
    // Resource Management (1600-1699)
    ErrorCode[ErrorCode["OUT_OF_MEMORY"] = 1600] = "OUT_OF_MEMORY";
    ErrorCode[ErrorCode["TIMEOUT"] = 1601] = "TIMEOUT";
    ErrorCode[ErrorCode["RESOURCE_EXHAUSTED"] = 1602] = "RESOURCE_EXHAUSTED";
    ErrorCode[ErrorCode["CONCURRENT_LIMIT_EXCEEDED"] = 1603] = "CONCURRENT_LIMIT_EXCEEDED";
    // Configuration (1700-1799)
    ErrorCode[ErrorCode["CONFIGURATION_ERROR"] = 1700] = "CONFIGURATION_ERROR";
    ErrorCode[ErrorCode["MISSING_CONFIGURATION"] = 1701] = "MISSING_CONFIGURATION";
    ErrorCode[ErrorCode["INVALID_CONFIGURATION"] = 1702] = "INVALID_CONFIGURATION";
    // Internal Errors (1800-1899)
    ErrorCode[ErrorCode["INTERNAL_ERROR"] = 1800] = "INTERNAL_ERROR";
    ErrorCode[ErrorCode["NOT_IMPLEMENTED"] = 1801] = "NOT_IMPLEMENTED";
    ErrorCode[ErrorCode["DEPENDENCY_ERROR"] = 1802] = "DEPENDENCY_ERROR";
    // External Services (1900-1999)
    ErrorCode[ErrorCode["SMART_CONNECTIONS_ERROR"] = 1900] = "SMART_CONNECTIONS_ERROR";
    ErrorCode[ErrorCode["ZOTERO_ERROR"] = 1901] = "ZOTERO_ERROR";
    ErrorCode[ErrorCode["NETWORK_ERROR"] = 1902] = "NETWORK_ERROR";
})(ErrorCode || (ErrorCode = {}));
export class StructuredError extends Error {
    code;
    context;
    recoveryStrategies;
    userMessage;
    recoverable;
    timestamp;
    constructor(code, message, context = {}, options = {}) {
        super(message);
        this.name = 'StructuredError';
        this.code = code;
        this.context = {
            ...context,
            timestamp: Date.now()
        };
        this.recoverable = options.recoverable ?? this.isRecoverableByDefault(code);
        this.userMessage = options.userMessage ?? this.generateUserMessage(code, message);
        this.recoveryStrategies = options.recoveryStrategies ?? this.getDefaultRecoveryStrategies(code);
        this.timestamp = Date.now();
        if (options.cause) {
            this.cause = options.cause;
        }
        // Log structured error
        this.logError();
    }
    isRecoverableByDefault(code) {
        const recoverableCodes = new Set([
            ErrorCode.OBSIDIAN_CONNECTION_FAILED,
            ErrorCode.SEARCH_TIMEOUT,
            ErrorCode.SEMANTIC_SEARCH_UNAVAILABLE,
            ErrorCode.RATE_LIMITED,
            ErrorCode.NETWORK_ERROR,
            ErrorCode.TIMEOUT
        ]);
        return recoverableCodes.has(code);
    }
    generateUserMessage(code, technicalMessage) {
        const userMessages = {
            [ErrorCode.INVALID_INPUT]: 'The provided input is invalid. Please check your parameters and try again.',
            [ErrorCode.FILE_NOT_FOUND]: 'The requested file could not be found. Please verify the file path exists.',
            [ErrorCode.OBSIDIAN_CONNECTION_FAILED]: 'Unable to connect to Obsidian. Please ensure Obsidian is running with the Local REST API plugin enabled.',
            [ErrorCode.SEMANTIC_SEARCH_UNAVAILABLE]: 'Semantic search is temporarily unavailable. Falling back to text-based search.',
            [ErrorCode.SEARCH_TIMEOUT]: 'Search operation timed out. Try narrowing your search criteria or increasing the timeout.',
            [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait a moment before trying again.',
            [ErrorCode.OUT_OF_MEMORY]: 'Operation requires too much memory. Try processing fewer files or smaller content.',
            [ErrorCode.PATH_TRAVERSAL]: 'Invalid file path detected for security reasons.',
            [ErrorCode.CONFIGURATION_ERROR]: 'Configuration issue detected. Please check your environment settings.',
            [ErrorCode.VAULT_NOT_FOUND]: 'Obsidian vault not found at the specified path.',
            [ErrorCode.PLUGIN_NOT_AVAILABLE]: 'Required Obsidian plugin is not available or not enabled.'
        };
        return userMessages[code] ?? `An error occurred: ${technicalMessage}`;
    }
    getDefaultRecoveryStrategies(code) {
        const strategies = {
            [ErrorCode.OBSIDIAN_CONNECTION_FAILED]: [
                {
                    type: 'retry',
                    description: 'Retry connection after a brief delay',
                    automated: true,
                    maxAttempts: 3
                },
                {
                    type: 'manual',
                    description: 'Check Obsidian is running and Local REST API plugin is enabled',
                    automated: false
                }
            ],
            [ErrorCode.SEMANTIC_SEARCH_UNAVAILABLE]: [
                {
                    type: 'fallback',
                    description: 'Use structural search instead of semantic search',
                    automated: true
                }
            ],
            [ErrorCode.SEARCH_TIMEOUT]: [
                {
                    type: 'retry',
                    description: 'Retry with a smaller scope or increased timeout',
                    automated: true,
                    maxAttempts: 2
                }
            ],
            [ErrorCode.RATE_LIMITED]: [
                {
                    type: 'retry',
                    description: 'Wait and retry after rate limit expires',
                    automated: true,
                    maxAttempts: 3
                }
            ],
            [ErrorCode.FILE_NOT_FOUND]: [
                {
                    type: 'manual',
                    description: 'Verify the file path exists in your vault',
                    automated: false
                }
            ]
        };
        return strategies[code] ?? [
            {
                type: 'none',
                description: 'No automatic recovery available',
                automated: false
            }
        ];
    }
    logError() {
        const logData = {
            errorCode: this.code,
            message: this.message,
            userMessage: this.userMessage,
            context: this.context,
            recoverable: this.recoverable,
            stack: this.stack,
            recoveryStrategies: this.recoveryStrategies.map(s => s.description)
        };
        if (this.recoverable) {
            logger.warn('Recoverable error occurred', logData);
        }
        else {
            logger.error('Non-recoverable error occurred', logData);
        }
    }
    /**
     * Convert to JSON for API responses
     */
    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.userMessage,
                technical_message: this.message,
                recoverable: this.recoverable,
                context: this.context,
                recovery_strategies: this.recoveryStrategies,
                timestamp: this.timestamp
            }
        };
    }
    /**
     * Get recovery suggestion for Claude
     */
    getRecoverySuggestion() {
        if (!this.recoverable || this.recoveryStrategies.length === 0) {
            return 'This error cannot be automatically recovered from.';
        }
        const automaticStrategies = this.recoveryStrategies.filter(s => s.automated);
        const manualStrategies = this.recoveryStrategies.filter(s => !s.automated);
        let suggestion = '';
        if (automaticStrategies.length > 0) {
            suggestion += 'Automatic recovery will be attempted: ';
            suggestion += automaticStrategies.map(s => s.description).join(', ');
        }
        if (manualStrategies.length > 0) {
            if (suggestion)
                suggestion += '. ';
            suggestion += 'Manual intervention may be required: ';
            suggestion += manualStrategies.map(s => s.description).join(', ');
        }
        return suggestion;
    }
}
// Factory functions for common error types
export class ErrorFactory {
    static invalidInput(message, context = {}) {
        return new StructuredError(ErrorCode.INVALID_INPUT, message, context, {
            userMessage: 'Invalid input provided. Please check your parameters.',
            recoverable: false
        });
    }
    static fileNotFound(filePath, context = {}) {
        return new StructuredError(ErrorCode.FILE_NOT_FOUND, `File not found: ${filePath}`, { ...context, filePath }, {
            userMessage: `The file "${filePath}" could not be found.`,
            recoverable: false,
            recoveryStrategies: [
                {
                    type: 'manual',
                    description: 'Verify the file path exists in your vault',
                    automated: false
                }
            ]
        });
    }
    static obsidianConnectionFailed(cause, context = {}) {
        return new StructuredError(ErrorCode.OBSIDIAN_CONNECTION_FAILED, 'Failed to connect to Obsidian Local REST API', context, {
            cause,
            userMessage: 'Cannot connect to Obsidian. Please ensure Obsidian is running with the Local REST API plugin enabled.',
            recoverable: true,
            recoveryStrategies: [
                {
                    type: 'retry',
                    description: 'Retry connection after a brief delay',
                    automated: true,
                    maxAttempts: 3
                },
                {
                    type: 'manual',
                    description: 'Check that Obsidian is running and Local REST API plugin is enabled on port 27124',
                    automated: false
                }
            ]
        });
    }
    static pathTraversal(path, context = {}) {
        return new StructuredError(ErrorCode.PATH_TRAVERSAL, `Directory traversal attempt detected in path: ${path}`, { ...context, filePath: path }, {
            userMessage: 'Invalid file path detected for security reasons.',
            recoverable: false,
            recoveryStrategies: [
                {
                    type: 'manual',
                    description: 'Use only relative paths within the vault directory',
                    automated: false
                }
            ]
        });
    }
    static searchTimeout(query, timeout, context = {}) {
        return new StructuredError(ErrorCode.SEARCH_TIMEOUT, `Search timed out after ${timeout}ms for query: ${query}`, { ...context, query }, {
            userMessage: 'Search operation timed out. Try narrowing your search criteria.',
            recoverable: true,
            recoveryStrategies: [
                {
                    type: 'retry',
                    description: 'Retry with reduced scope or increased timeout',
                    automated: true,
                    maxAttempts: 2
                }
            ]
        });
    }
    static semanticSearchUnavailable(context = {}) {
        return new StructuredError(ErrorCode.SEMANTIC_SEARCH_UNAVAILABLE, 'Smart Connections plugin or embeddings not available', context, {
            userMessage: 'Semantic search temporarily unavailable, using text-based search instead.',
            recoverable: true,
            recoveryStrategies: [
                {
                    type: 'fallback',
                    description: 'Use structural search instead',
                    automated: true
                }
            ]
        });
    }
    static validationFailed(field, value, constraint, context = {}) {
        return new StructuredError(ErrorCode.VALIDATION_FAILED, `Validation failed for ${field}: ${constraint}`, { ...context, additionalData: { field, value, constraint } }, {
            userMessage: `Invalid ${field}: ${constraint}`,
            recoverable: false
        });
    }
}
// Error aggregation for batch operations  
export class BatchErrorAggregator {
    errors = [];
    successCount = 0;
    addError(error) {
        this.errors.push(error);
    }
    addSuccess() {
        this.successCount++;
    }
    hasErrors() {
        return this.errors.length > 0;
    }
    getErrorSummary() {
        const recoverableErrors = this.errors.filter(e => e.recoverable);
        const criticalErrors = this.errors.filter(e => !e.recoverable);
        return {
            totalOperations: this.successCount + this.errors.length,
            successCount: this.successCount,
            errorCount: this.errors.length,
            errors: this.errors,
            recoverableErrors,
            criticalErrors
        };
    }
    generateReport() {
        const summary = this.getErrorSummary();
        let report = `Batch Operation Summary:
- Total operations: ${summary.totalOperations}
- Successful: ${summary.successCount}
- Failed: ${summary.errorCount}`;
        if (summary.recoverableErrors.length > 0) {
            report += `\n- Recoverable errors: ${summary.recoverableErrors.length}`;
        }
        if (summary.criticalErrors.length > 0) {
            report += `\n- Critical errors: ${summary.criticalErrors.length}`;
        }
        // Add error details
        if (this.errors.length > 0) {
            report += '\n\nError Details:';
            for (const error of this.errors) {
                report += `\n- ${error.userMessage}`;
                if (error.context.filePath) {
                    report += ` (${error.context.filePath})`;
                }
            }
        }
        return report;
    }
}
