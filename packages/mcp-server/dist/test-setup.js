import { vi } from 'vitest';
// Set up environment variables for tests
process.env.OBSIDIAN_VAULT_PATH = '/tmp/test-vault';
process.env.OBSIDIAN_API_URL = 'https://127.0.0.1:27124';
process.env.OBSIDIAN_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';
// Mock the logger to avoid noise in tests
vi.mock('./core/logger.js', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
    logPerformance: vi.fn(),
}));
