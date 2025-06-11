#!/usr/bin/env node

// Test script to verify hasProperty filter fix
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test case 1.4 parameters from the MCP Function Test Suite
const testRequest = {
  method: 'tools/call',
  params: {
    name: 'obsidian_semantic_search',
    arguments: {
      query: 'test analysis structure',
      filters: {
        hasProperty: {
          analysis_target: true,
          category: 'research'
        }
      }
    }
  }
};

console.log('Testing hasProperty filter fix...');
console.log('Test parameters:', JSON.stringify(testRequest, null, 2));

// Start the MCP server
const serverPath = path.join(__dirname, 'packages/mcp-server/dist/index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { 
    ...process.env,
    OBSIDIAN_VAULT_PATH: '/Users/wienkers/Library/Mobile Documents/iCloud~md~obsidian/Documents/Research',
    LOG_LEVEL: 'debug'
  }
});

let responseData = '';
let errorData = '';

server.stdout.on('data', (data) => {
  responseData += data.toString();
});

server.stderr.on('data', (data) => {
  errorData += data.toString();
  console.log('Server log:', data.toString());
});

server.on('close', (code) => {
  console.log(`\nServer process exited with code ${code}`);
  
  if (responseData) {
    console.log('\n=== Server Response ===');
    // Parse JSON-RPC responses
    const responses = responseData.trim().split('\n').filter(line => line.trim());
    responses.forEach((response, index) => {
      try {
        const parsed = JSON.parse(response);
        console.log(`Response ${index + 1}:`, JSON.stringify(parsed, null, 2));
        
        // Check if this is our search response
        if (parsed.result && parsed.result.content && parsed.result.content[0]) {
          const content = JSON.parse(parsed.result.content[0].text);
          console.log(`\n=== Search Results ===`);
          console.log(`Query: ${content.query}`);
          console.log(`Results found: ${content.results?.length || 0}`);
          console.log(`Total results: ${content.totalResults}`);
          
          if (content.results && content.results.length > 0) {
            console.log('\nMatched files:');
            content.results.forEach((result, i) => {
              console.log(`${i + 1}. ${result.path} (score: ${result.score})`);
            });
          }
          
          // Expected results check
          const expectedFiles = [
            'Tests/Analytics Test Note.md',
            'Tests/Complex Note.md'
          ];
          
          const foundFiles = content.results?.map(r => r.path) || [];
          const hasExpectedResults = expectedFiles.every(expected => 
            foundFiles.some(found => found.includes(expected.replace('Tests/', '')))
          );
          
          console.log(`\n=== Test Result ===`);
          console.log(`Expected files: ${expectedFiles.join(', ')}`);
          console.log(`Found files: ${foundFiles.join(', ')}`);
          console.log(`Test ${hasExpectedResults ? 'PASSED' : 'FAILED'}: ${hasExpectedResults ? 'Both expected files found' : 'Missing expected files'}`);
        }
      } catch (e) {
        console.log(`Could not parse response ${index + 1}: ${response}`);
      }
    });
  }
  
  if (errorData && !errorData.includes('MCP Server running')) {
    console.log('\n=== Server Errors ===');
    console.log(errorData);
  }
});

// Send the test request
const requestMessage = JSON.stringify(testRequest) + '\n';
server.stdin.write(requestMessage);

// Close stdin to signal we're done sending requests
setTimeout(() => {
  server.stdin.end();
}, 2000);

// Kill server after 10 seconds if it doesn't exit
setTimeout(() => {
  console.log('\nTimeout reached, killing server...');
  server.kill('SIGTERM');
}, 10000);