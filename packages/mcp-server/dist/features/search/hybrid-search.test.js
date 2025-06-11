import { describe, it, expect, beforeEach } from 'vitest';
import { HybridSearchEngine } from './hybrid-search.js';
describe('HybridSearchEngine', () => {
    let searchEngine;
    beforeEach(() => {
        searchEngine = new HybridSearchEngine();
    });
    describe('calculateTextScore with enhanced title scoring', () => {
        it('should give higher scores for exact title matches', () => {
            const content = '# MCP Function Test Suite\n\nThis is some content about testing.';
            const searchTerms = ['mcp', 'function', 'test', 'suite'];
            const originalQuery = 'MCP Function Test Suite';
            const filePath = 'Tests/MCP Function Test Suite.md';
            // Access private method for testing
            const score = searchEngine.calculateTextScore(content, searchTerms, originalQuery, filePath);
            // Should get significant bonus for exact title match
            expect(score).toBeGreaterThan(15); // At least the 15-point exact match bonus
        });
        it('should give bonus for partial title matches', () => {
            const content = '# MCP Function Test Suite\n\nThis is some content about testing.';
            const searchTerms = ['mcp', 'function'];
            const originalQuery = 'MCP Function';
            const filePath = 'Tests/Different Name.md';
            const score = searchEngine.calculateTextScore(content, searchTerms, originalQuery, filePath);
            // Should get partial title match bonuses
            expect(score).toBeGreaterThan(10); // Should have some bonus points
        });
        it('should match filename as well as content title', () => {
            const content = 'Some content without a title heading.';
            const searchTerms = ['mcp', 'test'];
            const originalQuery = 'MCP Test';
            const filePath = 'Tests/MCP Test File.md';
            const score = searchEngine.calculateTextScore(content, searchTerms, originalQuery, filePath);
            // Should get some score from filename partial matches
            expect(score).toBeGreaterThan(0);
        });
        it('should give exact filename match bonus', () => {
            const content = 'Some content without a title heading.';
            const searchTerms = ['mcp', 'test'];
            const originalQuery = 'MCP Test File';
            const filePath = 'Tests/MCP Test File.md';
            const score = searchEngine.calculateTextScore(content, searchTerms, originalQuery, filePath);
            // Should get the 15-point exact match bonus for filename plus partial matches
            expect(score).toBeGreaterThanOrEqual(15);
        });
        it('should not normalize exact title match bonus', () => {
            const longContent = '# Test Title\n' + 'A'.repeat(10000); // Very long content  
            const shortContent = '# Test Title\nShort content.';
            const searchTerms = ['test'];
            const originalQuery = 'Test Title';
            const filePath = 'test-title.md';
            const longScore = searchEngine.calculateTextScore(longContent, searchTerms, originalQuery, filePath);
            const shortScore = searchEngine.calculateTextScore(shortContent, searchTerms, originalQuery, filePath);
            // Both should have the exact title match bonus (15 points) 
            // The long content will have lower normalized scoring, so shortScore should be higher
            expect(shortScore).toBeGreaterThan(longScore);
            // But both should still have at least the 15-point exact match bonus
            expect(longScore).toBeGreaterThanOrEqual(15);
            expect(shortScore).toBeGreaterThanOrEqual(15);
        });
    });
});
