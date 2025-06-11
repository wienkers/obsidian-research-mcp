import { z } from 'zod';
import * as fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

// Enhanced configuration schema with better validation and defaults
export const EnhancedConfigSchema = z.object({
  // Core Obsidian Integration
  obsidian: z.object({
    apiUrl: z.string().url().default('https://127.0.0.1:27124'),
    apiKey: z.string().default('71223d2949830e13b43823d6f2925ae6fdf44b553e2f074a425ce62be00f5df7'),
    vaultPath: z.string().optional(),
    timeout: z.number().min(1000).max(60000).default(30000), // 30 seconds
    retries: z.number().min(0).max(10).default(3)
  }),
  
  // Smart Connections Integration
  smartConnections: z.object({
    enabled: z.boolean().default(true),
    apiUrl: z.string().url().optional(),
    timeout: z.number().min(1000).max(30000).default(15000),
    fallbackOnError: z.boolean().default(true)
  }),
  
  // Search Configuration
  search: z.object({
    maxResults: z.number().min(1).max(2000).default(100),
    semanticThreshold: z.number().min(0).max(1).default(0.7),
    indexingEnabled: z.boolean().default(true),
    indexUpdateInterval: z.number().min(60).max(3600).default(300), // 5 minutes
    mmrEnabled: z.boolean().default(true),
    mmrLambda: z.number().min(0).max(1).default(0.7)
  }),
  
  // Cache Configuration
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().min(0).default(300000), // 5 minutes in ms
    maxSize: z.number().min(0).default(104857600), // 100MB
    strategy: z.enum(['lru', 'lfu']).default('lru'),
    persistToDisk: z.boolean().default(false),
    diskCachePath: z.string().optional()
  }),
  
  // Performance Settings
  performance: z.object({
    maxConcurrentRequests: z.number().min(1).max(100).default(10),
    batchSize: z.number().min(1).max(200).default(20),
    enableProfiling: z.boolean().default(false),
    memoryThreshold: z.number().min(100).default(1000), // MB
    cpuThreshold: z.number().min(10).max(100).default(80), // %
    backgroundTaskEnabled: z.boolean().default(true)
  }),
  
  // Security Settings
  security: z.object({
    enablePathValidation: z.boolean().default(true),
    maxFileSize: z.number().min(1024).default(10485760), // 10MB
    maxRequestSize: z.number().min(1024).default(52428800), // 50MB
    rateLimiting: z.object({
      enabled: z.boolean().default(true),
      windowMs: z.number().min(1000).max(3600000).default(60000), // 1 minute
      maxRequests: z.number().min(1).max(10000).default(100)
    }),
    corsEnabled: z.boolean().default(true),
    allowedOrigins: z.array(z.string()).default(['*'])
  }),
  
  // Logging Configuration
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    enableFileLogging: z.boolean().default(true),
    logDir: z.string().default('./logs'),
    maxLogFiles: z.number().min(1).max(100).default(10),
    maxLogSize: z.number().min(1024).default(10485760), // 10MB
    enableStructuredLogging: z.boolean().default(true),
    enablePerformanceLogging: z.boolean().default(false)
  }),
  
  // Analysis Features
  analysis: z.object({
    enableContentChunking: z.boolean().default(true),
    chunkSize: z.number().min(100).max(10000).default(2000),
    chunkOverlap: z.number().min(0).max(1000).default(200),
    enableBacklinkIndexing: z.boolean().default(true),
    enableConceptMapping: z.boolean().default(true),
    maxAnalysisDepth: z.number().min(1).max(10).default(3)
  }),
  
  // External Integrations (Optional)
  integrations: z.object({
    zotero: z.object({
      enabled: z.boolean().default(false),
      apiKey: z.string().optional(),
      userId: z.string().optional(),
      groupId: z.string().optional()
    }),
    openai: z.object({
      enabled: z.boolean().default(false),
      apiKey: z.string().optional(),
      model: z.string().default('gpt-3.5-turbo'),
      maxTokens: z.number().min(100).max(8000).default(4000)
    })
  })
});

export type EnhancedConfig = z.infer<typeof EnhancedConfigSchema>;

export interface ConfigSource {
  name: string;
  load(): Promise<Partial<EnhancedConfig>>;
  priority: number; // Higher number = higher priority
}

// Environment variable source
class EnvironmentConfigSource implements ConfigSource {
  name = 'environment';
  priority = 100;
  
