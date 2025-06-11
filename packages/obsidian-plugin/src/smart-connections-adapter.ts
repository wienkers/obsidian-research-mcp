import { App, Notice } from 'obsidian';
import { SmartConnectionsIntegration } from './smart-connections-integration';

export class SmartConnectionsAdapter {
  private app: App;
  private smartConnections: SmartConnectionsIntegration;
  private isInitialized = false;

  constructor(app: App) {
    this.app = app;
    this.smartConnections = new SmartConnectionsIntegration(app);
  }

  async initialize(): Promise<boolean> {
    try {
      const loaded = await this.smartConnections.loadSmartConnections();
      this.isInitialized = loaded;
      
      if (loaded) {
        console.log('Smart Connections adapter initialized successfully');
        // Store reference globally so MCP server can access it
        (window as any).SmartConnectionsAdapter = this;
      }
      
      return loaded;
    } catch (error) {
      console.error('Failed to initialize Smart Connections adapter:', error);
      return false;
    }
  }

  async performSearch(query: string, options: any = {}): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Smart Connections adapter not initialized');
    }

    try {
      const results = await this.smartConnections.search({
        query,
        filter: {
          folders: options.folders,
          excludeFolders: options.excludeFolders,
          limit: options.limit || 10
        }
      });

      return results;
    } catch (error) {
      console.error('Smart Connections search failed:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.smartConnections.isAvailable();
  }

  getStatus(): any {
    return {
      initialized: this.isInitialized,
      available: this.isAvailable(),
      version: this.smartConnections.getVersionInfo()
    };
  }
}