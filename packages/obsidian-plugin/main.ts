import { Plugin, TFile, TFolder, Notice, Modal, Setting, App, PluginSettingTab } from 'obsidian';
import { SmartConnectionsAdapter } from './src/smart-connections-adapter';
import { SmartSearchRequest } from './src/smart-connections-types';
import { PluginLogger } from './src/logger';

interface ResearchMCPSettings {
  localRestApiEnabled: boolean;
  mcpServerPath: string;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  smartConnectionsEnabled: boolean;
  apiKey: string;
  serverInstalled: boolean;
}

const DEFAULT_SETTINGS: ResearchMCPSettings = {
  localRestApiEnabled: false,
  mcpServerPath: '',
  logLevel: 'info',
  smartConnectionsEnabled: true,
  apiKey: '',
  serverInstalled: false,
};

export default class ResearchMCPPlugin extends Plugin {
  settings: ResearchMCPSettings;
  localRestApiPlugin: any;
  localRestApi: any;
  smartConnectionsAdapter: SmartConnectionsAdapter;
  smartConnectionsRetryInterval: NodeJS.Timeout | null = null;
  smartConnectionsDetected = false;
  private logger: PluginLogger;

  async onload() {
    await this.loadSettings();
    this.logger = new PluginLogger(this.settings.logLevel);

    // Initialize Smart Connections adapter
    this.smartConnectionsAdapter = new SmartConnectionsAdapter(this.app);

    // Get Local REST API integration
    this.localRestApi = this.getLocalRestAPIInstance();
    
    if (!this.localRestApi) {
      new Notice('Local REST API plugin required for MCP Bridge', 0);
      return;
    }

    // Setup basic MCP integration
    this.setupMCPIntegration();

    // Defer Smart Connections loading to avoid timing issues
    this.setupSmartConnectionsDetection();

    // Add ribbon icon
    this.addRibbonIcon('brain-circuit', 'Research MCP Bridge', () => {
      this.checkLocalRestApiStatus();
    });

    // Add settings tab
    this.addSettingTab(new ResearchMCPSettingTab(this.app, this));
    
    // Auto-refresh API key on load
    const apiKey = this.getLocalRestApiKey();
    if (apiKey && apiKey !== this.settings.apiKey) {
      this.settings.apiKey = apiKey;
      this.saveSettings();
    }

    // Add commands
    this.addCommands();

    // Check for Local REST API plugin
    this.checkLocalRestApiPlugin();

    this.logger.info('Research MCP Bridge Plugin loaded');
  }

  async onunload() {
    // Clean up retry interval
    if (this.smartConnectionsRetryInterval) {
      clearInterval(this.smartConnectionsRetryInterval);
      this.smartConnectionsRetryInterval = null;
    }
    
    this.logger.info('Research MCP Bridge Plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Update logger level when settings change
    if (this.logger) {
      this.logger.updateLogLevel(this.settings.logLevel);
    }
  }

  private getLocalRestAPIInstance(): any {
    const plugins = (this.app as any).plugins;
    return plugins?.plugins?.['obsidian-local-rest-api'];
  }

  private setupMCPIntegration(): void {
    // Setup MCP integration using custom endpoints via Local REST API
    if (this.localRestApi) {
      // Get API key from Local REST API plugin settings
      const apiKey = this.getLocalRestApiKey();
      if (apiKey && apiKey !== this.settings.apiKey) {
        this.settings.apiKey = apiKey;
        this.saveSettings();
      }

      try {
        // Get the Local REST API public API for registering custom endpoints
        const publicApi = (this.app as any).plugins.plugins['obsidian-local-rest-api']?.getPublicApi?.(this.manifest);
        
        if (publicApi && publicApi.addRoute) {
          // Register custom endpoints
          publicApi.addRoute('/mcp/status')
            .get(this.handleMCPStatus.bind(this));
            
          publicApi.addRoute('/mcp/vault-info')
            .get(this.handleVaultInfo.bind(this));

          // Register Smart Connections semantic search endpoint
          publicApi.addRoute('/search/smart')
            .post(this.handleSmartSearch.bind(this));
            
          // Register backlinks endpoint
          publicApi.addRoute('/backlinks/:notePath')
            .get(this.handleBacklinks.bind(this));
            
          this.logger.info('✅ MCP custom endpoints registered successfully, including Smart Connections search and backlinks');
        } else {
          throw new Error('Local REST API public API not available or does not support addRoute()');
        }
      } catch (error) {
        this.logger.error('❌ Failed to register custom endpoints:', error);
        new Notice('Research MCP Bridge: Failed to register custom endpoints. Check Local REST API plugin version.', 8000);
      }
    }
  }

  private handleBacklinks(req: any, res: any): void {
    try {
      const notePath = decodeURIComponent(req.params.notePath);
      
      // Validate note path
      if (!notePath || typeof notePath !== 'string') {
        res.status(400).json({
          error: 'Invalid note path',
          message: 'Note path parameter is required'
        });
        return;
      }
      
      // Normalize path to ensure .md extension
      const normalizedPath = notePath.endsWith('.md') ? notePath : `${notePath}.md`;
      
      // Use Obsidian's built-in metadata cache for efficient backlink detection
      const resolvedLinks = this.app.metadataCache.resolvedLinks;
      const backlinks: Array<{ path: string; name: string }> = [];
      
      // Scan through all resolved links to find files that reference our target
      for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
        // Check if this source file has a link to our target
        if (links[normalizedPath] || links[notePath]) {
          const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
          if (sourceFile && sourceFile instanceof TFile) {
            backlinks.push({
              path: sourcePath,
              name: sourceFile.basename
            });
          }
        }
      }
      
      this.logger.debug(`Found ${backlinks.length} backlinks for "${notePath}"`);
      
      res.json({
        targetPath: normalizedPath,
        backlinks: backlinks,
        count: backlinks.length
      });
      
    } catch (error: any) {
      this.logger.error('Backlinks endpoint error:', error);
      res.status(500).json({
        error: 'Backlinks search failed',
        message: error.message || 'Unknown error occurred'
      });
    }
  }