  async load(): Promise<Partial<EnhancedConfig>> {
    const config: any = {};
    
    // Only add properties that have values
    if (process.env.OBSIDIAN_API_URL) {
      config.obsidian = config.obsidian || {};
      config.obsidian.apiUrl = process.env.OBSIDIAN_API_URL;
    }
    
    if (process.env.OBSIDIAN_API_KEY) {
      config.obsidian = config.obsidian || {};
      config.obsidian.apiKey = process.env.OBSIDIAN_API_KEY;
    }
    
    if (process.env.OBSIDIAN_VAULT_PATH) {
      config.obsidian = config.obsidian || {};
      config.obsidian.vaultPath = process.env.OBSIDIAN_VAULT_PATH;
    }
    
    if (process.env.OBSIDIAN_TIMEOUT) {
      config.obsidian = config.obsidian || {};
      config.obsidian.timeout = parseInt(process.env.OBSIDIAN_TIMEOUT);
    }
    
    if (process.env.OBSIDIAN_RETRIES) {
      config.obsidian = config.obsidian || {};
      config.obsidian.retries = parseInt(process.env.OBSIDIAN_RETRIES);
    }
    
    if (process.env.SMART_CONNECTIONS_ENABLED) {
      config.smartConnections = config.smartConnections || {};
      config.smartConnections.enabled = process.env.SMART_CONNECTIONS_ENABLED === 'true';
    }
    
    if (process.env.SMART_CONNECTIONS_API_URL) {
      config.smartConnections = config.smartConnections || {};
      config.smartConnections.apiUrl = process.env.SMART_CONNECTIONS_API_URL;
    }
    
    // Continue with other environment variables
    if (process.env.MAX_SEARCH_RESULTS) {
      config.search = config.search || {};
      config.search.maxResults = parseInt(process.env.MAX_SEARCH_RESULTS);
    }
    
    if (process.env.SEMANTIC_SIMILARITY_THRESHOLD) {
      config.search = config.search || {};
      config.search.semanticThreshold = parseFloat(process.env.SEMANTIC_SIMILARITY_THRESHOLD);
    }
    
    if (process.env.MMR_ENABLED) {
      config.search = config.search || {};
      config.search.mmrEnabled = process.env.MMR_ENABLED === 'true';
    }
    
    if (process.env.CACHE_ENABLED !== undefined) {
      config.cache = config.cache || {};
      config.cache.enabled = process.env.CACHE_ENABLED !== 'false';
    }
    
    if (process.env.CACHE_TTL) {
      config.cache = config.cache || {};
      config.cache.ttl = parseInt(process.env.CACHE_TTL);
    }
    
    if (process.env.CACHE_MAX_SIZE) {
      config.cache = config.cache || {};
      config.cache.maxSize = parseInt(process.env.CACHE_MAX_SIZE);
    }
    
    if (process.env.LOG_LEVEL) {
      config.logging = config.logging || {};
      config.logging.level = process.env.LOG_LEVEL;
    }
    
    if (process.env.FILE_LOGGING_ENABLED !== undefined) {
      config.logging = config.logging || {};
      config.logging.enableFileLogging = process.env.FILE_LOGGING_ENABLED !== 'false';
    }
    
    if (process.env.LOG_DIR) {
      config.logging = config.logging || {};
      config.logging.logDir = process.env.LOG_DIR;
    }
    
    return config;
  }
}

// File-based configuration source
class FileConfigSource implements ConfigSource {
  name = 'file';
  priority = 50;
  
  constructor(private configPath: string) {}
  
  async load(): Promise<Partial<EnhancedConfig>> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return {};
      }
      
      const fileContent = await fs.promises.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      
      logger.debug('Loaded configuration from file', { path: this.configPath });
      return parsed;
    } catch (error) {
      logger.warn('Failed to load configuration from file', { 
        path: this.configPath, 
        error: error instanceof Error ? error.message : String(error)
      });
      return {};
    }
  }
}

// Default configuration source
class DefaultConfigSource implements ConfigSource {
  name = 'defaults';
  priority = 1;
  
  async load(): Promise<Partial<EnhancedConfig>> {
    return {}; // Schema defaults will be used
  }
}

export class EnhancedConfigManager {
  private config: EnhancedConfig | null = null;
  private sources: ConfigSource[] = [];
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private onChangeCallbacks: Array<(config: EnhancedConfig) => void> = [];
  
  constructor() {
    this.addDefaultSources();
  }
  
  private addDefaultSources(): void {
    // Add default configuration sources in priority order
    this.addSource(new DefaultConfigSource());
    
    // Look for config files in common locations
    const configPaths = [
      './obsidian-mcp-config.json',
      './config/obsidian-mcp.json',
      path.join(process.env.HOME || '.', '.obsidian-mcp.json'),
      './obsidian-mcp.config.json'
    ];
    
    for (const configPath of configPaths) {
      this.addSource(new FileConfigSource(configPath));
    }
    
    this.addSource(new EnvironmentConfigSource());
  }
  
