#!/usr/bin/env node

import { server } from './server.js';

async function main() {
  try {
    console.error(`Starting Obsidian Research MCP Server (Node.js ${process.version})...`);
    console.error(`Environment: ES module, cwd: ${process.cwd()}`);
    
    // Pre-flight checks
    if (!server) {
      throw new Error('Server module failed to load');
    }
    
    console.error('Server module loaded successfully, starting...');
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    console.error('Environment details:', {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NODE_OPTIONS: process.env.NODE_OPTIONS
      }
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

main();