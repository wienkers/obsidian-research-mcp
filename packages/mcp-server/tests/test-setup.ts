import { vi } from 'vitest';

// Set up environment variables for tests
process.env.OBSIDIAN_VAULT_PATH = '/tmp/test-vault';
process.env.OBSIDIAN_API_URL = 'https://127.0.0.1:27124';
process.env.OBSIDIAN_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';

// Mock the logger to avoid noise in tests
vi.mock('../src/core/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logPerformance: vi.fn(),
  LoggedError: class LoggedError extends Error {
    constructor(message: string, metadata?: any) {
      super(message);
      this.name = 'LoggedError';
    }
  }
}));

// Mock the obsidian API
vi.mock('../src/integrations/obsidian-api.js', () => ({
  obsidianAPI: {
    listFiles: vi.fn(),
    getNote: vi.fn(),
    createFile: vi.fn(),
    updateFileContent: vi.fn(),
    deleteFile: vi.fn(),
  }
}));

// Mock the config
vi.mock('../src/core/config.js', () => ({
  config: {
    obsidianVaultPath: '/tmp/test-vault',
    obsidianApiUrl: 'https://127.0.0.1:27124',
    obsidianApiKey: 'test-api-key',
    smartConnectionsEnabled: true,
    cacheEnabled: true,
    logLevel: 'info'
  }
}));