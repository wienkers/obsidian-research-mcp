import { obsidianAPI } from '../../integrations/obsidian-api.js';
import { cache } from '../../core/cache.js';
import { logger, logPerformance } from '../../core/logger.js';
import { config } from '../../core/config.js';

export interface SectionIdentifier {
  type: 'heading' | 'line_range' | 'pattern';
  value: string | { start: number; end: number };
  level?: number; // For headings
}

export interface NoteSection {
  identifier: string;
  title: string;
  content: string;
  startLine: number;
  endLine: number;
  level?: number;
  context?: {
    precedingSection?: string;
    followingSection?: string;
    parentSection?: string;
    subsections?: string[];
  };
  metadata: {
    wordCount: number;
    lineCount: number;
    hasSubsections: boolean;
    contentTypes: Array<'text' | 'code' | 'list' | 'table' | 'link' | 'embed'>;
  };
}

export interface NoteSectionsResult {
  path: string;
  title: string;
  sections: NoteSection[];
  outline: Array<{
    title: string;
    level: number;
    lineNumber: number;
    hasContent: boolean;
  }>;
  summary: {
    totalSections: number;
    totalWords: number;
    averageWordsPerSection: number;
    deepestLevel: number;
    longestSection: string;
    shortestSection: string;
  };
}

export interface SectionOperationsOptions {
  path: string;
  sectionIdentifiers?: Array<string | SectionIdentifier>;
  includeContext: boolean;
  includeMetadata: boolean;
  contextWindow?: number;
  minSectionLength?: number;
}

export class SectionOperationsManager {
  async getNoteSections(options: SectionOperationsOptions): Promise<NoteSectionsResult> {
    return logPerformance('section-operations', async () => {
      const cacheKey = `sections:${JSON.stringify(options)}`;
      const cached = await cache.get<NoteSectionsResult>(cacheKey);
      if (cached) {
        return cached;
      }

      logger.info('Extracting sections from note', { path: options.path });

      // Get note content
      const note = await obsidianAPI.getNote(options.path);
      const lines = note.content.split('\n');

      // Extract all sections
      const allSections = this.extractAllSections(lines, options);
      
      // Filter sections based on identifiers if provided
      const filteredSections = options.sectionIdentifiers 
        ? this.filterSections(allSections, options.sectionIdentifiers, note.content)
        : allSections;

      // Add context if requested
      if (options.includeContext) {
        this.addSectionContext(filteredSections, allSections, options);
      }

      // Build outline
      const outline = this.buildOutline(allSections);
      
      // Calculate summary
      const summary = this.calculateSummary(filteredSections);

      const result: NoteSectionsResult = {
        path: options.path,
        title: this.extractTitle(options.path, note.content),
        sections: filteredSections,
        outline,
        summary,
      };

      // Cache the result
      await cache.set(cacheKey, result, config.cacheTtl, [`file:${options.path}`]);

      return result;
    });
  }

  async getSectionContent(
    path: string, 
    sectionIdentifier: string | SectionIdentifier
  ): Promise<NoteSection | null> {
    const result = await this.getNoteSections({
      path,
      sectionIdentifiers: [sectionIdentifier],
      includeContext: true,
      includeMetadata: true,
    });

    return result.sections[0] || null;
  }

