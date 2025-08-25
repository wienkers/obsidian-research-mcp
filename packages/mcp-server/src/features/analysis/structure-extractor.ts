import { obsidianAPI } from '../../integrations/obsidian-api.js';
import { batchReader } from '../batch-operations/batch-reader.js';
import { cache } from '../../core/cache.js';
import { logger, logPerformance } from '../../core/logger.js';
import { config } from '../../core/config.js';

export type ExtractType = 'headings' | 'lists' | 'code_blocks' | 'tasks' | 'quotes' | 'tables' | 'links' | 'embeds';

export interface StructureElement {
  type: ExtractType;
  content: string;
  lineNumber: number;
  level?: number; // For headings and lists
  language?: string; // For code blocks
  completed?: boolean; // For tasks
  context?: {
    precedingText?: string;
    followingText?: string;
    parentHeading?: string;
  };
}

export interface FileStructure {
  path: string;
  title: string;
  hierarchy: StructureHierarchy;
  summary: {
    totalElements: number;
    byType: Record<ExtractType, number>;
    headingLevels: Record<number, number>;
    taskCompletion: {
      total: number;
      completed: number;
      percentage: number;
    };
  };
}

export interface StructureHierarchy {
  sections: Array<{
    heading: StructureElement;
    level: number;
    children: StructureElement[];
    subsections: StructureHierarchy['sections'];
  }>;
}

export interface StructureExtractionOptions {
  paths: string[];
  extractTypes: ExtractType[];
  includeHierarchy: boolean;
  includeContext: boolean;
  contextWindow?: number;
  minHeadingLevel?: number;
  maxHeadingLevel?: number;
}

export interface StructureExtractionResult {
  files: FileStructure[];
  aggregatedSummary: {
    totalFiles: number;
    totalElements: number;
    byType: Record<ExtractType, number>;
    commonPatterns: Array<{
      type: ExtractType;
      pattern: string;
      frequency: number;
    }>;
  };
}

export class StructureExtractor {
  async extractStructure(options: StructureExtractionOptions): Promise<StructureExtractionResult> {
    return logPerformance('structure-extraction', async () => {
      const cacheKey = `structure:${JSON.stringify(options)}`;
      const cached = await cache.get<StructureExtractionResult>(cacheKey);
      if (cached) {
        return cached;
      }

      logger.info('Extracting structure from files', { 
        fileCount: options.paths.length, 
        extractTypes: options.extractTypes 
      });

      // Process files to extract structure
      const files = await this.processFiles(options);
      
      // Calculate aggregated summary
      const aggregatedSummary = this.calculateAggregatedSummary(files);

      const result: StructureExtractionResult = {
        files,
        aggregatedSummary,
      };

      // Cache the result
      await cache.set(cacheKey, result, config.cacheTtl, 
        options.paths.map(path => `file:${path}`)
      );

      return result;
    });
  }

  private async processFiles(options: StructureExtractionOptions): Promise<FileStructure[]> {
    const results: FileStructure[] = [];

    // Read all files in batches
    const batchResults = await batchReader.readMultipleNotes(options.paths, {
      includeContent: true,
      includeMetadata: false,
    });

    for (const batchResult of batchResults) {
      if (!batchResult.success || !batchResult.note?.content) {
        logger.warn(`Failed to process file: ${batchResult.path}`);
        continue;
      }

      try {
        const fileStructure = await this.extractFileStructure(
          batchResult.path,
          batchResult.note.content,
          options
        );
        results.push(fileStructure);
      } catch (error) {
        logger.warn(`Failed to extract structure from: ${batchResult.path}`, { error });
      }
    }

    return results;
  }

