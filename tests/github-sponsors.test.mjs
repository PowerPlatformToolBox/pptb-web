import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../lib/github-api.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load(nodes) {
    const exports = {};
    const requests = [];
    vm.runInNewContext(compiled, {
        exports,
        console,
        fetch: async (url, init) => {
            const body = JSON.parse(init.body);
            requests.push({ url, ...body });
            // GitHub excludes private sponsorships unless explicitly requested.
            const includesPrivate = /includePrivate:\s*true/.test(body.query);
            return Response.json({
                data: {
                    organization: {
                        sponsorshipsAsMaintainer: {
                            nodes: nodes.filter((node) => includesPrivate || node.privacyLevel === "PUBLIC"),
                        },
                    },
                },
            });
        },
    });
    return { fetchSponsors: exports.fetchGitHubSponsors, requests };
}

function sponsorship(login, overrides = {}) {
    return {
        sponsorEntity: {
            login,
            name: login,
            avatarUrl: `https://example.test/${login}.png`,
            url: `https://github.com/${login}`,
        },
        tier: { name: "Supporter", monthlyPriceInDollars: 10 },
        privacyLevel: "PUBLIC",
        isActive: true,
        isOneTimePayment: true,
        createdAt: "2026-01-01T00:00:00Z",
        ...overrides,
    };
}

test("requests private sponsorships and returns only their aggregate count", async () => {
    const { fetchSponsors, requests } = load([
        sponsorship("public-sponsor"),
        sponsorship("private-sponsor", {
            privacyLevel: "PRIVATE",
            tier: { name: "Private tier", monthlyPriceInDollars: 987 },
        }),
    ]);
    const result = await fetchSponsors("example-org", "test-token");

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://api.github.com/graphql");
    assert.deepEqual(requests[0].variables, { login: "example-org" });
    assert.match(requests[0].query, /activeOnly:\s*false/);
    assert.match(requests[0].query, /includePrivate:\s*true/);
    assert.equal(result.privateSponsorCount, 1);
    assert.equal(result.sponsors.length, 1);
    assert.equal(result.sponsors[0].login, "public-sponsor");
    assert.equal(result.sponsors[0].totalContributed, 10);
    assert.deepEqual(Object.keys(result).sort(), ["privateSponsorCount", "sponsors"]);
    assert.doesNotMatch(JSON.stringify(result), /private-sponsor|Private tier|987/);
});

test("counts private-only sponsorships even when the sponsor identity is unavailable", async () => {
    const { fetchSponsors } = load([
        sponsorship("hidden", { privacyLevel: "PRIVATE", sponsorEntity: null }),
        sponsorship("another-hidden", { privacyLevel: "PRIVATE", isActive: false }),
    ]);
    const result = await fetchSponsors("example-org", "test-token");

    assert.equal(result.privateSponsorCount, 2);
    assert.equal(result.sponsors.length, 0);
});

test("does not count public sponsorships as private", async () => {
    const { fetchSponsors } = load([sponsorship("public-sponsor")]);
    const result = await fetchSponsors("example-org", "test-token");

    assert.equal(result.privateSponsorCount, 0);
    assert.equal(result.sponsors.length, 1);
});

test("returns an empty sponsor list and zero private count when there are no sponsors", async () => {
    const { fetchSponsors } = load([]);
    const result = await fetchSponsors("example-org", "test-token");

    assert.equal(result.privateSponsorCount, 0);
    assert.equal(result.sponsors.length, 0);
});
