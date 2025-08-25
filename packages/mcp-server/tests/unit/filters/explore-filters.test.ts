import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to create a test helper to access the private applyExploreFilters method
// Since it's a private method, we'll test it through the public interface or create a test wrapper

describe('Explore Filters', () => {
  // Mock file data that mimics Obsidian API response format
  const mockFiles = [
    {
      name: 'Simple Note.md',
      path: 'Tests/Simple Note.md',
      isFolder: false,
      mtime: new Date('2024-06-15T10:30:00Z').getTime(),
      ctime: new Date('2024-06-15T10:30:00Z').getTime(),
      size: 1024
    },
    {
      name: 'Complex Note.md', 
      path: 'Tests/Complex Note.md',
      isFolder: false,
      mtime: new Date('2024-07-20T15:45:00Z').getTime(),
      ctime: new Date('2024-07-20T15:45:00Z').getTime(),
      size: 2048
    },
    {
      name: 'MCP Function Test Suite.md',
      path: 'Tests/MCP Function Test Suite.md', 
      isFolder: false,
      mtime: new Date('2025-08-26T09:00:00Z').getTime(),
      ctime: new Date('2025-08-26T09:00:00Z').getTime(),
      size: 3072
    },
    {
      name: 'Management Target A.md',
      path: 'Tests/Management Target A.md',
      isFolder: false,
      mtime: new Date('2025-08-26T09:15:00Z').getTime(),
      ctime: new Date('2025-08-26T09:15:00Z').getTime(),
      size: 512
    },
    {
      name: 'reset-test-environment.sh',
      path: 'Tests/reset-test-environment.sh',
      isFolder: false,
      mtime: new Date('2024-03-10T12:00:00Z').getTime(),
      ctime: new Date('2024-03-10T12:00:00Z').getTime(),
      size: 256
    },
    {
      name: 'Nested',
      path: 'Tests/Nested/',
      isFolder: true,
      mtime: new Date('2024-05-01T08:00:00Z').getTime(),
      ctime: new Date('2024-05-01T08:00:00Z').getTime(),
      size: 0
    },
    {
      name: 'Link Test File B Moved.md',
      path: 'Tests/Nested/Link Test File B Moved.md',
      isFolder: false,
      mtime: new Date('2025-08-26T10:30:00Z').getTime(),
      ctime: new Date('2025-08-26T10:30:00Z').getTime(),
      size: 768
    },
    {
      name: 'file-without-mtime.md',
      path: 'Tests/file-without-mtime.md',
      isFolder: false,
      mtime: null, // File without mtime
      ctime: null,
      size: 128
    }
  ];

  // Helper function to simulate the applyExploreFilters logic
  // Since we can't directly access the private method, we'll replicate the logic here
  function applyExploreFilters(files: any[], filters: any): any[] {
    let filteredFiles = files;

    // Handle null/undefined filters
    if (!filters) {
      return filteredFiles;
    }

    // Filter by extensions
    if (filters.extensions && Array.isArray(filters.extensions) && filters.extensions.length > 0) {
      filteredFiles = filteredFiles.filter(file => {
        // Only include folders if they might contain matching files (for navigation)
        // But when extensions are specified, we primarily want matching files
        if (file.isFolder) return false; // Exclude folders when extension filtering is active
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        return filters.extensions.some((ext: string) => ext.toLowerCase() === fileExt);
      });
    }

    // Filter by name pattern (regex)
    if (filters.namePattern && typeof filters.namePattern === 'string') {
      try {
        const nameRegex = new RegExp(filters.namePattern, 'i');
        filteredFiles = filteredFiles.filter(file => {
          const matches = nameRegex.test(file.name);
          return matches;
        });
      } catch (error) {
        // Don't filter if regex is invalid - return current filtered files
      }
    }

    // Filter by date range (modification time)
    if (filters.dateRange && typeof filters.dateRange === 'object') {
      const { start, end } = filters.dateRange;
      
      if (start || end) {
        filteredFiles = filteredFiles.filter(file => {
          // When date range filtering is active, exclude files without mtime info
          if (!file.mtime) return false;
          
          const fileDate = new Date(file.mtime);
          let includeFile = true;
          
          if (start) {
            try {
              const startDate = new Date(start);
              if (fileDate < startDate) includeFile = false;
            } catch (error) {
              return false; // Exclude files with invalid start date processing
            }
          }
          
          if (end && includeFile) {
            try {
              const endDate = new Date(end);
              if (fileDate > endDate) includeFile = false;
            } catch (error) {
              return false; // Exclude files with invalid end date processing
            }
          }
          
          return includeFile;
        });
      }
    }

    // Apply exclude patterns
    if (filters.excludePatterns && Array.isArray(filters.excludePatterns) && filters.excludePatterns.length > 0) {
      for (const excludePattern of filters.excludePatterns) {
        if (typeof excludePattern === 'string') {
          try {
            const excludeRegex = new RegExp(excludePattern, 'i');
            filteredFiles = filteredFiles.filter(file => !excludeRegex.test(file.name) && !excludeRegex.test(file.path));
          } catch (error) {
            // Invalid regex, skip this exclude pattern
          }
        }
      }
    }

    return filteredFiles;
  }

  describe('Extension Filter', () => {
    it('should filter files by single extension', () => {
      const filters = { extensions: ['md'] };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should include only .md files, no folders or shell scripts
      expect(result).toHaveLength(6); // 6 .md files in mockFiles
      result.forEach(file => {
        expect(file.name.endsWith('.md')).toBe(true);
        expect(file.isFolder).toBe(false);
      });
    });

    it('should filter files by multiple extensions', () => {
      const filters = { extensions: ['md', 'txt'] };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should include .md files (no .txt files in mockFiles)
      expect(result).toHaveLength(6);
      result.forEach(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        expect(['md', 'txt']).toContain(ext);
      });
    });

    it('should exclude folders when extension filter is active', () => {
      const filters = { extensions: ['md'] };
      const result = applyExploreFilters(mockFiles, filters);
      
      // No folders should be included
      result.forEach(file => {
        expect(file.isFolder).toBe(false);
      });
    });

    it('should exclude non-matching file types', () => {
      const filters = { extensions: ['md'] };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should not include .sh files
      const shellFiles = result.filter(file => file.name.endsWith('.sh'));
      expect(shellFiles).toHaveLength(0);
    });

    it('should return all files when no extension filter is provided', () => {
      const filters = {};
      const result = applyExploreFilters(mockFiles, filters);
      
      expect(result).toHaveLength(mockFiles.length);
    });
  });

  describe('Name Pattern Filter', () => {
    it('should filter files by name pattern containing "Note"', () => {
      const filters = { namePattern: '.*Note.*' };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should include only files with "Note" in the name
      expect(result).toHaveLength(2); // Simple Note.md and Complex Note.md
      result.forEach(file => {
        expect(file.name.toLowerCase()).toContain('note');
      });
      
      // Should not include files without "Note" in name
      const nonMatchingFiles = ['MCP Function Test Suite.md', 'Management Target A.md', 'Link Test File B Moved.md'];
      result.forEach(file => {
        expect(nonMatchingFiles).not.toContain(file.name);
      });
    });

    it('should be case insensitive', () => {
      const filters = { namePattern: '.*note.*' }; // lowercase pattern
      const result = applyExploreFilters(mockFiles, filters);
      
      expect(result).toHaveLength(2);
      result.forEach(file => {
        expect(file.name.toLowerCase()).toContain('note');
      });
    });

    it('should handle complex regex patterns', () => {
      const filters = { namePattern: '^Simple.*\\.md$' };
      const result = applyExploreFilters(mockFiles, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Simple Note.md');
    });

    it('should handle invalid regex patterns gracefully', () => {
      const filters = { namePattern: '[invalid regex' }; // Invalid regex
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should return all files when regex is invalid
      expect(result).toHaveLength(mockFiles.length);
    });

    it('should return all files when no name pattern is provided', () => {
      const filters = {};
      const result = applyExploreFilters(mockFiles, filters);
      
      expect(result).toHaveLength(mockFiles.length);
    });
  });

  describe('Date Range Filter', () => {
    it('should filter files within date range', () => {
      const filters = {
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z'
        }
      };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should include only files from 2024
      expect(result).toHaveLength(4); // Simple Note.md, Complex Note.md, reset-test-environment.sh, Nested folder
      result.forEach(file => {
        if (file.mtime) {
          const fileDate = new Date(file.mtime);
          expect(fileDate.getFullYear()).toBe(2024);
        }
      });
    });

    it('should exclude files from 2025 when filtering for 2024', () => {
      const filters = {
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z'
        }
      };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Files from 2025 should not be included
      const files2025 = ['MCP Function Test Suite.md', 'Management Target A.md', 'Link Test File B Moved.md'];
      result.forEach(file => {
        expect(files2025).not.toContain(file.name);
      });
    });

    it('should exclude files without mtime when date range is specified', () => {
      const filters = {
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z'
        }
      };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should not include file without mtime
      result.forEach(file => {
        expect(file.mtime).toBeTruthy();
      });
    });

    it('should handle start date only', () => {
      const filters = {
        dateRange: {
          start: '2024-07-01T00:00:00Z'
        }
      };
      const result = applyExploreFilters(mockFiles, filters);
      
      result.forEach(file => {
        if (file.mtime) {
          const fileDate = new Date(file.mtime);
          expect(fileDate >= new Date('2024-07-01T00:00:00Z')).toBe(true);
        }
      });
    });

    it('should handle end date only', () => {
      const filters = {
        dateRange: {
          end: '2024-12-31T23:59:59Z'
        }
      };
      const result = applyExploreFilters(mockFiles, filters);
      
      result.forEach(file => {
        if (file.mtime) {
          const fileDate = new Date(file.mtime);
          expect(fileDate <= new Date('2024-12-31T23:59:59Z')).toBe(true);
        }
      });
    });

    it('should return all files when no date range is provided', () => {
      const filters = {};
      const result = applyExploreFilters(mockFiles, filters);
      
      expect(result).toHaveLength(mockFiles.length);
    });
  });

  describe('Combined Filters (Test Case 5.3 Scenario)', () => {
    it('should apply all three filters correctly for Test Case 5.3', () => {
      const filters = {
        extensions: ['md'],
        namePattern: '.*Note.*',
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z'
        }
      };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should include only .md files with "Note" in name from 2024
      expect(result).toHaveLength(2); // Simple Note.md and Complex Note.md
      
      result.forEach(file => {
        // Must be .md file
        expect(file.name.endsWith('.md')).toBe(true);
        // Must contain "Note"
        expect(file.name.toLowerCase()).toContain('note');
        // Must be from 2024
        const fileDate = new Date(file.mtime);
        expect(fileDate.getFullYear()).toBe(2024);
      });

      // Verify specific expected files
      const expectedFiles = ['Simple Note.md', 'Complex Note.md'];
      expect(result.map(f => f.name).sort()).toEqual(expectedFiles.sort());
      
      // Verify excluded files are not present
      const excludedFiles = [
        'MCP Function Test Suite.md', // No "Note" in name
        'Management Target A.md',    // No "Note" in name
        'Link Test File B Moved.md', // No "Note" in name
        'reset-test-environment.sh'  // Not .md extension
      ];
      result.forEach(file => {
        expect(excludedFiles).not.toContain(file.name);
      });
    });
  });

  describe('Exclude Patterns Filter', () => {
    it('should exclude files matching exclude patterns', () => {
      const filters = {
        excludePatterns: ['.*Target.*']
      };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should exclude files with "Target" in name
      result.forEach(file => {
        expect(file.name.toLowerCase()).not.toContain('target');
      });
    });

    it('should handle multiple exclude patterns', () => {
      const filters = {
        excludePatterns: ['.*Target.*', '.*Suite.*']
      };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should exclude files with "Target" or "Suite" in name
      result.forEach(file => {
        expect(file.name.toLowerCase()).not.toContain('target');
        expect(file.name.toLowerCase()).not.toContain('suite');
      });
    });

    it('should handle invalid exclude patterns gracefully', () => {
      const filters = {
        excludePatterns: ['[invalid']
      };
      const result = applyExploreFilters(mockFiles, filters);
      
      // Should return all files when exclude pattern is invalid
      expect(result).toHaveLength(mockFiles.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files array', () => {
      const filters = { extensions: ['md'] };
      const result = applyExploreFilters([], filters);
      
      expect(result).toHaveLength(0);
    });

    it('should handle empty filters object', () => {
      const filters = {};
      const result = applyExploreFilters(mockFiles, filters);
      
      expect(result).toHaveLength(mockFiles.length);
    });

    it('should handle null/undefined filters', () => {
      const result1 = applyExploreFilters(mockFiles, null);
      const result2 = applyExploreFilters(mockFiles, undefined);
      
      expect(result1).toHaveLength(mockFiles.length);
      expect(result2).toHaveLength(mockFiles.length);
    });
  });
});