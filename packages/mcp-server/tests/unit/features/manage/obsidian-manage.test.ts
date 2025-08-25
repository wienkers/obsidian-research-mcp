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

    it('should never create backup files during copy operations', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      // Reset mocks completely
      vi.clearAllMocks();
      (obsidianAPI.getFileContent as any).mockReset();
      (obsidianAPI.createFile as any).mockReset();
      
      // Set up correct mock behavior for successful copy:
      // 1. First call: get source content (succeeds)
      // 2. Second call: check if target exists (fails - file not found)
      (obsidianAPI.getFileContent as any)
        .mockImplementationOnce(() => Promise.resolve('Source content')) // Source file exists
        .mockImplementationOnce(() => Promise.reject(new Error('File not found'))); // Target doesn't exist
      
      (obsidianAPI.createFile as any).mockResolvedValue(undefined);

      const result = await (server as any).handleConsolidatedManage({
        operation: 'copy',
        source: 'source.md',
        target: 'new-target.md',
        parameters: { overwrite: false },
        options: { createBackup: true } // This should be ignored for copy operations
      });

      const response = JSON.parse(result.content[0].text);

      // Debug: Check what actually happened
      console.log('Test 1 Response:', JSON.stringify(response, null, 2));

      // Verify operation succeeded
      expect(response.success).toBe(true);
      expect(response.operation).toBe('copy');
      
      // Verify only ONE call to createFile (for the actual copy, not backup)
      expect(obsidianAPI.createFile).toHaveBeenCalledTimes(1);
      expect(obsidianAPI.createFile).toHaveBeenCalledWith('new-target.md', 'Source content');

      // Ensure no backup files with timestamp pattern were created
      const createFileCalls = (obsidianAPI.createFile as any).mock.calls;
      for (const call of createFileCalls) {
        const [filePath] = call;
        expect(filePath).not.toMatch(/\.backup\.\d+$/);
      }
    });

    it('should never execute delete operation logic during copy operations', async () => {
      const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
      
      // Reset mocks completely
      vi.clearAllMocks();
      (obsidianAPI.getFileContent as any).mockReset();
      (obsidianAPI.createFile as any).mockReset();
      (obsidianAPI.deleteFile as any).mockReset();
      
      // Mock source content retrieval and target doesn't exist
      (obsidianAPI.getFileContent as any)
        .mockImplementationOnce(() => Promise.resolve('Source content')) // Source exists
        .mockImplementationOnce(() => Promise.reject(new Error('File not found'))); // Target doesn't exist
      
      (obsidianAPI.createFile as any).mockResolvedValue(undefined);
      (obsidianAPI.deleteFile as any).mockResolvedValue(undefined);

      // Spy on cleanupLinksAfterDelete to ensure it's never called
      const cleanupSpy = vi.spyOn(server as any, 'cleanupLinksAfterDelete').mockResolvedValue({
        linksCleanedUp: 0,
        filesUpdated: 0,
        updatedFiles: []
      });

      const result = await (server as any).handleConsolidatedManage({
        operation: 'copy',
        source: 'source.md',
        target: 'target.md'
      });

      // Verify delete-related operations were never called
      expect(obsidianAPI.deleteFile).not.toHaveBeenCalled();
      expect(cleanupSpy).not.toHaveBeenCalled();

      // Verify only copy-related operations were called
      expect(obsidianAPI.getFileContent).toHaveBeenCalledWith('source.md'); // Source read
      expect(obsidianAPI.createFile).toHaveBeenCalledWith('target.md', 'Source content'); // Target create

      const response = JSON.parse(result.content[0].text);
      
      // Debug: Check what actually happened
      console.log('Test 2 Response:', JSON.stringify(response, null, 2));
      
      expect(response.success).toBe(true);
      expect(response.operation).toBe('copy');
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

    describe('Case Preservation', () => {
      it('should preserve case when preserveCase is enabled (default)', async () => {
        const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
        
        // Mock file listing to return one test file
        (obsidianAPI.listFiles as any).mockResolvedValue([
          { path: 'test.md', isFolder: false }
        ]);
        
        // Mock file content with different case variations
        const originalContent = 'Content is important. The content matters. CONTENT EVERYWHERE.';
        (obsidianAPI.getFileContent as any).mockResolvedValue(originalContent);
        (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

        const result = await (server as any).handleConsolidatedManage({
          operation: 'find-replace',
          source: 'vault',
          parameters: {
            replacements: [
              { search: 'content', replace: 'material' }
            ],
            caseSensitive: false,
            preserveCase: true // Explicitly test default behavior
          }
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.totalReplacements).toBe(3);

        // Verify the replacement preserved case patterns
        const updateCall = (obsidianAPI.updateFileContent as any).mock.calls[0];
        const updatedContent = updateCall[1];
        
        // Check that case was preserved for each variation
        expect(updatedContent).toContain('Material is important'); // Content -> Material
        expect(updatedContent).toContain('The material matters'); // content -> material  
        expect(updatedContent).toContain('MATERIAL EVERYWHERE'); // CONTENT -> MATERIAL
      });

      it('should not preserve case when preserveCase is disabled', async () => {
        const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
        
        (obsidianAPI.listFiles as any).mockResolvedValue([
          { path: 'test.md', isFolder: false }
        ]);
        
        const originalContent = 'Content is important. The content matters.';
        (obsidianAPI.getFileContent as any).mockResolvedValue(originalContent);
        (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

        const result = await (server as any).handleConsolidatedManage({
          operation: 'find-replace',
          source: 'vault',
          parameters: {
            replacements: [
              { search: 'content', replace: 'material' }
            ],
            caseSensitive: false,
            preserveCase: false // Disable case preservation
          }
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);

        // Verify case was NOT preserved (all became lowercase)
        const updateCall = (obsidianAPI.updateFileContent as any).mock.calls[0];
        const updatedContent = updateCall[1];
        
        expect(updatedContent).toContain('material is important'); // Content -> material (not Material)
        expect(updatedContent).toContain('The material matters'); // content -> material
      });

      it('should not apply case preservation when caseSensitive is true', async () => {
        const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
        
        (obsidianAPI.listFiles as any).mockResolvedValue([
          { path: 'test.md', isFolder: false }
        ]);
        
        const originalContent = 'content is important. Content matters.';
        (obsidianAPI.getFileContent as any).mockResolvedValue(originalContent);
        (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

        const result = await (server as any).handleConsolidatedManage({
          operation: 'find-replace',
          source: 'vault',
          parameters: {
            replacements: [
              { search: 'content', replace: 'material' } // Only matches lowercase
            ],
            caseSensitive: true,
            preserveCase: true // Should be ignored when caseSensitive=true
          }
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.totalReplacements).toBe(1); // Only lowercase match

        const updateCall = (obsidianAPI.updateFileContent as any).mock.calls[0];
        const updatedContent = updateCall[1];
        
        expect(updatedContent).toContain('material is important'); // lowercase content -> material
        expect(updatedContent).toContain('Content matters'); // Content unchanged (no match)
      });

      it('should work with regex patterns and case preservation', async () => {
        const { obsidianAPI } = await import('../../../../src/integrations/obsidian-api.js');
        
        (obsidianAPI.listFiles as any).mockResolvedValue([
          { path: 'test.md', isFolder: false }
        ]);
        
        const originalContent = 'Target-123 and target-456 and TARGET-789';
        (obsidianAPI.getFileContent as any).mockResolvedValue(originalContent);
        (obsidianAPI.updateFileContent as any).mockResolvedValue(undefined);

        const result = await (server as any).handleConsolidatedManage({
          operation: 'find-replace',
          source: 'vault',
          parameters: {
            replacements: [
              { search: 'target', replace: 'reference' }
            ],
            useRegex: false, // Use literal string search
            caseSensitive: false,
            preserveCase: true
          }
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);

        const updateCall = (obsidianAPI.updateFileContent as any).mock.calls[0];
        const updatedContent = updateCall[1];
        
        expect(updatedContent).toContain('Reference-123'); // Target -> Reference
        expect(updatedContent).toContain('reference-456'); // target -> reference
        expect(updatedContent).toContain('REFERENCE-789'); // TARGET -> REFERENCE
      });
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