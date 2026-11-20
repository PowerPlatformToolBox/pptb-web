import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compile = async (path) => ts.transpileModule(await readFile(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const policySource = await compile("../lib/tool-similarity.ts");
const source = await compile("../lib/similarity-index.ts");
const document = { packageName: "tool-a", name: "Tool A", description: "Manage records", categories: ["Data"] };
const row = (id) => ({ id, source_hash: "a".repeat(32), document: { ...document, packageName: `tool-${id}` } });
const candidate = { ...document, id: "a" };

function setup({ rows = [], matches = [candidate], pendingError, matchError, saveError, saved = true, embedError, env = {} } = {}) {
    const policy = {};
    vm.runInNewContext(policySource, { exports: policy, console });
    const exports = {};
    const calls = [];
    const embedding = [0.1, 0.2];
    let embeddings = 0;
    const supabase = { async rpc(name, args) {
        calls.push({ name, args });
        if (name === "get_pending_similarity_documents") return { data: rows, error: pendingError };
        if (name === "save_similarity_embedding") return { data: saved, error: saveError };
        if (name === "match_similar_tools") return { data: matches, error: matchError };
        throw new Error(`Unexpected RPC: ${name}`);
    } };
    vm.runInNewContext(source, {
        exports,
        require(name) {
            if (name === "node:crypto") return { createHash };
            if (name === "@/lib/tool-similarity") return policy;
            if (name === "@/lib/foundry-similarity") return {
                SIMILARITY_EMBEDDING_DIMENSIONS: 1536,
                embedSimilarityDocument: async () => { embeddings++; if (embedError) throw embedError; return embedding; },
                decideToolSimilarity: async () => 0.95,
            };
            throw new Error(`Unexpected import: ${name}`);
        },
        process: { env: { AZURE_FOUNDRY_ENDPOINT: "https://example.services.ai.azure.com", ...env } },
    });
    return { client: exports, supabase, calls, embedding, embeddings: () => embeddings };
}

test("backfill processes at most three documents and signals another batch", async () => {
    const ctx = setup({ rows: ["a", "b", "c", "d"].map(row) });
    const result = await ctx.client.indexPublishedTools(ctx.supabase);
    assert.equal(result.indexed, 3);
    assert.equal(result.hasMore, true);
    assert.equal(ctx.embeddings(), 3);
    assert.equal(ctx.calls[0].args.p_limit, 4);
    const writes = ctx.calls.filter((call) => call.name === "save_similarity_embedding");
    assert.equal(writes.length, 3);
    assert.equal(writes[0].args.p_source_hash, "a".repeat(32));
    assert.deepEqual(writes[0].args.p_embedding, ctx.embedding);
});

test("fully indexed catalog does not spend embedding tokens", async () => {
    const ctx = setup();
    const result = await ctx.client.indexPublishedTools(ctx.supabase);
    assert.equal(result.indexed, 0);
    assert.equal(result.hasMore, false);
    assert.equal(ctx.embeddings(), 0);
});

test("concurrent catalog edits explicitly fail the batch for retry", async () => {
    const ctx = setup({ rows: [row("a")], saved: false });
    await assert.rejects(ctx.client.indexPublishedTools(ctx.supabase), { code: "index_incomplete" });
});

for (const options of [{ pendingError: {} }, { rows: [row("a")], saveError: {} }, { rows: [row("a")], embedError: new Error("Embedding unavailable") }]) {
    test("indexing stops on upstream failure rather than claiming success", async () => {
        const ctx = setup(options);
        await assert.rejects(ctx.client.indexPublishedTools(ctx.supabase));
    });
}

for (const rows of [null, {}, [{ ...row("a"), source_hash: "" }], [{ ...row("a"), document: null }]]) {
    test(`invalid index documents are rejected: ${JSON.stringify(rows)}`, async () => {
        const ctx = setup({ rows });
        await assert.rejects(ctx.client.indexPublishedTools(ctx.supabase), { code: "invalid_response" });
        assert.equal(ctx.embeddings(), 0);
    });
}

test("retrieval passes the model key and excludes the current package before limiting", async () => {
    const ctx = setup();
    const result = await ctx.client.retrieveSimilarTools(ctx.supabase, { ...document, packageName: " NEW-TOOL " }, 5);
    assert.equal(result[0].id, "a");
    assert.equal(ctx.calls[0].name, "match_similar_tools");
    assert.equal(ctx.calls[0].args.p_exclude_package, "new-tool");
    assert.equal(ctx.calls[0].args.p_limit, 5);
    assert.equal(ctx.calls[0].args.p_embedding_key, ctx.client.getSimilarityEmbeddingKey());
});

test("missing and stale indexes are distinct from a successful empty search", async () => {
    const ctx = setup({ matchError: { code: "P0001", message: "similarity_index_incomplete" } });
    await assert.rejects(ctx.client.retrieveSimilarTools(ctx.supabase, document, 5), { code: "index_incomplete" });
    const empty = setup({ matches: [] });
    assert.equal((await empty.client.retrieveSimilarTools(empty.supabase, document, 5)).length, 0);
});

for (const matches of [null, [{ id: "a" }], Array(6).fill(candidate)]) {
    test("malformed retrieval output is rejected", async () => {
        const ctx = setup({ matches });
        await assert.rejects(ctx.client.retrieveSimilarTools(ctx.supabase, document, 5), { code: "invalid_response" });
    });
}

test("retrieval limits are bounded before making provider requests", async () => {
    const ctx = setup();
    for (const limit of [0, 6, 1.5, NaN]) await assert.rejects(ctx.client.retrieveSimilarTools(ctx.supabase, document, limit), { code: "invalid_response" });
    assert.equal(ctx.embeddings(), 0);
});

test("embedding key is stable across trailing slash and changes with deployment", () => {
    const a = setup().client.getSimilarityEmbeddingKey();
    const b = setup({ env: { AZURE_FOUNDRY_ENDPOINT: "https://example.services.ai.azure.com/" } }).client.getSimilarityEmbeddingKey();
    const c = setup({ env: { AZURE_EMBEDDING_DEPLOYMENT: "new-model" } }).client.getSimilarityEmbeddingKey();
    assert.equal(a, b);
    assert.notEqual(a, c);
});

test("service factory wires retrieval and Decision-1", async () => {
    const ctx = setup();
    const services = ctx.client.createSimilarityServices(ctx.supabase);
    assert.equal((await services.retrieve(document, 5))[0].id, "a");
    assert.equal(await services.decide(document, candidate), 0.95);
});