  async updateSection(
    path: string,
    sectionIdentifier: string | SectionIdentifier,
    newContent: string
  ): Promise<{ success: boolean; updatedSection?: NoteSection; error?: string }> {
    try {
      // Get current note content
      const note = await obsidianAPI.getNote(path);
      const lines = note.content.split('\n');
      
      // Find the section to update
      const sections = this.extractAllSections(lines, { 
        path, 
        includeContext: false, 
        includeMetadata: false 
      });
      
      const targetSection = this.findSectionByIdentifier(sections, sectionIdentifier, note.content);
      if (!targetSection) {
        return { success: false, error: 'Section not found' };
      }

      // Replace section content
      const newLines = [
        ...lines.slice(0, targetSection.startLine - 1),
        ...newContent.split('\n'),
        ...lines.slice(targetSection.endLine)
      ];

      // Update the file
      await obsidianAPI.updateFileContent(path, newLines.join('\n'));

      // Get updated section
      const updatedSections = this.extractAllSections(newLines, { 
        path, 
        includeContext: true, 
        includeMetadata: true 
      });
      
      const updatedSection = this.findSectionByIdentifier(updatedSections, sectionIdentifier, newLines.join('\n'));

      return { 
        success: true, 
        updatedSection: updatedSection || undefined 
      };
    } catch (error) {
      logger.error('Failed to update section', { error, path, sectionIdentifier });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  private extractAllSections(lines: string[], options: SectionOperationsOptions): NoteSection[] {
    const sections: NoteSection[] = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/;
    
    let currentSection: Partial<NoteSection> | null = null;
    let sectionContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(headingRegex);

      if (headingMatch) {
        // Save previous section if it exists
        if (currentSection) {
          this.finalizeSection(currentSection, sectionContent, sections, options);
        }

        // Start new section
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        
        currentSection = {
          identifier: title,
          title,
          startLine: i + 1,
          level,
        };
        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    }

    // Handle last section
    if (currentSection) {
      this.finalizeSection(currentSection, sectionContent, sections, options);
    }

    return sections;
  }

  private finalizeSection(
    section: Partial<NoteSection>,
    content: string[],
    sections: NoteSection[],
    options: SectionOperationsOptions
  ): void {
    const contentText = content.join('\n').trim();
    
    // Apply minimum length filter if specified
    if (options.minSectionLength && contentText.length < options.minSectionLength) {
      return;
    }

    const finalSection: NoteSection = {
      identifier: section.identifier!,
      title: section.title!,
      content: contentText,
      startLine: section.startLine!,
      endLine: section.startLine! + content.length,
      level: section.level,
      metadata: this.calculateSectionMetadata(contentText),
    };

    sections.push(finalSection);
  }

  private filterSections(
    allSections: NoteSection[],
    identifiers: Array<string | SectionIdentifier>,
    originalContent: string
  ): NoteSection[] {
    const filtered: NoteSection[] = [];

    for (const identifier of identifiers) {
      const section = this.findSectionByIdentifier(allSections, identifier, originalContent);
      if (section) {
        filtered.push(section);
      }
    }

    return filtered;
  }

  private findSectionByIdentifier(
    sections: NoteSection[],
    identifier: string | SectionIdentifier,
    originalContent?: string
  ): NoteSection | null {
    if (typeof identifier === 'string') {
      // Simple string matching - look for heading that contains this text
      return sections.find(section => 
        section.title.toLowerCase().includes(identifier.toLowerCase()) ||
        section.identifier.toLowerCase().includes(identifier.toLowerCase())
      ) || null;
    }

    switch (identifier.type) {
      case 'heading': {
        const headingValue = typeof identifier.value === 'string' 
          ? identifier.value 
          : String(identifier.value);
        return sections.find(section => {
          const titleMatch = section.title.toLowerCase().includes(headingValue.toLowerCase());
          const levelMatch = !identifier.level || section.level === identifier.level;
          return titleMatch && levelMatch;
        }) || null;
      }

      case 'line_range':
        if (typeof identifier.value === 'object' && identifier.value !== null && 'start' in identifier.value && originalContent) {
          const range = identifier.value as { start: number; end: number };
          const lines = originalContent.split('\n');
          const sectionLines = lines.slice(range.start - 1, range.end);
          const sectionContent = sectionLines.join('\n');
          
          return {
            identifier: `lines-${range.start}-${range.end}`,
            title: `Lines ${range.start}-${range.end}`,
            content: sectionContent,
            startLine: range.start,
            endLine: range.end,
            metadata: this.calculateSectionMetadata(sectionContent),
          };
        }
        break;

      case 'pattern': {
        if (originalContent) {
          const pattern = new RegExp(String(identifier.value), 'i');
          const lines = originalContent.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i])) {
              const headingMatch = lines[i].match(/^(#{1,6})\s+(.+)$/);
              if (headingMatch) {
                const title = headingMatch[2].trim();
                return sections.find(section => section.title === title) || null;
              }
            }
          }
        }
        // Fallback to original behavior if no originalContent provided
        const pattern = new RegExp(String(identifier.value), 'i');
        return sections.find(section => 
          pattern.test(section.title) || pattern.test(section.content)
        ) || null;
      }
    }

    return null;
  }