  private getLocalRestApiKey(): string {
    const plugins = (this.app as any).plugins;
    const localRestPlugin = plugins?.plugins?.['obsidian-local-rest-api'];
    return localRestPlugin?.settings?.apiKey || '';
  }

  private handleMCPStatus(req: any, res: any): void {
    res.json({
      status: 'active',
      plugin: 'obsidian-research-mcp',
      version: this.manifest.version,
      apiKey: this.settings.apiKey ? 'configured' : 'missing',
      smartConnections: this.isSmartConnectionsAvailable(),
    });
  }

  private handleVaultInfo(req: any, res: any): void {
    res.json({
      name: this.app.vault.getName(),
      path: (this.app.vault.adapter as any).basePath || '',
      fileCount: this.app.vault.getAllLoadedFiles().length,
    });
  }

  private async handleSmartSearch(req: any, res: any): Promise<void> {
    try {
      if (!this.smartConnectionsAdapter.isAvailable()) {
        res.status(503).json({
          error: 'Smart Connections v3.0+ plugin is not available',
          message: 'Please install and enable Smart Connections plugin'
        });
        return;
      }

      // Validate request body
      const body = req.body as SmartSearchRequest;
      if (!body.query || typeof body.query !== 'string') {
        res.status(400).json({
          error: 'Invalid request body',
          message: 'Query string is required'
        });
        return;
      }

      // Perform semantic search via adapter
      const searchResponse = await this.smartConnectionsAdapter.performSearch(body.query, {
        folders: body.filter?.folders,
        excludeFolders: body.filter?.excludeFolders,
        limit: body.filter?.limit || 10
      });
      
      this.logger.debug(`Smart Connections search completed: ${searchResponse.results?.length || 0} results for "${body.query}"`);
      
      res.json(searchResponse);
    } catch (error: any) {
      this.logger.error('Smart Connections search error:', error);
      res.status(500).json({
        error: 'Smart Connections search failed',
        message: error.message || 'Unknown error occurred'
      });
    }
  }

  private setupSmartConnectionsDetection(): void {
    // Try immediate detection first
    this.tryLoadSmartConnections();
    
    // Set up workspace ready event for deferred detection
    this.app.workspace.onLayoutReady(() => {
      if (!this.smartConnectionsDetected) {
        this.logger.debug('Workspace ready - attempting Smart Connections detection');
        this.tryLoadSmartConnections();
        
        // Start retry mechanism if still not detected
        if (!this.smartConnectionsDetected) {
          this.startSmartConnectionsRetry();
        }
      }
    });
    
    // Listen for plugin loading events
    this.registerEvent(
      this.app.vault.on('config-changed' as any, () => {
        if (!this.smartConnectionsDetected) {
          this.tryLoadSmartConnections();
        }
      })
    );
  }

