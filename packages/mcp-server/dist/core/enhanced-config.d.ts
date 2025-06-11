import { z } from 'zod';
export declare const EnhancedConfigSchema: z.ZodObject<{
    obsidian: z.ZodObject<{
        apiUrl: z.ZodDefault<z.ZodString>;
        apiKey: z.ZodDefault<z.ZodString>;
        vaultPath: z.ZodOptional<z.ZodString>;
        timeout: z.ZodDefault<z.ZodNumber>;
        retries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        apiUrl: string;
        apiKey: string;
        timeout: number;
        retries: number;
        vaultPath?: string | undefined;
    }, {
        apiUrl?: string | undefined;
        apiKey?: string | undefined;
        vaultPath?: string | undefined;
        timeout?: number | undefined;
        retries?: number | undefined;
    }>;
    smartConnections: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        apiUrl: z.ZodOptional<z.ZodString>;
        timeout: z.ZodDefault<z.ZodNumber>;
        fallbackOnError: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        timeout: number;
        enabled: boolean;
        fallbackOnError: boolean;
        apiUrl?: string | undefined;
    }, {
        apiUrl?: string | undefined;
        timeout?: number | undefined;
        enabled?: boolean | undefined;
        fallbackOnError?: boolean | undefined;
    }>;
    search: z.ZodObject<{
        maxResults: z.ZodDefault<z.ZodNumber>;
        semanticThreshold: z.ZodDefault<z.ZodNumber>;
        indexingEnabled: z.ZodDefault<z.ZodBoolean>;
        indexUpdateInterval: z.ZodDefault<z.ZodNumber>;
        mmrEnabled: z.ZodDefault<z.ZodBoolean>;
        mmrLambda: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxResults: number;
        semanticThreshold: number;
        indexingEnabled: boolean;
        indexUpdateInterval: number;
        mmrEnabled: boolean;
        mmrLambda: number;
    }, {
        maxResults?: number | undefined;
        semanticThreshold?: number | undefined;
        indexingEnabled?: boolean | undefined;
        indexUpdateInterval?: number | undefined;
        mmrEnabled?: boolean | undefined;
        mmrLambda?: number | undefined;
    }>;
    cache: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        ttl: z.ZodDefault<z.ZodNumber>;
        maxSize: z.ZodDefault<z.ZodNumber>;
        strategy: z.ZodDefault<z.ZodEnum<["lru", "lfu"]>>;
        persistToDisk: z.ZodDefault<z.ZodBoolean>;
        diskCachePath: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        ttl: number;
        maxSize: number;
        strategy: "lru" | "lfu";
        persistToDisk: boolean;
        diskCachePath?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        ttl?: number | undefined;
        maxSize?: number | undefined;
        strategy?: "lru" | "lfu" | undefined;
        persistToDisk?: boolean | undefined;
        diskCachePath?: string | undefined;
    }>;
    performance: z.ZodObject<{
        maxConcurrentRequests: z.ZodDefault<z.ZodNumber>;
        batchSize: z.ZodDefault<z.ZodNumber>;
        enableProfiling: z.ZodDefault<z.ZodBoolean>;
        memoryThreshold: z.ZodDefault<z.ZodNumber>;
        cpuThreshold: z.ZodDefault<z.ZodNumber>;
        backgroundTaskEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        maxConcurrentRequests: number;
        batchSize: number;
        enableProfiling: boolean;
        memoryThreshold: number;
        cpuThreshold: number;
        backgroundTaskEnabled: boolean;
    }, {
        maxConcurrentRequests?: number | undefined;
        batchSize?: number | undefined;
        enableProfiling?: boolean | undefined;
        memoryThreshold?: number | undefined;
        cpuThreshold?: number | undefined;
        backgroundTaskEnabled?: boolean | undefined;
    }>;
    security: z.ZodObject<{
        enablePathValidation: z.ZodDefault<z.ZodBoolean>;
        maxFileSize: z.ZodDefault<z.ZodNumber>;
        maxRequestSize: z.ZodDefault<z.ZodNumber>;
        rateLimiting: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            windowMs: z.ZodDefault<z.ZodNumber>;
            maxRequests: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            windowMs: number;
            maxRequests: number;
        }, {
            enabled?: boolean | undefined;
            windowMs?: number | undefined;
            maxRequests?: number | undefined;
        }>;
        corsEnabled: z.ZodDefault<z.ZodBoolean>;
        allowedOrigins: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        maxFileSize: number;
        allowedOrigins: string[];
        enablePathValidation: boolean;
        maxRequestSize: number;
        rateLimiting: {
            enabled: boolean;
            windowMs: number;
            maxRequests: number;
        };
        corsEnabled: boolean;
    }, {
        rateLimiting: {
            enabled?: boolean | undefined;
            windowMs?: number | undefined;
            maxRequests?: number | undefined;
        };
        maxFileSize?: number | undefined;
        allowedOrigins?: string[] | undefined;
        enablePathValidation?: boolean | undefined;
        maxRequestSize?: number | undefined;
        corsEnabled?: boolean | undefined;
    }>;
    logging: z.ZodObject<{
        level: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
        enableFileLogging: z.ZodDefault<z.ZodBoolean>;
        logDir: z.ZodDefault<z.ZodString>;
        maxLogFiles: z.ZodDefault<z.ZodNumber>;
        maxLogSize: z.ZodDefault<z.ZodNumber>;
        enableStructuredLogging: z.ZodDefault<z.ZodBoolean>;
        enablePerformanceLogging: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        logDir: string;
        level: "error" | "warn" | "info" | "debug";
        enableFileLogging: boolean;
        maxLogFiles: number;
        maxLogSize: number;
        enableStructuredLogging: boolean;
        enablePerformanceLogging: boolean;
    }, {
        logDir?: string | undefined;
        level?: "error" | "warn" | "info" | "debug" | undefined;
        enableFileLogging?: boolean | undefined;
        maxLogFiles?: number | undefined;
        maxLogSize?: number | undefined;
        enableStructuredLogging?: boolean | undefined;
        enablePerformanceLogging?: boolean | undefined;
    }>;
    analysis: z.ZodObject<{
        enableContentChunking: z.ZodDefault<z.ZodBoolean>;
        chunkSize: z.ZodDefault<z.ZodNumber>;
        chunkOverlap: z.ZodDefault<z.ZodNumber>;
        enableBacklinkIndexing: z.ZodDefault<z.ZodBoolean>;
        enableConceptMapping: z.ZodDefault<z.ZodBoolean>;
        maxAnalysisDepth: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        chunkSize: number;
        enableContentChunking: boolean;
        chunkOverlap: number;
        enableBacklinkIndexing: boolean;
        enableConceptMapping: boolean;
        maxAnalysisDepth: number;
    }, {
        chunkSize?: number | undefined;
        enableContentChunking?: boolean | undefined;
        chunkOverlap?: number | undefined;
        enableBacklinkIndexing?: boolean | undefined;
        enableConceptMapping?: boolean | undefined;
        maxAnalysisDepth?: number | undefined;
    }>;
    integrations: z.ZodObject<{
        zotero: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            apiKey: z.ZodOptional<z.ZodString>;
            userId: z.ZodOptional<z.ZodString>;
            groupId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            apiKey?: string | undefined;
            userId?: string | undefined;
            groupId?: string | undefined;
        }, {
            apiKey?: string | undefined;
            enabled?: boolean | undefined;
            userId?: string | undefined;
            groupId?: string | undefined;
        }>;
        openai: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            apiKey: z.ZodOptional<z.ZodString>;
            model: z.ZodDefault<z.ZodString>;
            maxTokens: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            model: string;
            enabled: boolean;
            maxTokens: number;
            apiKey?: string | undefined;
        }, {
            model?: string | undefined;
            apiKey?: string | undefined;
            enabled?: boolean | undefined;
            maxTokens?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        zotero: {
            enabled: boolean;
            apiKey?: string | undefined;
            userId?: string | undefined;
            groupId?: string | undefined;
        };
        openai: {
            model: string;
            enabled: boolean;
            maxTokens: number;
            apiKey?: string | undefined;
        };
    }, {
        zotero: {
            apiKey?: string | undefined;
            enabled?: boolean | undefined;
            userId?: string | undefined;
            groupId?: string | undefined;
        };
        openai: {
            model?: string | undefined;
            apiKey?: string | undefined;
            enabled?: boolean | undefined;
            maxTokens?: number | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    analysis: {
        chunkSize: number;
        enableContentChunking: boolean;
        chunkOverlap: number;
        enableBacklinkIndexing: boolean;
        enableConceptMapping: boolean;
        maxAnalysisDepth: number;
    };
    search: {
        maxResults: number;
        semanticThreshold: number;
        indexingEnabled: boolean;
        indexUpdateInterval: number;
        mmrEnabled: boolean;
        mmrLambda: number;
    };
    logging: {
        logDir: string;
        level: "error" | "warn" | "info" | "debug";
        enableFileLogging: boolean;
        maxLogFiles: number;
        maxLogSize: number;
        enableStructuredLogging: boolean;
        enablePerformanceLogging: boolean;
    };
    obsidian: {
        apiUrl: string;
        apiKey: string;
        timeout: number;
        retries: number;
        vaultPath?: string | undefined;
    };
    smartConnections: {
        timeout: number;
        enabled: boolean;
        fallbackOnError: boolean;
        apiUrl?: string | undefined;
    };
    cache: {
        enabled: boolean;
        ttl: number;
        maxSize: number;
        strategy: "lru" | "lfu";
        persistToDisk: boolean;
        diskCachePath?: string | undefined;
    };
    performance: {
        maxConcurrentRequests: number;
        batchSize: number;
        enableProfiling: boolean;
        memoryThreshold: number;
        cpuThreshold: number;
        backgroundTaskEnabled: boolean;
    };
    security: {
        maxFileSize: number;
        allowedOrigins: string[];
        enablePathValidation: boolean;
        maxRequestSize: number;
        rateLimiting: {
            enabled: boolean;
            windowMs: number;
            maxRequests: number;
        };
        corsEnabled: boolean;
    };
    integrations: {
        zotero: {
            enabled: boolean;
            apiKey?: string | undefined;
            userId?: string | undefined;
            groupId?: string | undefined;
        };
        openai: {
            model: string;
            enabled: boolean;
            maxTokens: number;
            apiKey?: string | undefined;
        };
    };
}, {
    analysis: {
        chunkSize?: number | undefined;
        enableContentChunking?: boolean | undefined;
        chunkOverlap?: number | undefined;
        enableBacklinkIndexing?: boolean | undefined;
        enableConceptMapping?: boolean | undefined;
        maxAnalysisDepth?: number | undefined;
    };
    search: {
        maxResults?: number | undefined;
        semanticThreshold?: number | undefined;
        indexingEnabled?: boolean | undefined;
        indexUpdateInterval?: number | undefined;
        mmrEnabled?: boolean | undefined;
        mmrLambda?: number | undefined;
    };
    logging: {
        logDir?: string | undefined;
        level?: "error" | "warn" | "info" | "debug" | undefined;
        enableFileLogging?: boolean | undefined;
        maxLogFiles?: number | undefined;
        maxLogSize?: number | undefined;
        enableStructuredLogging?: boolean | undefined;
        enablePerformanceLogging?: boolean | undefined;
    };
    obsidian: {
        apiUrl?: string | undefined;
        apiKey?: string | undefined;
        vaultPath?: string | undefined;
        timeout?: number | undefined;
        retries?: number | undefined;
    };
    smartConnections: {
        apiUrl?: string | undefined;
        timeout?: number | undefined;
        enabled?: boolean | undefined;
        fallbackOnError?: boolean | undefined;
    };
    cache: {
        enabled?: boolean | undefined;
        ttl?: number | undefined;
        maxSize?: number | undefined;
        strategy?: "lru" | "lfu" | undefined;
        persistToDisk?: boolean | undefined;
        diskCachePath?: string | undefined;
    };
    performance: {
        maxConcurrentRequests?: number | undefined;
        batchSize?: number | undefined;
        enableProfiling?: boolean | undefined;
        memoryThreshold?: number | undefined;
        cpuThreshold?: number | undefined;
        backgroundTaskEnabled?: boolean | undefined;
    };
    security: {
        rateLimiting: {
            enabled?: boolean | undefined;
            windowMs?: number | undefined;
            maxRequests?: number | undefined;
        };
        maxFileSize?: number | undefined;
        allowedOrigins?: string[] | undefined;
        enablePathValidation?: boolean | undefined;
        maxRequestSize?: number | undefined;
        corsEnabled?: boolean | undefined;
    };
    integrations: {
        zotero: {
            apiKey?: string | undefined;
            enabled?: boolean | undefined;
            userId?: string | undefined;
            groupId?: string | undefined;
        };
        openai: {
            model?: string | undefined;
            apiKey?: string | undefined;
            enabled?: boolean | undefined;
            maxTokens?: number | undefined;
        };
    };
}>;
export type EnhancedConfig = z.infer<typeof EnhancedConfigSchema>;
export interface ConfigSource {
    name: string;
    load(): Promise<Partial<EnhancedConfig>>;
    priority: number;
}
export declare class EnhancedConfigManager {
    private config;
    private sources;
    private watchers;
    private onChangeCallbacks;
    constructor();
    private addDefaultSources;
    addSource(source: ConfigSource): void;
    load(): Promise<EnhancedConfig>;
    getConfig(): EnhancedConfig;
    startWatching(): void;
    private watchConfigFile;
    onChange(callback: (config: EnhancedConfig) => void): void;
    private notifyConfigChange;
    stopWatching(): void;
    private deepMerge;
    saveToFile(filePath: string): Promise<void>;
    validateVaultPath(): Promise<boolean>;
    getConfigSummary(): object;
}
export declare const enhancedConfigManager: EnhancedConfigManager;
export declare function loadConfig(): Promise<EnhancedConfig>;
//# sourceMappingURL=enhanced-config.d.ts.map