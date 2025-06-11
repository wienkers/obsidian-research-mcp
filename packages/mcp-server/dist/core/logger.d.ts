interface Logger {
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
}
declare class SimpleLogger implements Logger {
    private isDebugEnabled;
    private isEnabled;
    private log;
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
}
export declare const logger: SimpleLogger;
export declare class LoggedError extends Error {
    readonly context?: Record<string, any> | undefined;
    constructor(message: string, context?: Record<string, any> | undefined);
}
export declare function logPerformance<T>(operation: string, fn: () => Promise<T>): Promise<T>;
export {};
//# sourceMappingURL=logger.d.ts.map