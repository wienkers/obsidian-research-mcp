import { App } from 'obsidian';
import { 
  SmartConnectionsV3Plugin, 
  LookupParams, 
  LookupResult,
  SmartSearchRequest,
  SmartSearchResponse 
} from './smart-connections-types';

export class SmartConnectionsIntegration {
  private app: App;
  private smartConnectionsPlugin: SmartConnectionsV3Plugin | null = null;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Detect and load Smart Connections v3.0+ plugin
   */
  public async loadSmartConnections(): Promise<boolean> {
    const plugins = (this.app as any).plugins;
    const smartConnectionsPlugin = plugins?.plugins?.['smart-connections'] as any;

    // Check for Smart Connections v3.0+ (uses smart environment)
    if (smartConnectionsPlugin?.env?.smart_sources) {
      this.smartConnectionsPlugin = smartConnectionsPlugin;
      console.log('Smart Connections v3.0+ detected');
      return true;
    }

    console.log('Smart Connections v3.0+ not found');
    return false;
  }

  /**
   * Check if Smart Connections is available
   */
  public isAvailable(): boolean {
    return !!this.smartConnectionsPlugin?.env?.smart_sources;
  }

  /**
   * Perform semantic search using Smart Connections v3.0+ API
   */
  public async search(request: SmartSearchRequest): Promise<SmartSearchResponse> {
    if (!this.isAvailable()) {
      throw new Error('Smart Connections v3.0+ not available');
    }

    try {
      const lookupParams: LookupParams = {
        hypotheticals: [request.query],
        filter: {
          limit: request.filter?.limit || 10,
          key_starts_with_any: request.filter?.folders,
          exclude_key_starts_with_any: request.filter?.excludeFolders,
        }
      };

      const results = await this.smartConnectionsPlugin!.env.smart_sources.lookup(lookupParams);

      // Transform results to match expected response format
      const transformedResults = await Promise.all(
        results.map(async (result: LookupResult) => ({
          path: result.item.path,
          text: await result.item.read(),
          score: result.score,
          breadcrumbs: result.item.breadcrumbs || result.item.path,
        }))
      );

      return {
        results: transformedResults
      };
    } catch (error) {
      console.error('Smart Connections v3.0 search error:', error);
      throw error;
    }
  }

  /**
   * Get Smart Connections version info
   */
  public getVersionInfo(): { version: string; type: string } | null {
    if (!this.smartConnectionsPlugin) {
      return null;
    }

    return {
      version: '3.0+',
      type: 'smart_sources'
    };
  }
}