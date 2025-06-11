#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Testing simple pattern search...');

// Set environment variables
const env = {
  ...process.env,
  OBSIDIAN_VAULT_PATH: '/Users/wienkers/Library/Mobile Documents/iCloud~md~obsidian/Documents/Research',
  LOG_LEVEL: 'info'
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

// Test simpler pattern search
const patternRequest = {
  jsonrpc: "2.0", 
  id: 1,
  method: "tools/call",
  params: {
    name: "obsidian_pattern_search",
    arguments: {
      patterns: ["Analytics Test Note"],
      scope: {
        folders: ["Tests"]
      }
    }
  }
};

server.stdin.write(JSON.stringify(patternRequest) + '\n');

setTimeout(() => {
  server.kill('SIGTERM');
}, 8000);

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});