import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../lib/tool-similarity.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
const logs = [];
vm.runInNewContext(compiled, { exports, console: { error: (...args) => logs.push(args) } });
const { checkToolSimilarity, evaluateSimilaritySubmission, buildSimilarityText, SimilarityServiceError } = exports;
const document = { packageName: "new-tool", name: "New tool", description: "Manage Dataverse records", categories: ["Data"] };
const candidate = (id) => ({ ...document, id, packageName: `tool-${id}` });
const check = (probability, overrides = {}) => checkToolSimilarity(document, {
    retrieve: async () => [candidate("a")],
    decide: async () => probability,
    ...overrides,
});

for (const [probability, requiresOverride] of [[0, false], [0.899999, false], [0.9, true], [1, true]]) {
    test(`probability ${probability} requires override: ${requiresOverride}`, async () => {
        const result = await check(probability);
        assert.equal(result.status, "completed");
        assert.equal(result.requiresOverride, requiresOverride);
        assert.equal(result.matches[0].probability, probability);
        assert.equal(result.failures.length, 0);
        assert.ok(Number.isFinite(Date.parse(result.checkedAt)));
        assert.equal(result.policyVersion, "1");
    });
}

test("retrieval failure allows manual review, not a successful no-match result", async () => {
    const result = await check(0, { retrieve: async () => { throw new SimilarityServiceError("timeout"); } });
    assert.equal(result.status, "incomplete");
    assert.equal(result.matches.length, 0);
    assert.equal(result.failures[0].stage, "retrieval");
    assert.equal(result.failures[0].code, "timeout");
    assert.equal(evaluateSimilaritySubmission(result).allowed, true);
    assert.equal(evaluateSimilaritySubmission(result).manualReviewRequired, true);
});

test("partial Decision-1 failure retains a completed high match and enforces override", async () => {
    const result = await check(0, {
        retrieve: async () => [candidate("a"), candidate("b")],
        decide: async (_, item) => {
            if (item.id === "b") throw new Error("Private provider response and credential");
            return 0.95;
        },
    });
    assert.equal(result.status, "incomplete");
    assert.equal(result.requiresOverride, true);
    assert.equal(result.matches[0].id, "a");
    assert.equal(result.failures[0].candidateId, "b");
    assert.equal(result.failures[0].stage, "decision");
    assert.equal(evaluateSimilaritySubmission(result).allowed, false);
    const allowed = evaluateSimilaritySubmission(result, true, "This tool supports a distinct workflow and different capabilities.");
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.manualReviewRequired, true);
    assert.doesNotMatch(JSON.stringify({ result, logs }), /Private provider response|credential/);
});

for (const invalid of [-0.1, 1.1, NaN, Infinity, "0.95", null, undefined]) {
    test(`invalid probability ${String(invalid)} is flagged, not treated as zero`, async () => {
        const result = await check(invalid);
        assert.equal(result.status, "incomplete");
        assert.equal(result.failures[0].code, "invalid_response");
        assert.equal(result.matches.length, 0);
    });
}

for (const invalid of [null, {}, [{ id: "broken" }], [candidate("a"), null]]) {
    test(`invalid search response ${JSON.stringify(invalid)} is flagged`, async () => {
        const result = await check(0, { retrieve: async () => invalid });
        assert.equal(result.status, "incomplete");
        assert.equal(result.failures[0].stage, "retrieval");
        assert.equal(result.failures[0].code, "invalid_response");
    });
}

test("an empty catalog is a completed check", async () => {
    const result = await check(0, { retrieve: async () => [] });
    assert.equal(result.status, "completed");
    assert.equal(result.requiresOverride, false);
    assert.equal(evaluateSimilaritySubmission(result).manualReviewRequired, false);
});

test("self matches and duplicate IDs are removed and at most five candidates are evaluated", async () => {
    const ids = [];
    await check(0, {
        retrieve: async (_, limit) => {
            assert.equal(limit, 5);
            return [{ ...candidate("self"), packageName: " NEW-TOOL " }, candidate("a"), candidate("a"), ...["b", "c", "d", "e", "f"].map(candidate)];
        },
        decide: async (_, item) => { ids.push(item.id); return 0.2; },
    });
    assert.deepEqual(ids, ["a", "b", "c", "d", "e"]);
});

test("results are ranked by probability", async () => {
    const result = await check(0, {
        retrieve: async () => [candidate("a"), candidate("b")],
        decide: async (_, item) => item.id === "a" ? 0.3 : 0.9,
    });
    assert.equal(result.matches[0].id, "b");
});

test("override requires explicit boolean consent and a bounded explanation", async () => {
    const result = await check(0.9);
    const valid = "A".repeat(50);
    for (const [override, reason] of [[false, valid], ["true", valid], [true, null], [true, " ".repeat(100)], [true, "A".repeat(49)], [true, "A".repeat(2001)]]) {
        assert.equal(evaluateSimilaritySubmission(result, override, reason).allowed, false);
    }
    assert.equal(evaluateSimilaritySubmission(result, true, valid).allowed, true);
    assert.equal(evaluateSimilaritySubmission(result, true, "A".repeat(2000)).allowed, true);
    assert.equal(evaluateSimilaritySubmission(result, true, ` ${valid} `).override.reason, valid);
});

test("comparison text is canonical and excludes package identity", () => {
    const text = buildSimilarityText({ ...document, name: " Name ", description: "D".repeat(7000), categories: ["Z", " A ", "Z", ""] });
    const parsed = JSON.parse(text);
    assert.equal(parsed.name, "Name");
    assert.equal(parsed.description.length, 6000);
    assert.deepEqual(parsed.categories, ["A", "Z"]);
    assert.equal(text.includes("new-tool"), false);
    assert.equal(buildSimilarityText({ ...document, categories: ["B", "A"] }), buildSimilarityText({ ...document, categories: ["A", "B"] }));
});
