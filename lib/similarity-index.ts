import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { decideToolSimilarity, embedSimilarityDocument, SIMILARITY_EMBEDDING_DIMENSIONS } from "@/lib/foundry-similarity";
import { isSimilarityCandidate, SimilarityServiceError, type SimilarityCandidate, type SimilarityDocument, type SimilarityServices } from "@/lib/tool-similarity";

const INDEX_BATCH_SIZE = 3;

// Separate vectors when the resource, deployment, dimensions, or text format changes.
export function getSimilarityEmbeddingKey(): string {
    const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT;
    if (!endpoint) throw new SimilarityServiceError("not_configured");
    const configuration = JSON.stringify([
        endpoint.replace(/\/+$/, ""),
        process.env.AZURE_EMBEDDING_DEPLOYMENT || "text-embedding-3-small",
        SIMILARITY_EMBEDDING_DIMENSIONS,
        "text-v1",
    ]);
    return createHash("sha256").update(configuration).digest("hex");
}

interface IndexDocument {
    id: string;
    source_hash: string;
    document: SimilarityDocument;
}

function isIndexDocument(value: unknown): value is IndexDocument {
    if (typeof value !== "object" || value === null || !("document" in value) || !("id" in value)) return false;
    return (
        typeof value.id === "string" &&
        "source_hash" in value && typeof value.source_hash === "string" && /^[a-f0-9]{32}$/.test(value.source_hash) &&
        typeof value.document === "object" && value.document !== null &&
        isSimilarityCandidate({ ...value.document, id: value.id })
    );
}

export async function indexPublishedTools(supabase: SupabaseClient): Promise<{ indexed: number; hasMore: boolean }> {
    const embeddingKey = getSimilarityEmbeddingKey();
    const { data, error } = await supabase.rpc("get_pending_similarity_documents", {
        p_embedding_key: embeddingKey,
        p_limit: INDEX_BATCH_SIZE + 1,
    });
    if (error) throw new SimilarityServiceError("unavailable");
    const rows: unknown = data;
    if (!Array.isArray(rows) || !rows.every(isIndexDocument)) throw new SimilarityServiceError("invalid_response");
    let indexed = 0;
    for (const row of rows.slice(0, INDEX_BATCH_SIZE)) {
        const embedding = await embedSimilarityDocument(row.document);
        const { data: saved, error: saveError } = await supabase.rpc("save_similarity_embedding", {
            p_tool_id: row.id,
            p_source_hash: row.source_hash,
            p_embedding_key: embeddingKey,
            p_embedding: embedding,
        });
        if (saveError) throw new SimilarityServiceError("unavailable");
        // A catalog edit during embedding must be retried, not marked indexed.
        if (saved !== true) throw new SimilarityServiceError("index_incomplete");
        indexed++;
    }
    return { indexed, hasMore: rows.length > INDEX_BATCH_SIZE };
}

export async function retrieveSimilarTools(supabase: SupabaseClient, document: SimilarityDocument, limit: number): Promise<SimilarityCandidate[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw new SimilarityServiceError("invalid_response");
    const embeddingKey = getSimilarityEmbeddingKey();
    const embedding = await embedSimilarityDocument(document);
    const { data, error } = await supabase.rpc("match_similar_tools", {
        p_embedding: embedding,
        p_embedding_key: embeddingKey,
        p_exclude_package: document.packageName.trim().toLowerCase(),
        p_limit: limit,
    });
    if (error) throw new SimilarityServiceError(error.code === "P0001" && error.message === "similarity_index_incomplete" ? "index_incomplete" : "unavailable");
    const candidates: unknown = data;
    if (!Array.isArray(candidates) || candidates.length > limit || !candidates.every(isSimilarityCandidate)) {
        throw new SimilarityServiceError("invalid_response");
    }
    return candidates;
}

export function createSimilarityServices(supabase: SupabaseClient): SimilarityServices {
    return {
        retrieve: (document, limit) => retrieveSimilarTools(supabase, document, limit),
        decide: decideToolSimilarity,
    };
}
