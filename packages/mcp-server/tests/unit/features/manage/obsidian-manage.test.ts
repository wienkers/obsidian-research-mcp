import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObsidianResearchServer } from '../../../../src/server.js';

// Mock dependencies
vi.mock('../../../../src/integrations/obsidian-api.js', () => ({
  obsidianAPI: {
    getFileContent: vi.fn(),
    createFile: vi.fn(),
    updateFileContent: vi.fn(),
    deleteFile: vi.fn(),
    listFiles: vi.fn(),
  }
}));

vi.mock('../../../../src/features/batch-operations/link-updater.js', () => ({
  linkUpdater: {
    updateLinks: vi.fn()
  }
}));

vi.mock('../../../../src/core/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  LoggedError: class extends Error {}
}));

describe('ObsidianResearchServer - obsidian_manage implementation', () => {
  let server: ObsidianResearchServer;
  
  beforeEach(() => {
    server = new ObsidianResearchServer();
    vi.clearAllMocks();
  });

  describe('handleConsolidatedManage - Move Operations', () => {
    it('should handle move operation with link updates', async () => {
      const { linkUpdater } = await import('../../../../src/features/batch-operations/link-updater.js');
      
      (linkUpdater.updateLinks as any).mockResolvedValue({
        success: true,
        filesUpdated: 3,
        linksUpdated: 5,
        updatedFiles: ['file1.md', 'file2.md', 'file3.md'],
        errors: [],
        summary: 'Successfully moved file and updated links'
      });

      const result = await (server as any).handleConsolidatedManage({
        operation: 'move',
        source: 'old-path.md',
        target: 'new-path.md',
        options: { updateLinks: true }
      });

      expect(linkUpdater.updateLinks).toHaveBeenCalledWith({
        oldPath: 'old-path.md',
        newPath: 'new-path.md',
        updateBacklinks: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.operation).toBe('move');
      expect(response.success).toBe(true);
      expect(response.filesUpdated).toBe(3);
      expect(response.linksUpdated).toBe(5);
    });

    it('should handle rename operation', async () => {
      const { linkUpdater } = await import('../../../../src/features/batch-operations/link-updater.js');
      
      (linkUpdater.updateLinks as any).mockResolvedValue({
        success: true,
        filesUpdated: 1,
        linksUpdated: 2,
        updatedFiles: ['referencing-file.md'],
        errors: [],
        summary: 'File renamed successfully'
      });

      const result = await (server as any).handleConsolidatedManage({
        operation: 'rename',
        source: 'old-name.md',
        target: 'new-name.md'
      });

      expect(linkUpdater.updateLinks).toHaveBeenCalledWith({
        oldPath: 'old-name.md',
        newPath: 'new-name.md',
        updateBacklinks: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.operation).toBe('rename');
      expect(response.success).toBe(true);
    });

    it('should throw error when target is missing for move operation', async () => {
      const result = await (server as any).handleConsolidatedManage({
        operation: 'move',
        source: 'source.md'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Target path is required');
    });
  });

  describe('handleConsolidatedManage - Copy Operations', () => {
    it('should handle copy operation successfully', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.getFileContent as any).mockResolvedValueOnce('File content');
      (obsidianAPI.getFileContent as any).mockRejectedValueOnce(new Error('File not found')); // Target doesn't exist
      (obsidianAPI.createFile as any).mockResolvedValue(undefined);

      const result = await (server as any).handleConsolidatedManage({
        operation: 'copy',
        source: 'source.md',
        target: 'target.md'
      });

      expect(obsidianAPI.getFileContent).toHaveBeenCalledWith('source.md');
      expect(obsidianAPI.createFile).toHaveBeenCalledWith('target.md', 'File content');

      const response = JSON.parse(result.content[0].text);
      expect(response.operation).toBe('copy');
      expect(response.success).toBe(true);
    });

    it('should handle copy operation with overwrite protection', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.getFileContent as any)
        .mockResolvedValueOnce('Source content') // First call for source
        .mockResolvedValueOnce('Target exists'); // Second call for target check

      // The copy should fail when target exists and overwrite is false
      const result = await (server as any).handleConsolidatedManage({
        operation: 'copy',
        source: 'source.md',
        target: 'existing-target.md',
        parameters: { overwrite: false }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('already exists');
    });

    it('should handle copy operation with overwrite enabled', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.getFileContent as any)
        .mockResolvedValueOnce('Source content')
        .mockResolvedValueOnce('Target exists'); // Target exists
      (obsidianAPI.createFile as any).mockResolvedValue(undefined);

      const result = await (server as any).handleConsolidatedManage({
        operation: 'copy',
        source: 'source.md',
        target: 'existing-target.md',
        parameters: { overwrite: true }
      });

      expect(obsidianAPI.createFile).toHaveBeenCalledWith('existing-target.md', 'Source content');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });
  });

  describe('handleConsolidatedManage - Delete Operations', () => {
    it('should handle delete operation with backup', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      // Reset and set up fresh mock for this test
      (obsidianAPI.getFileContent as any).mockReset();
      (obsidianAPI.getFileContent as any).mockResolvedValue('File content to backup');
      (obsidianAPI.createFile as any).mockResolvedValue(undefined);
      (obsidianAPI.deleteFile as any).mockResolvedValue(undefined);

      // Mock cleanupLinksAfterDelete to prevent it from calling getFileContent
      vi.spyOn(server as any, 'cleanupLinksAfterDelete').mockResolvedValue({
        linksCleanedUp: 2,
        filesUpdated: 1,
        updatedFiles: ['referencing.md']
      });

      const result = await (server as any).handleConsolidatedManage({
        operation: 'delete',
        source: 'to-delete.md',
        options: { createBackup: true }
      });

      expect(obsidianAPI.getFileContent).toHaveBeenCalledWith('to-delete.md');
      expect(obsidianAPI.createFile).toHaveBeenCalledWith(
        expect.stringMatching(/to-delete\.md\.backup\.\d+/),
        'File content to backup'
      );
      expect(obsidianAPI.deleteFile).toHaveBeenCalledWith('to-delete.md');

      const response = JSON.parse(result.content[0].text);
      expect(response.operation).toBe('delete');
      expect(response.success).toBe(true);
      expect(response.linksCleanedUp).toBe(2);
    });

    it('should handle delete operation without backup', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.deleteFile as any).mockResolvedValue(undefined);

      vi.spyOn(server as any, 'cleanupLinksAfterDelete').mockResolvedValue({
        linksCleanedUp: 0,
        filesUpdated: 0,
        updatedFiles: []
      });

      const result = await (server as any).handleConsolidatedManage({
        operation: 'delete',
        source: 'to-delete.md'
      });

      expect(obsidianAPI.getFileContent).not.toHaveBeenCalled();
      expect(obsidianAPI.createFile).not.toHaveBeenCalled();
      expect(obsidianAPI.deleteFile).toHaveBeenCalledWith('to-delete.md');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });
  });

  describe('handleConsolidatedManage - Directory Operations', () => {
    it('should handle create-dir operation', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.createFile as any).mockResolvedValue(undefined);
      (obsidianAPI.deleteFile as any).mockResolvedValue(undefined);

      const result = await (server as any).handleConsolidatedManage({
        operation: 'create-dir',
        source: 'new-directory'
      });

      expect(obsidianAPI.createFile).toHaveBeenCalledWith(
        expect.stringMatching(/new-directory\/\.tmp_dir_creation_\d+\.md/),
        '# Temporary file for directory creation'
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.operation).toBe('create-dir');
      expect(response.success).toBe(true);
    });

    it('should handle delete-dir operation (not implemented)', async () => {
      const result = await (server as any).handleConsolidatedManage({
        operation: 'delete-dir',
        source: 'directory-to-delete'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.operation).toBe('delete-dir');
      expect(response.status).toBe('not_implemented');
    });
  });

  describe('handleConsolidatedManage - Find-Replace Operations', () => {
    it('should handle find-replace operation', async () => {
      vi.spyOn(server as any, 'performFindReplace').mockResolvedValue({
        operation: 'find-replace',
        totalReplacements: 5,
        filesUpdated: 2,
        updatedFiles: ['file1.md', 'file2.md'],
        errors: []
      });

      const result = await (server as any).handleConsolidatedManage({
        operation: 'find-replace',
        source: 'vault',
        parameters: {
          replacements: [
            { search: 'old text', replace: 'new text' }
          ]
        }
      });

      expect((server as any).performFindReplace).toHaveBeenCalledWith(
        { replacements: [{ search: 'old text', replace: 'new text' }] },
        {}
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.totalReplacements).toBe(5);
    });

    it('should throw error when replacements array is missing', async () => {
      const result = await (server as any).handleConsolidatedManage({
        operation: 'find-replace',
        source: 'vault'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Replacements array is required');
    });
  });

  describe('handleConsolidatedManage - Dry Run Mode', () => {
    it('should handle dry run mode for any operation', async () => {
      vi.spyOn(server as any, 'previewOperation').mockReturnValue([
        'Move file from source.md to target.md',
        'Update all links pointing to this file'
      ]);

      const result = await (server as any).handleConsolidatedManage({
        operation: 'move',
        source: 'source.md',
        target: 'target.md',
        parameters: {},
        options: { dryRun: true }
      });

      expect((server as any).previewOperation).toHaveBeenCalledWith('move', 'source.md', 'target.md', {});

      const response = JSON.parse(result.content[0].text);
      expect(response.dryRun).toBe(true);
      expect(response.estimatedChanges).toHaveLength(2);
    });
  });

  describe('handleConsolidatedManage - Error Handling', () => {
    it('should handle unknown operation', async () => {
      const result = await (server as any).handleConsolidatedManage({
        operation: 'unknown',
        source: 'source.md'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown operation');
    });

    it('should handle operation errors gracefully', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      (obsidianAPI.getFileContent as any).mockRejectedValue(new Error('File not found'));

      const result = await (server as any).handleConsolidatedManage({
        operation: 'copy',
        source: 'nonexistent.md',
        target: 'target.md'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('File not found');
    });
  });
});