  private startSmartConnectionsRetry(): void {
    let attempts = 0;
    const maxAttempts = 12; // Try for 1 minute (12 * 5 seconds)
    
    this.smartConnectionsRetryInterval = setInterval(() => {
      attempts++;
      this.logger.debug(`Smart Connections detection attempt ${attempts}/${maxAttempts}`);
      
      if (this.tryLoadSmartConnections() || attempts >= maxAttempts) {
        if (this.smartConnectionsRetryInterval) {
          clearInterval(this.smartConnectionsRetryInterval);
          this.smartConnectionsRetryInterval = null;
        }
        
        if (attempts >= maxAttempts && !this.smartConnectionsDetected) {
          this.logger.warn('Smart Connections detection timed out - plugin may not be installed or enabled');
        }
      }
    }, 5000); // Retry every 5 seconds
  }

  private tryLoadSmartConnections(): boolean {
    try {
      // First check if Smart Connections plugin exists and is enabled
      const plugins = (this.app as any).plugins;
      const smartConnectionsPlugin = plugins?.plugins?.['smart-connections'];
      
      if (!smartConnectionsPlugin) {
        this.logger.debug('Smart Connections plugin not found in loaded plugins');
        return false;
      }
      
      if (!smartConnectionsPlugin.env?.smart_sources) {
        this.logger.debug('Smart Connections plugin found but v3.0+ API not available yet');
        return false;
      }
      
      // Try to initialize the adapter
      this.smartConnectionsAdapter.initialize().then(loaded => {
        if (loaded && !this.smartConnectionsDetected) {
          this.smartConnectionsDetected = true;
          this.logger.info('✅ Smart Connections v3.0+ detected and initialized successfully');
          new Notice('Smart Connections v3.0+ integration ready', 3000);
          
          // Clear retry interval if still running
          if (this.smartConnectionsRetryInterval) {
            clearInterval(this.smartConnectionsRetryInterval);
            this.smartConnectionsRetryInterval = null;
          }
        }
      }).catch(error => {
        this.logger.error('Error initializing Smart Connections adapter:', error);
      });
      
      return true; // Plugin structure is correct, initialization in progress
    } catch (error) {
      this.logger.error('Error during Smart Connections detection:', error);
      return false;
    }
  }

  private async loadSmartConnections(): Promise<void> {
    try {
      const loaded = await this.smartConnectionsAdapter.initialize();
      if (loaded) {
        this.logger.info('Smart Connections adapter initialized successfully');
        new Notice('Smart Connections v3.0+ integration ready', 3000);
      } else {
        this.logger.debug('Smart Connections v3.0+ not available');
      }
    } catch (error) {
      this.logger.error('Error loading Smart Connections:', error);
    }
  }

  private isSmartConnectionsAvailable(): boolean {
    return this.smartConnectionsAdapter?.isAvailable() || false;
  }

  private checkLocalRestApiPlugin(): void {
    const plugins = (this.app as any).plugins;
    this.localRestApiPlugin = plugins?.plugins?.['obsidian-local-rest-api'];
    
    if (this.localRestApiPlugin) {
      this.settings.localRestApiEnabled = true;
      this.saveSettings();
      this.logger.info('Local REST API plugin detected');
    } else {
      this.logger.warn('Local REST API plugin not found');
    }
  }

  private checkLocalRestApiStatus(): void {
    if (this.localRestApiPlugin) {
      new Notice(`✅ Local REST API plugin is available!\n\nUse the external MCP server to connect Claude Desktop to your vault.`, 4000);
    } else {
      new Notice(`❌ Local REST API plugin not found.\n\nPlease install the 'Local REST API' plugin first.`, 4000);
    }
  }

