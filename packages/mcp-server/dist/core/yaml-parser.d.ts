export interface FrontmatterResult {
    frontmatter: Record<string, any>;
    content: string;
    hasFrontmatter: boolean;
}
export declare class YamlParser {
    /**
     * Extract and parse frontmatter from markdown content
     */
    extractFrontmatter(content: string): FrontmatterResult;
    /**
     * Parse YAML string to object with proper error handling
     */
    parseYaml(yamlString: string): Record<string, any> | null;
    /**
     * Stringify object to YAML with consistent formatting
     */
    stringifyYaml(obj: any): string;
    /**
     * Normalize YAML values for consistent handling
     */
    private normalizeYamlValues;
    private normalizeValue;
    /**
     * Update frontmatter in markdown content
     */
    updateFrontmatter(content: string, newFrontmatter: Record<string, any>): string;
    /**
     * Merge frontmatter with new values
     */
    mergeFrontmatter(content: string, updates: Record<string, any>): string;
    /**
     * Extract tags from frontmatter with normalization
     */
    extractTags(frontmatter: Record<string, any>): string[];
    /**
     * Extract date fields from frontmatter
     */
    extractDates(frontmatter: Record<string, any>): {
        created?: Date;
        modified?: Date;
        published?: Date;
    };
    private parseDate;
}
export declare const yamlParser: YamlParser;
//# sourceMappingURL=yaml-parser.d.ts.map