  private async extractFileStructure(
    path: string,
    content: string,
    options: StructureExtractionOptions
  ): Promise<FileStructure> {
    const elements: StructureElement[] = [];
    const lines = content.split('\n');

    // Extract different types of structural elements
    // Note: Extract tasks BEFORE lists to avoid misclassification
    const prioritizedExtractTypes = [...options.extractTypes];
    if (prioritizedExtractTypes.includes('tasks') && prioritizedExtractTypes.includes('lists')) {
      // Remove tasks and lists from their current positions
      const filteredTypes = prioritizedExtractTypes.filter(t => t !== 'tasks' && t !== 'lists');
      // Add tasks first, then lists
      prioritizedExtractTypes.splice(0, prioritizedExtractTypes.length, ...filteredTypes);
      prioritizedExtractTypes.unshift('tasks', 'lists');
    }

    for (const extractType of prioritizedExtractTypes) {
      switch (extractType) {
        case 'headings':
          elements.push(...this.extractHeadings(lines, options));
          break;
        case 'lists':
          elements.push(...this.extractLists(lines, options));
          break;
        case 'code_blocks':
          elements.push(...this.extractCodeBlocks(lines, options));
          break;
        case 'tasks':
          elements.push(...this.extractTasks(lines, options));
          break;
        case 'quotes':
          elements.push(...this.extractQuotes(lines, options));
          break;
        case 'tables':
          elements.push(...this.extractTables(lines, options));
          break;
        case 'links':
          elements.push(...this.extractLinks(lines, options));
          break;
        case 'embeds':
          elements.push(...this.extractEmbeds(lines, options));
          break;
      }
    }

    // Sort elements by line number
    elements.sort((a, b) => a.lineNumber - b.lineNumber);

    // Add context if requested
    if (options.includeContext) {
      this.addContext(elements, lines, options.contextWindow || 2);
    }

    // Always build hierarchy
    const hierarchy = this.buildHierarchy(elements);

    // Calculate summary
    const summary = this.calculateFileSummary(elements);

    return {
      path,
      title: this.extractTitle(path, content),
      hierarchy,
      summary,
    };
  }

  private extractHeadings(lines: string[], options: StructureExtractionOptions): StructureElement[] {
    const elements: StructureElement[] = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/;

    lines.forEach((line, index) => {
      const match = line.match(headingRegex);
      if (match) {
        const level = match[1].length;
        
        // Apply level filters if specified
        if (options.minHeadingLevel && level < options.minHeadingLevel) return;
        if (options.maxHeadingLevel && level > options.maxHeadingLevel) return;

        elements.push({
          type: 'headings',
          content: line,
          lineNumber: index + 1,
          level,
        });
      }
    });

    return elements;
  }

  private extractLists(lines: string[], options: StructureExtractionOptions): StructureElement[] {
    const elements: StructureElement[] = [];
    const listRegex = /^(\s*)([-*+]|\d+\.)\s+(.+)$/;

    lines.forEach((line, index) => {
      const match = line.match(listRegex);
      if (match) {
        // Skip lines that are tasks (contain checkbox patterns)
        // This prevents tasks from being misclassified as lists
        const content = match[3];
        if (content.match(/^\[([^\]]*)\]\s/)) {
          return; // Skip task lines
        }
        
        const indentation = match[1].length;
        const level = Math.floor(indentation / 2) + 1; // Assuming 2-space indentation
        
        elements.push({
          type: 'lists',
          content: line,
          lineNumber: index + 1,
          level,
        });
      }
    });

