import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL("../docs/sql/tool-review-versions-replies.sql", import.meta.url), "utf8");
const owner = "11111111-1111-4111-8111-111111111111";
const reviewer = "22222222-2222-4222-8222-222222222222";
const tool = "33333333-3333-4333-8333-333333333333";
const review = "44444444-4444-4444-8444-444444444444";

test("version and author reply migration enforces direct-client contracts", async (t) => {
    const db = new PGlite();
    t.after(() => db.close());
    await db.exec(`
        CREATE ROLE anon;
        CREATE ROLE authenticated;
        CREATE ROLE service_role BYPASSRLS;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
            $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
        CREATE TABLE public.tools(id uuid PRIMARY KEY, user_id uuid);
        CREATE TABLE public.ratings(id uuid PRIMARY KEY, tool_id uuid REFERENCES tools(id), rating integer);
        INSERT INTO tools VALUES ('${tool}', '${owner}');
        INSERT INTO ratings VALUES ('${review}', '${tool}', 5);
        GRANT SELECT, INSERT, UPDATE ON public.ratings TO anon, authenticated;
    `);
    await db.exec(migration);
    await db.exec(migration);
    async function as(role, user, fn) {
        await db.exec(`SET ROLE ${role}`);
        await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user || ""]);
        try { return await fn(); } finally { await db.exec("RESET ROLE"); }
    }
    const save = (text = " Thank you ") => db.query("SELECT * FROM public.save_rating_author_reply($1, $2)", [review, text]);
    await t.test("legacy versions stay NULL and unrelated updates remain allowed", async () => {
        assert.equal((await db.query("SELECT tool_version FROM ratings")).rows[0].tool_version, null);
        await as("authenticated", reviewer, () => db.query("UPDATE ratings SET rating=4 WHERE id=$1", [review]));
    });
    await t.test("older clients can insert reviews without a version or with an explicit NULL", async () => {
        for (const [role, user] of [["anon", null], ["authenticated", reviewer]]) {
            const omitted = await as(role, user, () => db.query("INSERT INTO ratings(id, tool_id, rating) VALUES (gen_random_uuid(), $1, 5) RETURNING tool_version", [tool]));
            assert.equal(omitted.rows[0].tool_version, null);
            const explicit = await as(role, user, () => db.query("INSERT INTO ratings VALUES (gen_random_uuid(), $1, 5, NULL) RETURNING tool_version", [tool]));
            assert.equal(explicit.rows[0].tool_version, null);
        }
        await db.query("UPDATE ratings SET tool_version=NULL WHERE id=$1", [review]);
    });
    await t.test("supplied versions must be nonblank and bounded", async () => {
        for (const version of ["", "  ", "\t\n\r", "x".repeat(101)]) {
            await assert.rejects(as("anon", null, () => db.query("INSERT INTO ratings VALUES (gen_random_uuid(), $1, 5, $2)", [tool, version])), /Tool version must contain/);
            await assert.rejects(db.query("UPDATE ratings SET tool_version=$1 WHERE id=$2", [version, review]), /Tool version must contain/);
        }
        for (const version of ["1", "x".repeat(100)]) {
            await as("anon", null, () => db.query("INSERT INTO ratings VALUES (gen_random_uuid(), $1, 5, $2)", [tool, ` ${version} `]));
        }
        await db.query("UPDATE ratings SET tool_version=' 1.2.3 ' WHERE id=$1", [review]);
        assert.equal((await db.query("SELECT tool_version FROM ratings WHERE id=$1", [review])).rows[0].tool_version, "1.2.3");
    });
    await t.test("anonymous/non-owner callers and direct writes are denied", async () => {
        await assert.rejects(as("anon", null, () => save()), /permission denied/);
        await assert.rejects(as("authenticated", reviewer, () => save()), /Only the tool owner/);
        await assert.rejects(as("authenticated", null, () => save()), /Sign in/);
        for (const role of ["anon", "authenticated"]) {
            await assert.rejects(as(role, owner, () => db.query("INSERT INTO rating_author_replies(rating_id, reply) VALUES ($1, 'Forged')", [review])), /permission denied/);
            await assert.rejects(as(role, owner, () => db.query("UPDATE rating_author_replies SET reply='Forged'")), /permission denied/);
            await assert.rejects(as(role, owner, () => db.query("TRUNCATE rating_author_replies")), /permission denied/);
        }
    });
    await t.test("owner can create/edit only one public response, preserving creation time", async () => {
        for (const text of [null, "", "  ", "\t\n\r", "x".repeat(2001)]) {
            await assert.rejects(as("authenticated", owner, () => save(text)), /1 to 2000/);
        }
        const created = (await as("authenticated", owner, () => save())).rows[0];
        assert.equal(created.reply, "Thank you");
        const edited = (await as("authenticated", owner, () => save("x".repeat(2000)))).rows[0];
        assert.equal(edited.created_at.getTime(), created.created_at.getTime());
        assert.ok(edited.updated_at >= created.updated_at);
        const publicRows = (await as("anon", null, () => db.query("SELECT * FROM rating_author_replies"))).rows;
        assert.equal(publicRows.length, 1);
        assert.equal(publicRows[0].reply.length, 2000);
    });
    await t.test("missing reviews fail and ownership transfers revoke former owner's access", async () => {
        await assert.rejects(as("authenticated", owner, () => db.query("SELECT public.save_rating_author_reply(gen_random_uuid(), 'Test')")), /Review not found/);
        await db.query("UPDATE tools SET user_id=$1", [reviewer]);
        await assert.rejects(as("authenticated", owner, () => save()), /Only the tool owner/);
        await as("authenticated", reviewer, () => save("New owner response"));
    });
    await t.test("responses do not change ratings and deletion cascades", async () => {
        assert.equal((await db.query("SELECT rating FROM ratings WHERE id=$1", [review])).rows[0].rating, 4);
        await db.query("DELETE FROM ratings WHERE id=$1", [review]);
        assert.equal((await db.query("SELECT * FROM rating_author_replies")).rows.length, 0);
    });
});
