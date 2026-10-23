import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const reviewTextExports = {};
vm.runInNewContext(ts.transpileModule(
    await readFile(new URL("../components/ReviewText.tsx", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
).outputText, { exports: reviewTextExports, require, URL });
const source = await readFile(new URL("../app/api/ratings/[toolId]/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const rating = {
    id: "review-1",
    tool_id: "tool-1",
    user_id: "private-user-id",
    install_id: "private-install-id",
    rating: 5,
    comment: "Great tool",
    created_at: "2026-10-22T12:00:00Z",
};

async function getRatings({ ratings = [rating], profiles = [], ratingsError = null, profilesError = null } = {}) {
    const selections = [];
    const errors = [];
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            if (name === "@supabase/supabase-js") {
                return {
                    createClient: () => ({
                        from(table) {
                            return {
                                select(columns) {
                                    selections.push({ table, columns });
                                    return this;
                                },
                                eq() { return this; },
                                order: async () => ({ data: ratings, error: ratingsError }),
                                in: async () => ({ data: profiles, error: profilesError }),
                            };
                        },
                    }),
                };
            }
            throw new Error(`Unexpected import: ${name}`);
        },
        process: { env: { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test" } },
        console: { error: (...args) => errors.push(args) },
    });
    const response = await exports.GET({}, { params: Promise.resolve({ toolId: "tool-1" }) });
    return { status: response.status, headers: response.headers, body: await response.json(), selections, errors };
}

test("public reviews return only a trimmed profile name and public review fields", async () => {
    const result = await getRatings({ profiles: [{ id: rating.user_id, name: "  Jane Reviewer  ", email: "private@example.test" }] });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.deepEqual(result.body, {
        ratings: [{ id: rating.id, toolId: rating.tool_id, userName: "Jane Reviewer", rating: 5, comment: rating.comment, toolVersion: null, createdAt: rating.created_at, authorReply: null }],
    });
    assert.deepEqual(result.selections, [
        { table: "ratings", columns: "id, tool_id, user_id, rating, comment, tool_version, created_at, rating_author_replies(reply, created_at, updated_at)" },
        { table: "user_profiles", columns: "id, name" },
    ]);
});

for (const name of [null, "", "   ", "private@example.test", "Jane <private@example.test>"]) {
    test(`unsafe or missing profile name ${JSON.stringify(name)} is anonymous`, async () => {
        const result = await getRatings({ profiles: [{ id: rating.user_id, name, email: "private@example.test" }] });
        assert.equal(result.body.ratings[0].userName, "Anonymous reviewer");
        assert.equal(JSON.stringify(result.body).includes("private"), false);
    });
}

test("a missing profile never falls back to the user's ID", async () => {
    const result = await getRatings();
    assert.equal(result.body.ratings[0].userName, "Anonymous reviewer");
    assert.equal(JSON.stringify(result.body).includes(rating.user_id), false);
});

test("installation-only reviews skip the profile lookup and remain anonymous", async () => {
    const result = await getRatings({ ratings: [{ ...rating, user_id: null }] });
    assert.equal(result.body.ratings[0].userName, "Anonymous reviewer");
    assert.equal(result.selections.length, 1);
    assert.equal(JSON.stringify(result.body).includes(rating.install_id), false);
});

test("no reviews return an empty uncached list without a profile lookup", async () => {
    const result = await getRatings({ ratings: [] });
    assert.deepEqual(result.body, { ratings: [] });
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.equal(result.selections.length, 1);
});

for (const field of ["ratingsError", "profilesError"]) {
    test(`${field} is logged and returns an explicit error without database details`, async () => {
        const result = await getRatings({ [field]: { message: "private@example.test" } });
        assert.equal(result.status, 500);
        assert.deepEqual(result.body, { error: "Failed to fetch ratings" });
        assert.equal(result.errors.length, 1);
    });
}

const pageSource = await readFile(new URL("../app/(public)/tools/[id]/reviews/page.tsx", import.meta.url), "utf8");
const compiledPage = ts.transpileModule(pageSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function renderReviews(review, error = null) {
    const states = ["Test Tool", [review], false, error, 5, { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 }];
    const exports = {};
    const wrapper = ({ children }) => React.createElement("div", null, children);
    vm.runInNewContext(compiledPage, {
        exports,
        require(name) {
            if (name === "react") return { ...React, useEffect() {}, useState: () => [states.shift(), () => {}] };
            if (name === "next/navigation") return { useParams: () => ({ id: "tool-1" }), useRouter: () => ({}) };
            if (name === "next/link") return { default: wrapper };
            if (name === "@/components/Container") return { Container: wrapper };
            if (name === "@/components/animations") return { FadeIn: wrapper };
            if (name === "@/lib/useSupabase") return { useSupabase: () => ({ supabase: null }) };
            if (name === "@/components/ReviewAuthorReply") return { ReviewAuthorReply: () => null };
            if (name === "@/components/ReviewText") return reviewTextExports;
            return require(name);
        },
    });
    return renderToStaticMarkup(React.createElement(exports.default));
}

test("review cards render the profile name, never legacy email or user ID fallbacks", () => {
    for (const userName of ["Jane Reviewer", null, " ", "private@example.test"]) {
        const html = renderReviews({
            id: rating.id, rating: 5, createdAt: rating.created_at,
            userName, userEmail: "private@example.test", userId: rating.user_id,
        });
        assert.equal(html.includes("private@example.test"), false);
        assert.equal(html.includes(rating.user_id), false);
        assert.equal(html.includes(userName === "Jane Reviewer" ? "Jane Reviewer" : "Anonymous reviewer"), true);
    }
});

test("review lookup failures display an error rather than claiming there are no reviews", () => {
    const html = renderReviews({}, "Unable to load reviews. Please try again later.");
    assert.match(html, /role="alert"/);
    assert.match(html, /Unable to load reviews/);
    assert.equal(html.includes("No reviews yet"), false);
});

test("public reviews expose version and author response without private fields", async () => {
    for (const relation of [
        { reply: "Thank you!", created_at: rating.created_at, updated_at: rating.created_at, user_id: "private-author" },
        [{ reply: "Thank you!", created_at: rating.created_at, updated_at: rating.created_at, user_id: "private-author" }],
    ]) {
        const result = await getRatings({ ratings: [{ ...rating, tool_version: "1.2.3", rating_author_replies: relation }] });
        assert.equal(result.body.ratings[0].toolVersion, "1.2.3");
        assert.deepEqual(result.body.ratings[0].authorReply, { reply: "Thank you!", createdAt: rating.created_at, updatedAt: rating.created_at });
        assert.equal(JSON.stringify(result.body).includes("private"), false);
    }
});

test("review cards distinguish versioned and legacy reviews", () => {
    assert.match(renderReviews({ id: rating.id, rating: 5, createdAt: rating.created_at, toolVersion: "1.2.3" }), /Version 1\.2\.3/);
    assert.match(renderReviews({ id: rating.id, rating: 5, createdAt: rating.created_at }), /Version not specified/);
});

test("review comments render clickable links and preserve line breaks", () => {
    const html = renderReviews({
        id: rating.id, rating: 5, createdAt: rating.created_at,
        comment: "See this issue:\nhttps://github.com/owner/tool/issues/42",
    });
    assert.ok(html.includes('href="https://github.com/owner/tool/issues/42"'));
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    assert.match(html, /whitespace-pre-wrap/);
});
