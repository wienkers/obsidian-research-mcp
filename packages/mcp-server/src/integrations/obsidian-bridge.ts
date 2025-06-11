import fetch from 'node-fetch';
import https from 'https';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { SearchResult } from '@obsidian-research-mcp/shared';

export interface ObsidianBridge {
  getStatus(): any;
  getVaultInfo(): any;
  smartConnectionsAdapter?: {
    performSearch(query: string, options?: any): Promise<any>;
    isAvailable(): boolean;
    getStatus(): any;
  };
}

export interface SimilarityOptions {
  limit?: number;
  threshold?: number;
  folders?: string[];
}

export class ObsidianBridgeAPI {
  private baseUrl: string;
  private headers: Record<string, string>;
  private agent: https.Agent | undefined;

  constructor() {
    this.baseUrl = config.obsidianApiUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
    };

    if (config.obsidianApiKey) {
      this.headers['Authorization'] = `Bearer ${config.obsidianApiKey}`;
    }

    if (this.baseUrl.startsWith('https')) {
      this.agent = new https.Agent({
        rejectUnauthorized: false
      });
    }
  }

  /**
   * Execute JavaScript in Obsidian to access the global bridge
   */
  async executeJS(jsCode: string): Promise<any> {
    try {
      // Since Local REST API doesn't support JS execution directly,
      // we'll need to work around this limitation.
      // For now, we'll log what we would execute and return a mock response
      logger.debug('Would execute JS in Obsidian:', { jsCode });
      
      // FUTURE: JS execution would require enhanced Local REST API plugin functionality
      // Current approach focuses on file-based operations which are more reliable
      // Alternative approaches: Plugin communication via custom endpoints or file system
      
      throw new Error('JavaScript execution not yet implemented for this Local REST API version');
    } catch (error) {
      logger.error('Failed to execute JavaScript in Obsidian', { error, jsCode });
      throw error;
    }
  }

  /**
   * Get bridge status via JavaScript evaluation
   */
  async getBridgeStatus(): Promise<any> {
    try {
      const result = await this.executeJS('window.ObsidianMCPBridge?.getStatus()');
      return result;
    } catch (error) {
      logger.warn('Could not get bridge status via JS execution');
      // Fallback to checking if plugin commands exist
      return this.checkPluginStatus();
    }
  }

  /**
   * Fallback method to check plugin status via commands
   */
  async checkPluginStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/commands/`, {
        headers: this.headers,
        agent: this.agent
      });

      if (response.ok) {
        const data = await response.json() as { commands?: Array<{id: string, name: string}> };
        const mcpCommands = data.commands?.filter((cmd) => 
          cmd.id?.includes('obsidian-research-mcp')
        ) || [];

        const isLoaded = mcpCommands.length > 0;
        
        return {
          status: isLoaded ? 'active' : 'inactive',
          plugin: 'obsidian-research-mcp',
          commandsFound: mcpCommands.length,
          bridgeAvailable: false, // Since we can't execute JS
        };
      }
      
      throw new Error(`Commands endpoint failed: ${response.status}`);
    } catch (error) {
      logger.error('Failed to check plugin status', { error });
      return {
        status: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check if Smart Connections is available
   */
  async isSmartConnectionsAvailable(): Promise<boolean> {
    try {
      const status = await this.getBridgeStatus();
      return status?.smartConnections || false;
    } catch (error) {
      logger.warn('Could not check Smart Connections availability', { error });
      return false;
    }
  }

  /**
   * Perform semantic search via bridge (when JS execution is available)
   */
  async searchSemantic(
    query: string, 
    options: SimilarityOptions = {}
  ): Promise<SearchResult[]> {
    try {
      logger.info('Attempting semantic search via Obsidian bridge', { query, options });
      
      // For now, we'll return empty results since JS execution isn't implemented
      // This is where we would execute:
      // window.SmartConnectionsAdapter?.performSearch(query, options)
      
      const jsCode = `
        (async () => {
          if (!window.SmartConnectionsAdapter) {
            throw new Error('Smart Connections adapter not available');
          }
          
          return await window.SmartConnectionsAdapter.performSearch('${query}', ${JSON.stringify(options)});
        })()
      `;

      logger.debug('Would execute Smart Connections search', { jsCode });
      
      // Return empty for now until JS execution is implemented
      logger.warn('Smart Connections search not yet available - JS execution not implemented');
      return [];
      
    } catch (error) {
      logger.error('Smart Connections search via bridge failed', { 
        error: error instanceof Error ? error.message : String(error),
        query,
        options 
      });
      return [];
    }
  }

  /**
   * Get vault information
   */
  async getVaultInfo(): Promise<any> {
    try {
      const status = await this.getBridgeStatus();
      if (status?.vaultInfo) {
        return status.vaultInfo;
      }
      
      // Fallback to direct vault endpoint
      const response = await fetch(`${this.baseUrl}/vault/`, {
        headers: this.headers,
        agent: this.agent
      });

      if (response.ok) {
        const data = await response.json() as { files?: string[] };
        return {
          fileCount: data.files?.length || 0,
          files: data.files
        };
      }
      
      throw new Error(`Vault endpoint failed: ${response.status}`);
    } catch (error) {
      logger.error('Failed to get vault info', { error });
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}

export const obsidianBridge = new ObsidianBridgeAPI();