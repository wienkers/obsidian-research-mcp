#!/bin/bash

# Obsidian Research MCP Server Startup Script
echo "🚀 Starting Obsidian Research MCP Server..."

# Change to the MCP server directory
cd "$(dirname "$0")/packages/mcp-server"

# Check if the server is built
if [ ! -f "dist/index.js" ]; then
    echo "📦 Building MCP server..."
    npm run build
fi

# Start the server
echo "🔌 Starting server - Claude Desktop should connect automatically"
echo "📝 Logs will appear below. Press Ctrl+C to stop."
echo "---"

node dist/index.js