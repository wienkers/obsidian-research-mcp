# Obsidian Research MCP

A **reliable** Model Context Protocol (MCP) server for Obsidian vaults. This system enables Claude to read, write, and search your Obsidian notes through the Local REST API plugin.

## 🌟 Features

### Core Capabilities ✅
- **Note Reading**: Read individual notes with full content and metadata
- **Note Writing**: Create and update notes in your vault
- **File Listing**: Browse your vault structure and find files
- **Content Search**: Search through note contents with context
- **Local REST API Integration**: Direct communication with Obsidian

### Architecture
- **Simple MCP Server**: Lightweight implementation with hard-coded configuration for testing
- **Obsidian Plugin**: Bridge between Local REST API and MCP server with auto-configuration
- **Reliable Communication**: HTTPS with SSL bypass for Local REST API compatibility

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **Obsidian** with **Local REST API plugin** installed and running
- **Smart Connections plugin**

### Step 1: Install Local REST API Plugin

1. Open Obsidian Settings → Community Plugins
2. Search for "Local REST API" 
3. Install and enable the plugin
4. In Local REST API settings:
   - Enable the server (it should start on port 27124)
   - Note down the API key generated
   - Ensure HTTPS is enabled

### Step 2: Build and Install MCP Components

1. **Clone and build the repository**
   ```bash
   git clone https://github.com/your-repo/obsidian-research-mcp.git
   cd obsidian-research-mcp
   npm install
   npm run build
   ```

2. **Install the Obsidian plugin**
   ```bash
   # Copy the built plugin to your vault
   cp -r packages/obsidian-plugin/ /path/to/your/vault/.obsidian/plugins/obsidian-research-mcp/
   ```

3. **Enable the Research MCP Bridge plugin in Obsidian**
   - Go to Settings → Community Plugins
   - Enable "Research MCP Bridge"
   - The plugin will automatically detect your Local REST API key

### Step 3: Configure Claude Desktop

1. **Use the plugin's auto-configuration**
   - In Obsidian, run the command: "Configure Claude Desktop"
   - Copy the generated configuration