  private addSectionContext(
    sections: NoteSection[],
    allSections: NoteSection[],
    _options: SectionOperationsOptions
  ): void {
    for (const section of sections) {
      const sectionIndex = allSections.findIndex(s => s.identifier === section.identifier);
      if (sectionIndex === -1) continue;

      const context: NoteSection['context'] = {};

      // Find preceding section
      if (sectionIndex > 0) {
        context.precedingSection = allSections[sectionIndex - 1].title;
      }

      // Find following section
      if (sectionIndex < allSections.length - 1) {
        context.followingSection = allSections[sectionIndex + 1].title;
      }

      // Find parent section (higher level heading before this one)
      if (section.level) {
        for (let i = sectionIndex - 1; i >= 0; i--) {
          const potentialParent = allSections[i];
          if (potentialParent.level && potentialParent.level < section.level) {
            context.parentSection = potentialParent.title;
            break;
          }
        }
      }

      // Find subsections (lower level headings that follow)
      if (section.level) {
        const subsections: string[] = [];
        for (let i = sectionIndex + 1; i < allSections.length; i++) {
          const potentialSubsection = allSections[i];
          if (potentialSubsection.level && potentialSubsection.level <= section.level) {
            break; // Reached same or higher level, stop looking for subsections
          }
          if (potentialSubsection.level === section.level + 1) {
            subsections.push(potentialSubsection.title);
          }
        }
        if (subsections.length > 0) {
          context.subsections = subsections;
        }
      }

      section.context = context;
    }
  }

  private buildOutline(sections: NoteSection[]): NoteSectionsResult['outline'] {
    return sections.map(section => ({
      title: section.title,
      level: section.level || 1,
      lineNumber: section.startLine,
      hasContent: section.content.trim().length > 0,
    }));
  }

  private calculateSummary(sections: NoteSection[]): NoteSectionsResult['summary'] {
    if (sections.length === 0) {
      return {
        totalSections: 0,
        totalWords: 0,
        averageWordsPerSection: 0,
        deepestLevel: 0,
        longestSection: '',
        shortestSection: '',
      };
    }

    const totalWords = sections.reduce((sum, section) => sum + section.metadata.wordCount, 0);
    const averageWordsPerSection = totalWords / sections.length;
    const deepestLevel = Math.max(...sections.map(s => s.level || 1));
    
    // Find longest and shortest sections
    const sortedByWords = [...sections].sort((a, b) => b.metadata.wordCount - a.metadata.wordCount);
    const longestSection = sortedByWords[0]?.title || '';
    const shortestSection = sortedByWords[sortedByWords.length - 1]?.title || '';

    return {
      totalSections: sections.length,
      totalWords,
      averageWordsPerSection,
      deepestLevel,
      longestSection,
      shortestSection,
    };
  }

  private calculateSectionMetadata(content: string): NoteSection['metadata'] {
    const wordCount = this.calculateWordCount(content);
    const lineCount = content.split('\n').length;
    const hasSubsections = /^#{2,6}\s+/.test(content);
    
    const contentTypes: Array<'text' | 'code' | 'list' | 'table' | 'link' | 'embed'> = [];
    
    if (/```[\s\S]*?```/.test(content)) contentTypes.push('code');
    if (/^\s*[-*+]\s+/m.test(content) || /^\s*\d+\.\s+/m.test(content)) contentTypes.push('list');
    if (/\|.*\|/.test(content)) contentTypes.push('table');
    if (/\[\[.*?\]\]|\[.*?\]\(.*?\)/.test(content)) contentTypes.push('link');
    if (/!\[\[.*?\]\]/.test(content)) contentTypes.push('embed');
    if (contentTypes.length === 0 || content.trim().length > 0) contentTypes.push('text');

    return {
      wordCount,
      lineCount,
      hasSubsections,
      contentTypes,
    };
  }

  private calculateWordCount(content: string): number {
    // Remove markdown syntax for more accurate word count
    const cleanContent = content
      .replace(/!\[\[.*?\]\]/g, '') // Remove embeds
      .replace(/\[\[.*?\]\]/g, '') // Remove wiki links
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
      .replace(/^#{1,6}\s+/gm, '') // Remove headings
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`.*?`/g, '') // Remove inline code
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/^>\s+/gm, '') // Remove blockquotes
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
      .trim();

    // Count words (split by whitespace, filter empty strings)
    const words = cleanContent.split(/\s+/).filter(word => word.length > 0);
    return words.length;
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

export const sectionOperationsManager = new SectionOperationsManager();