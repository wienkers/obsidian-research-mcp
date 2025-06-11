# Setup Guide

This guide will help you set up the **simplified** Obsidian Research MCP server for use with Claude.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js 18 or higher** - [Download here](https://nodejs.org/)
2. **Obsidian** - [Download here](https://obsidian.md/)
3. **Local REST API plugin** for Obsidian (required)
4. **Smart Connections plugin** (optional for future features)

## Step 1: Install Required Obsidian Plugins

### Local REST API Plugin (Required)

1. Open Obsidian
2. Go to Settings → Community plugins
3. Browse and install "Local REST API"
4. Enable the plugin
5. **Important**: Configure to use **HTTPS on port 27124** (not the default 27123)
6. Note the API key that gets generated - you'll need this later

### Smart Connections Plugin (Optional)

1. Browse and install "Smart Connections" 
2. Enable the plugin
3. Let it index your vault (for future semantic search features)

## Step 2: Clone and Install the MCP Server

```bash
# Clone the repository
git clone https://github.com/your-repo/obsidian-research-mcp.git
cd obsidian-research-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Step 3: Install the Obsidian Plugin

1. **Copy the plugin files:**
   ```bash
   cp -r packages/obsidian-plugin/ /path/to/your/vault/.obsidian/plugins/obsidian-research-mcp/
   ```

2. **Enable the plugin in Obsidian:**
   - Go to Settings → Community plugins
   - Find "Research MCP Bridge" and enable it

3. **The plugin will automatically:**
   - Detect your Local REST API plugin
   - Retrieve the API key
   - Configure the correct endpoints

## Step 4: Configure Claude Desktop

### Option A: Use the Plugin's Auto-Configuration (Recommended)

1. In Obsidian, run the command: **"Configure Claude Desktop"**
2. Copy the generated JSON configuration
3. Paste it into your Claude Desktop config file

### Option B: Manual Configuration

**macOS**: Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: Edit `%APPDATA%/Claude/claude_desktop_config.json`
**Linux**: Edit `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "obsidian-research-mcp": {
      "command": "node",
      "args": ["/path/to/obsidian-research-mcp/packages/mcp-server/dist/simple-server.js"],
      "env": {
        "OBSIDIAN_API_KEY": "your_api_key_from_local_rest_api",
        "OBSIDIAN_API_URL": "https://127.0.0.1:27124",
        "OBSIDIAN_VAULT_PATH": "/path/to/your/vault"
      }
    }
  }
}
```

**Replace:**
- `your_api_key_from_local_rest_api` with the key from Local REST API plugin
- `/path/to/obsidian-research-mcp` with the actual path to your installation
- `/path/to/your/vault` with the path to your Obsidian vault

## Step 5: Test the Connection

1. **Test Local REST API is working:**
   ```bash
   # Replace YOUR_API_KEY with your actual key
   curl -k -H "Authorization: Bearer YOUR_API_KEY" https://127.0.0.1:27124/vault
   ```

2. **Test MCP server can start:**
   ```bash
   cd obsidian-research-mcp/packages/mcp-server
   OBSIDIAN_API_KEY=your_key OBSIDIAN_VAULT_PATH=/path/to/vault node dist/simple-server.js
   ```

3. **Restart Claude Desktop** for configuration to take effect

## Step 6: Test with Claude

Open Claude Desktop and try:

1. **Test basic connectivity:**
   ```
   Can you read my Obsidian notes?
   ```

2. **List vault files:**
   ```
   Show me all the files in my Obsidian vault
   ```

3. **Read a specific note:**
   ```
   Read my note called "filename.md" and summarize it
   ```

4. **Search functionality:**
   ```
   Search my vault for notes containing "machine learning"
   ```

## Available Plugin Commands

Use these commands in Obsidian to help with setup and debugging:

- **"Check MCP Dependencies"** - Verify Local REST API and Smart Connections status
- **"Show Vault Information"** - Display vault stats
- **"Install MCP Server"** - Mark server as configured
- **"Configure Claude Desktop"** - Generate Claude configuration automatically
- **"MCP Integration Guide"** - Show current status and help

## Troubleshooting

### Common Issues

#### "Could not connect to Obsidian API"
- **Check Local REST API plugin is running on port 27124**
- Verify HTTPS is enabled in Local REST API settings
- Test the API manually with curl as shown above
- Make sure Obsidian is running

#### "MCP server not responding in Claude"
- Restart Claude Desktop after making configuration changes
- Check that the MCP server path in config is correct
- Verify environment variables are set in the config
- Test the server can start manually (see Step 5)

#### "Permission denied" or file access errors
- Ensure the vault path is correct and accessible
- Check file permissions on the vault directory
- Make sure the path doesn't contain special characters

#### "API key not found"
- Check Local REST API plugin is installed and enabled
- Look for the API key in Local REST API plugin settings
- Use the "Refresh API Key" button in the MCP Bridge plugin settings

### Debug Mode

1. **Enable debug in the MCP server:**
   ```bash
   # Add to your environment or Claude config:
   LOG_LEVEL=debug
   ```

2. **Use Obsidian plugin debug commands:**
   - "Check MCP Dependencies" shows plugin status
   - "Show Vault Information" shows vault accessibility
   - "MCP Integration Guide" shows overall status

3. **Manual API testing:**
   ```bash
   # Test Local REST API directly
   curl -k -H "Authorization: Bearer YOUR_API_KEY" \
     https://127.0.0.1:27124/vault

   # Should return your vault structure
   ```

### Performance Notes

- The simple server uses hard-coded configuration for reliability
- SSL verification is disabled for Local REST API's self-signed certificates
- Basic search is implemented; semantic search requires Smart Connections
- Memory usage is minimal compared to the full-featured server

## Security Considerations

### Network Security
- All communication is localhost-only (127.0.0.1)
- HTTPS used with Local REST API (self-signed certificates)
- No external network access required

### File Access
- MCP server has read/write access to your vault through Local REST API
- Access is controlled by Obsidian's file permissions
- API key provides authentication

### Best Practices
- Keep API keys secure and don't share them
- Regular vault backups are recommended
- Monitor file changes if concerned about accidental modifications

## Next Steps

Once setup is complete:

1. **Test all the basic tools** (list, read, create, search)
2. **Try different search queries** to understand capabilities
3. **Create test notes** to verify write functionality works
4. **Explore the plugin commands** for status and configuration

For issues or feature requests, check the project repository or create an issue.

---

*This simplified setup provides reliable basic functionality. Advanced features like semantic search and concept mapping can be added later.*