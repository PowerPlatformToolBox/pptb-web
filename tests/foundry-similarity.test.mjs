import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compile = async (path) => ts.transpileModule(await readFile(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const policySource = await compile("../lib/tool-similarity.ts");
const clientSource = await compile("../lib/foundry-similarity.ts");
const document = { packageName: "example", name: "Example", description: "Manage records", categories: ["Data"] };

function setup({ payload, status = 200, env = {}, fetchError, invalidJson = false } = {}) {
    const policy = {};
    vm.runInNewContext(policySource, { exports: policy, console });
    const exports = {};
    const requests = [];
    vm.runInNewContext(clientSource, {
        exports,
        require: (name) => {
            assert.equal(name, "@/lib/tool-similarity");
            return policy;
        },
        process: { env: { AZURE_FOUNDRY_ENDPOINT: "https://fndry-pptb.services.ai.azure.com", AZURE_FOUNDRY_API_KEY: "test-key", ...env } },
        URL, AbortSignal, Error,
        fetch: async (url, options) => {
            requests.push({ url, options, body: JSON.parse(options.body) });
            if (fetchError) throw fetchError;
            return { ok: status >= 200 && status < 300, json: async () => {
                if (invalidJson) throw new SyntaxError("Private response");
                return payload;
            } };
        },
    });
    return { client: exports, requests };
}

test("Decision-1 reads the actual noul response shape and default deployment name", async () => {
    const { client, requests } = setup({ payload: { model: "microsoft-decision-1", answers: { duplicates: { noul: 0.9997694932782918, type: "noul" } } } });
    assert.equal(await client.decideToolSimilarity(document, { ...document, id: "tool-id" }), 0.9997694932782918);
    const request = requests[0];
    assert.equal(request.url, "https://fndry-pptb.services.ai.azure.com/providers/microsoft/v1/systemone");
    assert.equal(request.body.model, "Microsoft-Decision-1");
    assert.equal(request.body.questions.duplicates.type, "noul");
    assert.equal(request.body.state.submittedTool.description, document.description);
    assert.equal(request.options.headers["api-key"], "test-key");
    assert.equal(request.options.redirect, "error");
    assert.equal(request.options.cache, "no-store");
    assert.ok(request.options.signal instanceof AbortSignal);
});

for (const answer of [null, { type: "noul", probability: 0.95 }, { type: "noul", noul: "0.95" }, { type: "noul", noul: 1.01 }, { type: "choice", noul: 0.95 }]) {
    test(`invalid Decision-1 answer ${JSON.stringify(answer)} is rejected`, async () => {
        const { client } = setup({ payload: { answers: { duplicates: answer } } });
        await assert.rejects(client.decideToolSimilarity(document, document), { code: "invalid_response" });
    });
}

test("embedding request uses v1 endpoint, explicit dimensions and default deployment", async () => {
    const embedding = Array.from({ length: 1536 }, (_, index) => index / 1536);
    const { client, requests } = setup({ payload: { data: [{ embedding }] } });
    assert.deepEqual(await client.embedSimilarityDocument(document), embedding);
    assert.equal(requests[0].url, "https://fndry-pptb.services.ai.azure.com/openai/v1/embeddings");
    assert.equal(requests[0].body.model, "text-embedding-3-small");
    assert.equal(requests[0].body.dimensions, 1536);
    assert.equal(requests[0].body.encoding_format, "float");
});

for (const embedding of [[], [0.1], Array(1536).fill(0), Array(1536).fill("0.1"), Array(1536).fill(Infinity)]) {
    test(`invalid embedding (${typeof embedding[0]}, length ${embedding.length}) is rejected`, async () => {
        const { client } = setup({ payload: { data: [{ embedding }] } });
        await assert.rejects(client.embedSimilarityDocument(document), { code: "invalid_response" });
    });
}

for (const endpoint of ["", "http://example.test", "https://user:pass@example.test", "https://example.test/projects/test", "https://example.test?key=secret", "not a URL"]) {
    test(`invalid resource endpoint ${endpoint} prevents a request`, async () => {
        const { client, requests } = setup({ env: { AZURE_FOUNDRY_ENDPOINT: endpoint } });
        await assert.rejects(client.embedSimilarityDocument(document), { code: "not_configured" });
        assert.equal(requests.length, 0);
    });
}

test("missing credentials prevent requests", async () => {
    const { client, requests } = setup({ env: { AZURE_FOUNDRY_API_KEY: "" } });
    await assert.rejects(client.embedSimilarityDocument(document), { code: "not_configured" });
    assert.equal(requests.length, 0);
});

for (const [options, code] of [
    [{ status: 429 }, "unavailable"],
    [{ fetchError: new Error("Private network details") }, "unavailable"],
    [{ fetchError: Object.assign(new Error("timeout"), { name: "TimeoutError" }) }, "timeout"],
    [{ invalidJson: true }, "invalid_response"],
]) {
    test(`provider failure is sanitized as ${code}`, async () => {
        const { client } = setup(options);
        await assert.rejects(client.embedSimilarityDocument(document), (error) => {
            assert.equal(error.code, code);
            assert.doesNotMatch(error.message, /Private|test-key/);
            return true;
        });
    });
}