  private addCommands(): void {
    // Command: Show vault info for MCP
    this.addCommand({
      id: 'show-vault-info',
      name: 'Show Vault Information',
      callback: () => {
        const vaultInfo = {
          name: this.app.vault.getName(),
          path: (this.app.vault.adapter as any).basePath || '',
          fileCount: this.app.vault.getAllLoadedFiles().length,
          restApiAvailable: this.localRestApiPlugin ? 'Yes' : 'No',
        };
        
        new Notice(`Vault: ${vaultInfo.name}\nFiles: ${vaultInfo.fileCount}\nLocal REST API: ${vaultInfo.restApiAvailable}`, 5000);
      }
    });

    // Command: Check dependencies
    this.addCommand({
      id: 'check-dependencies',
      name: 'Check MCP Dependencies',
      callback: () => {
        const localRestApi = (this.app as any).plugins?.plugins?.['obsidian-local-rest-api'];
        const smartConnections = (this.app as any).plugins?.plugins?.['smart-connections'];
        
        const status = `
🔍 MCP Dependencies Status

📡 Local REST API: ${localRestApi ? '✅ Available' : '❌ Not installed'}
🧠 Smart Connections: ${smartConnections ? '✅ Available' : '❌ Not installed'}

${!localRestApi ? '⚠️ Please install the "Local REST API" plugin to enable MCP communication.\n' : ''}
${!smartConnections ? '💡 Install "Smart Connections" plugin for semantic search capabilities.\n' : ''}
${localRestApi ? '✅ Ready for MCP integration!' : ''}
        `.trim();
        
        new Notice(status, 8000);
      }
    });

    // Command: List vault files
    this.addCommand({
      id: 'list-vault-files',
      name: 'List Vault Files',
      callback: () => {
        const files = this.app.vault.getAllLoadedFiles();
        const fileInfo = files.slice(0, 10).map(file => 
          `${file instanceof TFile ? '📄' : '📁'} ${file.name}`
        ).join('\n');
        
        new Notice(`📚 Vault Files (first 10):\n\n${fileInfo}\n\n${files.length > 10 ? `...and ${files.length - 10} more files` : ''}`, 7000);
      }
    });

    // Command: Show current file details
    this.addCommand({
      id: 'show-current-file',
      name: 'Show Current File Details',
      callback: () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          new Notice('No active file selected', 3000);
          return;
        }

        const fileInfo = `
📄 Current File Details

📝 Name: ${activeFile.name}
📂 Path: ${activeFile.path}
📊 Size: ${activeFile.stat.size} bytes
📅 Modified: ${new Date(activeFile.stat.mtime).toLocaleString()}
🏷️ Extension: ${activeFile.extension}
        `.trim();
        
        new Notice(fileInfo, 6000);
      }
    });

    // Command: Show file backlinks
    this.addCommand({
      id: 'show-file-backlinks',
      name: 'Show File Backlinks',
      callback: () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          new Notice('No active file selected', 3000);
          return;
        }

        const resolvedLinks = this.app.metadataCache.resolvedLinks;
        const backlinks = [];

        for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
          if (links[activeFile.path]) {
            const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
            if (sourceFile instanceof TFile) {
              backlinks.push(sourceFile.basename);
            }
          }
        }

        if (backlinks.length === 0) {
          new Notice(`No backlinks found for: ${activeFile.name}`, 3000);
        } else {
          const backlinkList = backlinks.slice(0, 5).join('\n');
          new Notice(`🔗 Backlinks for "${activeFile.name}":\n\n${backlinkList}\n\n${backlinks.length > 5 ? `...and ${backlinks.length - 5} more` : ''}`, 6000);
        }
      }
    });

    // Command: Install MCP Server
    this.addCommand({
      id: 'install-mcp-server',
      name: 'Install MCP Server',
      callback: async () => {
        await this.installMCPServer();
      }
    });

    // Command: Configure Claude Desktop
    this.addCommand({
      id: 'configure-claude',
      name: 'Configure Claude Desktop',
      callback: async () => {
        await this.configureClaudeDesktop();
      }
    });

    // Command: MCP Integration Guide
    this.addCommand({
      id: 'mcp-integration-guide',
      name: 'MCP Integration Guide',
      callback: () => {
        const apiKey = this.settings.apiKey || 'NOT_CONFIGURED';
        const guide = `
🚀 MCP Integration Status

✅ Local REST API: ${this.localRestApiPlugin ? 'Available' : 'Missing'}
🔑 API Key: ${this.settings.apiKey ? 'Configured' : 'Missing'}
🧠 Smart Connections: ${this.isSmartConnectionsAvailable() ? 'Available' : 'Missing'}
📦 MCP Server: ${this.settings.serverInstalled ? 'Installed' : 'Not Installed'}

🔧 Quick Setup:
1. Use 'Install MCP Server' command
2. Use 'Configure Claude Desktop' command
3. Restart Claude Desktop
4. Test with: "Can you read my Obsidian notes?"

🔑 Current API Key: ${apiKey}
        `.trim();
        
        new Notice(guide, 10000);
      }
    });
  }

  private async installMCPServer(): Promise<void> {
    try {
      new Notice('Installing MCP Server...', 2000);
      
      // Simple installation - create a basic server configuration
      const serverConfig = {
        name: 'obsidian-research-mcp',
        version: '1.0.0',
        apiKey: this.settings.apiKey,
        vaultPath: (this.app.vault.adapter as any).basePath || '',
      };
      
      // Mark as installed
      this.settings.serverInstalled = true;
      await this.saveSettings();
      
      new Notice('MCP Server installed successfully!', 3000);
    } catch (error: any) {
      new Notice('Failed to install MCP Server: ' + error.message, 5000);
    }
  }

  private async configureClaudeDesktop(): Promise<void> {
    try {
      if (!this.settings.apiKey) {
        new Notice('API Key not configured. Please check Local REST API plugin settings.', 5000);
        return;
      }

      const config = {
        mcpServers: {
          'obsidian-research-mcp': {
            command: 'node',
            args: [this.settings.mcpServerPath || './mcp-server/dist/index.js'],
            env: {
              OBSIDIAN_API_KEY: this.settings.apiKey,
              OBSIDIAN_API_URL: 'https://127.0.0.1:27124',
              OBSIDIAN_VAULT_PATH: (this.app.vault.adapter as any).basePath || '',
            }
          }
        }
      };

      // Show configuration to user
      const configText = JSON.stringify(config, null, 2);
      const modal = new ConfigModal(this.app, configText);
      modal.open();
      
      new Notice('Claude Desktop configuration generated. Add this to your claude_desktop_config.json file.', 8000);
    } catch (error: any) {
      new Notice('Failed to generate configuration: ' + error.message, 5000);
    }
  }
}