    return elements;
  }

  private extractCodeBlocks(lines: string[], options: StructureExtractionOptions): StructureElement[] {
    const elements: StructureElement[] = [];
    let inCodeBlock = false;
    let codeBlockStart = 0;
    let codeBlockContent: string[] = [];
    let language = '';

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Start of code block
          inCodeBlock = true;
          codeBlockStart = index + 1;
          language = line.substring(3).trim();
          codeBlockContent = [];
        } else {
          // End of code block
          inCodeBlock = false;
          elements.push({
            type: 'code_blocks',
            content: `\`\`\`${language}\n${codeBlockContent.join('\n')}\n\`\`\``,
            lineNumber: codeBlockStart,
            language: language || undefined,
          });
        }
      } else if (inCodeBlock) {
        codeBlockContent.push(line);
      }
    });

    return elements;
  }

  private extractTasks(lines: string[], options: StructureExtractionOptions): StructureElement[] {
    const elements: StructureElement[] = [];
    // Updated regex to capture any checkbox state, not just [ ], [x], [X]
    const taskRegex = /^(\s*)([-*+])\s+\[([^\]]*)\]\s+(.+)$/;

    lines.forEach((line, index) => {
      const match = line.match(taskRegex);
      if (match) {
        const taskState = match[3];
        const completed = this.isTaskCompleted(taskState);
        const level = Math.floor(match[1].length / 2) + 1;
        
        elements.push({
          type: 'tasks',
          content: line,
          lineNumber: index + 1,
          level,
          completed,
        });
      }
    });

    return elements;
  }

  /**
   * Determine if a task is completed based on its checkbox state
   */
  private isTaskCompleted(taskState: string): boolean {
    // Standard completed states
    if (taskState.toLowerCase() === 'x') {
      return true;
    }
    
    // Extended completed states (some systems use these as "done")
    const completedStates = ['✓', '✔', '✅', 'done', 'DONE'];
    if (completedStates.includes(taskState)) {
      return true;
    }
    
    // All other states (including ' ', '/', '?', '!', etc.) are considered incomplete
    return false;
  }

  private extractQuotes(lines: string[], options: StructureExtractionOptions): StructureElement[] {
    const elements: StructureElement[] = [];
    const quoteRegex = /^>\s*(.+)$/;
    let currentQuote: string[] = [];
    let quoteStart = 0;

    lines.forEach((line, index) => {
      const match = line.match(quoteRegex);
      if (match) {
        if (currentQuote.length === 0) {
          quoteStart = index + 1;
        }
        currentQuote.push(line);
      } else if (currentQuote.length > 0) {
        // End of quote block
        elements.push({
          type: 'quotes',
          content: currentQuote.join('\n'),
          lineNumber: quoteStart,
        });
        currentQuote = [];
      }
    });

    // Handle quote block at end of file
    if (currentQuote.length > 0) {
      elements.push({
        type: 'quotes',
        content: currentQuote.join('\n'),
        lineNumber: quoteStart,
      });
    }

    return elements;
  }

  private extractTables(lines: string[], options: StructureExtractionOptions): StructureElement[] {
    const elements: StructureElement[] = [];
    let inTable = false;
    let tableStart = 0;
    let tableContent: string[] = [];

    lines.forEach((line, index) => {
      const isTableRow = this.isMarkdownTableRow(line);
      
      if (isTableRow) {
        if (!inTable) {
          inTable = true;
          tableStart = index + 1;
          tableContent = [];
        }
        tableContent.push(line);
      } else if (inTable) {
        // End of table - but validate it's actually a table
        if (this.isValidMarkdownTable(tableContent)) {
          elements.push({
            type: 'tables',
            content: tableContent.join('\n'),
            lineNumber: tableStart,
          });
        }
        inTable = false;
        tableContent = [];
      }
    });

    // Handle table at end of file
    if (inTable && tableContent.length > 0 && this.isValidMarkdownTable(tableContent)) {
      elements.push({
        type: 'tables',
        content: tableContent.join('\n'),
        lineNumber: tableStart,
      });
    }

    return elements;
  }

  /**
   * Check if a line could be part of a markdown table
   */
  private isMarkdownTableRow(line: string): boolean {
    const trimmed = line.trim();
    
    // Must contain pipes and not be empty
    if (!trimmed.includes('|') || trimmed.length === 0) {
      return false;
    }
    
    // Exclude common false positives
    if (
      // Wikilinks with aliases: [[file|alias]]
      /^\s*[-*+]\s+.*\[\[.*\|.*\]\]/.test(trimmed) ||
      
      // Code blocks or inline code with pipes
      trimmed.includes('`') && trimmed.includes('|') ||
      
      // Single pipe without table structure (at least 2 pipes for a table)
      (trimmed.match(/\|/g) || []).length < 2 ||
      
      // Lines that start with list markers followed by links
      /^\s*[-*+]\s+\[.*\]\(.*\)/.test(trimmed)
    ) {
      return false;
    }
    
    // Must have at least 2 pipe characters (table needs at least 2 columns)
    const pipeCount = (trimmed.match(/\|/g) || []).length;
    return pipeCount >= 2;
  }

  /**
   * Validate that collected lines form a proper markdown table
   */
  private isValidMarkdownTable(tableLines: string[]): boolean {
    if (tableLines.length < 2) {
      return false;
    }
    
    // Check if we have a header separator row (second line with dashes)
    const potentialSeparator = tableLines[1]?.trim();
    const hasSeparatorRow = potentialSeparator && 
      /^[\|\s\-:]+$/.test(potentialSeparator) && 
      potentialSeparator.includes('-');
    
    if (!hasSeparatorRow) {
      // If no separator row, ensure all lines have consistent pipe structure
      const firstLinePipes = (tableLines[0].match(/\|/g) || []).length;
      return tableLines.every(line => 
        (line.match(/\|/g) || []).length === firstLinePipes && firstLinePipes >= 2
      );
    }
    
    return true;
  }

  private extractLinks(lines: string[], options: StructureExtractionOptions): StructureElement[] {
    const elements: StructureElement[] = [];
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    lines.forEach((line, index) => {
      // Extract wiki links
      let match;
      while ((match = wikiLinkRegex.exec(line)) !== null) {
        elements.push({
          type: 'links',
          content: match[0],
          lineNumber: index + 1,
        });
      }

      // Extract markdown links
      while ((match = markdownLinkRegex.exec(line)) !== null) {
        elements.push({
          type: 'links',
          content: match[0],
          lineNumber: index + 1,
        });
      }
    });

    return elements;
  }

  private extractEmbeds(lines: string[], options: StructureExtractionOptions): StructureElement[] {
    const elements: StructureElement[] = [];
    const embedRegex = /!\[\[([^\]]+)\]\]/g;

    lines.forEach((line, index) => {
      let match;
      while ((match = embedRegex.exec(line)) !== null) {
        elements.push({
          type: 'embeds',
          content: match[0],
          lineNumber: index + 1,
        });
      }
    });

    return elements;
  }

  private addContext(
    elements: StructureElement[],
    lines: string[],
    contextWindow: number
  ): void {
    for (const element of elements) {
      const lineIndex = element.lineNumber - 1;
      
      // Get preceding context
      const precedingStart = Math.max(0, lineIndex - contextWindow);
      const precedingLines = lines.slice(precedingStart, lineIndex);
      const precedingText = precedingLines.join('\n').trim();

      // Get following context
      const followingEnd = Math.min(lines.length, lineIndex + contextWindow + 1);
      const followingLines = lines.slice(lineIndex + 1, followingEnd);
      const followingText = followingLines.join('\n').trim();

      // Find parent heading
      let parentHeading: string | undefined;
      for (let i = lineIndex - 1; i >= 0; i--) {
        const line = lines[i];
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch && (!element.level || headingMatch[1].length < element.level)) {
          parentHeading = headingMatch[0].trim();
          break;
        }
      }

      element.context = {
        precedingText: precedingText || undefined,
        followingText: followingText || undefined,
        parentHeading,
      };
    }
  }

  private buildHierarchy(elements: StructureElement[]): StructureHierarchy {
    const sections: StructureHierarchy['sections'] = [];
    const headings = elements.filter(e => e.type === 'headings');
    
    // Handle documents with no headings - create a virtual root section
    if (headings.length === 0) {
      const nonHeadingElements = elements.filter(e => e.type !== 'headings');
      if (nonHeadingElements.length > 0) {
        sections.push({
          heading: {
            type: 'headings',
            content: 'Document Content',
            lineNumber: 1,
            level: 1,
          },
          level: 1,
          children: nonHeadingElements,
          subsections: [],
        });
      }
      return { sections };
    }
    
    let currentSections: Array<{
      heading: StructureElement;
      level: number;
      children: StructureElement[];
      subsections: StructureHierarchy['sections'];
    }> = [];

    // Handle elements before first heading
    if (headings.length > 0) {
      const firstHeadingIndex = elements.indexOf(headings[0]);
      const elementsBeforeFirstHeading = elements.slice(0, firstHeadingIndex)
        .filter(e => e.type !== 'headings');
      
      if (elementsBeforeFirstHeading.length > 0) {
        sections.push({
          heading: {
            type: 'headings',
            content: 'Preamble',
            lineNumber: 1,
            level: 1,
          },
          level: 1,
          children: elementsBeforeFirstHeading,
          subsections: [],
        });
      }
    }

    for (const heading of headings) {
      const level = heading.level || 1;
      
      // Find elements between this heading and the next
      const headingIndex = elements.indexOf(heading);
      const nextHeadingIndex = headings.indexOf(heading) + 1;
      const nextHeading = nextHeadingIndex < headings.length ? headings[nextHeadingIndex] : null;
      const nextHeadingElementIndex = nextHeading ? elements.indexOf(nextHeading) : elements.length;
      
      const children = elements.slice(headingIndex + 1, nextHeadingElementIndex)
        .filter(e => e.type !== 'headings');

      const section = {
        heading,
        level,
        children,
        subsections: [],
      };

      // Find appropriate parent section
      while (currentSections.length > 0 && currentSections[currentSections.length - 1].level >= level) {
        currentSections.pop();
      }

      if (currentSections.length === 0) {
        sections.push(section);
      } else {
        currentSections[currentSections.length - 1].subsections.push(section);
      }

      currentSections.push(section);
    }

    return { sections };
  }

  private calculateFileSummary(elements: StructureElement[]): FileStructure['summary'] {
    const byType: Record<ExtractType, number> = {
      headings: 0,
      lists: 0,
      code_blocks: 0,
      tasks: 0,
      quotes: 0,
      tables: 0,
      links: 0,
      embeds: 0,
    };

    const headingLevels: Record<number, number> = {};
    let totalTasks = 0;
    let completedTasks = 0;

    for (const element of elements) {
      byType[element.type]++;

      if (element.type === 'headings' && element.level) {
        headingLevels[element.level] = (headingLevels[element.level] || 0) + 1;
      }

      if (element.type === 'tasks') {
        totalTasks++;
        if (element.completed) {
          completedTasks++;
        }
      }
    }

    return {
      totalElements: elements.length,
      byType,
      headingLevels,
      taskCompletion: {
        total: totalTasks,
        completed: completedTasks,
        percentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      },
    };
  }

  private calculateAggregatedSummary(files: FileStructure[]): StructureExtractionResult['aggregatedSummary'] {
    const byType: Record<ExtractType, number> = {
      headings: 0,
      lists: 0,
      code_blocks: 0,
      tasks: 0,
      quotes: 0,
      tables: 0,
      links: 0,
      embeds: 0,
    };

    let totalElements = 0;
    const patterns = new Map<string, number>();

    for (const file of files) {
      totalElements += file.summary.totalElements;
      
      for (const [type, count] of Object.entries(file.summary.byType)) {
        byType[type as ExtractType] += count;
      }

      // Collect common patterns from hierarchy
      const extractElementsFromHierarchy = (sections: StructureHierarchy['sections']): StructureElement[] => {
        const elements: StructureElement[] = [];
        for (const section of sections) {
          elements.push(section.heading);
          elements.push(...section.children);
          if (section.subsections.length > 0) {
            elements.push(...extractElementsFromHierarchy(section.subsections));
          }
        }
        return elements;
      };

      const elements = extractElementsFromHierarchy(file.hierarchy.sections);
      for (const element of elements) {
        if (element.type === 'headings' || element.type === 'lists') {
          const pattern = `${element.type}:level-${element.level}`;
          patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
        }
      }
    }

    // Find most common patterns
    const commonPatterns = Array.from(patterns.entries())
      .map(([pattern, frequency]) => {
        const [type, levelInfo] = pattern.split(':');
        return {
          type: type as ExtractType,
          pattern: levelInfo,
          frequency,
        };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return {
      totalFiles: files.length,
      totalElements,
      byType,
      commonPatterns,
    };
  }

  private extractTitle(path: string, content: string): string {
    // Try to extract title from first heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // Fall back to filename without extension
    return path.split('/').pop()?.replace(/\.[^/.]+$/, '') || path;
  }
}

export const structureExtractor = new StructureExtractor();