2. **Add to your Claude Desktop config**
   
   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "obsidian-research-mcp": {
         "command": "node",
         "args": ["/path/to/obsidian-research-mcp/packages/mcp-server/dist/index.js"],
         "env": {
           "OBSIDIAN_API_KEY": "your_api_key_here",
           "OBSIDIAN_API_URL": "https://127.0.0.1:27124",
           "OBSIDIAN_VAULT_PATH": "/path/to/your/vault"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**

### Step 4: Test the Connection

Ask Claude: **"Can you read my Obsidian notes?"**

Claude should respond with access to your vault and be able to:
- List files in your vault
- Read specific notes
- Create new notes
- Search through your content

## 🔧 Configuration

### Environment Variables

The MCP server uses these environment variables (configured automatically by the plugin):

```bash
# Required
OBSIDIAN_API_KEY=your_local_rest_api_key     # From Local REST API plugin
OBSIDIAN_API_URL=https://127.0.0.1:27124    # Local REST API endpoint  
OBSIDIAN_VAULT_PATH=/path/to/your/vault     # Your vault's path

# Optional
LOG_LEVEL=info                               # Logging verbosity
```

### Obsidian Plugin Commands

Available commands in Obsidian:

- **"Check MCP Dependencies"** - Verify Local REST API and Smart Connections status
- **"Install MCP Server"** - Mark server as configured
- **"Configure Claude Desktop"** - Generate Claude configuration
- **"Show Vault Information"** - Display vault stats for MCP
- **"MCP Integration Guide"** - Show current status and next steps

## 🚀 Server Features

### MCP Server Implementation
- **8 consolidated tools** with advanced search capabilities
- **Fast startup** with optimized initialization
- **Core functionality** focused on essential vault operations
- **Enhanced search** with separate semantic and pattern search tools
- **Foundation for expansion** - designed for future enhancement
- **Reliable error handling** for implemented features

## 📚 Available MCP Tools

The Obsidian Research MCP server provides **8 consolidated tools** with enhanced search capabilities:

### 🧠 obsidian_semantic_search
Perform semantic search using Smart Connections with advanced filtering and link expansion. Searches by meaning and concept similarity.

**Key Features:**
- Pure semantic search via Smart Connections plugin
- Advanced filtering by folders, tags, linked files, and frontmatter properties  
- Link expansion for discovering connected notes
- Configurable similarity threshold
- Search depth control for link traversal
- No regex functionality - semantic understanding only

### 🔍 obsidian_pattern_search
Search for regex patterns across vault content with advanced scoping, statistics, and insights. Supports multiple patterns and exclusion filtering.

**Key Features:**
- Multiple regex patterns per search request
- Advanced scoping with include/exclude paths and folders
- File pattern matching with glob syntax
- Pattern usage statistics and frequency analysis
- AI-generated insights about pattern usage
- Context windows around matches
- Whole word matching options
- Case sensitivity controls

### 📄 obsidian_get_notes
Retrieve single or multiple notes by file path with comprehensive content, metadata, and statistics. Supports markdown/JSON formats with rich file information.

**Key Features:**
- Single file or multiple file retrieval by path
- Content and metadata inclusion options
- JSON or markdown format output
- Optional file statistics (creation time, modification time, size, token count estimate)
- Error handling for missing files
- File statistics require Obsidian API support

### ✏️ obsidian_write_content
Create, update, or modify notes with flexible targeting and positioning strategies. Supports both whole-file operations and sophisticated section-based positioning for precise content insertion.

**Key Features:**
- **Flexible Targeting**: Target notes by file path or currently active note in Obsidian
- **Whole-File Operations**: Overwrite, append, or prepend content to entire files
- **Relative Positioning**: Insert content relative to specific headings or frontmatter sections
- **Section-Based Operations**: Append, prepend, or replace content at specific locations
- **Automatic File Creation**: Creates files if they don't exist for append/prepend operations
- **Error Handling**: Comprehensive validation and helpful error messages

**Targeting Options:**
- `path`: Specify exact file path with targetIdentifier parameter
- `active`: Use currently active note in Obsidian (no path needed)

**Operation Modes:**
- **Whole-File Mode** (`mode: "whole-file"`):
  - `overwrite`: Replace entire file content (default)
  - `append`: Add content to end of existing file
  - `prepend`: Add content to beginning of existing file
- **Relative Mode** (`mode: "relative"`):
  - Target headings or frontmatter sections
  - Choose to append, prepend, or replace targeted sections
  - Precise content positioning within notes

**Usage Examples:**
```typescript
// Simple file creation/overwrite
{
  "targetType": "path",
  "targetIdentifier": "Notes/My Note.md",
  "content": "# New Content\nThis is my note."
}

// Append to active note
{
  "targetType": "active",
  "mode": "whole-file",
  "wholeFileMode": "append",
  "content": "\n## Additional Section\nMore content here."
}

// Insert after specific heading
{
  "targetType": "path",
  "targetIdentifier": "Research/Project.md",
  "mode": "relative",
  "relativeMode": {
    "operation": "append",
    "targetType": "heading",
    "target": "## Results"
  },
  "content": "\n### New Finding\nImportant discovery here."
}
```

### 🗂️ obsidian_explore
Vault exploration with advanced filtering capabilities. Provides overview mode (file counts) or detailed file listing with comprehensive filtering options.

**Key Features:**
- **Overview Mode**: File/folder counts with filter-aware statistics
- **List Mode**: Detailed file listing with metadata and filtering
- **Advanced Filtering**: Extension-based, name pattern (regex), date range, and exclude pattern filtering
- **Flexible Scoping**: Folder targeting with recursive exploration options
- **Smart Result Management**: Configurable limits and comprehensive metadata

**Filter Options:**
- `extensions`: Filter by file extensions (e.g., ['md', 'txt', 'pdf'])
- `namePattern`: Regex pattern for filename matching
- `dateRange`: Filter files by modification date range
- `excludePatterns`: Array of regex patterns to exclude from results

**Usage Examples:**
```typescript
// Basic vault overview
{ "mode": "overview" }

// List all markdown files
{ 
  "mode": "list", 
  "filters": { "extensions": ["md"] } 
}

// Find project files from last month
{
  "mode": "list",
  "filters": {
    "namePattern": "project.*",
    "dateRange": {
      "start": "2024-07-01T00:00:00Z",
      "end": "2024-07-31T23:59:59Z"
    }
  }
}

// Research folder exploration with exclusions
{
  "mode": "list",
  "scope": { "folder": "Research", "recursive": true },
  "filters": { 
    "extensions": ["md"],
    "excludePatterns": ["draft-.*", "\\.tmp$"]
  },
  "options": { "limit": 50 }
}
```

### 🔗 obsidian_relationships
Comprehensive relationship analysis with support for multiple relationship types, batch processing, and contextual information. Analyze connections between notes including backlinks, forward links, tags, mentions, and embeds.

**Key Features:**
- **Multiple File Analysis**: Single file or batch analysis of multiple files simultaneously
- **Comprehensive Relationship Types**: backlinks, forward links, tags, mentions, embeds, or all types
- **Contextual Information**: Optional context snippets showing where relationships occur
- **Result Filtering**: Configurable limits per file per relationship type
- **Strength Thresholds**: Filter relationships by strength/relevance scores
- **Flexible Targeting**: Support for single paths or arrays of file paths

**Relationship Types:**
- **backlinks**: Incoming links from other notes that reference the target file
- **links**: Outgoing links from the target file to other notes
- **tags**: Tag relationships and co-occurrences within the target file
- **mentions**: Unlinked textual mentions of file names in other notes
- **embeds**: Embedded content (images, notes, etc.) in or from the target file

**Parameters:**
- `target`: Single file path or array of paths for batch analysis
- `relationshipTypes`: Array of relationship types (`['backlinks', 'links', 'tags', 'mentions', 'embeds']`) or `'all'`
- `includeContext`: Boolean to include contextual snippets showing where relationships occur
- `maxResults`: Integer limit for results per file per relationship type (default: 50)
- `strengthThreshold`: Float between 0-1 for filtering relationships by strength (default: 0.0)

### 📊 obsidian_analyze
Extract structural elements from notes with advanced section targeting capabilities. Supports both basic structure extraction and detailed section analysis with complex targeting.

**Key Features:**
- **Basic Structure Extraction**: Configurable element extraction (headings, lists, code blocks, tasks, quotes, tables, links, embeds)
- **Advanced Section Targeting**: Complex section identification with multiple methods
  - **Heading targeting**: Match by text with optional level filtering (1-6)
  - **Line range targeting**: Precise targeting with `{start: 1, end: 50}` syntax
  - **Pattern targeting**: Regex-based section matching
- **Rich Section Metadata**: Word count, content types, line count, subsection detection
- **Section Context**: Parent sections, subsections, preceding/following relationships
- **Hierarchical Structure Building**: Full document structure with nested relationships
- **Batch Processing**: Multi-file analysis with aggregated summaries

### 🔧 obsidian_manage
Comprehensive file and directory management with automatic link integrity maintenance.

**Key Features:**
- **File Operations**: move, rename, copy, delete with automatic link updates
- **Directory Operations**: create directories (delete-dir planned)
- **Batch Text Operations**: find-replace with regex support and flexible scoping
- **Link Integrity**: Automatic link maintenance for all file operations
- **Safety Features**: dry-run preview mode, backup creation, comprehensive error handling
- **Advanced Options**: overwrite protection, recursive operations, scoped replacements

### Tool Categories by Use Case

**Basic Vault Operations**
- `obsidian_search` - Basic content search with semantic search and regex
- `obsidian_get_notes` - Comprehensive note retrieval with metadata, statistics, and multiple format support
- `obsidian_write_content` - Create or overwrite notes

**Advanced Analysis & Exploration**
- `obsidian_explore` - Basic vault overview and file listing
- `obsidian_relationships` - Comprehensive relationship analysis with multiple types and batch processing
- `obsidian_analyze` - Advanced structure extraction with complex section targeting (heading/line_range/pattern), rich metadata, and section context

**Comprehensive Management**
- `obsidian_manage` - Complete file lifecycle management with automatic link integrity

All tools include parameter validation, error handling, and follow MCP protocol standards. Many advanced features are planned for future implementation.

## 🛠️ Usage Examples

### Reading Notes
```
Claude, read my note "Daily Notes/2024-01-15.md" using obsidian_get_notes.
Claude, get multiple notes by providing an array of paths using obsidian_get_notes.
Claude, read "Research/Project.md" with file statistics using obsidian_get_notes with options: { includeStat: true }.
Claude, get "Meeting Notes.md" in JSON format with stats using obsidian_get_notes with options: { format: "json", includeStat: true }.
```

**File Statistics Output Examples:**

*Markdown format with includeStat=true:*
```
# My Note Content
This is the content of my note...

---
**File Statistics:**
- Created: 02:30:15 PM | 03-15-2025
- Modified: 04:45:22 PM | 03-20-2025
- Size: 1247 bytes
- Estimated tokens: 312
```

*JSON format includes both raw and formatted statistics:*
```json
{
  "path": "Research/Project.md",
  "content": "# My Note Content...",
  "stat": {
    "ctime": 1710511815000,
    "mtime": 1710954322000,
    "size": 1247
  },
  "formattedStat": {
    "createdTime": "02:30:15 PM | 03-15-2025",
    "modifiedTime": "04:45:22 PM | 03-20-2025",
    "size": 1247,
    "tokenCountEstimate": 312
  }
}
```

### Creating and Updating Notes
```
# Simple file creation/overwrite (default behavior)
Claude, create a new note "Research/New Project.md" with content "# Project Overview" using obsidian_write_content.

# Append content to existing file
Claude, append "## New Section\nAdditional content here." to "Research/Project.md" using obsidian_write_content with wholeFileMode="append".

# Prepend content to existing file  
Claude, prepend "# Important Notice\nThis is urgent." to "Daily Notes/Today.md" using obsidian_write_content with wholeFileMode="prepend".

# Update currently active note
Claude, append "## Meeting Notes\nDiscussion points here." to the active note using obsidian_write_content with targetType="active" and wholeFileMode="append".

# Insert content after specific heading
Claude, add "### New Finding\nImportant discovery." after the "## Results" heading in "Research/Data.md" using obsidian_write_content with mode="relative" and relativeMode targeting heading "## Results" with operation="append".

# Insert content before specific heading
Claude, insert "## Preparation\nSetup steps here." before the "## Methodology" heading in "Study.md" using obsidian_write_content with mode="relative" and relativeMode targeting heading "## Methodology" with operation="prepend".

# Replace content at specific heading
Claude, replace the "## Conclusion" section with "## Final Thoughts\nNew conclusion here." in "Report.md" using obsidian_write_content with mode="relative" and relativeMode targeting heading "## Conclusion" with operation="replace".
```

### Searching Content
```
Claude, search my vault for "machine learning" using obsidian_search.
Claude, find notes tagged "research" in my "Projects" folder using obsidian_search with filters.
```

### Exploring Vault Structure
```
# Basic vault overview
Claude, give me a vault overview using obsidian_explore with mode="overview".

# Simple file listing
Claude, list files in my vault using obsidian_explore with mode="list".

# Filter by file extensions
Claude, show me all markdown and text files using obsidian_explore with filters={ extensions: ["md", "txt"] }.

# Find files by name pattern
Claude, find all project-related files using obsidian_explore with filters={ namePattern: "project.*" }.

# Explore specific folder recursively
Claude, list all files in my Research folder using obsidian_explore with scope={ folder: "Research", recursive: true }.

# Advanced filtering with date range
Claude, find recent markdown files from this month using obsidian_explore with filters={ extensions: ["md"], dateRange: { start: "2024-08-01T00:00:00Z", end: "2024-08-31T23:59:59Z" } }.

# Exclude patterns (drafts and temporary files)
Claude, list my notes excluding drafts and temp files using obsidian_explore with filters={ extensions: ["md"], excludePatterns: ["draft-.*", "\\.tmp$"] }.

# Combined filtering example
Claude, explore my Projects folder for recent markdown files, excluding drafts, limited to 25 results using obsidian_explore with:
- scope={ folder: "Projects", recursive: true }
- filters={ extensions: ["md"], excludePatterns: ["draft-.*"], dateRange: { start: "2024-07-01T00:00:00Z" } }
- options={ limit: 25 }
```

### Analyzing Relationships
```
# Single file comprehensive analysis
Claude, analyze all relationship types for "Research Methodology.md" using obsidian_relationships with relationshipTypes="all" and includeContext=true.

# Multiple file batch analysis  
Claude, analyze relationships for ["Project A.md", "Project B.md"] using obsidian_relationships with relationshipTypes=["backlinks", "links"] and maxResults=20.

# Specific relationship types with context
Claude, find backlinks and mentions for "Daily Notes/2024-01-15.md" using obsidian_relationships with relationshipTypes=["backlinks", "mentions"] and includeContext=true.

# High-strength relationships only
Claude, get strong connections to "Research/AI Overview.md" using obsidian_relationships with strengthThreshold=0.7 and maxResults=10.

# Tag relationships analysis
Claude, analyze tag relationships for "Meeting Notes/Team Sync.md" using obsidian_relationships with relationshipTypes=["tags"] and includeContext=true.

# Embed analysis
Claude, find all embeds in "Documentation/Setup Guide.md" using obsidian_relationships with relationshipTypes=["embeds"].
```

### Content Analysis
```
Claude, extract the structure from my project notes using obsidian_analyze.
Claude, analyze "Research/Paper.md" with basic structure using obsidian_analyze with analysis=["structure"].
Claude, get specific sections from "Project.md" using obsidian_analyze with sectionIdentifiers=["Introduction", "Methodology"].
Claude, extract lines 10-50 from "Notes.md" using obsidian_analyze with sectionIdentifiers=[{"type": "line_range", "value": {"start": 10, "end": 50}}].
Claude, find sections matching pattern "^## Results" in "Data.md" using obsidian_analyze with sectionIdentifiers=[{"type": "pattern", "value": "^## Results"}].
Claude, get all level-2 headings from "Document.md" using obsidian_analyze with sectionIdentifiers=[{"type": "heading", "value": "", "level": 2}].
Claude, analyze sections with rich metadata using obsidian_analyze with analysis=["sections"] and options={includeMetadata: true, includeSectionContext: true}.
Claude, perform comprehensive analysis on multiple files using obsidian_analyze with target=["Research/Paper.md", "Notes/Summary.md"] and analysis=["structure", "sections", "themes"].
```

### File Management Operations
```
Claude, move "Old Project.md" to "Projects/New Project.md" using obsidian_manage with operation="move".
Claude, copy "Template.md" to "New Document.md" using obsidian_manage with operation="copy".
Claude, delete "Archive/Old Draft.md" using obsidian_manage with operation="delete".
Note: All operations automatically maintain link integrity.
```

### Batch Text Operations
```
Claude, find and replace "old term" with "new term" across all notes using obsidian_manage with operation="find-replace".
Claude, use regex to replace dates using obsidian_manage with operation="find-replace" and useRegex=true.
Note: Supports scoped operations targeting specific files or folders.
```

### Advanced Management Features
```
Claude, preview file move operation using obsidian_manage with dryRun=true.
Claude, create backup before deletion using obsidian_manage with createBackup=true.
Claude, create new directory using obsidian_manage with operation="create-dir".
```

## 🏗️ Architecture

```
obsidian-research-mcp/
├── packages/
│   ├── mcp-server/              # MCP server implementation
│   │   ├── src/
│   │   │   ├── server.ts        # Main server with comprehensive functionality
│   │   │   ├── features/        # Feature implementations (search, analysis, etc.)
│   │   │   ├── integrations/    # External API integrations
│   │   │   └── core/           # Configuration and utilities
│   │   └── dist/               # Built JavaScript files
│   ├── obsidian-plugin/        # Obsidian integration plugin
│   │   ├── main.ts            # Plugin main file with Local REST API bridge
│   │   └── manifest.json      # Plugin manifest
│   └── shared/                # Common types and utilities
```

### Key Components

1. **MCP Server** (`packages/mcp-server/src/`)
   - Environment-based configuration with sensible defaults
   - Direct HTTPS communication with Local REST API
   - SSL certificate bypass for self-signed certificates
   - Comprehensive tool implementations across multiple feature domains

2. **Obsidian Plugin** (`packages/obsidian-plugin/main.ts`)
   - Auto-detects Local REST API plugin and key
   - Provides configuration commands
   - Generates Claude Desktop configuration
   - Bridge between Obsidian and external MCP server

3. **Local REST API Integration**
   - Uses HTTPS on port 27124 (correct Local REST API port)
   - Handles authentication with Bearer tokens
   - Supports file operations and content search

## 🔍 Troubleshooting

### Common Issues

**"Could not connect to Obsidian"**
- Ensure Local REST API plugin is installed and enabled
- Check that the server is running on port 27124
- Verify the API key in plugin settings

**"MCP server not responding"**
- Restart Claude Desktop after configuration changes
- First startup may take 15-30 seconds - wait for initialization
- Check that the MCP server path in config is correct
- Verify environment variables are set properly

**"Server startup timeout"**
- Wait for initialization to complete (usually under 30 seconds)
- Ensure no CPU-intensive processes are running during startup
- Check Claude Desktop logs for specific error messages

**"Permission denied"**
- Ensure Obsidian vault path is correct and accessible
- Check file permissions on the vault directory

### Debug Commands

Use the Obsidian plugin commands to diagnose issues:
- "Check MCP Dependencies" - Verify plugin status
- "Show Vault Information" - Check vault accessibility
- "MCP Integration Guide" - View current configuration status

## 🔗 Link Management

The system provides link updating capabilities when files are moved or renamed using the `obsidian_batch` tool with operation="update-links":

### Safe File Renaming/Moving
When using `obsidian_batch` for link updates, the system:

- **Moves files** from old path to new path
- **Updates backlinks** in other files that reference the moved file
- **Handles multiple link formats**:
  - Simple wikilinks: `[[OldFile]]` → `[[NewFile]]`
  - Wikilinks with aliases: `[[OldFile|Custom Text]]` → `[[NewFile|Custom Text]]`
  - Full path wikilinks: `[[folder/OldFile]]` → `[[folder/NewFile]]`
  - Markdown links: `[text](OldFile.md)` → `[text](NewFile.md)`
  - Embed links: `![[OldFile]]` → `![[NewFile]]`

### Safety Features
- **Detailed logging** of all link updates performed
- **Error handling** that doesn't break file operations if link updates fail
- **Automatic backlink detection** and updating

This ensures that when you rename or move notes, your vault maintains link integrity without manual intervention.

## 🛡️ Security

- API communication uses HTTPS with the Local REST API
- API keys are automatically managed by the Local REST API plugin
- No external network access required - all communication is localhost
- Vault access is controlled by Obsidian's file permissions

## 🔬 Development

### Building
```bash
npm run build                    # Build all packages
npm run build:server            # Build MCP server only
npm run build:plugin            # Build Obsidian plugin only
```

### Testing
```bash
npm test                         # Run tests
npm run lint                     # Check code style
npm run typecheck               # TypeScript validation
```

### Development Mode
```bash
npm run dev                      # Start with hot reload
```



---

*A simple, reliable way to connect Claude with your Obsidian vault.*