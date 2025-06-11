import { z } from 'zod';
export const DateRangeSchema = z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
});
export const SearchFiltersSchema = z.object({
    tags: z.array(z.string()).optional(),
    folders: z.array(z.string()).optional(),
    linkedTo: z.array(z.string()).optional(),
    dateRange: DateRangeSchema.optional(),
    hasProperty: z.record(z.any()).optional(),
    fileTypes: z.array(z.string()).optional(),
});
export const HybridSearchParamsSchema = z.object({
    semanticQuery: z.string(),
    structuralFilters: SearchFiltersSchema.optional(),
    expandSearch: z.boolean().default(false),
    searchDepth: z.number().int().min(0).max(5).default(1),
    limit: z.number().int().min(1).max(500).default(50),
    semanticOnly: z.boolean().default(false),
    threshold: z.number().min(0).max(1).default(0.7),
});
export const SearchResultSchema = z.object({
    path: z.string(),
    title: z.string(),
    content: z.string().optional(),
    score: z.number(),
    relevanceType: z.enum(['semantic', 'structural', 'hybrid']),
    matchedTerms: z.array(z.string()).optional(),
    contextSnippets: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
});
export const ConceptQualitySchema = z.object({
    centrality: z.number().min(0).max(1),
    distinctiveness: z.number().min(0).max(1),
    coherence: z.number().min(0).max(1),
    completeness: z.number().min(0).max(1),
});
export const ConceptContextSchema = z.object({
    documentSection: z.string(),
    surroundingText: z.string(),
    headingHierarchy: z.array(z.string()),
    semanticNeighbors: z.array(z.string()),
    usage: z.enum(['definition', 'reference', 'argument', 'example']),
});
export const ConceptNodeSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(['note', 'tag', 'concept', 'citation', 'cluster']),
    weight: z.number(),
    properties: z.record(z.any()).optional(),
    position: z.object({
        x: z.number(),
        y: z.number(),
    }).optional(),
    quality: ConceptQualitySchema.optional(),
    contexts: z.array(ConceptContextSchema).optional(),
    centralityRank: z.number().optional(),
});
export const RelationshipEvidenceSchema = z.object({
    sourceFile: z.string(),
    context: z.string(),
    evidenceType: z.enum(['explicit', 'implicit', 'inferred']),
    strength: z.number().min(0).max(1),
});
export const ConceptEdgeSchema = z.object({
    source: z.string(),
    target: z.string(),
    type: z.enum(['explicit', 'semantic', 'co-occurrence', 'citation', 'hierarchical', 'causal', 'definitional', 'contradictory', 'supportive', 'exemplary', 'analogous']),
    strength: z.number().min(0).max(1),
    evidence: z.array(z.string()).optional(),
    bidirectional: z.boolean().default(false),
    relationshipType: z.enum(['hierarchical', 'causal', 'definitional', 'contradictory', 'supportive', 'exemplary', 'analogous']).optional(),
    relationshipEvidence: z.array(RelationshipEvidenceSchema).optional(),
    confidence: z.number().min(0).max(1).optional(),
    contextualStrength: z.number().min(0).max(1).optional(),
});
export const ConceptClusterSchema = z.object({
    id: z.string(),
    name: z.string(),
    nodes: z.array(z.string()),
    centroid: ConceptNodeSchema.optional(),
    coherence: z.number().min(0).max(1),
    themes: z.array(z.string()).optional(),
    insights: z.array(z.string()).optional(),
    keyConceptPaths: z.array(z.string()).optional(),
    conceptDensity: z.number().optional(),
});
export const ConceptAnalysisSchema = z.object({
    conceptHierarchy: z.record(z.array(z.string())).optional(),
    knowledgeGaps: z.array(z.string()).optional(),
    conceptEvolution: z.record(z.any()).optional(),
    crossReferences: z.array(z.object({
        concept: z.string(),
        references: z.array(z.string()),
    })).optional(),
    qualityDistribution: z.object({
        high: z.number(),
        medium: z.number(),
        low: z.number(),
    }).optional(),
});
export const ConceptRecommendationsSchema = z.object({
    explorationPaths: z.array(z.string()).optional(),
    missingConnections: z.array(z.object({
        concept1: z.string(),
        concept2: z.string(),
        reason: z.string(),
    })).optional(),
    strengthenableConcepts: z.array(z.string()).optional(),
    redundantConcepts: z.array(z.string()).optional(),
});
export const EnhancedConceptMapSummarySchema = z.object({
    conceptDiversity: z.number().optional(),
    knowledgeDepth: z.number().optional(),
    connectionDensity: z.number().optional(),
    topConceptsByQuality: z.array(z.object({
        concept: z.string(),
        qualityScore: z.number(),
    })).optional(),
    emergentThemes: z.array(z.string()).optional(),
});
export const ConceptMapSchema = z.object({
    nodes: z.array(ConceptNodeSchema),
    edges: z.array(ConceptEdgeSchema),
    clusters: z.array(ConceptClusterSchema).optional(),
    metadata: z.object({
        seedConcept: z.string(),
        generatedAt: z.string().datetime(),
        totalNodes: z.number(),
        totalEdges: z.number(),
    }),
    analysis: ConceptAnalysisSchema.optional(),
    recommendations: ConceptRecommendationsSchema.optional(),
    enhancedSummary: EnhancedConceptMapSummarySchema.optional(),
});
export const EvidenceSchema = z.object({
    id: z.string(),
    claim: z.string(),
    support: z.enum(['supporting', 'contradicting', 'neutral']),
    strength: z.number().min(0).max(1),
    source: z.string(),
    context: z.string(),
    extractedAt: z.string().datetime(),
});
export const SynthesisRequestSchema = z.object({
    researchQuestion: z.string(),
    scope: SearchFiltersSchema.optional(),
    synthesisType: z.enum(['literature-review', 'argument-map', 'evidence-summary', 'concept-synthesis']),
    outputTemplate: z.string().optional(),
    includeEvidence: z.boolean().default(true),
    maxSources: z.number().int().min(5).max(200).default(50),
});
export const CitationSchema = z.object({
    id: z.string(),
    type: z.enum(['book', 'article', 'webpage', 'thesis', 'conference', 'other']),
    title: z.string(),
    authors: z.array(z.string()).optional(),
    year: z.number().optional(),
    journal: z.string().optional(),
    doi: z.string().optional(),
    url: z.string().optional(),
    zoteroKey: z.string().optional(),
});
export const CitationContextSchema = z.object({
    noteId: z.string(),
    citation: CitationSchema,
    context: z.string(),
    relatedConcepts: z.array(z.string()).optional(),
    pageNumber: z.string().optional(),
});
// Semantic Chunking Schemas
export const ContentBoundarySchema = z.object({
    line: z.number(),
    column: z.number(),
    type: z.enum(['paragraph', 'section', 'list', 'codeblock', 'quote', 'table']),
});
export const HeadingPathSchema = z.object({
    level: z.number().min(1).max(6),
    text: z.string(),
    line: z.number(),
});
export const SemanticChunkSchema = z.object({
    id: z.string(),
    content: z.string(),
    boundaries: z.object({
        start: ContentBoundarySchema,
        end: ContentBoundarySchema,
        semantic: z.enum(['paragraph', 'section', 'list', 'codeblock', 'quote', 'table']),
    }),
    context: z.object({
        preceding: z.string(),
        following: z.string(),
        hierarchy: z.array(HeadingPathSchema),
        metadata: z.record(z.any()),
    }),
    embeddings: z.array(z.number()).optional(),
    tokens: z.number(),
});
export const ChunkOptionsSchema = z.object({
    minLength: z.number().default(100),
    maxLength: z.number().default(2000),
    overlapLength: z.number().default(200),
    preserveBoundaries: z.boolean().default(true),
    includeContext: z.boolean().default(true),
    contextWindow: z.number().default(512),
});
