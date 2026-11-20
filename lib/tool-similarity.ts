export const SIMILARITY_OVERRIDE_THRESHOLD = 0.9;
export const SIMILARITY_POLICY_VERSION = "1";
export const SIMILARITY_CANDIDATE_LIMIT = 5;

export interface SimilarityDocument {
    packageName: string;
    name: string;
    description: string;
    categories: string[];
}

export interface SimilarityCandidate extends SimilarityDocument {
    id: string;
}

export interface SimilarityMatch extends SimilarityCandidate {
    probability: number;
}

export type SimilarityFailureStage = "retrieval" | "decision";
export type SimilarityFailureCode = "unavailable" | "invalid_response" | "timeout" | "not_configured" | "index_incomplete";

export interface SimilarityFailure {
    stage: SimilarityFailureStage;
    code: SimilarityFailureCode;
    candidateId?: string;
}

export interface SimilarityCheck {
    status: "completed" | "incomplete";
    checkedAt: string;
    policyVersion: string;
    matches: SimilarityMatch[];
    failures: SimilarityFailure[];
    requiresOverride: boolean;
}

export class SimilarityServiceError extends Error {
    constructor(public readonly code: SimilarityFailureCode) {
        super(`Similarity service failed: ${code}`);
        this.name = "SimilarityServiceError";
    }
}

export interface SimilarityServices {
    retrieve: (document: SimilarityDocument, limit: number) => Promise<SimilarityCandidate[]>;
    decide: (document: SimilarityDocument, candidate: SimilarityCandidate) => Promise<number>;
}

// Keep comparison text bounded and identical for indexing and querying.
export function buildSimilarityText(document: SimilarityDocument): string {
    return JSON.stringify({
        name: document.name.trim().slice(0, 200),
        description: document.description.trim().slice(0, 6000),
        categories: [...new Set(document.categories.map((category) => category.trim()).filter(Boolean))].sort().slice(0, 20),
    });
}

export function isSimilarityProbability(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function isSimilarityCandidate(value: unknown): value is SimilarityCandidate {
    if (typeof value !== "object" || value === null) return false;
    return (
        "id" in value && typeof value.id === "string" && value.id.length > 0 &&
        "packageName" in value && typeof value.packageName === "string" && value.packageName.trim().length > 0 &&
        "name" in value && typeof value.name === "string" &&
        "description" in value && typeof value.description === "string" &&
        "categories" in value && Array.isArray(value.categories) && value.categories.every((category: unknown) => typeof category === "string")
    );
}

function failure(stage: SimilarityFailureStage, error: unknown, candidateId?: string): SimilarityFailure {
    const code = error instanceof SimilarityServiceError ? error.code : "unavailable";
    console.error("[tool-similarity] Check failed", { stage, code, candidateId });
    return { stage, code, ...(candidateId ? { candidateId } : {}) };
}

export async function checkToolSimilarity(document: SimilarityDocument, services: SimilarityServices): Promise<SimilarityCheck> {
    const matches: SimilarityMatch[] = [];
    const failures: SimilarityFailure[] = [];
    let candidates: SimilarityCandidate[] = [];

    try {
        const result: unknown = await services.retrieve(document, SIMILARITY_CANDIDATE_LIMIT);
        if (!Array.isArray(result) || !result.every(isSimilarityCandidate)) throw new SimilarityServiceError("invalid_response");
        const seen = new Set<string>();
        candidates = result.filter((candidate) => {
            if (candidate.packageName.trim().toLowerCase() === document.packageName.trim().toLowerCase() || seen.has(candidate.id)) return false;
            seen.add(candidate.id);
            return true;
        }).slice(0, SIMILARITY_CANDIDATE_LIMIT);
    } catch (error) {
        failures.push(failure("retrieval", error));
    }

    await Promise.all(candidates.map(async (candidate) => {
        try {
            const probability = await services.decide(document, candidate);
            if (!isSimilarityProbability(probability)) throw new SimilarityServiceError("invalid_response");
            matches.push({ ...candidate, probability });
        } catch (error) {
            failures.push(failure("decision", error, candidate.id));
        }
    }));

    matches.sort((first, second) => second.probability - first.probability || first.id.localeCompare(second.id));
    failures.sort((first, second) => (first.candidateId ?? "").localeCompare(second.candidateId ?? ""));

    return {
        status: failures.length > 0 ? "incomplete" : "completed",
        checkedAt: new Date().toISOString(),
        policyVersion: SIMILARITY_POLICY_VERSION,
        matches,
        failures,
        requiresOverride: matches.some((match) => match.probability >= SIMILARITY_OVERRIDE_THRESHOLD),
    };
}

export type SimilaritySubmissionDecision =
    | { allowed: true; manualReviewRequired: boolean; override: { reason: string } | null }
    | { allowed: false; error: string };

export function evaluateSimilaritySubmission(check: SimilarityCheck, override: unknown, reason: unknown): SimilaritySubmissionDecision {
    if (!check.requiresOverride) {
        return { allowed: true, manualReviewRequired: check.status === "incomplete", override: null };
    }
    if (override !== true) return { allowed: false, error: "Similar tools were found. An explicit override and explanation are required." };
    if (typeof reason !== "string" || reason.trim().length < 50 || reason.trim().length > 2000) {
        return { allowed: false, error: "Override explanation must be between 50 and 2000 characters." };
    }
    return { allowed: true, manualReviewRequired: check.status === "incomplete", override: { reason: reason.trim() } };
}