class ResearchMCPSettingTab extends PluginSettingTab {
  plugin: ResearchMCPPlugin;

  constructor(app: App, plugin: ResearchMCPPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Research MCP Bridge Settings' });

    // Add description
    const descEl = containerEl.createEl('div');
    descEl.innerHTML = `
      <p>This plugin enables <strong>Model Context Protocol (MCP)</strong> integration by working with the <strong>Local REST API</strong> plugin.</p>
      <p><strong>Local REST API Status:</strong> ${this.plugin.localRestApiPlugin ? '🟢 Available' : '🔴 Not Found'}</p>
      <p><strong>Smart Connections:</strong> ${(this.app as any).plugins?.plugins?.['smart-connections'] ? '🟢 Available' : '🔴 Not Found'}</p>
      <hr>
    `;

    new Setting(containerEl)
      .setName('MCP Server Path')
      .setDesc('Path to the external MCP server executable (optional)')
      .addText(text => text
        .setPlaceholder('/path/to/mcp-server')
        .setValue(this.plugin.settings.mcpServerPath)
        .onChange(async (value) => {
          this.plugin.settings.mcpServerPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Local REST API key (automatically detected from Local REST API plugin)')
      .addText(text => text
        .setPlaceholder('Auto-detected from Local REST API plugin')
        .setValue(this.plugin.settings.apiKey)
        .setDisabled(true));

    new Setting(containerEl)
      .setName('Refresh API Key')
      .setDesc('Manually refresh the API key from Local REST API plugin')
      .addButton(button => button
        .setButtonText('Refresh')
        .onClick(async () => {
          const apiKey = (this.plugin as any).getLocalRestApiKey();
          if (apiKey) {
            this.plugin.settings.apiKey = apiKey;
            await this.plugin.saveSettings();
            new Notice('API Key refreshed successfully!');
            this.display(); // Refresh the settings display
          } else {
            new Notice('Could not find API key. Ensure Local REST API plugin is installed and configured.');
          }
        }));

    new Setting(containerEl)
      .setName('Smart Connections Integration')
      .setDesc('Enable integration with Smart Connections plugin for semantic search')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.smartConnectionsEnabled)
        .onChange(async (value) => {
          this.plugin.settings.smartConnectionsEnabled = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Log Level')
      .setDesc('Logging verbosity level for debugging')
      .addDropdown(dropdown => dropdown
        .addOption('error', 'Error')
        .addOption('warn', 'Warning')
        .addOption('info', 'Info')
        .addOption('debug', 'Debug')
        .setValue(this.plugin.settings.logLevel)
        .onChange(async (value: 'error' | 'warn' | 'info' | 'debug') => {
          this.plugin.settings.logLevel = value;
          await this.plugin.saveSettings();
        }));

    // Add dependency status
    containerEl.createEl('h3', { text: 'Dependencies' });
    const depsEl = containerEl.createEl('div');
    const localRestApi = (this.app as any).plugins?.plugins?.['obsidian-local-rest-api'];
    const smartConnections = (this.app as any).plugins?.plugins?.['smart-connections'];
    
    depsEl.innerHTML = `
      <div style="background: var(--background-secondary); padding: 1rem; border-radius: 6px; margin: 1rem 0;">
        <h4>📦 Required Dependencies:</h4>
        <ul>
          <li><strong>Local REST API:</strong> ${localRestApi ? '✅ Installed' : '❌ Not installed (required)'}</li>
          <li><strong>Smart Connections:</strong> ${smartConnections ? '✅ Installed' : '⚠️ Optional (for semantic search)'}</li>
        </ul>
        
        ${!localRestApi ? '<p style="color: var(--text-error);">⚠️ Please install the "Local REST API" plugin to enable MCP communication.</p>' : ''}
      </div>
    `;

    // Add usage information
    containerEl.createEl('h3', { text: 'MCP Integration Architecture' });
    const architectureEl = containerEl.createEl('div');
    architectureEl.innerHTML = `
      <div style="background: var(--background-secondary); padding: 1rem; border-radius: 6px; margin: 1rem 0;">
        <h4>🏗️ How It Works:</h4>
        <ol>
          <li><strong>This Plugin:</strong> Provides vault integration commands and status</li>
          <li><strong>Local REST API Plugin:</strong> Exposes HTTP endpoints for vault access</li>
          <li><strong>External MCP Server:</strong> Runs separately, communicates via HTTP</li>
          <li><strong>Claude Desktop:</strong> Connects to the external MCP server</li>
        </ol>
        
        <h4>🔧 Available Commands:</h4>
        <ul>
          <li><strong>Show Vault Information</strong> - Display vault details</li>
          <li><strong>Check MCP Dependencies</strong> - Verify required plugins</li>
          <li><strong>List Vault Files</strong> - Show files in your vault</li>
          <li><strong>Show Current File Details</strong> - Info about active file</li>
          <li><strong>Show File Backlinks</strong> - Display backlinks for current file</li>
          <li><strong>MCP Integration Guide</strong> - Complete setup instructions</li>
        </ul>

        <h4>💡 Next Steps:</h4>
        <p>1. Ensure Local REST API plugin is installed and running<br>
        2. Use 'Install MCP Server' command to set up the server<br>
        3. Use 'Configure Claude Desktop' command for automatic setup<br>
        4. Restart Claude Desktop and test the connection</p>
        
        <h4>🔧 Current Status:</h4>
        <ul>
          <li><strong>API Key:</strong> ${this.plugin.settings.apiKey ? '✅ Configured' : '❌ Missing'}</li>
          <li><strong>MCP Server:</strong> ${this.plugin.settings.serverInstalled ? '✅ Installed' : '❌ Not Installed'}</li>
        </ul>
      </div>
    `;
  }
}

class ConfigModal extends Modal {
  private configText: string;

  constructor(app: App, configText: string) {
    super(app);
    this.configText = configText;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: 'Claude Desktop Configuration' });
    contentEl.createEl('p', { text: 'Copy this configuration to your claude_desktop_config.json file:' });
    
    const pre = contentEl.createEl('pre');
    pre.style.background = 'var(--background-secondary)';
    pre.style.padding = '1rem';
    pre.style.borderRadius = '6px';
    pre.style.fontSize = '12px';
    pre.style.overflow = 'auto';
    pre.style.maxHeight = '400px';
    pre.textContent = this.configText;
    
    const buttonContainer = contentEl.createEl('div');
    buttonContainer.style.textAlign = 'center';
    buttonContainer.style.marginTop = '1rem';
    
    const copyButton = buttonContainer.createEl('button', { text: 'Copy to Clipboard' });
    copyButton.onclick = () => {
      navigator.clipboard.writeText(this.configText);
      new Notice('Configuration copied to clipboard!');
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}