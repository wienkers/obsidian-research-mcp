export declare class IntelligentCache {
    private cache;
    private dependencyGraph;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, data: T, ttl?: number, dependencies?: string[]): Promise<void>;
    invalidate(key: string): Promise<void>;
    invalidateByDependency(dependency: string): Promise<void>;
    clear(): Promise<void>;
    getStats(): {
        size: number;
        dependencies: number;
        entries: {
            key: string;
            age: number;
            ttl: number;
            expired: boolean;
            dependencies: string[] | undefined;
        }[];
    };
    private isExpired;
    private hasDependencyChanged;
}
export declare const cache: IntelligentCache;
//# sourceMappingURL=cache.d.ts.map