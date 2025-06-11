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
export declare class ObsidianBridgeAPI {
    private baseUrl;
    private headers;
    private agent;
    constructor();
    /**
     * Execute JavaScript in Obsidian to access the global bridge
     */
    executeJS(jsCode: string): Promise<any>;
    /**
     * Get bridge status via JavaScript evaluation
     */
    getBridgeStatus(): Promise<any>;
    /**
     * Fallback method to check plugin status via commands
     */
    checkPluginStatus(): Promise<any>;
    /**
     * Check if Smart Connections is available
     */
    isSmartConnectionsAvailable(): Promise<boolean>;
    /**
     * Perform semantic search via bridge (when JS execution is available)
     */
    searchSemantic(query: string, options?: SimilarityOptions): Promise<SearchResult[]>;
    /**
     * Get vault information
     */
    getVaultInfo(): Promise<any>;
}
export declare const obsidianBridge: ObsidianBridgeAPI;
//# sourceMappingURL=obsidian-bridge.d.ts.map