import { z } from 'zod';
export declare const DateRangeSchema: z.ZodObject<{
    start: z.ZodOptional<z.ZodString>;
    end: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    start?: string | undefined;
    end?: string | undefined;
}, {
    start?: string | undefined;
    end?: string | undefined;
}>;
export declare const SearchFiltersSchema: z.ZodObject<{
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    folders: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    linkedTo: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    dateRange: z.ZodOptional<z.ZodObject<{
        start: z.ZodOptional<z.ZodString>;
        end: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        start?: string | undefined;
        end?: string | undefined;
    }, {
        start?: string | undefined;
        end?: string | undefined;
    }>>;
    hasProperty: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    fileTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    tags?: string[] | undefined;
    folders?: string[] | undefined;
    linkedTo?: string[] | undefined;
    dateRange?: {
        start?: string | undefined;
        end?: string | undefined;
    } | undefined;
    hasProperty?: Record<string, any> | undefined;
    fileTypes?: string[] | undefined;
}, {
    tags?: string[] | undefined;
    folders?: string[] | undefined;
    linkedTo?: string[] | undefined;
    dateRange?: {
        start?: string | undefined;
        end?: string | undefined;
    } | undefined;
    hasProperty?: Record<string, any> | undefined;
    fileTypes?: string[] | undefined;
}>;
export declare const HybridSearchParamsSchema: z.ZodObject<{
    semanticQuery: z.ZodString;
    structuralFilters: z.ZodOptional<z.ZodObject<{
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        folders: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        linkedTo: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        dateRange: z.ZodOptional<z.ZodObject<{
            start: z.ZodOptional<z.ZodString>;
            end: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            start?: string | undefined;
            end?: string | undefined;
        }, {
            start?: string | undefined;
            end?: string | undefined;
        }>>;
        hasProperty: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        fileTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        linkedTo?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        hasProperty?: Record<string, any> | undefined;
        fileTypes?: string[] | undefined;
    }, {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        linkedTo?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        hasProperty?: Record<string, any> | undefined;
        fileTypes?: string[] | undefined;
    }>>;
    expandSearch: z.ZodDefault<z.ZodBoolean>;
    searchDepth: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    semanticOnly: z.ZodDefault<z.ZodBoolean>;
    threshold: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    semanticQuery: string;
    expandSearch: boolean;
    searchDepth: number;
    limit: number;
    semanticOnly: boolean;
    threshold: number;
    structuralFilters?: {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        linkedTo?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        hasProperty?: Record<string, any> | undefined;
        fileTypes?: string[] | undefined;
    } | undefined;
}, {
    semanticQuery: string;
    structuralFilters?: {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        linkedTo?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        hasProperty?: Record<string, any> | undefined;
        fileTypes?: string[] | undefined;
    } | undefined;
    expandSearch?: boolean | undefined;
    searchDepth?: number | undefined;
    limit?: number | undefined;
    semanticOnly?: boolean | undefined;
    threshold?: number | undefined;
}>;
export declare const SearchResultSchema: z.ZodObject<{
    path: z.ZodString;
    title: z.ZodString;
    content: z.ZodOptional<z.ZodString>;
    score: z.ZodNumber;
    relevanceType: z.ZodEnum<["semantic", "structural", "hybrid"]>;
    matchedTerms: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    contextSnippets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    title: string;
    score: number;
    relevanceType: "semantic" | "structural" | "hybrid";
    content?: string | undefined;
    matchedTerms?: string[] | undefined;
    contextSnippets?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    path: string;
    title: string;
    score: number;
    relevanceType: "semantic" | "structural" | "hybrid";
    content?: string | undefined;
    matchedTerms?: string[] | undefined;
    contextSnippets?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const ConceptQualitySchema: z.ZodObject<{
    centrality: z.ZodNumber;
    distinctiveness: z.ZodNumber;
    coherence: z.ZodNumber;
    completeness: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    centrality: number;
    distinctiveness: number;
    coherence: number;
    completeness: number;
}, {
    centrality: number;
    distinctiveness: number;
    coherence: number;
    completeness: number;
}>;
export declare const ConceptContextSchema: z.ZodObject<{
    documentSection: z.ZodString;
    surroundingText: z.ZodString;
    headingHierarchy: z.ZodArray<z.ZodString, "many">;
    semanticNeighbors: z.ZodArray<z.ZodString, "many">;
    usage: z.ZodEnum<["definition", "reference", "argument", "example"]>;
}, "strip", z.ZodTypeAny, {
    documentSection: string;
    surroundingText: string;
    headingHierarchy: string[];
    semanticNeighbors: string[];
    usage: "definition" | "reference" | "argument" | "example";
}, {
    documentSection: string;
    surroundingText: string;
    headingHierarchy: string[];
    semanticNeighbors: string[];
    usage: "definition" | "reference" | "argument" | "example";
}>;
export declare const ConceptNodeSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    type: z.ZodEnum<["note", "tag", "concept", "citation", "cluster"]>;
    weight: z.ZodNumber;
    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    position: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>>;
    quality: z.ZodOptional<z.ZodObject<{
        centrality: z.ZodNumber;
        distinctiveness: z.ZodNumber;
        coherence: z.ZodNumber;
        completeness: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        centrality: number;
        distinctiveness: number;
        coherence: number;
        completeness: number;
    }, {
        centrality: number;
        distinctiveness: number;
        coherence: number;
        completeness: number;
    }>>;
    contexts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        documentSection: z.ZodString;
        surroundingText: z.ZodString;
        headingHierarchy: z.ZodArray<z.ZodString, "many">;
        semanticNeighbors: z.ZodArray<z.ZodString, "many">;
        usage: z.ZodEnum<["definition", "reference", "argument", "example"]>;
    }, "strip", z.ZodTypeAny, {
        documentSection: string;
        surroundingText: string;
        headingHierarchy: string[];
        semanticNeighbors: string[];
        usage: "definition" | "reference" | "argument" | "example";
    }, {
        documentSection: string;
        surroundingText: string;
        headingHierarchy: string[];
        semanticNeighbors: string[];
        usage: "definition" | "reference" | "argument" | "example";
    }>, "many">>;
    centralityRank: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "note" | "tag" | "concept" | "citation" | "cluster";
    title: string;
    id: string;
    weight: number;
    properties?: Record<string, any> | undefined;
    position?: {
        x: number;
        y: number;
    } | undefined;
    quality?: {
        centrality: number;
        distinctiveness: number;
        coherence: number;
        completeness: number;
    } | undefined;
    contexts?: {
        documentSection: string;
        surroundingText: string;
        headingHierarchy: string[];
        semanticNeighbors: string[];
        usage: "definition" | "reference" | "argument" | "example";
    }[] | undefined;
    centralityRank?: number | undefined;
}, {
    type: "note" | "tag" | "concept" | "citation" | "cluster";
    title: string;
    id: string;
    weight: number;
    properties?: Record<string, any> | undefined;
    position?: {
        x: number;
        y: number;
    } | undefined;
    quality?: {
        centrality: number;
        distinctiveness: number;
        coherence: number;
        completeness: number;
    } | undefined;
    contexts?: {
        documentSection: string;
        surroundingText: string;
        headingHierarchy: string[];
        semanticNeighbors: string[];
        usage: "definition" | "reference" | "argument" | "example";
    }[] | undefined;
    centralityRank?: number | undefined;
}>;
export declare const RelationshipEvidenceSchema: z.ZodObject<{
    sourceFile: z.ZodString;
    context: z.ZodString;
    evidenceType: z.ZodEnum<["explicit", "implicit", "inferred"]>;
    strength: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    sourceFile: string;
    context: string;
    evidenceType: "explicit" | "implicit" | "inferred";
    strength: number;
}, {
    sourceFile: string;
    context: string;
    evidenceType: "explicit" | "implicit" | "inferred";
    strength: number;
}>;
export declare const ConceptEdgeSchema: z.ZodObject<{
    source: z.ZodString;
    target: z.ZodString;
    type: z.ZodEnum<["explicit", "semantic", "co-occurrence", "citation", "hierarchical", "causal", "definitional", "contradictory", "supportive", "exemplary", "analogous"]>;
    strength: z.ZodNumber;
    evidence: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    bidirectional: z.ZodDefault<z.ZodBoolean>;
    relationshipType: z.ZodOptional<z.ZodEnum<["hierarchical", "causal", "definitional", "contradictory", "supportive", "exemplary", "analogous"]>>;
    relationshipEvidence: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sourceFile: z.ZodString;
        context: z.ZodString;
        evidenceType: z.ZodEnum<["explicit", "implicit", "inferred"]>;
        strength: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sourceFile: string;
        context: string;
        evidenceType: "explicit" | "implicit" | "inferred";
        strength: number;
    }, {
        sourceFile: string;
        context: string;
        evidenceType: "explicit" | "implicit" | "inferred";
        strength: number;
    }>, "many">>;
    confidence: z.ZodOptional<z.ZodNumber>;
    contextualStrength: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "semantic" | "citation" | "explicit" | "co-occurrence" | "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous";
    strength: number;
    source: string;
    target: string;
    bidirectional: boolean;
    evidence?: string[] | undefined;
    relationshipType?: "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous" | undefined;
    relationshipEvidence?: {
        sourceFile: string;
        context: string;
        evidenceType: "explicit" | "implicit" | "inferred";
        strength: number;
    }[] | undefined;
    confidence?: number | undefined;
    contextualStrength?: number | undefined;
}, {
    type: "semantic" | "citation" | "explicit" | "co-occurrence" | "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous";
    strength: number;
    source: string;
    target: string;
    evidence?: string[] | undefined;
    bidirectional?: boolean | undefined;
    relationshipType?: "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous" | undefined;
    relationshipEvidence?: {
        sourceFile: string;
        context: string;
        evidenceType: "explicit" | "implicit" | "inferred";
        strength: number;
    }[] | undefined;
    confidence?: number | undefined;
    contextualStrength?: number | undefined;
}>;
export declare const ConceptClusterSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    nodes: z.ZodArray<z.ZodString, "many">;
    centroid: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        type: z.ZodEnum<["note", "tag", "concept", "citation", "cluster"]>;
        weight: z.ZodNumber;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        position: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>>;
        quality: z.ZodOptional<z.ZodObject<{
            centrality: z.ZodNumber;
            distinctiveness: z.ZodNumber;
            coherence: z.ZodNumber;
            completeness: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        }, {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        }>>;
        contexts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            documentSection: z.ZodString;
            surroundingText: z.ZodString;
            headingHierarchy: z.ZodArray<z.ZodString, "many">;
            semanticNeighbors: z.ZodArray<z.ZodString, "many">;
            usage: z.ZodEnum<["definition", "reference", "argument", "example"]>;
        }, "strip", z.ZodTypeAny, {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }, {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }>, "many">>;
        centralityRank: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "note" | "tag" | "concept" | "citation" | "cluster";
        title: string;
        id: string;
        weight: number;
        properties?: Record<string, any> | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        quality?: {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        } | undefined;
        contexts?: {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }[] | undefined;
        centralityRank?: number | undefined;
    }, {
        type: "note" | "tag" | "concept" | "citation" | "cluster";
        title: string;
        id: string;
        weight: number;
        properties?: Record<string, any> | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        quality?: {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        } | undefined;
        contexts?: {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }[] | undefined;
        centralityRank?: number | undefined;
    }>>;
    coherence: z.ZodNumber;
    themes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    insights: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    keyConceptPaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    conceptDensity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    coherence: number;
    id: string;
    name: string;
    nodes: string[];
    centroid?: {
        type: "note" | "tag" | "concept" | "citation" | "cluster";
        title: string;
        id: string;
        weight: number;
        properties?: Record<string, any> | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        quality?: {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        } | undefined;
        contexts?: {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }[] | undefined;
        centralityRank?: number | undefined;
    } | undefined;
    themes?: string[] | undefined;
    insights?: string[] | undefined;
    keyConceptPaths?: string[] | undefined;
    conceptDensity?: number | undefined;
}, {
    coherence: number;
    id: string;
    name: string;
    nodes: string[];
    centroid?: {
        type: "note" | "tag" | "concept" | "citation" | "cluster";
        title: string;
        id: string;
        weight: number;
        properties?: Record<string, any> | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        quality?: {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        } | undefined;
        contexts?: {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }[] | undefined;
        centralityRank?: number | undefined;
    } | undefined;
    themes?: string[] | undefined;
    insights?: string[] | undefined;
    keyConceptPaths?: string[] | undefined;
    conceptDensity?: number | undefined;
}>;
export declare const ConceptAnalysisSchema: z.ZodObject<{
    conceptHierarchy: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    knowledgeGaps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    conceptEvolution: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    crossReferences: z.ZodOptional<z.ZodArray<z.ZodObject<{
        concept: z.ZodString;
        references: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        concept: string;
        references: string[];
    }, {
        concept: string;
        references: string[];
    }>, "many">>;
    qualityDistribution: z.ZodOptional<z.ZodObject<{
        high: z.ZodNumber;
        medium: z.ZodNumber;
        low: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        high: number;
        medium: number;
        low: number;
    }, {
        high: number;
        medium: number;
        low: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    conceptHierarchy?: Record<string, string[]> | undefined;
    knowledgeGaps?: string[] | undefined;
    conceptEvolution?: Record<string, any> | undefined;
    crossReferences?: {
        concept: string;
        references: string[];
    }[] | undefined;
    qualityDistribution?: {
        high: number;
        medium: number;
        low: number;
    } | undefined;
}, {
    conceptHierarchy?: Record<string, string[]> | undefined;
    knowledgeGaps?: string[] | undefined;
    conceptEvolution?: Record<string, any> | undefined;
    crossReferences?: {
        concept: string;
        references: string[];
    }[] | undefined;
    qualityDistribution?: {
        high: number;
        medium: number;
        low: number;
    } | undefined;
}>;
export declare const ConceptRecommendationsSchema: z.ZodObject<{
    explorationPaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    missingConnections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        concept1: z.ZodString;
        concept2: z.ZodString;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        concept1: string;
        concept2: string;
        reason: string;
    }, {
        concept1: string;
        concept2: string;
        reason: string;
    }>, "many">>;
    strengthenableConcepts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    redundantConcepts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    explorationPaths?: string[] | undefined;
    missingConnections?: {
        concept1: string;
        concept2: string;
        reason: string;
    }[] | undefined;
    strengthenableConcepts?: string[] | undefined;
    redundantConcepts?: string[] | undefined;
}, {
    explorationPaths?: string[] | undefined;
    missingConnections?: {
        concept1: string;
        concept2: string;
        reason: string;
    }[] | undefined;
    strengthenableConcepts?: string[] | undefined;
    redundantConcepts?: string[] | undefined;
}>;
export declare const EnhancedConceptMapSummarySchema: z.ZodObject<{
    conceptDiversity: z.ZodOptional<z.ZodNumber>;
    knowledgeDepth: z.ZodOptional<z.ZodNumber>;
    connectionDensity: z.ZodOptional<z.ZodNumber>;
    topConceptsByQuality: z.ZodOptional<z.ZodArray<z.ZodObject<{
        concept: z.ZodString;
        qualityScore: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        concept: string;
        qualityScore: number;
    }, {
        concept: string;
        qualityScore: number;
    }>, "many">>;
    emergentThemes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    conceptDiversity?: number | undefined;
    knowledgeDepth?: number | undefined;
    connectionDensity?: number | undefined;
    topConceptsByQuality?: {
        concept: string;
        qualityScore: number;
    }[] | undefined;
    emergentThemes?: string[] | undefined;
}, {
    conceptDiversity?: number | undefined;
    knowledgeDepth?: number | undefined;
    connectionDensity?: number | undefined;
    topConceptsByQuality?: {
        concept: string;
        qualityScore: number;
    }[] | undefined;
    emergentThemes?: string[] | undefined;
}>;
export declare const ConceptMapSchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        type: z.ZodEnum<["note", "tag", "concept", "citation", "cluster"]>;
        weight: z.ZodNumber;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        position: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>>;
        quality: z.ZodOptional<z.ZodObject<{
            centrality: z.ZodNumber;
            distinctiveness: z.ZodNumber;
            coherence: z.ZodNumber;
            completeness: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        }, {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        }>>;
        contexts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            documentSection: z.ZodString;
            surroundingText: z.ZodString;
            headingHierarchy: z.ZodArray<z.ZodString, "many">;
            semanticNeighbors: z.ZodArray<z.ZodString, "many">;
            usage: z.ZodEnum<["definition", "reference", "argument", "example"]>;
        }, "strip", z.ZodTypeAny, {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }, {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }>, "many">>;
        centralityRank: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "note" | "tag" | "concept" | "citation" | "cluster";
        title: string;
        id: string;
        weight: number;
        properties?: Record<string, any> | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        quality?: {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        } | undefined;
        contexts?: {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }[] | undefined;
        centralityRank?: number | undefined;
    }, {
        type: "note" | "tag" | "concept" | "citation" | "cluster";
        title: string;
        id: string;
        weight: number;
        properties?: Record<string, any> | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        quality?: {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        } | undefined;
        contexts?: {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }[] | undefined;
        centralityRank?: number | undefined;
    }>, "many">;
    edges: z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        target: z.ZodString;
        type: z.ZodEnum<["explicit", "semantic", "co-occurrence", "citation", "hierarchical", "causal", "definitional", "contradictory", "supportive", "exemplary", "analogous"]>;
        strength: z.ZodNumber;
        evidence: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        bidirectional: z.ZodDefault<z.ZodBoolean>;
        relationshipType: z.ZodOptional<z.ZodEnum<["hierarchical", "causal", "definitional", "contradictory", "supportive", "exemplary", "analogous"]>>;
        relationshipEvidence: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sourceFile: z.ZodString;
            context: z.ZodString;
            evidenceType: z.ZodEnum<["explicit", "implicit", "inferred"]>;
            strength: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            sourceFile: string;
            context: string;
            evidenceType: "explicit" | "implicit" | "inferred";
            strength: number;
        }, {
            sourceFile: string;
            context: string;
            evidenceType: "explicit" | "implicit" | "inferred";
            strength: number;
        }>, "many">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        contextualStrength: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "semantic" | "citation" | "explicit" | "co-occurrence" | "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous";
        strength: number;
        source: string;
        target: string;
        bidirectional: boolean;
        evidence?: string[] | undefined;
        relationshipType?: "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous" | undefined;
        relationshipEvidence?: {
            sourceFile: string;
            context: string;
            evidenceType: "explicit" | "implicit" | "inferred";
            strength: number;
        }[] | undefined;
        confidence?: number | undefined;
        contextualStrength?: number | undefined;
    }, {
        type: "semantic" | "citation" | "explicit" | "co-occurrence" | "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous";
        strength: number;
        source: string;
        target: string;
        evidence?: string[] | undefined;
        bidirectional?: boolean | undefined;
        relationshipType?: "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous" | undefined;
        relationshipEvidence?: {
            sourceFile: string;
            context: string;
            evidenceType: "explicit" | "implicit" | "inferred";
            strength: number;
        }[] | undefined;
        confidence?: number | undefined;
        contextualStrength?: number | undefined;
    }>, "many">;
    clusters: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        nodes: z.ZodArray<z.ZodString, "many">;
        centroid: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            type: z.ZodEnum<["note", "tag", "concept", "citation", "cluster"]>;
            weight: z.ZodNumber;
            properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            position: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>>;
            quality: z.ZodOptional<z.ZodObject<{
                centrality: z.ZodNumber;
                distinctiveness: z.ZodNumber;
                coherence: z.ZodNumber;
                completeness: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                centrality: number;
                distinctiveness: number;
                coherence: number;
                completeness: number;
            }, {
                centrality: number;
                distinctiveness: number;
                coherence: number;
                completeness: number;
            }>>;
            contexts: z.ZodOptional<z.ZodArray<z.ZodObject<{
                documentSection: z.ZodString;
                surroundingText: z.ZodString;
                headingHierarchy: z.ZodArray<z.ZodString, "many">;
                semanticNeighbors: z.ZodArray<z.ZodString, "many">;
                usage: z.ZodEnum<["definition", "reference", "argument", "example"]>;
            }, "strip", z.ZodTypeAny, {
                documentSection: string;
                surroundingText: string;
                headingHierarchy: string[];
                semanticNeighbors: string[];
                usage: "definition" | "reference" | "argument" | "example";
            }, {
                documentSection: string;
                surroundingText: string;
                headingHierarchy: string[];
                semanticNeighbors: string[];
                usage: "definition" | "reference" | "argument" | "example";
            }>, "many">>;
            centralityRank: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type: "note" | "tag" | "concept" | "citation" | "cluster";
            title: string;
            id: string;
            weight: number;
            properties?: Record<string, any> | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            quality?: {
                centrality: number;
                distinctiveness: number;
                coherence: number;
                completeness: number;
            } | undefined;
            contexts?: {
                documentSection: string;
                surroundingText: string;
                headingHierarchy: string[];
                semanticNeighbors: string[];
                usage: "definition" | "reference" | "argument" | "example";
            }[] | undefined;
            centralityRank?: number | undefined;
        }, {
            type: "note" | "tag" | "concept" | "citation" | "cluster";
            title: string;
            id: string;
            weight: number;
            properties?: Record<string, any> | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            quality?: {
                centrality: number;
                distinctiveness: number;
                coherence: number;
                completeness: number;
            } | undefined;
            contexts?: {
                documentSection: string;
                surroundingText: string;
                headingHierarchy: string[];
                semanticNeighbors: string[];
                usage: "definition" | "reference" | "argument" | "example";
            }[] | undefined;
            centralityRank?: number | undefined;
        }>>;
        coherence: z.ZodNumber;
        themes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        insights: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        keyConceptPaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        conceptDensity: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        coherence: number;
        id: string;
        name: string;
        nodes: string[];
        centroid?: {
            type: "note" | "tag" | "concept" | "citation" | "cluster";
            title: string;
            id: string;
            weight: number;
            properties?: Record<string, any> | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            quality?: {
                centrality: number;
                distinctiveness: number;
                coherence: number;
                completeness: number;
            } | undefined;
            contexts?: {
                documentSection: string;
                surroundingText: string;
                headingHierarchy: string[];
                semanticNeighbors: string[];
                usage: "definition" | "reference" | "argument" | "example";
            }[] | undefined;
            centralityRank?: number | undefined;
        } | undefined;
        themes?: string[] | undefined;
        insights?: string[] | undefined;
        keyConceptPaths?: string[] | undefined;
        conceptDensity?: number | undefined;
    }, {
        coherence: number;
        id: string;
        name: string;
        nodes: string[];
        centroid?: {
            type: "note" | "tag" | "concept" | "citation" | "cluster";
            title: string;
            id: string;
            weight: number;
            properties?: Record<string, any> | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            quality?: {
                centrality: number;
                distinctiveness: number;
                coherence: number;
                completeness: number;
            } | undefined;
            contexts?: {
                documentSection: string;
                surroundingText: string;
                headingHierarchy: string[];
                semanticNeighbors: string[];
                usage: "definition" | "reference" | "argument" | "example";
            }[] | undefined;
            centralityRank?: number | undefined;
        } | undefined;
        themes?: string[] | undefined;
        insights?: string[] | undefined;
        keyConceptPaths?: string[] | undefined;
        conceptDensity?: number | undefined;
    }>, "many">>;
    metadata: z.ZodObject<{
        seedConcept: z.ZodString;
        generatedAt: z.ZodString;
        totalNodes: z.ZodNumber;
        totalEdges: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        seedConcept: string;
        generatedAt: string;
        totalNodes: number;
        totalEdges: number;
    }, {
        seedConcept: string;
        generatedAt: string;
        totalNodes: number;
        totalEdges: number;
    }>;
    analysis: z.ZodOptional<z.ZodObject<{
        conceptHierarchy: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        knowledgeGaps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        conceptEvolution: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        crossReferences: z.ZodOptional<z.ZodArray<z.ZodObject<{
            concept: z.ZodString;
            references: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            concept: string;
            references: string[];
        }, {
            concept: string;
            references: string[];
        }>, "many">>;
        qualityDistribution: z.ZodOptional<z.ZodObject<{
            high: z.ZodNumber;
            medium: z.ZodNumber;
            low: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            high: number;
            medium: number;
            low: number;
        }, {
            high: number;
            medium: number;
            low: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        conceptHierarchy?: Record<string, string[]> | undefined;
        knowledgeGaps?: string[] | undefined;
        conceptEvolution?: Record<string, any> | undefined;
        crossReferences?: {
            concept: string;
            references: string[];
        }[] | undefined;
        qualityDistribution?: {
            high: number;
            medium: number;
            low: number;
        } | undefined;
    }, {
        conceptHierarchy?: Record<string, string[]> | undefined;
        knowledgeGaps?: string[] | undefined;
        conceptEvolution?: Record<string, any> | undefined;
        crossReferences?: {
            concept: string;
            references: string[];
        }[] | undefined;
        qualityDistribution?: {
            high: number;
            medium: number;
            low: number;
        } | undefined;
    }>>;
    recommendations: z.ZodOptional<z.ZodObject<{
        explorationPaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        missingConnections: z.ZodOptional<z.ZodArray<z.ZodObject<{
            concept1: z.ZodString;
            concept2: z.ZodString;
            reason: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            concept1: string;
            concept2: string;
            reason: string;
        }, {
            concept1: string;
            concept2: string;
            reason: string;
        }>, "many">>;
        strengthenableConcepts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        redundantConcepts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        explorationPaths?: string[] | undefined;
        missingConnections?: {
            concept1: string;
            concept2: string;
            reason: string;
        }[] | undefined;
        strengthenableConcepts?: string[] | undefined;
        redundantConcepts?: string[] | undefined;
    }, {
        explorationPaths?: string[] | undefined;
        missingConnections?: {
            concept1: string;
            concept2: string;
            reason: string;
        }[] | undefined;
        strengthenableConcepts?: string[] | undefined;
        redundantConcepts?: string[] | undefined;
    }>>;
    enhancedSummary: z.ZodOptional<z.ZodObject<{
        conceptDiversity: z.ZodOptional<z.ZodNumber>;
        knowledgeDepth: z.ZodOptional<z.ZodNumber>;
        connectionDensity: z.ZodOptional<z.ZodNumber>;
        topConceptsByQuality: z.ZodOptional<z.ZodArray<z.ZodObject<{
            concept: z.ZodString;
            qualityScore: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            concept: string;
            qualityScore: number;
        }, {
            concept: string;
            qualityScore: number;
        }>, "many">>;
        emergentThemes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        conceptDiversity?: number | undefined;
        knowledgeDepth?: number | undefined;
        connectionDensity?: number | undefined;
        topConceptsByQuality?: {
            concept: string;
            qualityScore: number;
        }[] | undefined;
        emergentThemes?: string[] | undefined;
    }, {
        conceptDiversity?: number | undefined;
        knowledgeDepth?: number | undefined;
        connectionDensity?: number | undefined;
        topConceptsByQuality?: {
            concept: string;
            qualityScore: number;
        }[] | undefined;
        emergentThemes?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        seedConcept: string;
        generatedAt: string;
        totalNodes: number;
        totalEdges: number;
    };
    nodes: {
        type: "note" | "tag" | "concept" | "citation" | "cluster";
        title: string;
        id: string;
        weight: number;
        properties?: Record<string, any> | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        quality?: {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        } | undefined;
        contexts?: {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }[] | undefined;
        centralityRank?: number | undefined;
    }[];
    edges: {
        type: "semantic" | "citation" | "explicit" | "co-occurrence" | "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous";
        strength: number;
        source: string;
        target: string;
        bidirectional: boolean;
        evidence?: string[] | undefined;
        relationshipType?: "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous" | undefined;
        relationshipEvidence?: {
            sourceFile: string;
            context: string;
            evidenceType: "explicit" | "implicit" | "inferred";
            strength: number;
        }[] | undefined;
        confidence?: number | undefined;
        contextualStrength?: number | undefined;
    }[];
    clusters?: {
        coherence: number;
        id: string;
        name: string;
        nodes: string[];
        centroid?: {
            type: "note" | "tag" | "concept" | "citation" | "cluster";
            title: string;
            id: string;
            weight: number;
            properties?: Record<string, any> | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            quality?: {
                centrality: number;
                distinctiveness: number;
                coherence: number;
                completeness: number;
            } | undefined;
            contexts?: {
                documentSection: string;
                surroundingText: string;
                headingHierarchy: string[];
                semanticNeighbors: string[];
                usage: "definition" | "reference" | "argument" | "example";
            }[] | undefined;
            centralityRank?: number | undefined;
        } | undefined;
        themes?: string[] | undefined;
        insights?: string[] | undefined;
        keyConceptPaths?: string[] | undefined;
        conceptDensity?: number | undefined;
    }[] | undefined;
    analysis?: {
        conceptHierarchy?: Record<string, string[]> | undefined;
        knowledgeGaps?: string[] | undefined;
        conceptEvolution?: Record<string, any> | undefined;
        crossReferences?: {
            concept: string;
            references: string[];
        }[] | undefined;
        qualityDistribution?: {
            high: number;
            medium: number;
            low: number;
        } | undefined;
    } | undefined;
    recommendations?: {
        explorationPaths?: string[] | undefined;
        missingConnections?: {
            concept1: string;
            concept2: string;
            reason: string;
        }[] | undefined;
        strengthenableConcepts?: string[] | undefined;
        redundantConcepts?: string[] | undefined;
    } | undefined;
    enhancedSummary?: {
        conceptDiversity?: number | undefined;
        knowledgeDepth?: number | undefined;
        connectionDensity?: number | undefined;
        topConceptsByQuality?: {
            concept: string;
            qualityScore: number;
        }[] | undefined;
        emergentThemes?: string[] | undefined;
    } | undefined;
}, {
    metadata: {
        seedConcept: string;
        generatedAt: string;
        totalNodes: number;
        totalEdges: number;
    };
    nodes: {
        type: "note" | "tag" | "concept" | "citation" | "cluster";
        title: string;
        id: string;
        weight: number;
        properties?: Record<string, any> | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        quality?: {
            centrality: number;
            distinctiveness: number;
            coherence: number;
            completeness: number;
        } | undefined;
        contexts?: {
            documentSection: string;
            surroundingText: string;
            headingHierarchy: string[];
            semanticNeighbors: string[];
            usage: "definition" | "reference" | "argument" | "example";
        }[] | undefined;
        centralityRank?: number | undefined;
    }[];
    edges: {
        type: "semantic" | "citation" | "explicit" | "co-occurrence" | "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous";
        strength: number;
        source: string;
        target: string;
        evidence?: string[] | undefined;
        bidirectional?: boolean | undefined;
        relationshipType?: "hierarchical" | "causal" | "definitional" | "contradictory" | "supportive" | "exemplary" | "analogous" | undefined;
        relationshipEvidence?: {
            sourceFile: string;
            context: string;
            evidenceType: "explicit" | "implicit" | "inferred";
            strength: number;
        }[] | undefined;
        confidence?: number | undefined;
        contextualStrength?: number | undefined;
    }[];
    clusters?: {
        coherence: number;
        id: string;
        name: string;
        nodes: string[];
        centroid?: {
            type: "note" | "tag" | "concept" | "citation" | "cluster";
            title: string;
            id: string;
            weight: number;
            properties?: Record<string, any> | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            quality?: {
                centrality: number;
                distinctiveness: number;
                coherence: number;
                completeness: number;
            } | undefined;
            contexts?: {
                documentSection: string;
                surroundingText: string;
                headingHierarchy: string[];
                semanticNeighbors: string[];
                usage: "definition" | "reference" | "argument" | "example";
            }[] | undefined;
            centralityRank?: number | undefined;
        } | undefined;
        themes?: string[] | undefined;
        insights?: string[] | undefined;
        keyConceptPaths?: string[] | undefined;
        conceptDensity?: number | undefined;
    }[] | undefined;
    analysis?: {
        conceptHierarchy?: Record<string, string[]> | undefined;
        knowledgeGaps?: string[] | undefined;
        conceptEvolution?: Record<string, any> | undefined;
        crossReferences?: {
            concept: string;
            references: string[];
        }[] | undefined;
        qualityDistribution?: {
            high: number;
            medium: number;
            low: number;
        } | undefined;
    } | undefined;
    recommendations?: {
        explorationPaths?: string[] | undefined;
        missingConnections?: {
            concept1: string;
            concept2: string;
            reason: string;
        }[] | undefined;
        strengthenableConcepts?: string[] | undefined;
        redundantConcepts?: string[] | undefined;
    } | undefined;
    enhancedSummary?: {
        conceptDiversity?: number | undefined;
        knowledgeDepth?: number | undefined;
        connectionDensity?: number | undefined;
        topConceptsByQuality?: {
            concept: string;
            qualityScore: number;
        }[] | undefined;
        emergentThemes?: string[] | undefined;
    } | undefined;
}>;
export declare const EvidenceSchema: z.ZodObject<{
    id: z.ZodString;
    claim: z.ZodString;
    support: z.ZodEnum<["supporting", "contradicting", "neutral"]>;
    strength: z.ZodNumber;
    source: z.ZodString;
    context: z.ZodString;
    extractedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    context: string;
    strength: number;
    source: string;
    claim: string;
    support: "supporting" | "contradicting" | "neutral";
    extractedAt: string;
}, {
    id: string;
    context: string;
    strength: number;
    source: string;
    claim: string;
    support: "supporting" | "contradicting" | "neutral";
    extractedAt: string;
}>;
export declare const SynthesisRequestSchema: z.ZodObject<{
    researchQuestion: z.ZodString;
    scope: z.ZodOptional<z.ZodObject<{
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        folders: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        linkedTo: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        dateRange: z.ZodOptional<z.ZodObject<{
            start: z.ZodOptional<z.ZodString>;
            end: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            start?: string | undefined;
            end?: string | undefined;
        }, {
            start?: string | undefined;
            end?: string | undefined;
        }>>;
        hasProperty: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        fileTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        linkedTo?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        hasProperty?: Record<string, any> | undefined;
        fileTypes?: string[] | undefined;
    }, {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        linkedTo?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        hasProperty?: Record<string, any> | undefined;
        fileTypes?: string[] | undefined;
    }>>;
    synthesisType: z.ZodEnum<["literature-review", "argument-map", "evidence-summary", "concept-synthesis"]>;
    outputTemplate: z.ZodOptional<z.ZodString>;
    includeEvidence: z.ZodDefault<z.ZodBoolean>;
    maxSources: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    researchQuestion: string;
    synthesisType: "literature-review" | "argument-map" | "evidence-summary" | "concept-synthesis";
    includeEvidence: boolean;
    maxSources: number;
    scope?: {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        linkedTo?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        hasProperty?: Record<string, any> | undefined;
        fileTypes?: string[] | undefined;
    } | undefined;
    outputTemplate?: string | undefined;
}, {
    researchQuestion: string;
    synthesisType: "literature-review" | "argument-map" | "evidence-summary" | "concept-synthesis";
    scope?: {
        tags?: string[] | undefined;
        folders?: string[] | undefined;
        linkedTo?: string[] | undefined;
        dateRange?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        hasProperty?: Record<string, any> | undefined;
        fileTypes?: string[] | undefined;
    } | undefined;
    outputTemplate?: string | undefined;
    includeEvidence?: boolean | undefined;
    maxSources?: number | undefined;
}>;
export declare const CitationSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["book", "article", "webpage", "thesis", "conference", "other"]>;
    title: z.ZodString;
    authors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    year: z.ZodOptional<z.ZodNumber>;
    journal: z.ZodOptional<z.ZodString>;
    doi: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    zoteroKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "book" | "article" | "webpage" | "thesis" | "conference" | "other";
    title: string;
    id: string;
    authors?: string[] | undefined;
    year?: number | undefined;
    journal?: string | undefined;
    doi?: string | undefined;
    url?: string | undefined;
    zoteroKey?: string | undefined;
}, {
    type: "book" | "article" | "webpage" | "thesis" | "conference" | "other";
    title: string;
    id: string;
    authors?: string[] | undefined;
    year?: number | undefined;
    journal?: string | undefined;
    doi?: string | undefined;
    url?: string | undefined;
    zoteroKey?: string | undefined;
}>;
export declare const CitationContextSchema: z.ZodObject<{
    noteId: z.ZodString;
    citation: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["book", "article", "webpage", "thesis", "conference", "other"]>;
        title: z.ZodString;
        authors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        year: z.ZodOptional<z.ZodNumber>;
        journal: z.ZodOptional<z.ZodString>;
        doi: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        zoteroKey: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "book" | "article" | "webpage" | "thesis" | "conference" | "other";
        title: string;
        id: string;
        authors?: string[] | undefined;
        year?: number | undefined;
        journal?: string | undefined;
        doi?: string | undefined;
        url?: string | undefined;
        zoteroKey?: string | undefined;
    }, {
        type: "book" | "article" | "webpage" | "thesis" | "conference" | "other";
        title: string;
        id: string;
        authors?: string[] | undefined;
        year?: number | undefined;
        journal?: string | undefined;
        doi?: string | undefined;
        url?: string | undefined;
        zoteroKey?: string | undefined;
    }>;
    context: z.ZodString;
    relatedConcepts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    pageNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    citation: {
        type: "book" | "article" | "webpage" | "thesis" | "conference" | "other";
        title: string;
        id: string;
        authors?: string[] | undefined;
        year?: number | undefined;
        journal?: string | undefined;
        doi?: string | undefined;
        url?: string | undefined;
        zoteroKey?: string | undefined;
    };
    context: string;
    noteId: string;
    relatedConcepts?: string[] | undefined;
    pageNumber?: string | undefined;
}, {
    citation: {
        type: "book" | "article" | "webpage" | "thesis" | "conference" | "other";
        title: string;
        id: string;
        authors?: string[] | undefined;
        year?: number | undefined;
        journal?: string | undefined;
        doi?: string | undefined;
        url?: string | undefined;
        zoteroKey?: string | undefined;
    };
    context: string;
    noteId: string;
    relatedConcepts?: string[] | undefined;
    pageNumber?: string | undefined;
}>;
export declare const ContentBoundarySchema: z.ZodObject<{
    line: z.ZodNumber;
    column: z.ZodNumber;
    type: z.ZodEnum<["paragraph", "section", "list", "codeblock", "quote", "table"]>;
}, "strip", z.ZodTypeAny, {
    type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
    line: number;
    column: number;
}, {
    type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
    line: number;
    column: number;
}>;
export declare const HeadingPathSchema: z.ZodObject<{
    level: z.ZodNumber;
    text: z.ZodString;
    line: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    line: number;
    level: number;
    text: string;
}, {
    line: number;
    level: number;
    text: string;
}>;
export declare const SemanticChunkSchema: z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    boundaries: z.ZodObject<{
        start: z.ZodObject<{
            line: z.ZodNumber;
            column: z.ZodNumber;
            type: z.ZodEnum<["paragraph", "section", "list", "codeblock", "quote", "table"]>;
        }, "strip", z.ZodTypeAny, {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        }, {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        }>;
        end: z.ZodObject<{
            line: z.ZodNumber;
            column: z.ZodNumber;
            type: z.ZodEnum<["paragraph", "section", "list", "codeblock", "quote", "table"]>;
        }, "strip", z.ZodTypeAny, {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        }, {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        }>;
        semantic: z.ZodEnum<["paragraph", "section", "list", "codeblock", "quote", "table"]>;
    }, "strip", z.ZodTypeAny, {
        start: {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        };
        end: {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        };
        semantic: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
    }, {
        start: {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        };
        end: {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        };
        semantic: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
    }>;
    context: z.ZodObject<{
        preceding: z.ZodString;
        following: z.ZodString;
        hierarchy: z.ZodArray<z.ZodObject<{
            level: z.ZodNumber;
            text: z.ZodString;
            line: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            line: number;
            level: number;
            text: string;
        }, {
            line: number;
            level: number;
            text: string;
        }>, "many">;
        metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        metadata: Record<string, any>;
        preceding: string;
        following: string;
        hierarchy: {
            line: number;
            level: number;
            text: string;
        }[];
    }, {
        metadata: Record<string, any>;
        preceding: string;
        following: string;
        hierarchy: {
            line: number;
            level: number;
            text: string;
        }[];
    }>;
    embeddings: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    tokens: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    content: string;
    id: string;
    context: {
        metadata: Record<string, any>;
        preceding: string;
        following: string;
        hierarchy: {
            line: number;
            level: number;
            text: string;
        }[];
    };
    boundaries: {
        start: {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        };
        end: {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        };
        semantic: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
    };
    tokens: number;
    embeddings?: number[] | undefined;
}, {
    content: string;
    id: string;
    context: {
        metadata: Record<string, any>;
        preceding: string;
        following: string;
        hierarchy: {
            line: number;
            level: number;
            text: string;
        }[];
    };
    boundaries: {
        start: {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        };
        end: {
            type: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
            line: number;
            column: number;
        };
        semantic: "paragraph" | "section" | "list" | "codeblock" | "quote" | "table";
    };
    tokens: number;
    embeddings?: number[] | undefined;
}>;
export declare const ChunkOptionsSchema: z.ZodObject<{
    minLength: z.ZodDefault<z.ZodNumber>;
    maxLength: z.ZodDefault<z.ZodNumber>;
    overlapLength: z.ZodDefault<z.ZodNumber>;
    preserveBoundaries: z.ZodDefault<z.ZodBoolean>;
    includeContext: z.ZodDefault<z.ZodBoolean>;
    contextWindow: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    minLength: number;
    maxLength: number;
    overlapLength: number;
    preserveBoundaries: boolean;
    includeContext: boolean;
    contextWindow: number;
}, {
    minLength?: number | undefined;
    maxLength?: number | undefined;
    overlapLength?: number | undefined;
    preserveBoundaries?: boolean | undefined;
    includeContext?: boolean | undefined;
    contextWindow?: number | undefined;
}>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type HybridSearchParams = z.infer<typeof HybridSearchParamsSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type ConceptQuality = z.infer<typeof ConceptQualitySchema>;
export type ConceptContext = z.infer<typeof ConceptContextSchema>;
export type RelationshipEvidence = z.infer<typeof RelationshipEvidenceSchema>;
export type ConceptNode = z.infer<typeof ConceptNodeSchema>;
export type ConceptEdge = z.infer<typeof ConceptEdgeSchema>;
export type ConceptCluster = z.infer<typeof ConceptClusterSchema>;
export type ConceptAnalysis = z.infer<typeof ConceptAnalysisSchema>;
export type ConceptRecommendations = z.infer<typeof ConceptRecommendationsSchema>;
export type EnhancedConceptMapSummary = z.infer<typeof EnhancedConceptMapSummarySchema>;
export type ConceptMap = z.infer<typeof ConceptMapSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type SynthesisRequest = z.infer<typeof SynthesisRequestSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type CitationContext = z.infer<typeof CitationContextSchema>;
export type ContentBoundary = z.infer<typeof ContentBoundarySchema>;
export type HeadingPath = z.infer<typeof HeadingPathSchema>;
export type SemanticChunk = z.infer<typeof SemanticChunkSchema>;
export type ChunkOptions = z.infer<typeof ChunkOptionsSchema>;
//# sourceMappingURL=core.d.ts.map