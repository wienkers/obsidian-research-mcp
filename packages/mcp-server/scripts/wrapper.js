#!/usr/bin/env node

// Wrapper script to help debug MCP server issues
console.error('MCP Wrapper: Starting with Node.js version:', process.version);
console.error('MCP Wrapper: Module resolution:', JSON.stringify({
  type: 'module',
  cwd: process.cwd(),
  env: {
    NODE_ENV: process.env.NODE_ENV,
    NODE_OPTIONS: process.env.NODE_OPTIONS
  }
}));

// Import and start the main server
try {
  const { server } = await import('./dist/server.js');
  console.error('MCP Wrapper: Server imported successfully');
  await server.run();
} catch (error) {
  console.error('MCP Wrapper: Failed to import or start server:', error.message);
  console.error('MCP Wrapper: Stack trace:', error.stack);
  process.exit(1);
}