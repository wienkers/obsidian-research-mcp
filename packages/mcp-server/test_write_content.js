#!/usr/bin/env node

// Test script for obsidian_write_content MCP tool call
import { ObsidianResearchServer } from './dist/server.js';

async function testWriteContent() {
  console.log('=== MCP Tool Call Test: obsidian_write_content ===');
  
  const server = new ObsidianResearchServer();
  
  const params = {
    targetType: 'path',
    targetIdentifier: 'Tests/Analytics Test Note.md',
    content: '\n### Updated Methodology Section\n\nThis methodology section has been updated via MCP.\n\n1. **Enhanced Analysis**: Improved structural extraction\n2. **Better Targeting**: More precise section identification  \n3. **Comprehensive Coverage**: All element types supported\n\n',
    mode: 'relative',
    relativeMode: {
      operation: 'replace',
      targetType: 'heading',
      target: 'Methodology Section'
    }
  };

  console.log('Parameters:');
  console.log(JSON.stringify(params, null, 2));
  console.log('\n=== Executing Tool ===');

  try {
    // Use the internal handler method
    const result = await server.handleConsolidatedWriteNote(params);
    console.log('\n=== Tool Execution Results ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('\n=== Tool Execution Error ===');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testWriteContent().catch(error => {
  console.error('Test failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});