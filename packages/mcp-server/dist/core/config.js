import { z } from 'zod';
export const ConfigSchema = z.object({
    // Obsidian API settings
    obsidianApiUrl: z.string().url().default('https://127.0.0.1:27124'),
    obsidianVaultPath: z.string().optional(),
    obsidianApiKey: z.string().default('71223d2949830e13b43823d6f2925ae6fdf44b553e2f074a425ce62be00f5df7'),
    // Smart Connections integration
    smartConnectionsEnabled: z.boolean().default(true),
    smartConnectionsApiUrl: z.string().url().optional(),
    // Server settings
    serverPort: z.number().min(1000).max(65535).default(8000),
    // Search limits
    maxSearchResults: z.number().positive().default(100),
    semanticSimilarityThreshold: z.number().min(0).max(1).default(0.7),
    // Cache settings  
    cacheEnabled: z.boolean().default(true),
    cacheTtl: z.number().positive().default(300), // 5 minutes in seconds
    // Request settings
    requestTimeout: z.number().positive().default(30000), // 30 seconds in ms
    // Analysis limits
    maxFileSize: z.number().positive().default(10485760), // 10MB in bytes
    maxBatchSize: z.number().positive().default(50),
    // Graph analysis
    maxDepth: z.number().positive().default(3),
    minConnections: z.number().min(0).default(1),
    // Batch operations
    maxBatchOperations: z.number().positive().default(100),
    batchConcurrency: z.number().positive().default(5),
    // AI/LLM integration (optional)
    openaiApiKey: z.string().optional(),
    anthropicApiKey: z.string().optional(),
    maxCompletionTokens: z.number().positive().default(4000),
    // Synthesis settings
    maxSynthesisTokens: z.number().positive().default(8000),
    maxEvidenceItems: z.number().positive().default(20),
    // Zotero integration (optional)
    zoteroEnabled: z.boolean().default(false),
    zoteroApiKey: z.string().optional(),
    zoteroUserId: z.string().optional(),
    zoteroGroupId: z.string().optional(),
    // Security
    enableCors: z.boolean().default(true),
    allowedOrigins: z.array(z.string()).default(['http://localhost']),
    // Logging
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    logDir: z.string().default('./logs'),
});
function loadConfig() {
    const rawConfig = {
        obsidianApiUrl: process.env.OBSIDIAN_API_URL,
        obsidianVaultPath: process.env.OBSIDIAN_VAULT_PATH,
        obsidianApiKey: process.env.OBSIDIAN_API_KEY,
        smartConnectionsEnabled: process.env.SMART_CONNECTIONS_ENABLED !== 'false',
        smartConnectionsApiUrl: process.env.SMART_CONNECTIONS_API_URL,
        serverPort: process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : undefined,
        maxSearchResults: process.env.MAX_SEARCH_RESULTS ? parseInt(process.env.MAX_SEARCH_RESULTS) : undefined,
        semanticSimilarityThreshold: process.env.SEMANTIC_SIMILARITY_THRESHOLD ? parseFloat(process.env.SEMANTIC_SIMILARITY_THRESHOLD) : undefined,
        cacheEnabled: process.env.CACHE_ENABLED !== 'false',
        cacheTtl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : undefined,
        requestTimeout: process.env.REQUEST_TIMEOUT ? parseInt(process.env.REQUEST_TIMEOUT) : undefined,
        maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : undefined,
        maxBatchSize: process.env.MAX_BATCH_SIZE ? parseInt(process.env.MAX_BATCH_SIZE) : undefined,
        maxDepth: process.env.MAX_DEPTH ? parseInt(process.env.MAX_DEPTH) : undefined,
        minConnections: process.env.MIN_CONNECTIONS ? parseInt(process.env.MIN_CONNECTIONS) : undefined,
        maxBatchOperations: process.env.MAX_BATCH_OPERATIONS ? parseInt(process.env.MAX_BATCH_OPERATIONS) : undefined,
        batchConcurrency: process.env.BATCH_CONCURRENCY ? parseInt(process.env.BATCH_CONCURRENCY) : undefined,
        openaiApiKey: process.env.OPENAI_API_KEY,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        maxCompletionTokens: process.env.MAX_COMPLETION_TOKENS ? parseInt(process.env.MAX_COMPLETION_TOKENS) : undefined,
        maxSynthesisTokens: process.env.MAX_SYNTHESIS_TOKENS ? parseInt(process.env.MAX_SYNTHESIS_TOKENS) : undefined,
        maxEvidenceItems: process.env.MAX_EVIDENCE_ITEMS ? parseInt(process.env.MAX_EVIDENCE_ITEMS) : undefined,
        zoteroEnabled: process.env.ZOTERO_ENABLED === 'true',
        zoteroApiKey: process.env.ZOTERO_API_KEY,
        zoteroUserId: process.env.ZOTERO_USER_ID,
        zoteroGroupId: process.env.ZOTERO_GROUP_ID,
        enableCors: process.env.ENABLE_CORS !== 'false',
        allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : undefined,
        logLevel: process.env.LOG_LEVEL,
        logDir: process.env.LOG_DIR,
    };
    // Remove undefined values
    const cleanConfig = Object.fromEntries(Object.entries(rawConfig).filter(([, value]) => value !== undefined));
    try {
        return ConfigSchema.parse(cleanConfig);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
            throw new Error(`Configuration validation failed:\n${issues}`);
        }
        throw error;
    }
}
export const config = loadConfig();
