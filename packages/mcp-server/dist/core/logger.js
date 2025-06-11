class SimpleLogger {
    isDebugEnabled = process.env.LOG_LEVEL === 'debug';
    isEnabled = process.env.ENABLE_CONSOLE_LOGGING === 'true';
    log(level, message, meta) {
        if (!this.isEnabled && level !== 'error') {
            return; // Only log errors by default to avoid interfering with MCP protocol
        }
        const timestamp = new Date().toISOString();
        const logMessage = meta
            ? `${timestamp} [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`
            : `${timestamp} [${level.toUpperCase()}] ${message}`;
        // Use stderr to avoid interfering with MCP JSON-RPC on stdout
        console.error(logMessage);
    }
    debug(message, meta) {
        if (this.isDebugEnabled) {
            this.log('debug', message, meta);
        }
    }
    info(message, meta) {
        this.log('info', message, meta);
    }
    warn(message, meta) {
        this.log('warn', message, meta);
    }
    error(message, meta) {
        this.log('error', message, meta);
    }
}
export const logger = new SimpleLogger();
export class LoggedError extends Error {
    context;
    constructor(message, context) {
        super(message);
        this.context = context;
        this.name = 'LoggedError';
        logger.error(message, { error: this, context });
    }
}
export async function logPerformance(operation, fn) {
    const start = Date.now();
    logger.info(`Starting operation: ${operation}`);
    try {
        const result = await fn();
        const duration = Date.now() - start;
        logger.info(`Completed operation: ${operation}`, { duration });
        return result;
    }
    catch (error) {
        const duration = Date.now() - start;
        logger.error(`Failed operation: ${operation}`, { error, duration });
        throw error;
    }
}
