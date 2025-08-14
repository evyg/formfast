interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

type LogLevelKey = keyof LogLevel;

interface LogEntry {
  level: LogLevelKey;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  error?: Error;
}

interface LoggerConfig {
  minLevel: LogLevelKey;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  bufferSize: number;
  flushInterval: number;
}

class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',
      enableConsole: process.env.NODE_ENV !== 'production',
      enableRemote: process.env.NODE_ENV === 'production',
      remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT || '/api/logs',
      bufferSize: 50,
      flushInterval: 10000, // 10 seconds
      ...config,
    };

    this.sessionId = this.generateSessionId();
    
    if (this.config.enableRemote) {
      this.startFlushTimer();
    }

    // Log unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Unhandled error', {
          message: event.error?.message || event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', {
          reason: event.reason,
          stack: event.reason?.stack,
        });
      });
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  private shouldLog(level: LogLevelKey): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private createLogEntry(
    level: LogLevelKey,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      context,
      error,
    };
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const { level, message, context, error } = entry;
    const prefix = `[${entry.timestamp}] ${level}:`;

    switch (level) {
      case 'DEBUG':
        console.debug(prefix, message, context);
        break;
      case 'INFO':
        console.info(prefix, message, context);
        break;
      case 'WARN':
        console.warn(prefix, message, context);
        break;
      case 'ERROR':
        console.error(prefix, message, context, error);
        break;
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private async flush(): Promise<void> {
    if (!this.config.enableRemote || this.logBuffer.length === 0) {
      return;
    }

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      if (typeof window !== 'undefined' && this.config.remoteEndpoint) {
        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logs }),
        });
      }
    } catch (error) {
      // If remote logging fails, put logs back in buffer and log to console
      this.logBuffer.unshift(...logs);
      console.error('Failed to send logs to remote endpoint:', error);
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('DEBUG')) return;

    const entry = this.createLogEntry('DEBUG', message, context);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('INFO')) return;

    const entry = this.createLogEntry('INFO', message, context);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('WARN')) return;

    const entry = this.createLogEntry('WARN', message, context);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  public error(message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog('ERROR')) return;

    const entry = this.createLogEntry('ERROR', message, context, error);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  // Specialized logging methods
  public apiRequest(method: string, url: string, context?: Record<string, unknown>): void {
    this.info(`API Request: ${method} ${url}`, {
      type: 'api_request',
      method,
      url,
      ...context,
    });
  }

  public apiResponse(
    method: string,
    url: string,
    status: number,
    duration: number,
    context?: Record<string, unknown>
  ): void {
    const level = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO';
    this[level.toLowerCase() as Lowercase<typeof level>](
      `API Response: ${method} ${url} ${status} (${duration}ms)`,
      {
        type: 'api_response',
        method,
        url,
        status,
        duration,
        ...context,
      }
    );
  }

  public userAction(action: string, context?: Record<string, unknown>): void {
    this.info(`User Action: ${action}`, {
      type: 'user_action',
      action,
      ...context,
    });
  }

  public performance(metric: string, value: number, context?: Record<string, unknown>): void {
    this.info(`Performance: ${metric} = ${value}`, {
      type: 'performance',
      metric,
      value,
      ...context,
    });
  }

  public security(event: string, context?: Record<string, unknown>): void {
    this.warn(`Security Event: ${event}`, {
      type: 'security',
      event,
      ...context,
    });
  }

  // Set user context for all future logs
  public setUser(userId: string, email?: string): void {
    this.info('User context set', {
      type: 'user_context',
      userId,
      email,
    });
  }

  // Clean up resources
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

// Create singleton instance
export const logger = new Logger();

// Export types for use in other modules
export type { LogEntry, LoggerConfig };

// Utility function for timing operations
export function timeOperation<T>(
  operation: () => T | Promise<T>,
  operationName: string,
  context?: Record<string, unknown>
): Promise<T> {
  const startTime = performance.now();
  
  logger.debug(`Starting operation: ${operationName}`, context);

  const handleResult = (result: T): T => {
    const duration = performance.now() - startTime;
    logger.performance(`Operation completed: ${operationName}`, duration, context);
    return result;
  };

  const handleError = (error: Error): never => {
    const duration = performance.now() - startTime;
    logger.error(`Operation failed: ${operationName}`, { duration, ...context }, error);
    throw error;
  };

  try {
    const result = operation();
    
    if (result instanceof Promise) {
      return result.then(handleResult).catch(handleError);
    } else {
      return Promise.resolve(handleResult(result));
    }
  } catch (error) {
    return Promise.reject(handleError(error as Error));
  }
}

// React hook for component-level logging
export function useLogger(componentName: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) => 
      logger.debug(`[${componentName}] ${message}`, context),
    info: (message: string, context?: Record<string, unknown>) => 
      logger.info(`[${componentName}] ${message}`, context),
    warn: (message: string, context?: Record<string, unknown>) => 
      logger.warn(`[${componentName}] ${message}`, context),
    error: (message: string, context?: Record<string, unknown>, error?: Error) => 
      logger.error(`[${componentName}] ${message}`, context, error),
    userAction: (action: string, context?: Record<string, unknown>) => 
      logger.userAction(action, { component: componentName, ...context }),
  };
}