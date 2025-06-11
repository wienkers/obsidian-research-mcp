// Smart Connections v3.0+ types and interfaces

export interface SmartConnectionsV3Plugin {
  env: {
    smart_sources: {
      lookup(params: LookupParams): Promise<LookupResult[]>;
    };
  };
}

export interface LookupParams {
  hypotheticals: string[];
  filter?: {
    limit?: number;
    key_starts_with_any?: string[];
    exclude_key_starts_with_any?: string[];
    exclude_key?: string;
    exclude_keys?: string[];
    exclude_key_starts_with?: string;
    exclude_key_includes?: string;
    key_ends_with?: string;
    key_starts_with?: string;
    key_includes?: string;
  };
}

export interface LookupResult {
  item: {
    path: string;
    name?: string;
    key: string;
    breadcrumbs?: string;
    read(): Promise<string>;
    link?: string;
    size?: number;
  };
  score: number;
}

export interface SmartSearchRequest {
  query: string;
  filter?: {
    folders?: string[];
    excludeFolders?: string[];
    limit?: number;
  };
}

export interface SmartSearchResponse {
  results: {
    path: string;
    text: string;
    score: number;
    breadcrumbs: string;
  }[];
}