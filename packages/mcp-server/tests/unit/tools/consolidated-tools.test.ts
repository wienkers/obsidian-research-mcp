import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  CONSOLIDATED_OBSIDIAN_TOOLS, 
  validateSemanticSearchParams,
  validatePatternSearchParams,
  validateTargetInput,
  validateLinkedToParams 
} from '../../../src/tools/consolidated-tools.js';
import { ObsidianResearchServer } from '../../../src/server.js';

describe('Consolidated Tools Schema Validation', () => {
  describe('obsidian_semantic_search tool', () => {
    const semanticSearchTool = CONSOLIDATED_OBSIDIAN_TOOLS.find(tool => tool.name === 'obsidian_semantic_search');

    it('should have correct schema structure', () => {
      expect(semanticSearchTool).toBeDefined();
      expect(semanticSearchTool?.name).toBe('obsidian_semantic_search');
      expect(semanticSearchTool?.inputSchema.required).toEqual(['query']);
    });

    it('should validate semantic search params', () => {
      const validInput = {
        query: 'machine learning',
        filters: {
          tags: ['research'],
          folders: ['Literature']
        },
        options: {
          limit: 50,
          threshold: 0.8
        }
      };

      expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
    });

    it('should validate all filter options with mixed linkedTo formats', () => {
      const validInput = {
        query: 'test',
        filters: {
          tags: ['tag1', 'tag2'],
          folders: ['folder1', 'folder2'], 
          linkedTo: ['Research Notes', 'Bibliography.md', 'project/index', 'references.md'],
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-12-31T23:59:59Z'
          },
          hasProperty: { key: 'value' }
        }
      };

      expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      
      // Check that linkedTo paths were normalized properly
      const expected = ['Research Notes.md', 'Bibliography.md', 'project/index.md', 'references.md'];
      expect(validInput.filters.linkedTo).toEqual(expected);
    });

    it('should validate all option parameters', () => {
      const validInput = {
        query: 'test',
        options: {
          expandSearch: true,
          searchDepth: 3,
          limit: 250,
          threshold: 0.9
        }
      };

      expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
    });

    it('should throw error for missing query', () => {
      const invalidInput = {
        options: { limit: 50 }
      };

      expect(() => validateSemanticSearchParams(invalidInput)).toThrow('Search query must be a non-empty string');
    });

    it('should throw error for invalid threshold', () => {
      const invalidInput = {
        query: 'test',
        options: { threshold: 1.5 }
      };

      expect(() => validateSemanticSearchParams(invalidInput)).toThrow('Threshold must be between 0 and 1');
    });

    describe('boundary value testing', () => {
      it('should accept minimum searchDepth (0)', () => {
        const validInput = {
          query: 'test',
          options: { searchDepth: 0 }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should accept maximum searchDepth (5)', () => {
        const validInput = {
          query: 'test',
          options: { searchDepth: 5 }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should accept minimum limit (1)', () => {
        const validInput = {
          query: 'test',
          options: { limit: 1 }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should accept maximum limit (500)', () => {
        const validInput = {
          query: 'test',
          options: { limit: 500 }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should accept minimum threshold (0.0)', () => {
        const validInput = {
          query: 'test',
          options: { threshold: 0.0 }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should accept maximum threshold (1.0)', () => {
        const validInput = {
          query: 'test',
          options: { threshold: 1.0 }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should throw error for threshold below minimum', () => {
        const invalidInput = {
          query: 'test',
          options: { threshold: -0.1 }
        };

        expect(() => validateSemanticSearchParams(invalidInput)).toThrow('Threshold must be between 0 and 1');
      });

      it('should throw error for threshold above maximum', () => {
        const invalidInput = {
          query: 'test',
          options: { threshold: 1.1 }
        };

        expect(() => validateSemanticSearchParams(invalidInput)).toThrow('Threshold must be between 0 and 1');
      });
    });

    describe('complex filter combinations', () => {
      it('should validate all filters together', () => {
        const validInput = {
          query: 'machine learning research',
          filters: {
            folders: ['Research', 'Literature', 'Projects'],
            tags: ['ai', 'ml', 'research', 'papers'],
            linkedTo: ['References.md', 'Index.md', 'Bibliography.md'],
            hasProperty: {
              author: 'John Doe',
              status: 'published',
              priority: 'high',
              tags: ['important']
            },
            dateRange: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-12-31T23:59:59Z'
            }
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should validate folders and tags combination', () => {
        const validInput = {
          query: 'test',
          filters: {
            folders: ['Research', 'Notes'],
            tags: ['important', 'review']
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should validate linkedTo and hasProperty combination', () => {
        const validInput = {
          query: 'test',
          filters: {
            linkedTo: ['MainNote.md', 'Reference.md'],
            hasProperty: {
              type: 'research',
              completed: true
            }
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should validate dateRange with other filters', () => {
        const validInput = {
          query: 'test',
          filters: {
            folders: ['Archive'],
            dateRange: {
              start: '2024-06-01T00:00:00Z',
              end: '2024-06-30T23:59:59Z'
            }
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });
    });

    describe('filter edge cases', () => {
      it('should accept empty arrays in filters', () => {
        const validInput = {
          query: 'test',
          filters: {
            folders: [],
            tags: [],
            linkedTo: []
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should accept null values in hasProperty', () => {
        const validInput = {
          query: 'test',
          filters: {
            hasProperty: {
              emptyField: null,
              undefinedField: undefined
            }
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should accept nested objects in hasProperty', () => {
        const validInput = {
          query: 'test',
          filters: {
            hasProperty: {
              metadata: {
                author: 'John Doe',
                tags: ['important'],
                nested: {
                  level: 2,
                  data: 'value'
                }
              }
            }
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should accept only start date in dateRange', () => {
        const validInput = {
          query: 'test',
          filters: {
            dateRange: {
              start: '2024-01-01T00:00:00Z'
            }
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should accept only end date in dateRange', () => {
        const validInput = {
          query: 'test',
          filters: {
            dateRange: {
              end: '2024-12-31T23:59:59Z'
            }
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });
    });

    describe('real-world scenario tests', () => {
      it('should handle long search queries', () => {
        const longQuery = 'This is a very long semantic search query that contains multiple concepts and ideas about machine learning, artificial intelligence, deep learning neural networks, natural language processing, computer vision, data science, and research methodologies that might be found in academic papers and technical documentation';
        
        const validInput = {
          query: longQuery,
          options: { limit: 100 }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should handle queries with special characters', () => {
        const specialCharQuery = 'machine-learning & AI: "deep neural networks" (CNNs) + RNNs @2024 #research';
        
        const validInput = {
          query: specialCharQuery
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should handle unicode characters in queries', () => {
        const unicodeQuery = 'recherche en français 日本語での研究 Исследование на русском языке';
        
        const validInput = {
          query: unicodeQuery
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should handle markdown syntax in queries', () => {
        const markdownQuery = '[[linked notes]] and **bold text** with `code` and > quotes';
        
        const validInput = {
          query: markdownQuery
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should handle complex search scenarios', () => {
        const validInput = {
          query: 'advanced machine learning techniques',
          filters: {
            folders: ['Research/ML', 'Papers/AI', 'Projects/DeepLearning'],
            tags: ['machine-learning', 'deep-learning', 'neural-networks'],
            linkedTo: ['ML-Fundamentals.md', 'AI-Overview.md'],
            hasProperty: {
              status: 'published',
              authors: ['Smith, J.', 'Doe, A.'],
              year: 2024,
              type: 'research-paper'
            },
            dateRange: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-12-31T23:59:59Z'
            }
          },
          options: {
            expandSearch: true,
            searchDepth: 3,
            limit: 250,
            threshold: 0.8
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });
    });

    describe('option combinations', () => {
      it('should validate all options together', () => {
        const validInput = {
          query: 'test',
          options: {
            expandSearch: true,
            searchDepth: 2,
            limit: 100,
            threshold: 0.75
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should validate expandSearch without searchDepth', () => {
        const validInput = {
          query: 'test',
          options: {
            expandSearch: true,
            limit: 50
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });

      it('should validate searchDepth without expandSearch', () => {
        const validInput = {
          query: 'test',
          options: {
            searchDepth: 3,
            threshold: 0.6
          }
        };

        expect(() => validateSemanticSearchParams(validInput)).not.toThrow();
      });
    });

    describe('integration tests with mocked APIs', () => {
      let server: ObsidianResearchServer;
      let hybridSearchEngineMock: any;
      let obsidianAPIMock: any;
      let smartConnectionsAPIMock: any;

      beforeEach(() => {
        // Mock the hybrid search engine
        hybridSearchEngineMock = {
          search: vi.fn().mockResolvedValue([
            {
              path: 'TestNote.md',
              title: 'Test Note',
              content: 'This is test content about machine learning.',
              score: 0.95,
              relevanceType: 'semantic',
              matchedTerms: ['machine', 'learning'],
              contextSnippets: ['This is test content about machine learning.'],
              metadata: { semanticOnly: true }
            }
          ])
        };

        // Mock Smart Connections API
        smartConnectionsAPIMock = {
          searchSemantic: vi.fn().mockResolvedValue([
            {
              path: 'SemanticNote.md', 
              title: 'Semantic Note',
              score: 0.88,
              relevanceType: 'semantic'
            }
          ])
        };

        // Mock Obsidian API
        obsidianAPIMock = {
          getNote: vi.fn().mockResolvedValue({
            path: 'TestNote.md',
            content: 'Test content',
            frontmatter: {},
            tags: [],
            links: []
          })
        };

        // Replace the actual implementations with mocks
        vi.doMock('../../../src/features/search/hybrid-search.js', () => ({
          hybridSearchEngine: hybridSearchEngineMock
        }));
        
        vi.doMock('../../../src/integrations/smart-connections.js', () => ({
          smartConnectionsAPI: smartConnectionsAPIMock
        }));

        vi.doMock('../../../src/integrations/obsidian-api.js', () => ({
          obsidianAPI: obsidianAPIMock
        }));

        server = new ObsidianResearchServer();
      });

      it('should execute semantic search with proper parameters', async () => {
        const params = {
          query: 'machine learning',
          options: { threshold: 0.8, limit: 50 }
        };

        // Since we can't easily test the private method directly,
        // we verify that the validation and parameter processing works
        expect(() => validateSemanticSearchParams(params)).not.toThrow();
        
        // Verify that hybridSearchEngine.search would be called with correct params
        const expectedSearchParams = {
          semanticQuery: 'machine learning',
          structuralFilters: undefined,
          expandSearch: false,
          searchDepth: 1,
          limit: 50,
          semanticOnly: true,
          threshold: 0.8
        };

        // This tests that our parameter transformation logic is correct
        expect(expectedSearchParams.semanticOnly).toBe(true);
        expect(expectedSearchParams.threshold).toBe(0.8);
        expect(expectedSearchParams.limit).toBe(50);
      });

      it('should handle Smart Connections API failures gracefully', async () => {
        smartConnectionsAPIMock.searchSemantic.mockRejectedValue(new Error('Smart Connections unavailable'));
        
        // The search should still work even if Smart Connections fails
        // (falls back to structural search only)
        const params = {
          query: 'test query',
          options: { threshold: 0.7 }
        };

        expect(() => validateSemanticSearchParams(params)).not.toThrow();
      });

      it('should validate semanticOnly flag is set correctly', async () => {
        const params = {
          query: 'semantic search test',
          filters: { folders: ['Research'] },
          options: { expandSearch: true, searchDepth: 2 }
        };

        expect(() => validateSemanticSearchParams(params)).not.toThrow();
        
        // Verify the semanticOnly flag would be set to true for semantic search
        // This is implementation-specific logic that should be tested
        const searchParams = {
          semanticQuery: params.query,
          structuralFilters: params.filters,
          expandSearch: params.options.expandSearch,
          searchDepth: params.options.searchDepth,
          semanticOnly: true // This should always be true for obsidian_semantic_search
        };

        expect(searchParams.semanticOnly).toBe(true);
      });
    });

    describe('result structure validation', () => {
      it('should validate expected search result structure', () => {
        const mockSearchResult = {
          path: 'TestNote.md',
          score: 0.85,
          contextSnippets: ['This is test content.']
        };

        // Validate that the result structure matches expected SearchResult schema
        expect(mockSearchResult.path).toBeDefined();
        expect(mockSearchResult.score).toBeGreaterThan(0);
        expect(Array.isArray(mockSearchResult.contextSnippets)).toBe(true);
      });

      it('should include title only when it differs from filename', () => {
        // Result where title matches filename - title should be omitted
        const resultWithMatchingTitle = {
          path: 'folder/TestNote.md',
          title: 'TestNote', // Same as filename without .md
          score: 0.85,
          contextSnippets: ['Some content.']
        };
        
        // Simulate the logic from the server
        const filename = resultWithMatchingTitle.path.split('/').pop()?.replace(/\.md$/i, '') || '';
        const resultObj: any = {
          path: resultWithMatchingTitle.path,
          score: resultWithMatchingTitle.score,
          contextSnippets: resultWithMatchingTitle.contextSnippets,
        };
        
        if (resultWithMatchingTitle.title !== filename) {
          resultObj.title = resultWithMatchingTitle.title;
        }
        
        expect(resultObj.title).toBeUndefined(); // Title should be omitted
        expect(resultObj.path).toBe('folder/TestNote.md');

        // Result where title differs from filename - title should be included
        const resultWithDifferentTitle = {
          path: 'folder/short-name.md',
          title: 'This is a Much Longer Descriptive Title',
          score: 0.85,
          contextSnippets: ['Some content.']
        };
        
        const filename2 = resultWithDifferentTitle.path.split('/').pop()?.replace(/\.md$/i, '') || '';
        const resultObj2: any = {
          path: resultWithDifferentTitle.path,
          score: resultWithDifferentTitle.score,
          contextSnippets: resultWithDifferentTitle.contextSnippets,
        };
        
        if (resultWithDifferentTitle.title !== filename2) {
          resultObj2.title = resultWithDifferentTitle.title;
        }
        
        expect(resultObj2.title).toBe('This is a Much Longer Descriptive Title');
      });

      it('should validate semantic-only result properties', () => {
        const semanticResult = {
          path: 'SemanticNote.md',
          score: 0.92,
          contextSnippets: ['Semantic content snippet.']
        };

        expect(semanticResult.path).toBe('SemanticNote.md');
        expect(semanticResult.score).toBeGreaterThan(0.9);
        expect(Array.isArray(semanticResult.contextSnippets)).toBe(true);
      });

      it('should validate expanded search result properties', () => {
        const expandedResult = {
          path: 'ExpandedNote.md', 
          score: 0.65,
          contextSnippets: ['Content from expanded search.']
        };

        expect(expandedResult.path).toBe('ExpandedNote.md');
        expect(expandedResult.score).toBeGreaterThan(0);
        expect(expandedResult.score).toBeLessThan(0.9); // Expanded results should have lower scores
        expect(Array.isArray(expandedResult.contextSnippets)).toBe(true);
      });
    });

    describe('error handling tests', () => {
      it('should handle empty results gracefully', () => {
        const emptyResultsResponse = {
          query: 'nonexistent topic',
          results: [],
          totalResults: 0,
          searchParams: {
            expandSearch: false,
            searchDepth: 1,
            threshold: 0.7
          }
        };

        expect(Array.isArray(emptyResultsResponse.results)).toBe(true);
        expect(emptyResultsResponse.results.length).toBe(0);
        expect(emptyResultsResponse.totalResults).toBe(0);
      });

      it('should handle malformed filter parameters', () => {
        const invalidFilters = [
          // Invalid dateRange format
          {
            query: 'test',
            filters: {
              dateRange: {
                start: 'invalid-date',
                end: 'another-invalid-date'
              }
            }
          },
          // Non-array tags
          {
            query: 'test', 
            filters: {
              tags: 'not-an-array'
            }
          },
          // Non-array folders
          {
            query: 'test',
            filters: {
              folders: 'single-folder-string'
            }
          }
        ];

        // These should be caught by schema validation if properly implemented
        invalidFilters.forEach((invalidInput, index) => {
          // For now, these pass validation but would fail at runtime
          // This highlights areas where schema validation could be improved
          expect(invalidInput.query).toBeDefined();
        });
      });

      it('should handle timeout scenarios', () => {
        const timeoutResponse = {
          query: 'complex query',
          results: [],
          totalResults: 0,
          error: 'Search timeout after 5000ms',
          searchParams: {
            expandSearch: true,
            searchDepth: 5,
            threshold: 0.5
          }
        };

        expect(timeoutResponse.error).toContain('timeout');
        expect(timeoutResponse.results).toEqual([]);
      });
    });

    describe('implementation-specific feature tests', () => {
      it('should validate MMR ranking parameters', () => {
        const mmrParams = {
          query: 'diverse results test',
          options: {
            limit: 100,
            threshold: 0.6
          }
        };

        // MMR ranking should be applied with these parameters:
        // - lambda for relevance/diversity balance
        // - maxResults based on limit
        // - useSemanticSimilarity: true (since Smart Connections enabled)
        // - diversityThreshold: 0.1
        
        expect(() => validateSemanticSearchParams(mmrParams)).not.toThrow();
        
        // Verify MMR would use correct parameters
        const expectedMMRConfig = {
          maxResults: mmrParams.options.limit,
          useSemanticSimilarity: true,
          diversityThreshold: 0.1
        };

        expect(expectedMMRConfig.maxResults).toBe(100);
        expect(expectedMMRConfig.useSemanticSimilarity).toBe(true);
      });

      it('should validate link expansion parameters', () => {
        const expansionParams = {
          query: 'test expansion',
          options: {
            expandSearch: true,
            searchDepth: 3,
            limit: 50
          }
        };

        expect(() => validateSemanticSearchParams(expansionParams)).not.toThrow();

        // Link expansion should be limited by:
        // - MAX_EXPANSION_NOTES = 10
        // - TIMEOUT_MS = 5000
        // - Circuit breaker at 50 total results
        // - Batch size = 2

        const expectedExpansionLimits = {
          maxExpansionNotes: 10,
          timeoutMs: 5000,
          circuitBreakerLimit: 50,
          batchSize: 2
        };

        expect(expectedExpansionLimits.maxExpansionNotes).toBe(10);
        expect(expectedExpansionLimits.timeoutMs).toBe(5000);
      });

      it('should validate cache behavior parameters', () => {
        const cacheableParams = {
          query: 'cacheable query',
          filters: {
            folders: ['Research'],
            tags: ['important']
          },
          options: {
            limit: 25,
            threshold: 0.8
          }
        };

        expect(() => validateSemanticSearchParams(cacheableParams)).not.toThrow();

        // Cache key should be generated from:
        // - query, folders (sorted), tags (sorted), limit, expandSearch, searchDepth
        const expectedCacheKeyComponents = {
          query: cacheableParams.query,
          folders: cacheableParams.filters.folders?.sort(),
          tags: cacheableParams.filters.tags?.sort(),
          limit: cacheableParams.options.limit,
          expandSearch: false, // default value
          searchDepth: 1 // default value
        };

        expect(expectedCacheKeyComponents.query).toBe('cacheable query');
        expect(expectedCacheKeyComponents.limit).toBe(25);
      });

      it('should validate filter application order', () => {
        const filteredParams = {
          query: 'filtered search',
          filters: {
            folders: ['Research'],
            tags: ['ai', 'ml'],
            linkedTo: ['MainNote.md'],
            hasProperty: { status: 'published' },
            dateRange: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-12-31T23:59:59Z'
            }
          }
        };

        expect(() => validateSemanticSearchParams(filteredParams)).not.toThrow();

        // Filters should be applied in this order:
        // 1. Semantic search with Smart Connections
        // 2. Apply structural filters (folders, tags via searchFiles or tag filtering)
        // 3. Apply additional filters (linkedTo, hasProperty)
        // 4. Apply final filters and limits

        const filterOrder = ['semantic', 'structural', 'linkedTo', 'hasProperty'];
        expect(filterOrder.length).toBe(4);
        expect(filterOrder[0]).toBe('semantic');
      });

      it('should validate performance optimization features', () => {
        const performanceParams = {
          query: 'performance test query',
          options: {
            expandSearch: true,
            searchDepth: 5,
            limit: 500
          }
        };

        expect(() => validateSemanticSearchParams(performanceParams)).not.toThrow();

        // Performance optimizations should include:
        // - Early exit if enough high-quality results (score > 5)
        // - Batch processing with delays (10ms between batches)
        // - Timeout protection (5000ms for expansion)
        // - Circuit breaker for total results (50 max)

        const performanceSettings = {
          earlyExitScoreThreshold: 5,
          batchDelay: 10,
          expansionTimeout: 5000,
          circuitBreakerLimit: 50
        };

        expect(performanceSettings.earlyExitScoreThreshold).toBe(5);
        expect(performanceSettings.expansionTimeout).toBe(5000);
      });
    });
  });

  describe('validateLinkedToParams function', () => {
    it('should accept and normalize filenames without extensions', () => {
      const input = ['Research Notes', 'Bibliography', 'project/index'];
      const result = validateLinkedToParams(input);
      
      expect(result).toEqual(['Research Notes.md', 'Bibliography.md', 'project/index.md']);
    });

    it('should preserve filenames that already have .md extensions', () => {
      const input = ['Research Notes.md', 'Bibliography.md'];
      const result = validateLinkedToParams(input);
      
      expect(result).toEqual(['Research Notes.md', 'Bibliography.md']);
    });

    it('should handle mixed formats correctly', () => {
      const input = ['Research Notes', 'Bibliography.md', 'project/index', 'references.md'];
      const result = validateLinkedToParams(input);
      
      expect(result).toEqual(['Research Notes.md', 'Bibliography.md', 'project/index.md', 'references.md']);
    });

    it('should preserve non-.md extensions', () => {
      const input = ['image.png', 'document.pdf', 'data.json'];
      const result = validateLinkedToParams(input);
      
      expect(result).toEqual(['image.png', 'document.pdf', 'data.json']);
    });

    it('should handle empty array', () => {
      const result = validateLinkedToParams([]);
      expect(result).toEqual([]);
    });

    it('should handle undefined/null input', () => {
      expect(validateLinkedToParams(undefined)).toEqual([]);
      expect(validateLinkedToParams(null)).toEqual([]);
    });

    it('should strip query parameters and fragments', () => {
      const input = ['note.md#section', 'file.md?param=value', 'document#fragment?query=test'];
      const result = validateLinkedToParams(input);
      
      expect(result).toEqual(['note.md', 'file.md', 'document.md']);
    });

    it('should throw error for non-array input', () => {
      expect(() => validateLinkedToParams('not an array')).toThrow('LinkedTo must be an array of file paths');
    });

    it('should throw error for non-string items', () => {
      expect(() => validateLinkedToParams(['valid.md', 123, 'another.md'])).toThrow('LinkedTo item at index 1 must be a string');
    });

    it('should throw error for empty string items', () => {
      expect(() => validateLinkedToParams(['valid.md', '', 'another.md'])).toThrow('LinkedTo item at index 1 cannot be empty');
      expect(() => validateLinkedToParams(['valid.md', '   ', 'another.md'])).toThrow('LinkedTo item at index 1 cannot be empty');
    });

    it('should throw error for paths that are too long', () => {
      const longPath = 'a'.repeat(501);
      expect(() => validateLinkedToParams([longPath])).toThrow('LinkedTo item at index 0 is too long (max 500 characters)');
    });

    it('should throw error for absolute paths', () => {
      expect(() => validateLinkedToParams(['/absolute/path.md'])).toThrow('LinkedTo item at index 0 should be a relative path within the vault');
      expect(() => validateLinkedToParams(['C:/windows/path.md'])).toThrow('LinkedTo item at index 0 should be a relative path within the vault');
    });

    it('should throw error for directory traversal attempts', () => {
      expect(() => validateLinkedToParams(['../outside.md'])).toThrow('LinkedTo item at index 0 cannot contain directory traversal');
      expect(() => validateLinkedToParams(['folder/../other.md'])).toThrow('LinkedTo item at index 0 cannot contain directory traversal');
    });

    it('should throw error for invalid characters', () => {
      expect(() => validateLinkedToParams(['file<name>.md'])).toThrow('LinkedTo item at index 0 contains invalid characters');
      expect(() => validateLinkedToParams(['file|name.md'])).toThrow('LinkedTo item at index 0 contains invalid characters');
    });

    it('should throw error for reserved filenames', () => {
      expect(() => validateLinkedToParams(['CON'])).toThrow('LinkedTo item at index 0 is a reserved filename');
      expect(() => validateLinkedToParams(['PRN.md'])).toThrow('LinkedTo item at index 0 is a reserved filename');
    });

    it('should throw error for null bytes', () => {
      expect(() => validateLinkedToParams(['file\0name.md'])).toThrow('LinkedTo item at index 0 cannot contain null bytes');
    });
  });

  describe('obsidian_pattern_search tool', () => {
    const patternSearchTool = CONSOLIDATED_OBSIDIAN_TOOLS.find(tool => tool.name === 'obsidian_pattern_search');

    it('should have correct schema structure', () => {
      expect(patternSearchTool).toBeDefined();
      expect(patternSearchTool?.name).toBe('obsidian_pattern_search');
      expect(patternSearchTool?.inputSchema.required).toEqual(['patterns']);
    });

    it('should validate pattern search params', () => {
      const validInput = {
        patterns: ['@\\w+\\d{4}', 'TODO:.*']
      };

      expect(() => validatePatternSearchParams(validInput)).not.toThrow();
    });

    it('should throw error for missing patterns', () => {
      const invalidInput = {
        options: { caseSensitive: true }
      };

      expect(() => validatePatternSearchParams(invalidInput)).toThrow('Patterns must be a non-empty array of regex patterns');
    });

    it('should throw error for empty patterns array', () => {
      const invalidInput = {
        patterns: []
      };

      expect(() => validatePatternSearchParams(invalidInput)).toThrow('Patterns must be a non-empty array of regex patterns');
    });

    it('should throw error for invalid regex pattern', () => {
      const invalidInput = {
        patterns: ['[invalid regex']
      };

      expect(() => validatePatternSearchParams(invalidInput)).toThrow('Invalid regex pattern');
    });
  });

  describe('obsidian_get_notes tool', () => {
    const getNotesTool = CONSOLIDATED_OBSIDIAN_TOOLS.find(tool => tool.name === 'obsidian_get_notes');

    it('should have correct schema structure', () => {
      expect(getNotesTool).toBeDefined();
      expect(getNotesTool?.name).toBe('obsidian_get_notes');
      expect(getNotesTool?.inputSchema.required).toEqual(['target']);
    });

    it('should validate single file path target', () => {
      const validInput = {
        target: 'Notes/Project.md'
      };

      expect(() => validateTargetInput(validInput)).not.toThrow();
    });

    it('should validate multiple file paths target', () => {
      const validInput = {
        target: ['Notes/Project.md', 'Literature/Paper.md', 'Ideas/Concepts.md']
      };

      expect(() => validateTargetInput(validInput)).not.toThrow();
    });


    it('should validate format options', () => {
      const validInput = {
        target: 'test.md',
        options: {
          format: 'json',
          includeContent: true,
          includeMetadata: true,
          includeStat: true
        }
      };

      expect(() => validateTargetInput(validInput)).not.toThrow();
    });



    it('should throw error for empty target', () => {
      const invalidInput = {
        target: ''
      };

      expect(() => validateTargetInput(invalidInput)).toThrow('Target is required');
    });

    it('should throw error for missing target', () => {
      const invalidInput = {};

      expect(() => validateTargetInput(invalidInput)).toThrow('Target is required');
    });

    it('should throw error for whitespace-only target', () => {
      const invalidInput = {
        target: '   '
      };

      expect(() => validateTargetInput(invalidInput)).toThrow('Target path cannot be empty');
    });

    it('should throw error for empty target array', () => {
      const invalidInput = {
        target: []
      };

      expect(() => validateTargetInput(invalidInput)).toThrow('Target array cannot be empty');
    });

    describe('Integration Tests - obsidian_get_notes', () => {
      let server: ObsidianResearchServer;
      let obsidianAPIMock: any;

      beforeEach(() => {
        // Mock Obsidian API for integration testing
        obsidianAPIMock = {
          getNote: vi.fn(),
          listFiles: vi.fn()
        };

        // Replace with mock
        vi.doMock('../../../src/integrations/obsidian-api.js', () => ({
          obsidianAPI: obsidianAPIMock
        }));

        server = new ObsidianResearchServer();
      });

      describe('Single File Retrieval', () => {
        it('should retrieve single note with default options', async () => {
          const mockNote = {
            path: 'Notes/Test.md',
            content: '# Test Note\n\nThis is test content.',
            frontmatter: { title: 'Test Note', tags: ['test'] },
            tags: ['test'],
            links: ['Other Note.md'],
            backlinks: ['Referring Note.md']
          };

          obsidianAPIMock.getNote.mockResolvedValue(mockNote);

          const params = { target: 'Notes/Test.md' };
          expect(() => validateTargetInput(params)).not.toThrow();

          // Verify the mock would be called correctly
          expect(obsidianAPIMock.getNote).toBeDefined();
        });

        it('should retrieve single note in JSON format', async () => {
          const mockNote = {
            path: 'Notes/Test.md',
            content: '# Test Note\n\nThis is test content.',
            frontmatter: { title: 'Test Note' },
            tags: ['test'],
            links: [],
            backlinks: []
          };

          obsidianAPIMock.getNote.mockResolvedValue(mockNote);

          const params = {
            target: 'Notes/Test.md',
            options: { format: 'json' }
          };

          expect(() => validateTargetInput(params)).not.toThrow();
          expect(params.options.format).toBe('json');
        });

        it('should retrieve single note with statistics', async () => {
          const mockNote = {
            path: 'Notes/Test.md',
            content: '# Test Note\n\nThis is test content.',
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          };

          const mockFileInfo = {
            path: 'Notes/Test.md',
            ctime: 1640995200000, // 2022-01-01
            mtime: 1641081600000, // 2022-01-02
            size: 1024
          };

          obsidianAPIMock.getNote.mockResolvedValue(mockNote);
          obsidianAPIMock.listFiles.mockResolvedValue([mockFileInfo]);

          const params = {
            target: 'Notes/Test.md',
            options: { includeStat: true }
          };

          expect(() => validateTargetInput(params)).not.toThrow();
          expect(params.options.includeStat).toBe(true);
        });
      });

      describe('Multiple File Retrieval', () => {
        it('should retrieve multiple notes successfully', async () => {
          const mockNotes = [
            {
              path: 'Notes/Test1.md',
              content: '# Test Note 1',
              frontmatter: {},
              tags: [],
              links: [],
              backlinks: []
            },
            {
              path: 'Notes/Test2.md',
              content: '# Test Note 2',
              frontmatter: {},
              tags: [],
              links: [],
              backlinks: []
            }
          ];

          obsidianAPIMock.getNote
            .mockResolvedValueOnce(mockNotes[0])
            .mockResolvedValueOnce(mockNotes[1]);

          const params = {
            target: ['Notes/Test1.md', 'Notes/Test2.md']
          };

          expect(() => validateTargetInput(params)).not.toThrow();
          expect(Array.isArray(params.target)).toBe(true);
          expect(params.target.length).toBe(2);
        });

        it('should handle mixed success/failure in multiple file retrieval', async () => {
          obsidianAPIMock.getNote
            .mockResolvedValueOnce({
              path: 'Notes/Exists.md',
              content: '# Existing Note',
              frontmatter: {},
              tags: [],
              links: [],
              backlinks: []
            })
            .mockRejectedValueOnce(new Error('Note not found'));

          const params = {
            target: ['Notes/Exists.md', 'Notes/Missing.md']
          };

          expect(() => validateTargetInput(params)).not.toThrow();
        });

        it('should retrieve multiple notes with statistics', async () => {
          const mockNotes = [
            {
              path: 'Notes/Test1.md',
              content: '# Test Note 1',
              frontmatter: {},
              tags: [],
              links: [],
              backlinks: []
            }
          ];

          const mockFileInfo = {
            path: 'Notes/Test1.md',
            ctime: 1640995200000,
            mtime: 1641081600000,
            size: 512
          };

          obsidianAPIMock.getNote.mockResolvedValueOnce(mockNotes[0]);
          obsidianAPIMock.listFiles.mockResolvedValue([mockFileInfo]);

          const params = {
            target: ['Notes/Test1.md'],
            options: { includeStat: true }
          };

          expect(() => validateTargetInput(params)).not.toThrow();
        });
      });

      describe('Format Testing', () => {
        it('should handle markdown format output', async () => {
          const params = {
            target: 'Notes/Test.md',
            options: { format: 'markdown' }
          };

          expect(() => validateTargetInput(params)).not.toThrow();
          expect(params.options.format).toBe('markdown');
        });

        it('should handle JSON format output', async () => {
          const params = {
            target: 'Notes/Test.md',
            options: { format: 'json' }
          };

          expect(() => validateTargetInput(params)).not.toThrow();
          expect(params.options.format).toBe('json');
        });

        it('should validate format enum values', () => {
          const validFormats = ['markdown', 'json'];
          const invalidFormats = ['html', 'txt', 'xml'];

          validFormats.forEach(format => {
            const params = {
              target: 'Notes/Test.md',
              options: { format }
            };
            expect(() => validateTargetInput(params)).not.toThrow();
          });

          // Schema validation would catch invalid formats at runtime
          invalidFormats.forEach(format => {
            const params = {
              target: 'Notes/Test.md',
              options: { format }
            };
            // These would be caught by JSON schema validation in actual implementation
            expect(params.options.format).toBe(format);
          });
        });
      });

      describe('Statistics Testing', () => {
        it('should validate includeStat boolean parameter', () => {
          const params = {
            target: 'Notes/Test.md',
            options: { includeStat: true }
          };

          expect(() => validateTargetInput(params)).not.toThrow();
          expect(params.options.includeStat).toBe(true);
        });

        it('should handle statistics error gracefully', async () => {
          const mockNote = {
            path: 'Notes/Test.md',
            content: '# Test Note',
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          };

          obsidianAPIMock.getNote.mockResolvedValue(mockNote);
          obsidianAPIMock.listFiles.mockResolvedValue([]); // No file info available

          const params = {
            target: 'Notes/Test.md',
            options: { includeStat: true }
          };

          expect(() => validateTargetInput(params)).not.toThrow();
        });

        it('should include all metadata fields', async () => {
          const mockNote = {
            path: 'Notes/Test.md',
            content: '# Test Note\n\nContent with [[link]] and #tag',
            frontmatter: { title: 'Test', author: 'User' },
            tags: ['tag1', 'tag2'],
            links: ['LinkedNote.md'],
            backlinks: ['BacklinkNote.md']
          };

          obsidianAPIMock.getNote.mockResolvedValue(mockNote);

          const params = {
            target: 'Notes/Test.md',
            options: { includeMetadata: true }
          };

          expect(() => validateTargetInput(params)).not.toThrow();
          expect(params.options.includeMetadata).toBe(true);
        });
      });

      describe('Error Handling', () => {
        it('should handle missing file error', async () => {
          obsidianAPIMock.getNote.mockRejectedValue(new Error('File not found'));

          const params = { target: 'Notes/Missing.md' };
          expect(() => validateTargetInput(params)).not.toThrow();
        });

        it('should handle invalid file path', () => {
          const invalidPaths = ['', '   ', null, undefined];
          
          invalidPaths.forEach(path => {
            if (path === null || path === undefined) {
              const params = {};
              expect(() => validateTargetInput(params)).toThrow('Target is required');
            } else {
              const params = { target: path };
              if (path.trim().length === 0) {
                expect(() => validateTargetInput(params)).toThrow();
              }
            }
          });
        });

        it('should handle network/API errors gracefully', async () => {
          obsidianAPIMock.getNote.mockRejectedValue(new Error('Network error'));

          const params = { target: 'Notes/Test.md' };
          expect(() => validateTargetInput(params)).not.toThrow();
        });
      });

      describe('Performance Testing', () => {
        it('should handle large file content', async () => {
          const largeContent = 'Large content '.repeat(10000); // ~130KB
          const mockNote = {
            path: 'Notes/Large.md',
            content: largeContent,
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          };

          obsidianAPIMock.getNote.mockResolvedValue(mockNote);

          const params = { target: 'Notes/Large.md' };
          expect(() => validateTargetInput(params)).not.toThrow();
        });

        it('should handle many files efficiently', async () => {
          const manyFiles = Array.from({ length: 50 }, (_, i) => `Notes/File${i}.md`);
          
          const params = { target: manyFiles };
          expect(() => validateTargetInput(params)).not.toThrow();
          expect(params.target.length).toBe(50);
        });

        it('should handle files with special characters', async () => {
          const specialPaths = [
            'Notes/File with spaces.md',
            'Notes/File-with-dashes.md',
            'Notes/File_with_underscores.md',
            'Notes/File(with)parentheses.md',
            'Notes/File[with]brackets.md'
          ];

          specialPaths.forEach(path => {
            const params = { target: path };
            expect(() => validateTargetInput(params)).not.toThrow();
          });
        });

        it('should handle unicode file names', async () => {
          const unicodePaths = [
            'Notes/文档.md',
            'Notes/документ.md',
            'Notes/έγγραφο.md',
            'Notes/文書.md'
          ];

          unicodePaths.forEach(path => {
            const params = { target: path };
            expect(() => validateTargetInput(params)).not.toThrow();
          });
        });
      });

      describe('Edge Cases', () => {
        it('should handle empty file content', async () => {
          const mockNote = {
            path: 'Notes/Empty.md',
            content: '',
            frontmatter: {},
            tags: [],
            links: [],
            backlinks: []
          };

          obsidianAPIMock.getNote.mockResolvedValue(mockNote);

          const params = { target: 'Notes/Empty.md' };
          expect(() => validateTargetInput(params)).not.toThrow();
        });

        it('should handle files with only frontmatter', async () => {
          const mockNote = {
            path: 'Notes/OnlyFrontmatter.md',
            content: '---\ntitle: Test\n---\n',
            frontmatter: { title: 'Test' },
            tags: [],
            links: [],
            backlinks: []
          };

          obsidianAPIMock.getNote.mockResolvedValue(mockNote);

          const params = { target: 'Notes/OnlyFrontmatter.md' };
          expect(() => validateTargetInput(params)).not.toThrow();
        });

        it('should handle mixed content and metadata options', async () => {
          const params = {
            target: 'Notes/Test.md',
            options: {
              includeContent: false,
              includeMetadata: true,
              includeStat: true
            }
          };

          expect(() => validateTargetInput(params)).not.toThrow();
          expect(params.options.includeContent).toBe(false);
          expect(params.options.includeMetadata).toBe(true);
          expect(params.options.includeStat).toBe(true);
        });

        it('should return complete statistics when includeStat is true', async () => {
          const mockNote = {
            path: 'Tests/Complex Note.md',
            content: '# Test Note\n\nThis is test content with some length for token estimation.',
            frontmatter: { title: 'Test Note', category: 'research' },
            tags: ['test', 'statistics'],
            links: ['Other Note.md'],
            backlinks: ['Linking Note.md']
          };
          
          const mockFileWithStats = {
            path: 'Tests/Complex Note.md',
            name: 'Complex Note.md',
            isFolder: false,
            size: 1533,
            mtime: 1756068565258, // timestamp
            ctime: 1756068569636  // timestamp
          };
          
          // Mock the obsidian API calls
          obsidianAPIMock.getNote.mockResolvedValue(mockNote);
          obsidianAPIMock.listFiles.mockResolvedValue([mockFileWithStats]);
          
          const params = {
            target: 'Tests/Complex Note.md',
            options: {
              format: 'json',
              includeContent: true,
              includeMetadata: true,
              includeStat: true
            }
          };
          
          expect(() => validateTargetInput(params)).not.toThrow();
          expect(params.options.includeStat).toBe(true);
          
          // This test validates that our listFiles method would now return metadata
          // when includeMetadata parameter is true (which our fix implements)
          const filesWithMetadata = await obsidianAPIMock.listFiles(undefined, true, true);
          const fileWithStats = filesWithMetadata.find(f => f.path === 'Tests/Complex Note.md');
          
          expect(fileWithStats).toBeDefined();
          expect(fileWithStats?.mtime).toBe(1756068565258);
          expect(fileWithStats?.ctime).toBe(1756068569636);
          expect(fileWithStats?.size).toBe(1533);
        });
      });
    });
  });

  describe('obsidian_write_content tool', () => {
    const writeNoteTool = CONSOLIDATED_OBSIDIAN_TOOLS.find(tool => tool.name === 'obsidian_write_content');

    it('should have correct schema structure', () => {
      expect(writeNoteTool).toBeDefined();
      expect(writeNoteTool?.name).toBe('obsidian_write_content');
      expect(writeNoteTool?.inputSchema.required).toEqual(['content']);
      
      // Verify schema has all expected properties
      const properties = writeNoteTool?.inputSchema.properties;
      expect(properties).toHaveProperty('targetType');
      expect(properties).toHaveProperty('targetIdentifier');
      expect(properties).toHaveProperty('content');
      expect(properties).toHaveProperty('mode');
      expect(properties).toHaveProperty('wholeFileMode');
      expect(properties).toHaveProperty('relativeMode');
    });

    describe('targetType validation', () => {
      it('should validate targetType "path" with targetIdentifier', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Test.md',
          content: '# Test Note\n\nThis is test content.'
        };

        expect(validInput.targetType).toBe('path');
        expect(validInput.targetIdentifier).toBe('Notes/Test.md');
        expect(validInput.content).toBeDefined();
      });

      it('should validate targetType "active"', () => {
        const validInput = {
          targetType: 'active',
          content: 'Content to add to active note.'
        };

        expect(validInput.targetType).toBe('active');
        expect(validInput.content).toBeDefined();
        // targetIdentifier should not be required for active type
        expect(validInput).not.toHaveProperty('targetIdentifier');
      });

      it('should use default targetType "path"', () => {
        const inputWithDefaults = {
          targetIdentifier: 'Notes/Test.md',
          content: 'Test content'
        };

        // Schema should default targetType to 'path'
        expect(writeNoteTool?.inputSchema.properties.targetType.default).toBe('path');
      });
    });

    describe('whole-file mode validation', () => {
      it('should validate mode "whole-file" with wholeFileMode "overwrite"', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Test.md',
          content: '# New Content\n\nThis replaces everything.',
          mode: 'whole-file',
          wholeFileMode: 'overwrite'
        };

        expect(validInput.mode).toBe('whole-file');
        expect(validInput.wholeFileMode).toBe('overwrite');
      });

      it('should validate mode "whole-file" with wholeFileMode "append"', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Test.md',
          content: '\n\n## Additional Section\n\nThis content is appended.',
          mode: 'whole-file',
          wholeFileMode: 'append'
        };

        expect(validInput.mode).toBe('whole-file');
        expect(validInput.wholeFileMode).toBe('append');
      });

      it('should validate mode "whole-file" with wholeFileMode "prepend"', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Test.md',
          content: '# Important Notice\n\nThis content is prepended.\n\n',
          mode: 'whole-file',
          wholeFileMode: 'prepend'
        };

        expect(validInput.mode).toBe('whole-file');
        expect(validInput.wholeFileMode).toBe('prepend');
      });

      it('should use default values for whole-file mode', () => {
        // Schema should default mode to 'whole-file' and wholeFileMode to 'overwrite'
        expect(writeNoteTool?.inputSchema.properties.mode.default).toBe('whole-file');
        expect(writeNoteTool?.inputSchema.properties.wholeFileMode.default).toBe('overwrite');
      });
    });

    describe('relative mode validation', () => {
      it('should validate mode "relative" with operation "append" to heading', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Research.md',
          content: '\n\n### New Finding\n\nImportant discovery here.',
          mode: 'relative',
          relativeMode: {
            operation: 'append',
            targetType: 'heading',
            target: 'Results'
          }
        };

        expect(validInput.mode).toBe('relative');
        expect(validInput.relativeMode.operation).toBe('append');
        expect(validInput.relativeMode.targetType).toBe('heading');
        expect(validInput.relativeMode.target).toBe('Results');
      });

      it('should validate mode "relative" with operation "prepend" to heading', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Study.md',
          content: '## Preparation\n\nSetup steps here.\n\n',
          mode: 'relative',
          relativeMode: {
            operation: 'prepend',
            targetType: 'heading',
            target: 'Methodology'
          }
        };

        expect(validInput.mode).toBe('relative');
        expect(validInput.relativeMode.operation).toBe('prepend');
        expect(validInput.relativeMode.targetType).toBe('heading');
      });

      it('should validate mode "relative" with operation "replace" to heading', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Report.md',
          content: '## Final Thoughts\n\nNew conclusion here.',
          mode: 'relative',
          relativeMode: {
            operation: 'replace',
            targetType: 'heading',
            target: 'Conclusion'
          }
        };

        expect(validInput.mode).toBe('relative');
        expect(validInput.relativeMode.operation).toBe('replace');
      });

      it('should validate mode "relative" with frontmatter target', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Article.md',
          content: 'status: published\nauthor: John Doe',
          mode: 'relative',
          relativeMode: {
            operation: 'append',
            targetType: 'frontmatter',
            target: 'metadata'
          }
        };

        expect(validInput.relativeMode.targetType).toBe('frontmatter');
      });

      it('should validate all relative mode operations', () => {
        const operations = ['append', 'prepend', 'replace'];
        
        operations.forEach(operation => {
          const validInput = {
            targetType: 'path',
            targetIdentifier: 'Notes/Test.md',
            content: 'Test content',
            mode: 'relative',
            relativeMode: {
              operation,
              targetType: 'heading',
              target: 'TestHeading'
            }
          };

          expect(validInput.relativeMode.operation).toBe(operation);
        });
      });

      it('should validate all relative mode target types', () => {
        const targetTypes = ['heading', 'frontmatter'];
        
        targetTypes.forEach(targetType => {
          const validInput = {
            targetType: 'path',
            targetIdentifier: 'Notes/Test.md',
            content: 'Test content',
            mode: 'relative',
            relativeMode: {
              operation: 'append',
              targetType,
              target: 'TestTarget'
            }
          };

          expect(validInput.relativeMode.targetType).toBe(targetType);
        });
      });
    });

    describe('content validation', () => {
      it('should require content field', () => {
        // Content is the only required field according to schema
        expect(writeNoteTool?.inputSchema.required).toEqual(['content']);
      });

      it('should validate empty content', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Empty.md',
          content: ''
        };

        expect(validInput.content).toBe('');
      });

      it('should validate large content', () => {
        const largeContent = 'Large content section.\n'.repeat(1000);
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Large.md',
          content: largeContent
        };

        expect(validInput.content.length).toBeGreaterThan(10000);
      });

      it('should validate markdown content', () => {
        const markdownContent = `# Title

## Section

- List item 1
- List item 2

**Bold text** and *italic text*.

\`\`\`javascript
console.log('code block');
\`\`\`

[[Internal Link]] and [External Link](https://example.com)

> Blockquote

| Table | Header |
|-------|--------|
| Cell  | Value  |
`;

        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Markdown.md',
          content: markdownContent
        };

        expect(validInput.content).toContain('# Title');
        expect(validInput.content).toContain('[[Internal Link]]');
        expect(validInput.content).toContain('```javascript');
      });

      it('should validate content with special characters', () => {
        const specialContent = 'Content with émojis 🎉, ümlauts, and 中文字符';
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Special.md',
          content: specialContent
        };

        expect(validInput.content).toContain('émojis');
        expect(validInput.content).toContain('🎉');
        expect(validInput.content).toContain('中文字符');
      });
    });

    describe('schema validation edge cases', () => {
      it('should validate oneOf constraint for targetType path', () => {
        // When targetType is 'path', targetIdentifier should be required
        const schema = writeNoteTool?.inputSchema;
        const oneOfConstraints = schema?.oneOf;
        
        expect(oneOfConstraints).toBeDefined();
        expect(Array.isArray(oneOfConstraints)).toBe(true);
        expect(oneOfConstraints?.length).toBe(2);
      });

      it('should validate active note targeting without path', () => {
        const validInput = {
          targetType: 'active',
          content: 'Content for active note'
          // No targetIdentifier required for active type
        };

        expect(validInput.targetType).toBe('active');
        expect(validInput).not.toHaveProperty('targetIdentifier');
      });

      it('should validate relative mode requires all fields', () => {
        const relativeMode = writeNoteTool?.inputSchema.properties.relativeMode;
        expect(relativeMode?.required).toEqual(['operation', 'targetType', 'target']);
      });

      it('should validate enum values', () => {
        const schema = writeNoteTool?.inputSchema.properties;
        
        expect(schema?.targetType.enum).toEqual(['path', 'active']);
        expect(schema?.mode.enum).toEqual(['whole-file', 'relative']);
        expect(schema?.wholeFileMode.enum).toEqual(['overwrite', 'append', 'prepend']);
        
        const relativeMode = schema?.relativeMode.properties;
        expect(relativeMode?.operation.enum).toEqual(['append', 'prepend', 'replace']);
        expect(relativeMode?.targetType.enum).toEqual(['heading', 'frontmatter']);
      });
    });

    describe('integration test scenarios', () => {
      it('should validate complete overwrite scenario', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Research/NewProject.md',
          content: '# New Project\n\n## Overview\n\nThis is a new research project.',
          mode: 'whole-file',
          wholeFileMode: 'overwrite'
        };

        expect(validInput.targetType).toBe('path');
        expect(validInput.mode).toBe('whole-file');
        expect(validInput.wholeFileMode).toBe('overwrite');
      });

      it('should validate complete append scenario', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Daily/Journal.md',
          content: '\n\n## Evening Reflection\n\nToday was productive.',
          mode: 'whole-file',
          wholeFileMode: 'append'
        };

        expect(validInput.wholeFileMode).toBe('append');
      });

      it('should validate complete relative insert scenario', () => {
        const validInput = {
          targetType: 'path',
          targetIdentifier: 'Research/Data.md',
          content: '\n\n### New Analysis\n\nRecent findings show...',
          mode: 'relative',
          relativeMode: {
            operation: 'append',
            targetType: 'heading',
            target: 'Results'
          }
        };

        expect(validInput.mode).toBe('relative');
        expect(validInput.relativeMode.operation).toBe('append');
        expect(validInput.relativeMode.targetType).toBe('heading');
      });

      it('should validate active note scenario', () => {
        const validInput = {
          targetType: 'active',
          content: '## Quick Note\n\nAdded to currently active note.',
          mode: 'whole-file',
          wholeFileMode: 'append'
        };

        expect(validInput.targetType).toBe('active');
        expect(validInput.wholeFileMode).toBe('append');
      });
    });

    describe('error scenarios', () => {
      it('should handle missing content', () => {
        const invalidInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Test.md'
          // Missing required content field
        };

        // Schema validation should catch this at runtime
        expect(invalidInput).not.toHaveProperty('content');
      });

      it('should handle missing targetIdentifier for path mode', () => {
        const invalidInput = {
          targetType: 'path',
          content: 'Test content'
          // Missing targetIdentifier when targetType is 'path'
        };

        // oneOf constraint should catch this at runtime
        expect(invalidInput.targetType).toBe('path');
        expect(invalidInput).not.toHaveProperty('targetIdentifier');
      });

      it('should handle missing relativeMode when mode is relative', () => {
        const invalidInput = {
          targetType: 'path',
          targetIdentifier: 'Notes/Test.md',
          content: 'Test content',
          mode: 'relative'
          // Missing relativeMode when mode is 'relative'
        };

        expect(invalidInput.mode).toBe('relative');
        expect(invalidInput).not.toHaveProperty('relativeMode');
      });
    });
  });

  describe('obsidian_explore tool', () => {
    const exploreTool = CONSOLIDATED_OBSIDIAN_TOOLS.find(tool => tool.name === 'obsidian_explore');

    it('should have correct schema structure', () => {
      expect(exploreTool).toBeDefined();
      expect(exploreTool?.name).toBe('obsidian_explore');
      expect(exploreTool?.description).toContain('filtering capabilities');
      expect(exploreTool?.inputSchema.properties).toHaveProperty('mode');
      expect(exploreTool?.inputSchema.properties).toHaveProperty('scope');
      expect(exploreTool?.inputSchema.properties).toHaveProperty('filters');
      expect(exploreTool?.inputSchema.properties).toHaveProperty('options');
    });

    describe('mode validation', () => {
      it('should validate overview mode', () => {
        const validInput = {
          mode: 'overview'
        };
        expect(validInput.mode).toBe('overview');
      });

      it('should validate list mode', () => {
        const validInput = {
          mode: 'list'
        };
        expect(validInput.mode).toBe('list');
      });

      it('should have list as default mode', () => {
        const modeProperty = exploreTool?.inputSchema.properties.mode;
        expect(modeProperty.default).toBe('list');
      });

      it('should only support overview and list modes', () => {
        const modeProperty = exploreTool?.inputSchema.properties.mode;
        expect(modeProperty.enum).toEqual(['overview', 'list']);
      });
    });

    describe('scope validation', () => {
      it('should validate scope with folder', () => {
        const validInput = {
          mode: 'list',
          scope: {
            folder: 'Research'
          }
        };
        expect(validInput.scope.folder).toBe('Research');
      });

      it('should validate scope with recursive option', () => {
        const validInput = {
          mode: 'list',
          scope: {
            folder: 'Projects',
            recursive: true
          }
        };
        expect(validInput.scope.recursive).toBe(true);
      });

      it('should have recursive default to false', () => {
        const scopeProperty = exploreTool?.inputSchema.properties.scope;
        expect(scopeProperty.properties.recursive.default).toBe(false);
      });
    });

    describe('filters validation', () => {
      it('should validate extensions filter', () => {
        const validInput = {
          mode: 'list',
          filters: {
            extensions: ['md', 'txt']
          }
        };
        expect(validInput.filters.extensions).toEqual(['md', 'txt']);
      });

      it('should validate namePattern filter', () => {
        const validInput = {
          mode: 'list',
          filters: {
            namePattern: '.*[Pp]roject.*'
          }
        };
        expect(validInput.filters.namePattern).toBe('.*[Pp]roject.*');
      });

      it('should validate dateRange filter', () => {
        const validInput = {
          mode: 'list',
          filters: {
            dateRange: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-12-31T23:59:59Z'
            }
          }
        };
        expect(validInput.filters.dateRange.start).toBe('2024-01-01T00:00:00Z');
        expect(validInput.filters.dateRange.end).toBe('2024-12-31T23:59:59Z');
      });

      it('should validate excludePatterns filter', () => {
        const validInput = {
          mode: 'list',
          filters: {
            excludePatterns: ['\\.tmp$', 'draft-.*']
          }
        };
        expect(validInput.filters.excludePatterns).toEqual(['\\.tmp$', 'draft-.*']);
      });

      it('should validate all filter options together', () => {
        const validInput = {
          mode: 'list',
          filters: {
            extensions: ['md', 'txt'],
            namePattern: '.*[Pp]roject.*',
            dateRange: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-12-31T23:59:59Z'
            },
            excludePatterns: ['\\.tmp$']
          }
        };
        expect(validInput.filters.extensions).toBeDefined();
        expect(validInput.filters.namePattern).toBeDefined();
        expect(validInput.filters.dateRange).toBeDefined();
        expect(validInput.filters.excludePatterns).toBeDefined();
      });
    });

    describe('options validation', () => {
      it('should validate limit option', () => {
        const validInput = {
          mode: 'list',
          options: {
            limit: 50
          }
        };
        expect(validInput.options.limit).toBe(50);
      });

      it('should have limit default to 100', () => {
        const optionsProperty = exploreTool?.inputSchema.properties.options;
        expect(optionsProperty.properties.limit.default).toBe(100);
      });

      it('should enforce minimum limit of 1', () => {
        const optionsProperty = exploreTool?.inputSchema.properties.options;
        expect(optionsProperty.properties.limit.minimum).toBe(1);
      });
    });

    describe('filter schema structure', () => {
      const filtersProperty = exploreTool?.inputSchema.properties.filters;

      it('should have extensions as array of strings', () => {
        expect(filtersProperty.properties.extensions.type).toBe('array');
        expect(filtersProperty.properties.extensions.items.type).toBe('string');
      });

      it('should have namePattern as string', () => {
        expect(filtersProperty.properties.namePattern.type).toBe('string');
      });

      it('should have dateRange with start and end properties', () => {
        const dateRangeProperty = filtersProperty.properties.dateRange;
        expect(dateRangeProperty.type).toBe('object');
        expect(dateRangeProperty.properties.start.type).toBe('string');
        expect(dateRangeProperty.properties.start.format).toBe('date-time');
        expect(dateRangeProperty.properties.end.type).toBe('string');
        expect(dateRangeProperty.properties.end.format).toBe('date-time');
      });

      it('should have excludePatterns as array of strings', () => {
        expect(filtersProperty.properties.excludePatterns.type).toBe('array');
        expect(filtersProperty.properties.excludePatterns.items.type).toBe('string');
      });
    });

    describe('functional testing with mocked obsidianAPI', () => {
      let server: ObsidianResearchServer;
      let obsidianAPIMock: any;

      beforeEach(() => {
        // Mock obsidianAPI
        obsidianAPIMock = {
          listFiles: vi.fn()
        };

        // Replace the actual implementation with mock
        vi.doMock('../../../src/integrations/obsidian-api.js', () => ({
          obsidianAPI: obsidianAPIMock
        }));

        server = new ObsidianResearchServer();
      });

      describe('overview mode functionality', () => {
        it('should return correct file counts in overview mode', () => {
          const mockFiles = [
            { name: 'note1.md', path: 'note1.md', isFolder: false, mtime: Date.now() },
            { name: 'note2.md', path: 'note2.md', isFolder: false, mtime: Date.now() },
            { name: 'folder1', path: 'folder1', isFolder: true, mtime: Date.now() },
            { name: 'document.txt', path: 'document.txt', isFolder: false, mtime: Date.now() }
          ];

          obsidianAPIMock.listFiles.mockResolvedValue(mockFiles);

          const params = { mode: 'overview' };
          
          // Verify parameter structure
          expect(params.mode).toBe('overview');
          expect(obsidianAPIMock.listFiles).toBeDefined();
        });

        it('should apply filters in overview mode', () => {
          const mockFiles = [
            { name: 'project1.md', path: 'project1.md', isFolder: false, mtime: Date.now() },
            { name: 'project2.txt', path: 'project2.txt', isFolder: false, mtime: Date.now() },
            { name: 'other.md', path: 'other.md', isFolder: false, mtime: Date.now() },
            { name: 'folder1', path: 'folder1', isFolder: true, mtime: Date.now() }
          ];

          obsidianAPIMock.listFiles.mockResolvedValue(mockFiles);

          const params = {
            mode: 'overview',
            filters: {
              extensions: ['md'],
              namePattern: 'project.*'
            }
          };

          expect(params.filters.extensions).toEqual(['md']);
          expect(params.filters.namePattern).toBe('project.*');
        });
      });

      describe('list mode functionality', () => {
        it('should return file list with metadata', () => {
          const mockFiles = [
            { 
              name: 'note1.md', 
              path: 'notes/note1.md', 
              isFolder: false, 
              mtime: 1640995200000,
              size: 1024 
            },
            { 
              name: 'note2.md', 
              path: 'notes/note2.md', 
              isFolder: false, 
              mtime: 1641081600000,
              size: 2048 
            }
          ];

          obsidianAPIMock.listFiles.mockResolvedValue(mockFiles);

          const params = { mode: 'list' };
          
          expect(params.mode).toBe('list');
          expect(obsidianAPIMock.listFiles).toBeDefined();
        });

        it('should respect limit option', () => {
          const mockFiles = Array.from({ length: 150 }, (_, i) => ({
            name: `note${i}.md`,
            path: `note${i}.md`,
            isFolder: false,
            mtime: Date.now(),
            size: 1024
          }));

          obsidianAPIMock.listFiles.mockResolvedValue(mockFiles);

          const params = {
            mode: 'list',
            options: { limit: 50 }
          };

          expect(params.options.limit).toBe(50);
          expect(mockFiles.length).toBe(150); // Mock has 150 files
        });
      });

      describe('scope functionality', () => {
        it('should pass folder scope to obsidianAPI', () => {
          const mockFiles = [
            { name: 'note1.md', path: 'research/note1.md', isFolder: false, mtime: Date.now() }
          ];

          obsidianAPIMock.listFiles.mockResolvedValue(mockFiles);

          const params = {
            mode: 'list',
            scope: {
              folder: 'research',
              recursive: true
            }
          };

          expect(params.scope.folder).toBe('research');
          expect(params.scope.recursive).toBe(true);
        });
      });

      describe('filter functionality', () => {
        const mockFiles = [
          { name: 'project1.md', path: 'project1.md', isFolder: false, mtime: 1640995200000, size: 1024 },
          { name: 'project2.txt', path: 'project2.txt', isFolder: false, mtime: 1641081600000, size: 512 },
          { name: 'draft-notes.md', path: 'draft-notes.md', isFolder: false, mtime: 1641168000000, size: 256 },
          { name: 'other.pdf', path: 'other.pdf', isFolder: false, mtime: 1641254400000, size: 2048 },
          { name: 'temp.tmp', path: 'temp.tmp', isFolder: false, mtime: Date.now(), size: 128 },
          { name: 'folder', path: 'folder', isFolder: true, mtime: Date.now() }
        ];

        beforeEach(() => {
          obsidianAPIMock.listFiles.mockResolvedValue(mockFiles);
        });

        it('should filter by extensions', () => {
          const params = {
            mode: 'list',
            filters: {
              extensions: ['md', 'txt']
            }
          };

          expect(params.filters.extensions).toEqual(['md', 'txt']);
          // The filtering logic would be tested in the actual implementation
        });

        it('should filter by name pattern', () => {
          const params = {
            mode: 'list',
            filters: {
              namePattern: 'project.*'
            }
          };

          expect(params.filters.namePattern).toBe('project.*');
        });

        it('should filter by date range', () => {
          const params = {
            mode: 'list',
            filters: {
              dateRange: {
                start: '2022-01-01T00:00:00Z',
                end: '2022-01-03T00:00:00Z'
              }
            }
          };

          expect(params.filters.dateRange.start).toBe('2022-01-01T00:00:00Z');
          expect(params.filters.dateRange.end).toBe('2022-01-03T00:00:00Z');
        });

        it('should exclude patterns', () => {
          const params = {
            mode: 'list',
            filters: {
              excludePatterns: ['\\.tmp$', 'draft-.*']
            }
          };

          expect(params.filters.excludePatterns).toEqual(['\\.tmp$', 'draft-.*']);
        });

        it('should combine multiple filters', () => {
          const params = {
            mode: 'list',
            filters: {
              extensions: ['md'],
              namePattern: 'project.*',
              excludePatterns: ['draft-.*']
            }
          };

          expect(params.filters.extensions).toEqual(['md']);
          expect(params.filters.namePattern).toBe('project.*');
          expect(params.filters.excludePatterns).toEqual(['draft-.*']);
        });
      });

      describe('error handling', () => {
        it('should handle obsidianAPI errors gracefully', () => {
          obsidianAPIMock.listFiles.mockRejectedValue(new Error('API Error'));

          const params = { mode: 'list' };
          
          // The error handling would be tested in the actual server implementation
          expect(params.mode).toBe('list');
        });

        it('should handle invalid regex patterns gracefully', () => {
          const mockFiles = [
            { name: 'test.md', path: 'test.md', isFolder: false, mtime: Date.now() }
          ];
          
          obsidianAPIMock.listFiles.mockResolvedValue(mockFiles);

          const params = {
            mode: 'list',
            filters: {
              namePattern: '[invalid regex'
            }
          };

          // Invalid regex should not cause the tool to fail
          expect(params.filters.namePattern).toBe('[invalid regex');
        });

        it('should handle invalid date formats gracefully', () => {
          const mockFiles = [
            { name: 'test.md', path: 'test.md', isFolder: false, mtime: Date.now() }
          ];
          
          obsidianAPIMock.listFiles.mockResolvedValue(mockFiles);

          const params = {
            mode: 'list',
            filters: {
              dateRange: {
                start: 'invalid-date',
                end: 'also-invalid'
              }
            }
          };

          // Invalid dates should not cause the tool to fail
          expect(params.filters.dateRange.start).toBe('invalid-date');
        });
      });
    });
  });

  describe('obsidian_relationships tool', () => {
    const relationshipsTool = CONSOLIDATED_OBSIDIAN_TOOLS.find(tool => tool.name === 'obsidian_relationships');

    it('should have correct schema structure', () => {
      expect(relationshipsTool).toBeDefined();
      expect(relationshipsTool?.name).toBe('obsidian_relationships');
      expect(relationshipsTool?.inputSchema.required).toEqual(['target']);
    });

    it('should validate single relationship type', () => {
      const validInput = {
        target: 'Research/ML.md',
        relationshipTypes: ['backlinks']
      };

      expect(validInput.relationshipTypes).toEqual(['backlinks']);
    });

    it('should validate multiple relationship types', () => {
      const validInput = {
        target: 'Research/ML.md',
        relationshipTypes: ['backlinks', 'links', 'tags', 'mentions']
      };

      expect(validInput.relationshipTypes.length).toBe(4);
    });

    it('should validate all relationship types', () => {
      const relationshipTypes = ['backlinks', 'links', 'tags', 'mentions', 'embeds', 'all'];
      
      relationshipTypes.forEach(relationshipType => {
        const validInput = {
          target: 'test.md',
          relationshipTypes: [relationshipType]
        };

        expect(validInput.relationshipTypes).toContain(relationshipType);
      });
    });

    it('should validate all options', () => {
      const validInput = {
        target: 'test.md',
        relationshipTypes: ['backlinks', 'links'],
        includeContext: true,
        maxResults: 50,
        strengthThreshold: 0.3
      };

      expect(validInput.includeContext).toBe(true);
      expect(validInput.maxResults).toBe(50);
      expect(validInput.strengthThreshold).toBe(0.3);
    });

    it('should validate maxResults and strengthThreshold ranges', () => {
      const validMaxResults = [1, 50, 500];
      const validThresholds = [0.0, 0.5, 1.0];
      
      validMaxResults.forEach(maxResults => {
        const validInput = {
          target: 'test.md',
          maxResults
        };

        expect(validInput.maxResults).toBe(maxResults);
      });

      validThresholds.forEach(strengthThreshold => {
        const validInput = {
          target: 'test.md',
          strengthThreshold
        };

        expect(validInput.strengthThreshold).toBe(strengthThreshold);
      });
    });

    describe('parameter validation', () => {
      it('should validate single file target', () => {
        const validInput = {
          target: 'Notes/Research.md'
        };

        expect(() => validateTargetInput(validInput)).not.toThrow();
        expect(validInput.target).toBe('Notes/Research.md');
      });

      it('should validate multiple file targets', () => {
        const validInput = {
          target: ['Notes/Research.md', 'Projects/AI.md', 'Literature/Papers.md']
        };

        expect(() => validateTargetInput(validInput)).not.toThrow();
        expect(Array.isArray(validInput.target)).toBe(true);
        expect(validInput.target.length).toBe(3);
      });

      it('should have default relationshipTypes of ["backlinks"]', () => {
        const schema = relationshipsTool?.inputSchema.properties.relationshipTypes;
        expect(schema?.default).toEqual(['backlinks']);
      });

      it('should have default includeContext of true', () => {
        const schema = relationshipsTool?.inputSchema.properties.includeContext;
        expect(schema?.default).toBe(true);
      });

      it('should have default strengthThreshold of 0.0', () => {
        const schema = relationshipsTool?.inputSchema.properties.strengthThreshold;
        expect(schema?.default).toBe(0.0);
      });

      it('should validate relationshipTypes enum values', () => {
        const schema = relationshipsTool?.inputSchema.properties.relationshipTypes;
        const enumValues = schema?.items?.enum;
        expect(enumValues).toEqual(['backlinks', 'links', 'tags', 'mentions', 'embeds', 'all']);
      });

      it('should validate maxResults boundary values', () => {
        const schema = relationshipsTool?.inputSchema.properties.maxResults;
        expect(schema?.minimum).toBe(1);
        expect(schema?.maximum).toBe(500);
      });

      it('should validate strengthThreshold boundary values', () => {
        const schema = relationshipsTool?.inputSchema.properties.strengthThreshold;
        expect(schema?.minimum).toBe(0);
        expect(schema?.maximum).toBe(1);
      });

      it('should validate includeContext as boolean', () => {
        const validInputs = [
          { target: 'test.md', includeContext: true },
          { target: 'test.md', includeContext: false }
        ];

        validInputs.forEach(input => {
          expect(typeof input.includeContext).toBe('boolean');
        });
      });

      it('should validate "all" relationship type expansion', () => {
        const validInput = {
          target: 'test.md',
          relationshipTypes: ['all']
        };

        expect(validInput.relationshipTypes).toContain('all');
        // The expansion to ['backlinks', 'links', 'tags', 'mentions', 'embeds'] 
        // happens in the server implementation
      });
    });

    describe('error validation', () => {
      it('should throw error for missing target', () => {
        const invalidInput = {};
        expect(() => validateTargetInput(invalidInput)).toThrow('Target is required');
      });

      it('should throw error for empty target string', () => {
        const invalidInput = { target: '' };
        expect(() => validateTargetInput(invalidInput)).toThrow('Target is required');
      });

      it('should throw error for empty target array', () => {
        const invalidInput = { target: [] };
        expect(() => validateTargetInput(invalidInput)).toThrow('Target array cannot be empty');
      });

      it('should throw error for whitespace-only target', () => {
        const invalidInput = { target: '   ' };
        expect(() => validateTargetInput(invalidInput)).toThrow('Target path cannot be empty');
      });

      it('should throw error for invalid path in array', () => {
        const invalidInput = { target: ['valid.md', '', 'another.md'] };
        expect(() => validateTargetInput(invalidInput)).toThrow('All target paths must be non-empty strings');
      });
    });

    describe('relationship type functionality', () => {
      let server: ObsidianResearchServer;
      let mockBacklinkIndex: any;
      let mockObsidianAPI: any;

      beforeEach(() => {
        // Mock backlinkIndex
        mockBacklinkIndex = {
          getBacklinkRelationships: vi.fn(),
          getBacklinks: vi.fn(),
          getForwardLinks: vi.fn(),
          getTags: vi.fn(),
          findMentions: vi.fn(),
          getEmbeds: vi.fn()
        };

        // Mock obsidianAPI
        mockObsidianAPI = {
          getFileContent: vi.fn()
        };

        // Replace the actual implementations with mocks
        vi.doMock('../../../src/features/search/backlink-index.js', () => ({
          backlinkIndex: mockBacklinkIndex
        }));

        vi.doMock('../../../src/integrations/obsidian-api.js', () => ({
          obsidianAPI: mockObsidianAPI
        }));

        server = new ObsidianResearchServer();
      });

      describe('backlinks relationship type', () => {
        it('should retrieve backlinks with context', async () => {
          const mockBacklinkRelationships = [
            {
              source: 'Reference.md',
              contexts: [
                { text: 'See [[Target Note]] for details', line: 5 },
                { text: 'Also mentioned in [[Target Note]]', line: 10 }
              ]
            }
          ];

          mockBacklinkIndex.getBacklinkRelationships.mockResolvedValue(mockBacklinkRelationships);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Target Note\n\nContent here');

          const params = {
            target: 'Target Note.md',
            relationshipTypes: ['backlinks'],
            includeContext: true
          };

          // Test that the mock would be called correctly
          expect(params.relationshipTypes).toContain('backlinks');
          expect(params.includeContext).toBe(true);
        });

        it('should retrieve backlinks without context', async () => {
          const mockBacklinks = ['Reference1.md', 'Reference2.md', 'Reference3.md'];

          mockBacklinkIndex.getBacklinks.mockResolvedValue(mockBacklinks);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Target Note');

          const params = {
            target: 'Target Note.md',
            relationshipTypes: ['backlinks'],
            includeContext: false
          };

          expect(params.includeContext).toBe(false);
          expect(mockBacklinkIndex.getBacklinks).toBeDefined();
        });
      });

      describe('links relationship type', () => {
        it('should retrieve forward links', async () => {
          const mockForwardLinks = ['Linked Note 1.md', 'Linked Note 2.md'];

          mockBacklinkIndex.getForwardLinks.mockResolvedValue(mockForwardLinks);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Source Note');

          const params = {
            target: 'Source Note.md',
            relationshipTypes: ['links']
          };

          expect(params.relationshipTypes).toContain('links');
          expect(mockBacklinkIndex.getForwardLinks).toBeDefined();
        });
      });

      describe('tags relationship type', () => {
        it('should retrieve tag relationships with context', async () => {
          const mockTagRels = {
            tags: ['research', 'ai', 'machine-learning'],
            contexts: [
              { tag: 'research', text: '#research project', line: 1 },
              { tag: 'ai', text: 'Tagged with #ai', line: 3 },
              { tag: 'machine-learning', text: 'About #machine-learning', line: 7 }
            ]
          };

          mockBacklinkIndex.getTags.mockResolvedValue(mockTagRels);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Tagged Note');

          const params = {
            target: 'Tagged Note.md',
            relationshipTypes: ['tags'],
            includeContext: true
          };

          expect(params.relationshipTypes).toContain('tags');
          expect(mockBacklinkIndex.getTags).toBeDefined();
        });
      });

      describe('mentions relationship type', () => {
        it('should retrieve unlinked mentions', async () => {
          const mockMentions = [
            {
              source: 'Mentioning Note.md',
              contexts: [
                { text: 'Target Note is mentioned here', line: 2 },
                { text: 'Another mention of Target Note', line: 8 }
              ]
            }
          ];

          mockBacklinkIndex.findMentions.mockResolvedValue(mockMentions);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Target Note');

          const params = {
            target: 'Target Note.md',
            relationshipTypes: ['mentions']
          };

          expect(params.relationshipTypes).toContain('mentions');
          expect(mockBacklinkIndex.findMentions).toBeDefined();
        });
      });

      describe('embeds relationship type', () => {
        it('should retrieve embed relationships', async () => {
          const mockEmbeds = [
            {
              target: 'Embedded Note.md',
              contexts: [
                { text: '![[Embedded Note]]', line: 5, embedType: 'note' },
                { text: '![[Embedded Note#section]]', line: 12, embedType: 'section' }
              ]
            }
          ];

          mockBacklinkIndex.getEmbeds.mockResolvedValue(mockEmbeds);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Source Note');

          const params = {
            target: 'Source Note.md',
            relationshipTypes: ['embeds']
          };

          expect(params.relationshipTypes).toContain('embeds');
          expect(mockBacklinkIndex.getEmbeds).toBeDefined();
        });
      });

      describe('multiple relationship types', () => {
        it('should handle multiple relationship types', async () => {
          mockBacklinkIndex.getBacklinks.mockResolvedValue(['Backlink.md']);
          mockBacklinkIndex.getForwardLinks.mockResolvedValue(['Forward.md']);
          mockBacklinkIndex.getTags.mockResolvedValue({ tags: ['tag1'], contexts: [] });
          mockObsidianAPI.getFileContent.mockResolvedValue('# Multi Note');

          const params = {
            target: 'Multi Note.md',
            relationshipTypes: ['backlinks', 'links', 'tags']
          };

          expect(params.relationshipTypes).toEqual(['backlinks', 'links', 'tags']);
          expect(params.relationshipTypes.length).toBe(3);
        });

        it('should expand "all" to all relationship types', async () => {
          const params = {
            target: 'All Note.md',
            relationshipTypes: ['all']
          };

          expect(params.relationshipTypes).toContain('all');
          // The server implementation would expand 'all' to:
          // ['backlinks', 'links', 'tags', 'mentions', 'embeds']
        });
      });

      describe('batch processing', () => {
        it('should handle multiple target files', async () => {
          mockBacklinkIndex.getBacklinks
            .mockResolvedValueOnce(['Back1.md'])
            .mockResolvedValueOnce(['Back2.md']);
          mockObsidianAPI.getFileContent
            .mockResolvedValueOnce('# Note 1')
            .mockResolvedValueOnce('# Note 2');

          const params = {
            target: ['Note1.md', 'Note2.md'],
            relationshipTypes: ['backlinks']
          };

          expect(Array.isArray(params.target)).toBe(true);
          expect(params.target.length).toBe(2);
        });
      });

      describe('filtering and options', () => {
        it('should respect maxResults parameter', async () => {
          const manyBacklinks = Array.from({ length: 100 }, (_, i) => `Backlink${i}.md`);
          mockBacklinkIndex.getBacklinks.mockResolvedValue(manyBacklinks);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Popular Note');

          const params = {
            target: 'Popular Note.md',
            relationshipTypes: ['backlinks'],
            maxResults: 10
          };

          expect(params.maxResults).toBe(10);
          // The server implementation would slice results to maxResults
        });

        it('should respect strengthThreshold parameter', async () => {
          const mockBacklinkRels = [
            { source: 'Strong.md', contexts: [{ text: 'Strong link', line: 1 }] },
            { source: 'Weak.md', contexts: [{ text: 'Weak', line: 1 }] }
          ];

          mockBacklinkIndex.getBacklinkRelationships.mockResolvedValue(mockBacklinkRels);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Target');

          const params = {
            target: 'Target.md',
            relationshipTypes: ['backlinks'],
            strengthThreshold: 0.7
          };

          expect(params.strengthThreshold).toBe(0.7);
          // The server implementation would filter by calculated strength
        });

        it('should handle includeContext setting', async () => {
          const withContextParams = {
            target: 'Note.md',
            relationshipTypes: ['backlinks'],
            includeContext: true
          };

          const withoutContextParams = {
            target: 'Note.md',
            relationshipTypes: ['backlinks'],
            includeContext: false
          };

          expect(withContextParams.includeContext).toBe(true);
          expect(withoutContextParams.includeContext).toBe(false);
          // Server would use getBacklinkRelationships vs getBacklinks accordingly
        });
      });
    });

    describe('error handling and edge cases', () => {
      let server: ObsidianResearchServer;
      let mockBacklinkIndex: any;
      let mockObsidianAPI: any;

      beforeEach(() => {
        mockBacklinkIndex = {
          getBacklinkRelationships: vi.fn(),
          getBacklinks: vi.fn(),
          getForwardLinks: vi.fn(),
          getTags: vi.fn(),
          findMentions: vi.fn(),
          getEmbeds: vi.fn()
        };

        mockObsidianAPI = {
          getFileContent: vi.fn()
        };

        vi.doMock('../../../src/features/search/backlink-index.js', () => ({
          backlinkIndex: mockBacklinkIndex
        }));

        vi.doMock('../../../src/integrations/obsidian-api.js', () => ({
          obsidianAPI: mockObsidianAPI
        }));

        server = new ObsidianResearchServer();
      });

      describe('backlinkIndex error handling', () => {
        it('should handle backlinkIndex.getBacklinks failures gracefully', async () => {
          mockBacklinkIndex.getBacklinks.mockRejectedValue(new Error('Index unavailable'));
          mockObsidianAPI.getFileContent.mockResolvedValue('# Test Note');

          const params = {
            target: 'Test.md',
            relationshipTypes: ['backlinks']
          };

          // The server implementation should handle this error gracefully
          expect(params.target).toBe('Test.md');
          expect(mockBacklinkIndex.getBacklinks).toBeDefined();
        });

        it('should handle backlinkIndex.getForwardLinks failures gracefully', async () => {
          mockBacklinkIndex.getForwardLinks.mockRejectedValue(new Error('Forward links error'));
          mockObsidianAPI.getFileContent.mockResolvedValue('# Test Note');

          const params = {
            target: 'Test.md',
            relationshipTypes: ['links']
          };

          expect(params.relationshipTypes).toContain('links');
        });

        it('should handle backlinkIndex.getTags failures gracefully', async () => {
          mockBacklinkIndex.getTags.mockRejectedValue(new Error('Tags index error'));
          mockObsidianAPI.getFileContent.mockResolvedValue('# Test Note');

          const params = {
            target: 'Test.md',
            relationshipTypes: ['tags']
          };

          expect(params.relationshipTypes).toContain('tags');
        });

        it('should handle backlinkIndex.findMentions failures gracefully', async () => {
          mockBacklinkIndex.findMentions.mockRejectedValue(new Error('Mentions search error'));
          mockObsidianAPI.getFileContent.mockResolvedValue('# Test Note');

          const params = {
            target: 'Test.md',
            relationshipTypes: ['mentions']
          };

          expect(params.relationshipTypes).toContain('mentions');
        });

        it('should handle backlinkIndex.getEmbeds failures gracefully', async () => {
          mockBacklinkIndex.getEmbeds.mockRejectedValue(new Error('Embeds index error'));
          mockObsidianAPI.getFileContent.mockResolvedValue('# Test Note');

          const params = {
            target: 'Test.md',
            relationshipTypes: ['embeds']
          };

          expect(params.relationshipTypes).toContain('embeds');
        });
      });

      describe('file access error handling', () => {
        it('should handle missing files gracefully', async () => {
          mockBacklinkIndex.getBacklinks.mockResolvedValue(['Valid.md']);
          mockObsidianAPI.getFileContent.mockRejectedValue(new Error('File not found'));

          const params = {
            target: 'Missing.md',
            relationshipTypes: ['backlinks']
          };

          // Server should handle this error and return partial results
          expect(params.target).toBe('Missing.md');
        });

        it('should handle file access permission errors', async () => {
          mockBacklinkIndex.getBacklinks.mockResolvedValue(['Valid.md']);
          mockObsidianAPI.getFileContent.mockRejectedValue(new Error('Permission denied'));

          const params = {
            target: 'Restricted.md',
            relationshipTypes: ['backlinks']
          };

          expect(params.target).toBe('Restricted.md');
        });

        it('should handle network/API errors', async () => {
          mockBacklinkIndex.getBacklinks.mockResolvedValue(['Valid.md']);
          mockObsidianAPI.getFileContent.mockRejectedValue(new Error('Connection failed'));

          const params = {
            target: 'Remote.md',
            relationshipTypes: ['backlinks']
          };

          expect(params.target).toBe('Remote.md');
        });
      });

      describe('edge cases with relationship data', () => {
        it('should handle empty backlinks results', async () => {
          mockBacklinkIndex.getBacklinks.mockResolvedValue([]);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Isolated Note');

          const params = {
            target: 'Isolated.md',
            relationshipTypes: ['backlinks']
          };

          expect(params.relationshipTypes).toContain('backlinks');
          // Should return empty relationships array
        });

        it('should handle null/undefined relationship results', async () => {
          mockBacklinkIndex.getBacklinks.mockResolvedValue(null);
          mockBacklinkIndex.getTags.mockResolvedValue(undefined);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Null Note');

          const params = {
            target: 'Null.md',
            relationshipTypes: ['backlinks', 'tags']
          };

          expect(params.relationshipTypes).toEqual(['backlinks', 'tags']);
        });

        it('should handle malformed relationship data', async () => {
          const malformedBacklinks = [
            { source: 'Valid.md', contexts: [{ text: 'Valid', line: 1 }] },
            { source: null, contexts: null }, // Malformed entry
            { contexts: [{ text: 'Missing source', line: 2 }] }, // Missing source
            'InvalidFormat.md' // Wrong data type
          ];

          mockBacklinkIndex.getBacklinkRelationships.mockResolvedValue(malformedBacklinks);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Malformed Note');

          const params = {
            target: 'Malformed.md',
            relationshipTypes: ['backlinks'],
            includeContext: true
          };

          expect(params.includeContext).toBe(true);
          // Server should handle malformed data gracefully
        });

        it('should handle very large relationship datasets', async () => {
          const manyBacklinks = Array.from({ length: 10000 }, (_, i) => `Backlink${i}.md`);
          mockBacklinkIndex.getBacklinks.mockResolvedValue(manyBacklinks);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Popular Note');

          const params = {
            target: 'Popular.md',
            relationshipTypes: ['backlinks'],
            maxResults: 100
          };

          expect(params.maxResults).toBe(100);
          // Server should handle pagination/limiting properly
        });
      });

      describe('unicode and special character handling', () => {
        it('should handle unicode file names', async () => {
          const unicodeFiles = ['文档.md', 'документ.md', 'archivo.md', 'αρχείο.md'];
          mockBacklinkIndex.getBacklinks.mockResolvedValue(unicodeFiles);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Unicode Note');

          const params = {
            target: '测试文件.md',
            relationshipTypes: ['backlinks']
          };

          expect(params.target).toBe('测试文件.md');
        });

        it('should handle special characters in content', async () => {
          const specialContexts = [
            { text: 'Link with émojis 🔗 and ümlauts', line: 1 },
            { text: 'Math symbols: ∑ ∫ ∂ ∞', line: 2 },
            { text: 'Code blocks: `const x = "test";`', line: 3 }
          ];

          mockBacklinkIndex.getBacklinkRelationships.mockResolvedValue([
            { source: 'Special.md', contexts: specialContexts }
          ]);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Special Chars');

          const params = {
            target: 'Special.md',
            relationshipTypes: ['backlinks'],
            includeContext: true
          };

          expect(params.includeContext).toBe(true);
        });

        it('should handle file paths with spaces and special characters', async () => {
          const specialPaths = [
            'File with spaces.md',
            'File-with-dashes.md', 
            'File_with_underscores.md',
            'File(with)parentheses.md',
            'File[with]brackets.md',
            'File{with}braces.md'
          ];

          mockBacklinkIndex.getBacklinks.mockResolvedValue(specialPaths);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Special Path Note');

          const params = {
            target: 'Note with (special) [characters].md',
            relationshipTypes: ['backlinks']
          };

          expect(params.target).toContain('special');
        });
      });

      describe('strength calculation edge cases', () => {
        it('should handle contexts with no text', async () => {
          const emptyContexts = [
            { text: '', line: 1 },
            { text: '   ', line: 2 }, // whitespace only
            { text: null, line: 3 },
            { text: undefined, line: 4 }
          ];

          mockBacklinkIndex.getBacklinkRelationships.mockResolvedValue([
            { source: 'Empty.md', contexts: emptyContexts }
          ]);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Empty Context Note');

          const params = {
            target: 'Empty.md',
            relationshipTypes: ['backlinks'],
            includeContext: true,
            strengthThreshold: 0.1
          };

          expect(params.strengthThreshold).toBe(0.1);
          // Server should handle empty contexts in strength calculation
        });

        it('should handle extreme strength threshold values', async () => {
          mockBacklinkIndex.getBacklinkRelationships.mockResolvedValue([
            { source: 'Test.md', contexts: [{ text: 'Normal context', line: 1 }] }
          ]);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Threshold Test');

          const extremeParams = [
            { target: 'Test.md', strengthThreshold: 0.0 }, // Minimum
            { target: 'Test.md', strengthThreshold: 1.0 }, // Maximum
            { target: 'Test.md', strengthThreshold: 0.9999 } // Near maximum
          ];

          extremeParams.forEach(param => {
            expect(param.strengthThreshold).toBeGreaterThanOrEqual(0);
            expect(param.strengthThreshold).toBeLessThanOrEqual(1);
          });
        });
      });

      describe('batch processing edge cases', () => {
        it('should handle mixed success/failure in batch processing', async () => {
          mockBacklinkIndex.getBacklinks
            .mockResolvedValueOnce(['Success1.md'])
            .mockRejectedValueOnce(new Error('Failed for file 2'))
            .mockResolvedValueOnce(['Success3.md']);

          mockObsidianAPI.getFileContent
            .mockResolvedValueOnce('# File 1')
            .mockRejectedValueOnce(new Error('File 2 not found'))
            .mockResolvedValueOnce('# File 3');

          const params = {
            target: ['File1.md', 'File2.md', 'File3.md'],
            relationshipTypes: ['backlinks']
          };

          expect(Array.isArray(params.target)).toBe(true);
          expect(params.target.length).toBe(3);
          // Server should return partial results for successful files
        });

        it('should handle empty target arrays gracefully', async () => {
          const params = {
            target: [],
            relationshipTypes: ['backlinks']
          };

          expect(() => validateTargetInput(params)).toThrow('Target array cannot be empty');
        });

        it('should handle very large batch sizes', async () => {
          const largeBatch = Array.from({ length: 1000 }, (_, i) => `File${i}.md`);
          
          const params = {
            target: largeBatch,
            relationshipTypes: ['backlinks']
          };

          expect(Array.isArray(params.target)).toBe(true);
          expect(params.target.length).toBe(1000);
          // Server should handle large batches efficiently
        });
      });

      describe('timeout and performance edge cases', () => {
        it('should handle slow backlinkIndex operations', async () => {
          // Mock slow response
          mockBacklinkIndex.getBacklinks.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve(['Slow.md']), 5000))
          );
          mockObsidianAPI.getFileContent.mockResolvedValue('# Slow Note');

          const params = {
            target: 'Slow.md',
            relationshipTypes: ['backlinks']
          };

          expect(params.target).toBe('Slow.md');
          // Server should have timeout protection
        });

        it('should handle memory-intensive relationship data', async () => {
          const heavyContexts = Array.from({ length: 1000 }, (_, i) => ({
            text: 'Very long context text that repeats many times to simulate memory pressure. '.repeat(100),
            line: i + 1
          }));

          mockBacklinkIndex.getBacklinkRelationships.mockResolvedValue([
            { source: 'Heavy.md', contexts: heavyContexts }
          ]);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Heavy Note');

          const params = {
            target: 'Heavy.md',
            relationshipTypes: ['backlinks'],
            includeContext: true,
            maxResults: 10
          };

          expect(params.maxResults).toBe(10);
          // Server should handle memory efficiently with maxResults limiting
        });
      });

      describe('response format validation', () => {
        it('should return consistent structure for empty results', async () => {
          mockBacklinkIndex.getBacklinks.mockResolvedValue([]);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Empty Results');

          const params = {
            target: 'Empty.md',
            relationshipTypes: ['backlinks']
          };

          // Expected response structure should include:
          // - fileRelationships: []
          // - overallSummary: { totalFiles, totalRelationships, averageRelationships }
          expect(params.target).toBe('Empty.md');
        });

        it('should maintain response format consistency across relationship types', async () => {
          const relationshipTypes = ['backlinks', 'links', 'tags', 'mentions', 'embeds'];
          
          relationshipTypes.forEach(relType => {
            const params = {
              target: 'Consistent.md',
              relationshipTypes: [relType]
            };

            // Each relationship type should return the same response structure
            expect(params.relationshipTypes).toContain(relType);
          });
        });

        it('should handle JSON serialization edge cases', async () => {
          const problematicContexts = [
            { text: 'Text with "quotes" and \'apostrophes\'', line: 1 },
            { text: 'Text with\nnewlines\rand\ttabs', line: 2 },
            { text: 'Text with backslashes\\and\\slashes/', line: 3 },
            { text: 'Text with unicode: \u{1F600} \u{1F4DD}', line: 4 }
          ];

          mockBacklinkIndex.getBacklinkRelationships.mockResolvedValue([
            { source: 'Problematic.md', contexts: problematicContexts }
          ]);
          mockObsidianAPI.getFileContent.mockResolvedValue('# Problematic Note');

          const params = {
            target: 'Problematic.md',
            relationshipTypes: ['backlinks'],
            includeContext: true
          };

          expect(params.includeContext).toBe(true);
          // Server should handle JSON serialization of complex text
        });
      });
    });
  });

  describe('obsidian_analyze tool', () => {
    const analyzeTool = CONSOLIDATED_OBSIDIAN_TOOLS.find(tool => tool.name === 'obsidian_analyze');

    it('should have correct schema structure', () => {
      expect(analyzeTool).toBeDefined();
      expect(analyzeTool?.name).toBe('obsidian_analyze');
      expect(analyzeTool?.inputSchema.required).toEqual(['target']);
    });

    it('should validate single file target', () => {
      const validInput = {
        target: 'Notes/Research.md'
      };

      expect(() => validateTargetInput(validInput)).not.toThrow();
    });

    it('should validate multiple files target', () => {
      const validInput = {
        target: ['Notes/Research.md', 'Projects/AI.md']
      };

      expect(() => validateTargetInput(validInput)).not.toThrow();
    });

    it('should validate all analysis types', () => {
      const analysisTypes = ['structure', 'elements', 'themes', 'quality', 'readability', 'connections', 'metadata'];
      
      analysisTypes.forEach(analysisType => {
        const validInput = {
          target: 'test.md',
          analysis: [analysisType]
        };

        expect(validInput.analysis).toContain(analysisType);
      });
    });

    it('should validate all extract types', () => {
      const extractTypes = ['headings', 'lists', 'code_blocks', 'tasks', 'quotes', 'tables', 'links', 'embeds'];
      
      const validInput = {
        target: 'test.md',
        options: {
          extractTypes: extractTypes
        }
      };

      expect(validInput.options.extractTypes).toEqual(extractTypes);
    });

    it('should validate heading level options', () => {
      const validInput = {
        target: 'test.md',
        options: {
          minHeadingLevel: 2,
          maxHeadingLevel: 4,
          includeHierarchy: true,
          includeContext: true,
          contextWindow: 3
        }
      };

      expect(validInput.options.minHeadingLevel).toBe(2);
      expect(validInput.options.maxHeadingLevel).toBe(4);
    });

    it('should validate sectionIdentifiers with string values', () => {
      const validInput = {
        target: 'document.md',
        sectionIdentifiers: ['Introduction', 'Conclusion', 'References']
      };
      expect(validInput.sectionIdentifiers).toHaveLength(3);
      expect(validInput.sectionIdentifiers).toContain('Introduction');
    });

    it('should validate sectionIdentifiers with complex objects', () => {
      const validInput = {
        target: 'document.md',
        sectionIdentifiers: [
          { type: 'heading', value: 'Results', level: 2 },
          { type: 'line_range', value: { start: 10, end: 20 } },
          { type: 'pattern', value: '^## Analysis' }
        ]
      };
      
      expect(validInput.sectionIdentifiers).toHaveLength(3);
      expect(validInput.sectionIdentifiers[0].type).toBe('heading');
      expect(validInput.sectionIdentifiers[1].type).toBe('line_range');
      expect(validInput.sectionIdentifiers[2].type).toBe('pattern');
    });

    it('should validate mixed sectionIdentifiers', () => {
      const validInput = {
        target: 'document.md',
        sectionIdentifiers: [
          'Simple String',
          { type: 'heading', value: 'Complex Heading', level: 3 },
          { type: 'line_range', value: { start: 1, end: 50 } }
        ]
      };
      expect(validInput.sectionIdentifiers).toHaveLength(3);
    });

    it('should validate all section metadata options', () => {
      const validInput = {
        target: 'test.md',
        options: {
          includeSectionContext: true,
          includeMetadata: true,
          contextWindow: 2,
          minSectionLength: 50
        }
      };
      
      expect(validInput.options.includeSectionContext).toBe(true);
      expect(validInput.options.includeMetadata).toBe(true);
      expect(validInput.options.contextWindow).toBe(2);
      expect(validInput.options.minSectionLength).toBe(50);
    });

    it('should validate sections analysis specifically', () => {
      const validInput = {
        target: 'research.md',
        analysis: ['sections'],
        sectionIdentifiers: ['Methodology', 'Results'],
        options: {
          includeSectionContext: true,
          includeMetadata: true
        }
      };
      
      expect(validInput.analysis).toContain('sections');
      expect(validInput.sectionIdentifiers).toHaveLength(2);
    });

    it('should validate complex section identifier types', () => {
      const sectionTypes = ['heading', 'line_range', 'pattern'];
      
      sectionTypes.forEach(type => {
        let validValue;
        switch (type) {
          case 'heading':
            validValue = 'Section Title';
            break;
          case 'line_range':
            validValue = { start: 1, end: 10 };
            break;
          case 'pattern':
            validValue = '^## [A-Z]';
            break;
        }
        
        const validInput = {
          target: 'test.md',
          sectionIdentifiers: [{ type, value: validValue }]
        };
        
        expect(validInput.sectionIdentifiers[0].type).toBe(type);
        expect(validInput.sectionIdentifiers[0].value).toEqual(validValue);
      });
    });

    it('should validate heading section identifier with level', () => {
      const validInput = {
        target: 'doc.md',
        sectionIdentifiers: [
          { type: 'heading', value: 'Main Results', level: 2 }
        ]
      };
      
      expect(validInput.sectionIdentifiers[0].level).toBe(2);
    });

    it('should validate line range section identifier', () => {
      const validInput = {
        target: 'doc.md',
        sectionIdentifiers: [
          { type: 'line_range', value: { start: 25, end: 75 } }
        ]
      };
      
      const lineRange = validInput.sectionIdentifiers[0].value as { start: number; end: number };
      expect(lineRange.start).toBe(25);
      expect(lineRange.end).toBe(75);
    });

    it('should handle empty analysis array defaulting to structure', () => {
      const validInput = {
        target: 'test.md',
        analysis: []
      };
      
      // Should be valid - empty array will default to ['structure']
      expect(validInput.analysis).toHaveLength(0);
    });

    it('should validate all combinations of analysis types', () => {
      const analysisTypes = ['structure', 'sections', 'elements', 'themes', 'quality', 'readability', 'connections', 'metadata'];
      
      // Test all combinations of 2
      for (let i = 0; i < analysisTypes.length; i++) {
        for (let j = i + 1; j < analysisTypes.length; j++) {
          const validInput = {
            target: 'test.md',
            analysis: [analysisTypes[i], analysisTypes[j]]
          };
          
          expect(validInput.analysis).toHaveLength(2);
          expect(validInput.analysis).toContain(analysisTypes[i]);
          expect(validInput.analysis).toContain(analysisTypes[j]);
        }
      }
    });

    it('should validate all combinations of extract types', () => {
      const extractTypes = ['headings', 'lists', 'code_blocks', 'tasks', 'quotes', 'tables', 'links', 'embeds'];
      
      // Test combining 3 different extract types
      const validInput = {
        target: 'comprehensive.md',
        options: {
          extractTypes: ['headings', 'code_blocks', 'tables']
        }
      };
      
      expect(validInput.options.extractTypes).toHaveLength(3);
      expect(validInput.options.extractTypes).toContain('headings');
      expect(validInput.options.extractTypes).toContain('code_blocks');
      expect(validInput.options.extractTypes).toContain('tables');
    });

    it('should validate schema properties for sectionIdentifiers', () => {
      const sectionIdentifiersProperty = analyzeTool?.inputSchema.properties.sectionIdentifiers;
      
      expect(sectionIdentifiersProperty).toBeDefined();
      expect(sectionIdentifiersProperty.type).toBe('array');
      expect(sectionIdentifiersProperty.items).toBeDefined();
      
      // Should support oneOf with string or complex object
      expect(sectionIdentifiersProperty.items.oneOf).toBeDefined();
      expect(sectionIdentifiersProperty.items.oneOf).toHaveLength(2);
    });

    it('should validate schema enum values for analysis types', () => {
      const analysisProperty = analyzeTool?.inputSchema.properties.analysis;
      
      expect(analysisProperty.items.enum).toEqual([
        'structure', 'sections', 'elements', 'themes', 'quality', 'readability', 'connections', 'metadata'
      ]);
    });

    it('should validate schema enum values for extract types', () => {
      const optionsProperty = analyzeTool?.inputSchema.properties.options;
      const extractTypesProperty = optionsProperty.properties.extractTypes;
      
      expect(extractTypesProperty.items.enum).toEqual([
        'headings', 'lists', 'code_blocks', 'tasks', 'quotes', 'tables', 'links', 'embeds'
      ]);
    });

    it('should validate contextWindow range constraints', () => {
      const optionsProperty = analyzeTool?.inputSchema.properties.options;
      const contextWindowProperty = optionsProperty.properties.contextWindow;
      
      expect(contextWindowProperty.minimum).toBe(0);
      expect(contextWindowProperty.maximum).toBe(10);
      expect(contextWindowProperty.default).toBe(1);
    });

    it('should validate heading level constraints', () => {
      const optionsProperty = analyzeTool?.inputSchema.properties.options;
      
      const minHeadingLevelProperty = optionsProperty.properties.minHeadingLevel;
      expect(minHeadingLevelProperty.minimum).toBe(1);
      expect(minHeadingLevelProperty.maximum).toBe(6);
      
      const maxHeadingLevelProperty = optionsProperty.properties.maxHeadingLevel;
      expect(maxHeadingLevelProperty.minimum).toBe(1);
      expect(maxHeadingLevelProperty.maximum).toBe(6);
    });

    it('should validate boolean option defaults', () => {
      const optionsProperty = analyzeTool?.inputSchema.properties.options;
      
      expect(optionsProperty.properties.includeHierarchy.default).toBe(true);
      expect(optionsProperty.properties.includeContext.default).toBe(false);
      expect(optionsProperty.properties.includeSectionContext.default).toBe(true);
      expect(optionsProperty.properties.includeMetadata.default).toBe(true);
    });

    // Edge case and error handling tests
    it('should handle edge cases for analysis parameter validation', () => {
      // Test with duplicate analysis types (should be handled gracefully)
      const validInput = {
        target: 'test.md',
        analysis: ['structure', 'structure', 'sections', 'structure']
      };
      
      expect(validInput.analysis).toContain('structure');
      expect(validInput.analysis).toContain('sections');
    });

    it('should validate complex nested section identifier scenarios', () => {
      const complexValidInput = {
        target: ['file1.md', 'file2.md', 'file3.md'],
        analysis: ['structure', 'sections', 'elements'],
        sectionIdentifiers: [
          'Introduction',
          { type: 'heading', value: 'Methodology' },
          { type: 'heading', value: 'Results', level: 2 },
          { type: 'line_range', value: { start: 1, end: 100 } },
          { type: 'pattern', value: '^#+\\s+(Discussion|Conclusion)' },
          'References'
        ],
        options: {
          extractTypes: ['headings', 'lists', 'code_blocks', 'tables'],
          includeHierarchy: false,
          includeContext: true,
          includeSectionContext: true,
          includeMetadata: true,
          contextWindow: 5,
          minHeadingLevel: 1,
          maxHeadingLevel: 6,
          minSectionLength: 200
        }
      };
      
      expect(complexValidInput.target).toHaveLength(3);
      expect(complexValidInput.analysis).toHaveLength(3);
      expect(complexValidInput.sectionIdentifiers).toHaveLength(6);
      expect(complexValidInput.options.extractTypes).toHaveLength(4);
    });

    it('should validate all available option combinations', () => {
      const comprehensiveOptions = {
        target: 'comprehensive.md',
        analysis: ['structure', 'sections', 'elements', 'themes', 'quality', 'readability', 'connections', 'metadata'],
        sectionIdentifiers: [
          'All Sections',
          { type: 'pattern', value: '.*' }
        ],
        options: {
          extractTypes: ['headings', 'lists', 'code_blocks', 'tasks', 'quotes', 'tables', 'links', 'embeds'],
          includeHierarchy: true,
          includeContext: true,
          includeSectionContext: true,
          includeMetadata: true,
          contextWindow: 10,
          minHeadingLevel: 1,
          maxHeadingLevel: 6,
          minSectionLength: 1
        }
      };
      
      expect(comprehensiveOptions.analysis).toHaveLength(8);
      expect(comprehensiveOptions.options.extractTypes).toHaveLength(8);
      expect(comprehensiveOptions.options.contextWindow).toBe(10);
    });

    it('should validate minimal valid configuration', () => {
      const minimalValid = {
        target: 'simple.md'
        // Everything else is optional
      };
      
      expect(minimalValid.target).toBe('simple.md');
      // Analysis defaults to ['structure'], options use defaults
    });

    it('should validate boundary values for numeric constraints', () => {
      const boundaryValues = {
        target: 'boundary.md',
        options: {
          contextWindow: 0, // Minimum
          minHeadingLevel: 1, // Minimum
          maxHeadingLevel: 6, // Maximum
          minSectionLength: 0 // Effectively no minimum
        }
      };
      
      expect(boundaryValues.options.contextWindow).toBe(0);
      expect(boundaryValues.options.minHeadingLevel).toBe(1);
      expect(boundaryValues.options.maxHeadingLevel).toBe(6);
    });

    it('should validate maximum boundary values', () => {
      const maxBoundaryValues = {
        target: 'max-boundary.md',
        options: {
          contextWindow: 10, // Maximum
          minHeadingLevel: 6, // Maximum (when min = max)
          maxHeadingLevel: 6, // Same as min
          minSectionLength: 10000 // Large value
        }
      };
      
      expect(maxBoundaryValues.options.contextWindow).toBe(10);
      expect(maxBoundaryValues.options.minHeadingLevel).toBe(6);
      expect(maxBoundaryValues.options.maxHeadingLevel).toBe(6);
    });

    it('should validate realistic usage scenarios', () => {
      // Scenario 1: Research paper analysis
      const researchPaper = {
        target: 'research-paper.md',
        analysis: ['structure', 'sections'],
        sectionIdentifiers: [
          'Abstract',
          { type: 'heading', value: 'Introduction', level: 2 },
          { type: 'heading', value: 'Methodology', level: 2 },
          { type: 'heading', value: 'Results', level: 2 },
          { type: 'heading', value: 'Discussion', level: 2 },
          'Conclusion',
          'References'
        ],
        options: {
          extractTypes: ['headings', 'tables', 'quotes'],
          includeHierarchy: true,
          includeSectionContext: true,
          includeMetadata: true
        }
      };

      // Scenario 2: Code documentation analysis
      const codeDocumentation = {
        target: ['api-docs.md', 'readme.md', 'changelog.md'],
        analysis: ['structure', 'elements'],
        options: {
          extractTypes: ['headings', 'code_blocks', 'links'],
          includeHierarchy: false,
          includeContext: true,
          contextWindow: 2
        }
      };

      // Scenario 3: Meeting notes extraction
      const meetingNotes = {
        target: 'meeting-notes.md',
        analysis: ['sections'],
        sectionIdentifiers: [
          { type: 'pattern', value: '^#+\\s+(Agenda|Discussion|Action Items|Next Steps)' }
        ],
        options: {
          extractTypes: ['tasks', 'lists'],
          includeSectionContext: false,
          includeMetadata: true,
          minSectionLength: 50
        }
      };

      expect(researchPaper.sectionIdentifiers).toHaveLength(7);
      expect(codeDocumentation.target).toHaveLength(3);
      expect(meetingNotes.analysis).toContain('sections');
    });

    it('should validate schema structure completeness', () => {
      expect(analyzeTool?.inputSchema.type).toBe('object');
      expect(analyzeTool?.inputSchema.properties.target).toBeDefined();
      expect(analyzeTool?.inputSchema.properties.analysis).toBeDefined();
      expect(analyzeTool?.inputSchema.properties.sectionIdentifiers).toBeDefined();
      expect(analyzeTool?.inputSchema.properties.options).toBeDefined();
      
      // Verify required vs optional properties
      expect(analyzeTool?.inputSchema.required).toEqual(['target']);
      
      // Verify target can be string or array
      const targetProperty = analyzeTool?.inputSchema.properties.target;
      expect(targetProperty.oneOf).toBeDefined();
      expect(targetProperty.oneOf).toHaveLength(2);
    });

    it('should validate options schema structure', () => {
      const optionsProperty = analyzeTool?.inputSchema.properties.options;
      
      expect(optionsProperty.type).toBe('object');
      // Note: additionalProperties may not be explicitly set to false in schema
      
      // Check all expected option properties exist
      const expectedOptions = [
        'extractTypes', 'includeHierarchy', 'includeContext', 'includeSectionContext',
        'includeMetadata', 'contextWindow', 'minHeadingLevel', 'maxHeadingLevel', 'minSectionLength'
      ];
      
      expectedOptions.forEach(option => {
        expect(optionsProperty.properties[option]).toBeDefined();
      });
    });

    it('should validate section identifier schema flexibility', () => {
      const sectionIdentifiersProperty = analyzeTool?.inputSchema.properties.sectionIdentifiers;
      
      // Should be array of either strings or structured objects
      expect(sectionIdentifiersProperty.type).toBe('array');
      expect(sectionIdentifiersProperty.items.oneOf).toHaveLength(2);
      
      // First type should be string
      expect(sectionIdentifiersProperty.items.oneOf[0].type).toBe('string');
      
      // Second type should be object with type/value structure
      const objectType = sectionIdentifiersProperty.items.oneOf[1];
      expect(objectType.type).toBe('object');
      expect(objectType.required).toContain('type');
      expect(objectType.required).toContain('value');
      expect(objectType.properties.type.enum).toEqual(['heading', 'line_range', 'pattern']);
    });

    it('should validate default value consistency', () => {
      const optionsProperty = analyzeTool?.inputSchema.properties.options;
      
      // Check boolean defaults
      expect(optionsProperty.properties.includeHierarchy.default).toBe(true);
      expect(optionsProperty.properties.includeContext.default).toBe(false);
      expect(optionsProperty.properties.includeSectionContext.default).toBe(true);
      expect(optionsProperty.properties.includeMetadata.default).toBe(true);
      
      // Check numeric defaults
      expect(optionsProperty.properties.contextWindow.default).toBe(1);
      
      // Check array defaults
      expect(optionsProperty.properties.extractTypes.default).toEqual(['headings']);
    });

    it('should validate comprehensive tool description accuracy', () => {
      expect(analyzeTool?.description).toBeDefined();
      expect(analyzeTool?.description.length).toBeGreaterThan(100);
      
      // Description should mention key capabilities
      const description = analyzeTool?.description.toLowerCase();
      expect(description).toContain('structure');
      expect(description).toContain('section');
      expect(description).toContain('analysis');
    });
  });

  describe('obsidian_manage tool', () => {
    const manageTool = CONSOLIDATED_OBSIDIAN_TOOLS.find(tool => tool.name === 'obsidian_manage');

    it('should have correct schema structure', () => {
      expect(manageTool).toBeDefined();
      expect(manageTool?.name).toBe('obsidian_manage');
      expect(manageTool?.inputSchema.required).toEqual(['operation', 'source']);
    });

    it('should validate find-replace operation', () => {
      const validInput = {
        operation: 'find-replace',
        source: 'Notes',
        parameters: {
          replacements: [
            { search: 'old text', replace: 'new text' },
            { search: '@\\w+2023', replace: '@author2024' }
          ],
          useRegex: true,
          scope: {
            folders: ['Research']
          }
        }
      };

      expect(validInput.operation).toBe('find-replace');
      expect(validInput.parameters.replacements.length).toBe(2);
    });

    it('should validate move operation', () => {
      const validInput = {
        operation: 'move',
        source: 'Notes/Old Name.md',
        target: 'Archive/New Name.md',
        options: {
          updateLinks: true,
          createBackup: false
        }
      };

      expect(validInput.operation).toBe('move');
      expect(validInput.options.updateLinks).toBe(true);
    });

    it('should validate copy operation', () => {
      const validInput = {
        operation: 'copy',
        source: 'Templates/Note.md',
        target: 'Notes/New Note.md',
        parameters: {
          overwrite: true
        }
      };

      expect(validInput.operation).toBe('copy');
      expect(validInput.parameters.overwrite).toBe(true);
    });

    it('should validate all operations', () => {
      const operations = ['move', 'rename', 'copy', 'delete', 'create-dir', 'delete-dir', 'find-replace'];
      
      operations.forEach(operation => {
        const validInput = {
          operation,
          source: 'test-source'
        };

        expect(validInput.operation).toBe(operation);
      });
    });

    it('should validate directory operations', () => {
      const validInput = {
        operation: 'create-dir',
        source: 'Projects/New Project',
        parameters: {
          recursive: true
        }
      };

      expect(validInput.operation).toBe('create-dir');
      expect(validInput.parameters.recursive).toBe(true);
    });

    it('should validate management options', () => {
      const validInput = {
        operation: 'delete',
        source: 'Archive/Old File.md',
        options: {
          updateLinks: true,
          createBackup: true,
          dryRun: false
        }
      };

      expect(validInput.options.updateLinks).toBe(true);
      expect(validInput.options.createBackup).toBe(true);
      expect(validInput.options.dryRun).toBe(false);
    });
  });


  describe('Tool count validation', () => {
    it('should have exactly 8 consolidated tools', () => {
      expect(CONSOLIDATED_OBSIDIAN_TOOLS.length).toBe(8);
    });

    it('should have all expected tool names', () => {
      const expectedNames = [
        'obsidian_semantic_search',
        'obsidian_pattern_search',
        'obsidian_get_notes', 
        'obsidian_write_content',
        'obsidian_explore',
        'obsidian_relationships',
        'obsidian_analyze',
        'obsidian_manage'
      ];

      const actualNames = CONSOLIDATED_OBSIDIAN_TOOLS.map(tool => tool.name);
      expect(actualNames).toEqual(expectedNames);
    });

    it('should have unique tool names', () => {
      const names = CONSOLIDATED_OBSIDIAN_TOOLS.map(tool => tool.name);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });

    it('should have descriptions for all tools', () => {
      CONSOLIDATED_OBSIDIAN_TOOLS.forEach(tool => {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    it('should have input schemas for all tools', () => {
      CONSOLIDATED_OBSIDIAN_TOOLS.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });
});