  addSource(source: ConfigSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => a.priority - b.priority); // Lower priority first
  }
  
  async load(): Promise<EnhancedConfig> {
    logger.info('Loading configuration from sources', { 
      sources: this.sources.map(s => s.name) 
    });
    
    let mergedConfig: Partial<EnhancedConfig> = {};
    
    // Load from all sources in priority order
    for (const source of this.sources) {
      try {
        const sourceConfig = await source.load();
        mergedConfig = this.deepMerge(mergedConfig, sourceConfig);
        
        logger.debug('Loaded configuration from source', { 
          source: source.name, 
          priority: source.priority,
          keys: Object.keys(sourceConfig)
        });
      } catch (error) {
        logger.warn('Failed to load from configuration source', { 
          source: source.name, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Validate and apply defaults
    try {
      this.config = EnhancedConfigSchema.parse(mergedConfig);
      
      logger.info('Configuration loaded successfully', {
        obsidianApiUrl: this.config.obsidian.apiUrl,
        vaultPath: this.config.obsidian.vaultPath,
        cacheEnabled: this.config.cache.enabled,
        smartConnectionsEnabled: this.config.smartConnections.enabled,
        logLevel: this.config.logging.level
      });
      
      return this.config;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join('\n');
        
        logger.error('Configuration validation failed', { issues });
        throw new Error(`Configuration validation failed:\n${issues}`);
      }
      throw error;
    }
  }
  
  getConfig(): EnhancedConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }
  
  // Watch for configuration changes
  startWatching(): void {
    for (const source of this.sources) {
      if (source instanceof FileConfigSource) {
        this.watchConfigFile((source as any).configPath);
      }
    }
  }
  
  private watchConfigFile(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }
      
      const watcher = fs.watch(filePath, async (eventType) => {
        if (eventType === 'change') {
          logger.info('Configuration file changed, reloading', { filePath });
          
          try {
            const newConfig = await this.load();
            this.notifyConfigChange(newConfig);
          } catch (error) {
            logger.error('Failed to reload configuration', { 
              filePath,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      });
      
      this.watchers.set(filePath, watcher);
      logger.debug('Started watching configuration file', { filePath });
    } catch (error) {
      logger.warn('Failed to start watching configuration file', { 
        filePath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  onChange(callback: (config: EnhancedConfig) => void): void {
    this.onChangeCallbacks.push(callback);
  }
  
  private notifyConfigChange(newConfig: EnhancedConfig): void {
    for (const callback of this.onChangeCallbacks) {
      try {
        callback(newConfig);
      } catch (error) {
        logger.error('Configuration change callback failed', { error });
      }
    }
  }
  
  stopWatching(): void {
    for (const [filePath, watcher] of this.watchers) {
      try {
        watcher.close();
        logger.debug('Stopped watching configuration file', { filePath });
      } catch (error) {
        logger.warn('Failed to stop watching configuration file', { filePath, error });
      }
    }
    this.watchers.clear();
  }
  
  // Deep merge configuration objects
  private deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) {
      return target;
    }
    
    if (typeof source !== 'object' || Array.isArray(source)) {
      return source;
    }
    
    const result = { ...target };
    
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }
  
  // Export configuration to file
  async saveToFile(filePath: string): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration to save');
    }
    
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fs.promises.writeFile(filePath, configData, 'utf-8');
      
      logger.info('Configuration saved to file', { filePath });
    } catch (error) {
      logger.error('Failed to save configuration to file', { 
        filePath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  // Validate vault path
  async validateVaultPath(): Promise<boolean> {
    if (!this.config?.obsidian.vaultPath) {
      logger.warn('Vault path not configured');
      return false;
    }
    
    try {
      const vaultPath = this.config.obsidian.vaultPath;
      const stat = await fs.promises.stat(vaultPath);
      
      if (!stat.isDirectory()) {
        logger.error('Vault path is not a directory', { vaultPath });
        return false;
      }
      
      logger.info('Vault path validated successfully', { vaultPath });
      return true;
    } catch (error) {
      logger.error('Vault path validation failed', { 
        vaultPath: this.config.obsidian.vaultPath,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  // Get configuration summary for logging
  getConfigSummary(): object {
    if (!this.config) {
      return { status: 'not_loaded' };
    }
    
    return {
      obsidian: {
        apiUrl: this.config.obsidian.apiUrl,
        hasVaultPath: !!this.config.obsidian.vaultPath,
        timeout: this.config.obsidian.timeout
      },
      smartConnections: {
        enabled: this.config.smartConnections.enabled
      },
      cache: {
        enabled: this.config.cache.enabled,
        ttl: this.config.cache.ttl,
        strategy: this.config.cache.strategy
      },
      search: {
        maxResults: this.config.search.maxResults,
        mmrEnabled: this.config.search.mmrEnabled
      },
      logging: {
        level: this.config.logging.level,
        fileLogging: this.config.logging.enableFileLogging
      }
    };
  }
}

// Global configuration manager instance
export const enhancedConfigManager = new EnhancedConfigManager();

// Helper function to load and return config
export async function loadConfig(): Promise<EnhancedConfig> {
  return enhancedConfigManager.load();
}