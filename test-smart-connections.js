#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Testing Smart Connections status...');

// Set environment variables without explicitly setting SMART_CONNECTIONS_ENABLED
const env = {
  ...process.env,
  OBSIDIAN_VAULT_PATH: '/Users/wienkers/Library/Mobile Documents/iCloud~md~obsidian/Documents/Research',
  LOG_LEVEL: 'debug',
  ENABLE_CONSOLE_LOGGING: 'true'
};

const server = spawn('node', ['packages/mcp-server/dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env
});

server.stderr.on('data', (data) => {
  console.error('Server:', data.toString().trim());
});

server.stdout.on('data', (data) => {
  const response = data.toString();
  console.log('Response:', response);
});

// Test semantic search with hasProperty filter
const searchRequest = {
  jsonrpc: "2.0", 
  id: 1,
  method: "tools/call",
  params: {
    name: "obsidian_semantic_search",
    arguments: {
      query: "test analysis structure",
      filters: {
        hasProperty: {
          analysis_target: true,
          category: "research"
        }
      }
    }
  }
};

server.stdin.write(JSON.stringify(searchRequest) + '\n');

setTimeout(() => {
  server.kill('SIGTERM');
}, 8000);

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});