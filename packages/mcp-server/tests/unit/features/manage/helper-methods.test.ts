import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObsidianResearchServer } from '../../../../src/server.js';

// Mock dependencies
vi.mock('../../../../src/integrations/obsidian-api.js', () => ({
  obsidianAPI: {
    getFileContent: vi.fn(),
    updateFileContent: vi.fn(),
    listFiles: vi.fn(),
  }
}));

vi.mock('../../../../src/core/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Helper function to escape regex characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('ObsidianResearchServer - Helper Methods', () => {
  let server: ObsidianResearchServer;
  
  beforeEach(() => {
    server = new ObsidianResearchServer();
    vi.clearAllMocks();
  });

  describe('previewOperation', () => {
    it('should preview move operation', () => {
      const changes = (server as any).previewOperation('move', 'old.md', 'new.md');
      
      expect(changes).toEqual([
        'Move file from \'old.md\' to \'new.md\'',
        'Update all links pointing to this file'
      ]);
    });

    it('should preview rename operation', () => {
      const changes = (server as any).previewOperation('rename', 'old-name.md', 'new-name.md');
      
      expect(changes).toEqual([
        'Move file from \'old-name.md\' to \'new-name.md\'',
        'Update all links pointing to this file'
      ]);
    });

    it('should preview copy operation', () => {
      const changes = (server as any).previewOperation('copy', 'source.md', 'target.md');
      
      expect(changes).toEqual([
        'Copy file from \'source.md\' to \'target.md\''
      ]);
    });

    it('should preview delete operation', () => {
      const changes = (server as any).previewOperation('delete', 'to-delete.md');
      
      expect(changes).toEqual([
        'Delete file \'to-delete.md\'',
        'Remove all broken links to this file'
      ]);
    });

    it('should preview find-replace operation with basic parameters', () => {
      const parameters = {
        replacements: [
          { search: 'old', replace: 'new' },
          { search: 'test', replace: 'example' }
        ]
      };
      
      const changes = (server as any).previewOperation('find-replace', 'vault', undefined, parameters);
      
      expect(changes).toEqual([
        'Perform 2 text replacements'
      ]);
    });

    it('should preview find-replace operation with scope', () => {
      const parameters = {
        replacements: [{ search: 'old', replace: 'new' }],
        scope: {
          paths: ['file1.md', 'file2.md'],
          folders: ['folder1', 'folder2']
        }
      };
      
      const changes = (server as any).previewOperation('find-replace', 'vault', undefined, parameters);
      
      expect(changes).toEqual([
        'Perform 1 text replacements',
        'Target 2 specific files',
        'Target files in 2 folders'
      ]);
    });
  });

  describe('cleanupLinksAfterDelete', () => {
    it('should clean up wikilinks to deleted file', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'referencing.md', isFolder: false },
        { path: 'other.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any)
        .mockResolvedValueOnce('This links to [[DeletedFile]] and [[DeletedFile#section]].')
        .mockResolvedValueOnce('No links here.');

      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const result = await (server as any).cleanupLinksAfterDelete('DeletedFile.md');

      expect(result.linksCleanedUp).toBe(2);
      expect(result.filesUpdated).toBe(1);
      expect(result.updatedFiles).toEqual(['referencing.md']);

      expect(obsidianAPI.updateFileContent).toHaveBeenCalledWith(
        'referencing.md',
        'This links to ~~[[DeletedFile]]~~ (deleted) and ~~[[DeletedFile#section]]~~ (deleted).'
      );
    });

    it('should clean up embed links to deleted file', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'document.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any).mockResolvedValue('Here is an embed: ![[DeletedImage]]');
      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const result = await (server as any).cleanupLinksAfterDelete('DeletedImage.md');

      expect(result.linksCleanedUp).toBe(1);
      expect(result.filesUpdated).toBe(1);

      expect(obsidianAPI.updateFileContent).toHaveBeenCalledWith(
        'document.md',
        'Here is an embed: !~~[[DeletedImage]]~~ (deleted)'
      );
    });

    it('should clean up markdown links to deleted file', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'document.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any).mockResolvedValue('Check out [this link](DeletedFile.md) and [another](DeletedFile#section).');
      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const result = await (server as any).cleanupLinksAfterDelete('DeletedFile.md');

      expect(result.linksCleanedUp).toBe(2);
      expect(result.filesUpdated).toBe(1);

      expect(obsidianAPI.updateFileContent).toHaveBeenCalledWith(
        'document.md',
        'Check out ~~this link~~ (deleted) and ~~another~~ (deleted).'
      );
    });

    it('should handle files with no links to deleted file', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'unrelated.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any).mockResolvedValue('This file has no links to the deleted file.');

      const result = await (server as any).cleanupLinksAfterDelete('DeletedFile.md');

      expect(result.linksCleanedUp).toBe(0);
      expect(result.filesUpdated).toBe(0);
      expect(result.updatedFiles).toEqual([]);

      expect(obsidianAPI.updateFileContent).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully when cleaning up individual files', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      const { logger } = await import('../../../../src/core/logger.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'good.md', isFolder: false },
        { path: 'error.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any)
        .mockResolvedValueOnce('Link to [[DeletedFile]]')
        .mockRejectedValueOnce(new Error('File read error'));

      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const result = await (server as any).cleanupLinksAfterDelete('DeletedFile.md');

      expect(result.linksCleanedUp).toBe(1);
      expect(result.filesUpdated).toBe(1);
      expect(result.updatedFiles).toEqual(['good.md']);

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to clean up links in error.md',
        { error: expect.any(Error) }
      );
    });
  });

  describe('performFindReplace', () => {
    it('should perform simple text replacement across all files', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'file1.md', isFolder: false },
        { path: 'file2.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any)
        .mockResolvedValueOnce('This is old text that should be replaced.')
        .mockResolvedValueOnce('No matches here.');

      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const parameters = {
        replacements: [{ search: 'old text', replace: 'new text' }],
        useRegex: false,
        caseSensitive: false
      };

      const result = await (server as any).performFindReplace(parameters, {});

      expect(result.totalReplacements).toBe(1);
      expect(result.filesUpdated).toBe(1);
      expect(result.updatedFiles).toEqual(['file1.md']);

      expect(obsidianAPI.updateFileContent).toHaveBeenCalledWith(
        'file1.md',
        'This is new text that should be replaced.'
      );
    });

    it('should perform regex replacement', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'dates.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any).mockResolvedValue('Date: 2023-12-01 and 2023-11-15');
      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const parameters = {
        replacements: [{ search: '2023-(\\d{2})-(\\d{2})', replace: '2024-$1-$2' }],
        useRegex: true,
        caseSensitive: true
      };

      const result = await (server as any).performFindReplace(parameters, {});

      expect(result.totalReplacements).toBe(2);
      expect(result.filesUpdated).toBe(1);

      expect(obsidianAPI.updateFileContent).toHaveBeenCalledWith(
        'dates.md',
        'Date: 2024-12-01 and 2024-11-15'
      );
    });

    it('should perform case-sensitive replacement', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'case-test.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any).mockResolvedValue('Test and test and TEST');
      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const parameters = {
        replacements: [{ search: 'test', replace: 'example' }],
        useRegex: false,
        caseSensitive: true
      };

      const result = await (server as any).performFindReplace(parameters, {});

      expect(result.totalReplacements).toBe(1);
      
      expect(obsidianAPI.updateFileContent).toHaveBeenCalledWith(
        'case-test.md',
        'Test and example and TEST'
      );
    });

    it('should perform case-insensitive replacement', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'case-test.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any).mockResolvedValue('Test and test and TEST');
      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const parameters = {
        replacements: [{ search: 'test', replace: 'example' }],
        useRegex: false,
        caseSensitive: false
      };

      const result = await (server as any).performFindReplace(parameters, {});

      expect(result.totalReplacements).toBe(3);
      
      expect(obsidianAPI.updateFileContent).toHaveBeenCalledWith(
        'case-test.md',
        'example and example and example'
      );
    });

    it('should scope replacement to specific paths', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.getFileContent as any)
        .mockResolvedValueOnce('old text here')
        .mockResolvedValueOnce('more old text');

      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const parameters = {
        replacements: [{ search: 'old text', replace: 'new text' }],
        scope: {
          paths: ['specific1.md', 'specific2.md']
        }
      };

      const result = await (server as any).performFindReplace(parameters, {});

      expect(result.totalReplacements).toBe(2);
      expect(result.filesUpdated).toBe(2);

      expect(obsidianAPI.listFiles).not.toHaveBeenCalled();
      expect(obsidianAPI.getFileContent).toHaveBeenCalledWith('specific1.md');
      expect(obsidianAPI.getFileContent).toHaveBeenCalledWith('specific2.md');
    });

    it('should scope replacement to specific folders', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any)
        .mockResolvedValueOnce([
          { path: 'folder1/file1.md', isFolder: false },
          { path: 'folder1/file2.md', isFolder: false }
        ])
        .mockResolvedValueOnce([
          { path: 'folder2/file3.md', isFolder: false }
        ]);

      (obsidianAPI.getFileContent as any)
        .mockResolvedValueOnce('old text in file1')
        .mockResolvedValueOnce('old text in file2')
        .mockResolvedValueOnce('old text in file3');

      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const parameters = {
        replacements: [{ search: 'old text', replace: 'new text' }],
        scope: {
          folders: ['folder1', 'folder2']
        }
      };

      const result = await (server as any).performFindReplace(parameters, {});

      expect(result.totalReplacements).toBe(3);
      expect(result.filesUpdated).toBe(3);

      expect(obsidianAPI.listFiles).toHaveBeenCalledWith('folder1', true);
      expect(obsidianAPI.listFiles).toHaveBeenCalledWith('folder2', true);
    });

    it('should handle multiple replacements in single file', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'multi.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any).mockResolvedValue('Replace this and also that.');
      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const parameters = {
        replacements: [
          { search: 'this', replace: 'THAT' },
          { search: 'that', replace: 'THIS' }
        ]
      };

      const result = await (server as any).performFindReplace(parameters, {});

      expect(result.totalReplacements).toBe(3);
      expect(result.filesUpdated).toBe(1);

      expect(obsidianAPI.updateFileContent).toHaveBeenCalledWith(
        'multi.md',
        'Replace THIS and also THIS.'
      );
    });

    it('should handle file read errors gracefully', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'good.md', isFolder: false },
        { path: 'error.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any)
        .mockResolvedValueOnce('Replace this text')
        .mockRejectedValueOnce(new Error('Read error'));

      (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

      const parameters = {
        replacements: [{ search: 'this', replace: 'that' }]
      };

      const result = await (server as any).performFindReplace(parameters, {});

      expect(result.totalReplacements).toBe(1);
      expect(result.filesUpdated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        file: 'error.md',
        error: 'Read error'
      });
    });

    it('should return zero replacements when no matches found', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.listFiles as any).mockResolvedValue([
        { path: 'no-matches.md', isFolder: false }
      ]);

      (obsidianAPI.getFileContent as any).mockResolvedValue('This file has no matching text.');

      const parameters = {
        replacements: [{ search: 'nonexistent', replace: 'replacement' }]
      };

      const result = await (server as any).performFindReplace(parameters, {});

      expect(result.totalReplacements).toBe(0);
      expect(result.filesUpdated).toBe(0);
      expect(result.updatedFiles).toEqual([]);

      expect(obsidianAPI.updateFileContent).not.toHaveBeenCalled();
    });
  });
});