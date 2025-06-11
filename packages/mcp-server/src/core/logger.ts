// Simple logger for MCP servers - avoids winston complexity and startup delays
interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

class SimpleLogger implements Logger {
  private isDebugEnabled = process.env.LOG_LEVEL === 'debug';
  private isEnabled = process.env.ENABLE_CONSOLE_LOGGING === 'true';

  private log(level: string, message: string, meta?: any): void {
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

  debug(message: string, meta?: any): void {
    if (this.isDebugEnabled) {
      this.log('debug', message, meta);
    }
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }
}

export const logger = new SimpleLogger();

export class LoggedError extends Error {
  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = 'LoggedError';
    logger.error(message, { error: this, context });
  }
}

export async function logPerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  logger.info(`Starting operation: ${operation}`);
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.info(`Completed operation: ${operation}`, { duration });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Failed operation: ${operation}`, { error, duration });
    throw error;
  }
}