import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL("../docs/sql/ideas-migration.sql", import.meta.url), "utf8");
const removeVoteMigration = await readFile(new URL("../docs/sql/ideas-remove-vote.sql", import.meta.url), "utf8");
const backendEditsMigration = await readFile(new URL("../docs/sql/ideas-backend-edits.sql", import.meta.url), "utf8");
const claimingMigration = await readFile(new URL("../docs/sql/ideas-claiming.sql", import.meta.url), "utf8");
const claimingVerification = await readFile(new URL("../docs/sql/ideas-claiming-verification.sql", import.meta.url), "utf8");
const removeNotifications = await readFile(new URL("../docs/sql/ideas-claiming-remove-notifications.sql", import.meta.url), "utf8");
const removeReviewHistory = await readFile(new URL("../docs/sql/ideas-remove-review-history.sql", import.meta.url), "utf8");
const renameIdeas = await readFile(new URL("../docs/sql/ideas-rename.sql", import.meta.url), "utf8");
const renameVerification = await readFile(new URL("../docs/sql/ideas-rename-verification.sql", import.meta.url), "utf8");
const preflight = await readFile(new URL("../docs/sql/ideas-preflight.sql", import.meta.url), "utf8");
const verification = await readFile(new URL("../docs/sql/ideas-verification.sql", import.meta.url), "utf8");
const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const member = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";

test("ideas migration preserves legacy contracts and enforces the combined board rules", async (t) => {
    const db = new PGlite();
    t.after(() => db.close());
    // Reproduce the supplied schema, RLS policies, grants and RPC contracts.
    await db.exec(`
        CREATE ROLE anon;
        CREATE ROLE authenticated;
        CREATE ROLE service_role BYPASSRLS;
        CREATE SCHEMA auth;
        CREATE TABLE auth.users(id uuid PRIMARY KEY);
        INSERT INTO auth.users VALUES ('${admin}'), ('${member}');
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
            $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
        CREATE TABLE public.user_roles(
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
            role text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
        );
        INSERT INTO public.user_roles(user_id, role) VALUES ('${admin}', 'admin');
        CREATE TABLE public.tool_ideas(
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
            description text NOT NULL CHECK(length(description) BETWEEN 1 AND 3000), email text,
            install_id text NOT NULL, app_version text NOT NULL, status text NOT NULL DEFAULT 'open',
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE public.tool_idea_votes(
            idea_id uuid NOT NULL REFERENCES public.tool_ideas(id) ON DELETE CASCADE,
            voter_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY(idea_id, voter_id)
        );
        CREATE TABLE public.tool_intakes(
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tool_idea_id uuid CONSTRAINT tool_intakes_tool_idea_id_fkey REFERENCES public.tool_ideas(id) ON DELETE SET NULL
        );
        ALTER TABLE public.tool_ideas ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.tool_idea_votes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Clients can submit ideas" ON public.tool_ideas FOR INSERT TO anon, authenticated WITH CHECK(status = 'open');
        CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO anon, authenticated USING(auth.uid() = user_id);
        GRANT ALL ON public.tool_ideas, public.tool_idea_votes, public.user_roles, public.tool_intakes TO anon, authenticated, service_role;
        CREATE FUNCTION public.get_tool_ideas(p_install_id text)
        RETURNS TABLE(id uuid, title text, description text, upvotes bigint, created_at timestamptz, has_upvoted boolean)
        LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
            SELECT i.id, i.title, i.description,
                (SELECT count(*) FROM tool_idea_votes v WHERE v.idea_id = i.id), i.created_at,
                EXISTS (SELECT 1 FROM tool_idea_votes v WHERE v.idea_id = i.id AND v.voter_id =
                    CASE WHEN auth.uid() IS NOT NULL THEN 'user:' || auth.uid()::text ELSE 'install:' || p_install_id END)
            FROM tool_ideas i WHERE i.status = 'open' ORDER BY 4 DESC, i.created_at DESC
        $$;
        CREATE FUNCTION public.upvote_tool_idea(p_idea_id uuid, p_install_id text)
        RETURNS TABLE(upvotes bigint, has_upvoted boolean)
        LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
            INSERT INTO tool_idea_votes(idea_id, voter_id)
            SELECT p_idea_id, CASE WHEN auth.uid() IS NOT NULL THEN 'user:' || auth.uid()::text ELSE 'install:' || p_install_id END
            WHERE EXISTS (SELECT 1 FROM tool_ideas WHERE id = p_idea_id AND status = 'open')
            ON CONFLICT DO NOTHING;
            SELECT count(*), EXISTS (SELECT 1 FROM tool_idea_votes WHERE idea_id = p_idea_id AND voter_id =
                CASE WHEN auth.uid() IS NOT NULL THEN 'user:' || auth.uid()::text ELSE 'install:' || p_install_id END)
            FROM tool_idea_votes WHERE idea_id = p_idea_id
        $$;
        GRANT EXECUTE ON FUNCTION public.get_tool_ideas(text), public.upvote_tool_idea(uuid,text) TO anon, authenticated, service_role;
        INSERT INTO public.tool_ideas(id,title,description,email,install_id,app_version) VALUES
            ('${first}', 'First tool', 'Description', 'private@example.test', 'legacy-install', '1.0'),
            ('${second}', 'Second tool', 'Description', NULL, '${member}', 'web');
        INSERT INTO public.tool_idea_votes VALUES ('${first}', 'install:legacy-install', now());
        INSERT INTO public.tool_intakes(tool_idea_id) VALUES ('${first}');
    `);
    const oldColumns = (await db.query("SELECT * FROM public.get_tool_ideas('legacy-install')")).fields.map((field) => field.name);
    const preflightResults = await db.exec(preflight);
    assert.equal(preflightResults.at(-1).rows.length, 0);
    await db.exec(migration);
    const verificationResults = await db.exec(verification);
    const permissions = verificationResults.find((result) => result.rows[0]?.public_board_readable !== undefined);
    assert.ok(permissions);
    assert.ok(Object.values(permissions.rows[0]).every((allowed) => allowed === true));

    async function as(role, user, action) {
        await db.exec(`SET ROLE ${role}`);
        await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user || ""]);
        try {
            return await action();
        } finally {
            await db.exec("RESET ROLE");
            await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
        }
    }
    const row = async (id) => (await db.query("SELECT * FROM public.tool_ideas WHERE id=$1", [id])).rows[0];
    const review = async (id, status, { resolution = null, note = null, duplicate = null, github = null, revision } = {}) =>
        as("authenticated", admin, async () => {
            const expected = revision ?? (await db.query("SELECT updated_at FROM public.get_ideas('') WHERE id=$1", [id])).rows[0].updated_at;
            return db.query("SELECT public.review_idea($1,$2,$3,$4,$5,$6,$7)", [id, expected, status, resolution, note, duplicate, github]);
        });

    await t.test("migration preserves records, votes, intake links and legacy result shape", async () => {
        const result = await as("anon", null, () => db.query("SELECT * FROM public.get_tool_ideas('legacy-install')"));
        assert.deepEqual(
            result.fields.map((field) => field.name),
            oldColumns,
        );
        assert.equal(result.rows.length, 2);
        assert.equal(result.rows[0].id, first);
        assert.equal(result.rows[0].has_upvoted, true);
        assert.equal(Number(result.rows[0].upvotes), 1);
        assert.equal((await row(first)).idea_type, "tool");
        assert.equal((await db.query("SELECT tool_idea_id FROM public.tool_intakes")).rows[0].tool_idea_id, first);
    });

    let desktop;
    let vscode;
    await t.test("old inserts default to tool and new clients can submit all types", async () => {
        await as("anon", null, () => db.exec("INSERT INTO public.tool_ideas(title,description,install_id,app_version) VALUES ('Old client','Description','old-install','1.0')"));
        assert.equal((await db.query("SELECT idea_type FROM public.tool_ideas WHERE title='Old client'")).rows[0].idea_type, "tool");
        for (const type of ["pptb_desktop", "pptb_vscode"]) {
            await as("authenticated", member, () =>
                db.query("INSERT INTO public.tool_ideas(title,description,install_id,app_version,idea_type) VALUES ($1,'Description',$2,'web',$1)", [type, member]),
            );
        }
        desktop = (await db.query("SELECT id FROM public.tool_ideas WHERE idea_type='pptb_desktop'")).rows[0].id;
        vscode = (await db.query("SELECT id FROM public.tool_ideas WHERE idea_type='pptb_vscode'")).rows[0].id;
        const legacy = await as("anon", null, () => db.query("SELECT * FROM public.get_tool_ideas('old-install')"));
        assert.equal(legacy.rows.length, 3);
        const combined = await as("anon", null, () => db.query("SELECT * FROM public.get_ideas('')"));
        assert.equal(combined.rows.length, 5);
        for (const field of ["email", "install_id", "updated_by", "app_version"]) assert.ok(!combined.fields.some(({ name }) => name === field));
        await assert.rejects(
            as("anon", null, () => db.exec("INSERT INTO public.tool_ideas(title,description,install_id,app_version,idea_type) VALUES ('Bad','D','i','v','invalid')")),
            /ideas_type_check/,
        );
    });

    await t.test("members cannot review, read private rows/history or submit review metadata", async () => {
        await assert.rejects(
            as("authenticated", member, () => db.query("SELECT public.review_idea($1,now(),'planned',null,null,null,null)", [first])),
            /Admin access required/,
        );
        await assert.rejects(
            as("anon", null, () => db.query("SELECT public.review_idea($1,now(),'planned',null,null,null,null)", [first])),
            /permission denied/,
        );
        for (const role of ["anon", "authenticated"]) {
            const user = role === "authenticated" ? member : null;
            const privateRows = await as(role, user, () => db.query("SELECT * FROM public.tool_ideas"));
            assert.equal(privateRows.rows.length, 0);
            await assert.rejects(
                as(role, user, () =>
                    db.exec(
                        "INSERT INTO public.tool_ideas(title,description,install_id,app_version,github_issue_url,idea_type) VALUES ('Bad','D','i','v','https://github.com/PowerPlatformToolBox/desktop-app/issues/1','pptb_desktop')",
                    ),
                ),
                /row-level security/,
            );
            await assert.rejects(
                as(role, user, () => db.exec("TRUNCATE public.tool_idea_votes")),
                /permission denied/,
            );
            await assert.rejects(
                as(role, user, () => db.query("INSERT INTO public.tool_idea_votes(idea_id,voter_id) VALUES ($1,'forged')", [first])),
                /row-level security|not accepting votes/,
            );
        }
        assert.equal((await as("authenticated", member, () => db.query("SELECT * FROM public.idea_review_history"))).rows.length, 0);
    });

    await t.test("review validates GitHub repository, preserves votes, and records the actor", async () => {
        await assert.rejects(review(desktop, "open", { github: "https://github.com/PowerPlatformToolBox/vscode-extension/issues/1" }), /ideas_github_check/);
        await assert.rejects(review(first, "open", { github: "https://github.com/PowerPlatformToolBox/desktop-app/issues/1" }), /ideas_github_check/);
        await review(desktop, "under_review", { github: "https://github.com/PowerPlatformToolBox/desktop-app/issues/12", note: "Evaluating" });
        assert.equal((await row(desktop)).updated_by, admin);
        const history = await as("authenticated", admin, () => db.query("SELECT * FROM public.idea_review_history WHERE idea_id=$1", [desktop]));
        assert.equal(history.rows.length, 1);
        assert.equal(history.rows[0].changed_by, admin);
        assert.equal(history.rows[0].previous_review.status, "open");
        assert.equal(history.rows[0].new_review.status, "under_review");
        assert.equal((await db.query("SELECT count(*) FROM public.tool_idea_votes")).rows[0].count, 1);
        await review(desktop, "under_review");
        assert.equal((await row(desktop)).github_issue_url, null);
    });

    await t.test("voting works for eligible statuses and deduplicates both identity formats", async () => {
        for (const status of ["open", "under_review", "planned"]) {
            await review(first, status);
            for (const identity of [
                ["anon", null, "new-install"],
                ["authenticated", member, ""],
            ]) {
                const [role, user, install] = identity;
                const vote = await as(role, user, () => db.query("SELECT * FROM public.upvote_tool_idea($1,$2)", [first, install]));
                const repeat = await as(role, user, () => db.query("SELECT * FROM public.upvote_tool_idea($1,$2)", [first, install]));
                assert.equal(vote.rows[0].has_upvoted, true);
                assert.deepEqual(vote.rows, repeat.rows);
            }
        }
        await assert.rejects(
            as("anon", null, () => db.query("SELECT * FROM public.upvote_tool_idea($1,'')", [first])),
            /installation ID/,
        );
    });

    await t.test("closed resolutions and explanations are required; reopening clears them", async () => {
        await assert.rejects(review(first, "closed"), /ideas_resolution_check/);
        await assert.rejects(review(first, "closed", { resolution: "implemented", note: "   " }), /ideas_resolution_check/);
        await assert.rejects(review(first, "closed", { resolution: "implemented", note: "\t\n" }), /ideas_resolution_check/);
        for (const resolution of ["implemented", "not_planned", "out_of_scope", "withdrawn"]) {
            await review(first, "closed", { resolution, note: "Public explanation" });
            await assert.rejects(
                as("anon", null, () => db.query("SELECT * FROM public.upvote_tool_idea($1,'new-voter')", [first])),
                /not accepting votes/,
            );
            await assert.rejects(db.query("INSERT INTO public.tool_idea_votes(idea_id,voter_id) VALUES ($1,'direct-vote')", [first]), /not accepting votes/);
        }
        assert.equal(Number((await db.query("SELECT count(*) FROM public.tool_idea_votes WHERE idea_id=$1", [first])).rows[0].count), 3);
        const legacy = await as("anon", null, () => db.query("SELECT * FROM public.get_tool_ideas('legacy-install')"));
        assert.ok(!legacy.rows.some(({ id }) => id === first));
        await review(first, "open");
        assert.equal((await row(first)).resolution, null);
        assert.equal((await row(first)).duplicate_of, null);
    });

    await t.test("duplicate targets cannot be missing, self-referential or cyclic", async () => {
        await assert.rejects(review(first, "duplicate"), /ideas_duplicate_check/);
        await assert.rejects(review(first, "duplicate", { duplicate: first }), /cycle|ideas_duplicate_check/);
        await assert.rejects(review(first, "duplicate", { duplicate: "ffffffff-ffff-4fff-8fff-ffffffffffff" }), /foreign key/);
        await review(first, "duplicate", { duplicate: second });
        await assert.rejects(review(second, "duplicate", { duplicate: first }), /cycle/);
        await review(second, "duplicate", { duplicate: desktop });
        await assert.rejects(review(desktop, "duplicate", { duplicate: first }), /cycle/);
        await assert.rejects(
            as("authenticated", member, () => db.query("SELECT * FROM public.upvote_tool_idea($1,'')", [first])),
            /not accepting votes/,
        );
        await review(first, "open");
        assert.equal((await row(first)).duplicate_of, null);
    });

    await t.test("stale reviews fail without overwriting another maintainer's work", async () => {
        const revision = (await row(vscode)).updated_at;
        await review(vscode, "planned");
        await assert.rejects(review(vscode, "closed", { revision, resolution: "not_planned", note: "Stale update" }), /Idea changed/);
        assert.equal((await row(vscode)).status, "planned");
    });

    await t.test("tool intakes cannot link PPTB ideas", async () => {
        await assert.rejects(db.query("INSERT INTO public.tool_intakes(tool_idea_id) VALUES ($1)", [desktop]), /only link to Tool Ideas/);
        await as("service_role", null, () => db.query("INSERT INTO public.tool_intakes(tool_idea_id) VALUES ($1)", [first]));
        await assert.rejects(db.query("UPDATE public.tool_intakes SET tool_idea_id=$1", [vscode]), /only link to Tool Ideas/);
    });

    await t.test("vote removal migration is additive and safe to reapply", async () => {
        const votesBefore = (await db.query("SELECT * FROM public.tool_idea_votes ORDER BY idea_id, voter_id")).rows;
        await db.exec(removeVoteMigration);
        await db.exec(removeVoteMigration);
        assert.deepEqual((await db.query("SELECT * FROM public.tool_idea_votes ORDER BY idea_id, voter_id")).rows, votesBefore);
        const grants = await db.query(`SELECT
            has_function_privilege('anon','public.remove_tool_idea_vote(uuid,text)','EXECUTE') AS anonymous,
            has_function_privilege('authenticated','public.remove_tool_idea_vote(uuid,text)','EXECUTE') AS signed_in`);
        assert.deepEqual(grants.rows[0], { anonymous: true, signed_in: true });
    });

    const vote = (user, install = "") => as(user ? "authenticated" : "anon", user, () => db.query("SELECT * FROM public.upvote_tool_idea($1,$2)", [first, install]));
    const unvote = (user, install = "", id = first) => as(user ? "authenticated" : "anon", user, () => db.query("SELECT * FROM public.remove_tool_idea_vote($1,$2)", [id, install]));

    await t.test("vote removal is identity-scoped and idempotent for each eligible status", async () => {
        for (const status of ["open", "under_review", "planned"]) {
            await review(first, status);
            await vote(member);
            await vote(admin);
            await vote(null, "removal-install");
            const countBefore = Number((await db.query("SELECT count(*) FROM public.tool_idea_votes WHERE idea_id=$1", [first])).rows[0].count);
            // A signed-in caller cannot use p_install_id to delete someone else's installation vote.
            const removed = await unvote(member, "removal-install");
            assert.equal(removed.rows[0].has_upvoted, false);
            assert.equal(Number(removed.rows[0].upvotes), countBefore - 1);
            assert.deepEqual((await unvote(member)).rows, removed.rows);
            assert.equal((await vote(admin)).rows[0].has_upvoted, true);
            assert.equal(Number((await vote(null, "removal-install")).rows[0].upvotes), countBefore - 1);
            const anonRemoved = await unvote(null, "removal-install");
            assert.equal(anonRemoved.rows[0].has_upvoted, false);
            assert.equal(Number(anonRemoved.rows[0].upvotes), countBefore - 2);
            assert.deepEqual((await unvote(null, "removal-install")).rows, anonRemoved.rows);
            const revote = await vote(member);
            assert.equal(revote.rows[0].has_upvoted, true);
            assert.equal(Number(revote.rows[0].upvotes), countBefore - 1);
            const list = await as("authenticated", member, () => db.query("SELECT * FROM public.get_ideas('') WHERE id=$1", [first]));
            assert.equal(list.rows[0].has_upvoted, true);
            await unvote(member);
            const refreshed = await as("authenticated", member, () => db.query("SELECT * FROM public.get_ideas('') WHERE id=$1", [first]));
            assert.equal(refreshed.rows[0].has_upvoted, false);
        }
    });

    await t.test("removal rejects invalid identity, missing ideas and terminal statuses without deleting votes", async () => {
        await review(first, "open");
        await vote(member);
        await assert.rejects(unvote(null, ""), /installation ID/);
        await assert.rejects(unvote(null, "   "), /installation ID/);
        await assert.rejects(unvote(member, "", "ffffffff-ffff-4fff-8fff-ffffffffffff"), /cannot be changed/);
        await assert.rejects(unvote(member, "", null), /cannot be changed/);
        const votesBefore = (await db.query("SELECT * FROM public.tool_idea_votes ORDER BY idea_id, voter_id")).rows;
        for (const status of ["closed", "duplicate"]) {
            await review(first, status, status === "closed" ? { resolution: "implemented", note: "Delivered" } : { duplicate: desktop });
            await assert.rejects(unvote(member), /cannot be changed/);
            await assert.rejects(unvote(null, "legacy-install"), /cannot be changed/);
            assert.deepEqual((await db.query("SELECT * FROM public.tool_idea_votes ORDER BY idea_id, voter_id")).rows, votesBefore);
        }
        await review(first, "open");
        assert.equal((await unvote(member)).rows[0].has_upvoted, false);
    });

    await t.test("backend corrections preserve constraints, links, votes and accurate history", async () => {
        await db.exec(backendEditsMigration);
        await db.exec(backendEditsMigration);
        const votesBefore = (await db.query("SELECT * FROM public.tool_idea_votes ORDER BY idea_id, voter_id")).rows;
        await assert.rejects(db.query("UPDATE public.tool_ideas SET idea_type='pptb_desktop' WHERE id=$1", [first]), /Unlink tool intakes/);
        await review(vscode, "planned", { github: "https://github.com/PowerPlatformToolBox/vscode-extension/issues/12" });
        await assert.rejects(db.query("UPDATE public.tool_ideas SET idea_type='pptb_desktop' WHERE id=$1", [vscode]), /ideas_github_check/);
        await db.query("UPDATE public.tool_ideas SET idea_type='pptb_desktop', github_issue_url=null, title='Corrected title', description='Corrected description' WHERE id=$1", [vscode]);
        const corrected = await row(vscode);
        assert.equal(corrected.idea_type, "pptb_desktop");
        assert.equal(corrected.updated_by, null);
        const history = (await db.query("SELECT * FROM public.idea_review_history WHERE idea_id=$1 ORDER BY changed_at DESC LIMIT 1", [vscode])).rows[0];
        assert.equal(history.previous_review.idea_type, "pptb_vscode");
        assert.equal(history.new_review.idea_type, "pptb_desktop");
        assert.equal(history.new_review.title, "Corrected title");
        assert.equal(history.changed_by, null);
        await as("service_role", null, () => db.query("UPDATE public.tool_ideas SET idea_type='pptb_vscode' WHERE id=$1", [vscode]));
        assert.equal((await row(vscode)).idea_type, "pptb_vscode");
        for (const role of ["anon", "authenticated"]) {
            const result = await as(role, role === "authenticated" ? member : null, () => db.query("UPDATE public.tool_ideas SET idea_type='tool' WHERE id=$1 RETURNING id", [vscode]));
            assert.equal(result.rows.length, 0);
        }
        assert.equal((await row(vscode)).idea_type, "pptb_vscode");
        await assert.rejects(db.query("UPDATE public.tool_ideas SET status='invalid' WHERE id=$1", [vscode]), /ideas_status_check/);
        assert.deepEqual((await db.query("SELECT * FROM public.tool_idea_votes ORDER BY idea_id, voter_id")).rows, votesBefore);
    });

    let claimable;
    let claimId;
    const repository = "https://github.com/new-builder/first-tool";
    const claim = (user, id = claimable, url = repository) => as(user ? "authenticated" : "anon", user,
        () => db.query("SELECT * FROM public.claim_tool_idea($1,$2)", [id, url]));
    const manageClaim = async (status, { release = false, url = repository, revision, resolution = null, note = null } = {}) => {
        const current = await row(claimable);
        return as("authenticated", admin, () => db.query(
            "SELECT public.review_idea_with_claim($1,$2,$3,$4,$5,null,null,$6,$7)",
            [claimable, revision ?? current.updated_at, status, resolution, note, url, release],
        ));
    };

    await t.test("claiming migration is additive, reapplicable and does not infer creators", async () => {
        await db.exec(`CREATE TABLE public.user_profiles(id uuid PRIMARY KEY, name text, is_tool_developer boolean DEFAULT false);
            INSERT INTO public.user_profiles(id,name) VALUES ('${member}','New builder');`);
        await db.exec(claimingMigration);
        await db.exec(claimingMigration);
        const checked = await db.exec(claimingVerification);
        assert.ok(Object.values(checked[0].rows[0]).every(Boolean));
        assert.equal(checked[1].rows[0].invalid_claims, 0);
        assert.equal((await row(second)).creator_user_id, null);
        claimable = "33333333-3333-4333-8333-333333333333";
        await as("authenticated", member, () => db.query(
            "INSERT INTO public.tool_ideas(id,title,description,install_id,app_version,creator_user_id) VALUES ($1,'Claimable','D','other-install','web',$2)",
            [claimable, admin],
        ));
        assert.equal((await row(claimable)).creator_user_id, member);
        await as("anon", null, () => db.query(
            "INSERT INTO public.tool_ideas(title,description,install_id,app_version,creator_user_id) VALUES ('Anonymous','D',$1::text,'desktop',$1::uuid)",
            [admin],
        ));
        assert.equal((await db.query("SELECT creator_user_id FROM public.tool_ideas WHERE title='Anonymous'")).rows[0].creator_user_id, null);
        assert.equal((await db.query("SELECT is_tool_developer FROM public.user_profiles WHERE id=$1", [member])).rows[0].is_tool_developer, false);
    });

    await t.test("claims enforce sign-in, Tool Ideas-only scope and canonical repository URLs", async () => {
        await assert.rejects(claim(null), /permission denied/);
        await assert.rejects(claim(member, desktop), /no longer available/);
        await assert.rejects(claim(member, first, "https://github.com/a/b/issues/1"), /repository URL/);
        for (const url of [repository + "/", repository + "\n", repository + ".git", repository + "?x=1",
            "http://github.com/a/b", "https://github.com/a/..", "https://github.com/a/.",
            "https://github.com/-bad/repo", "https://github.com/a/b/tree/main", "https://user@github.com/a/b"]) {
            assert.equal((await db.query("SELECT public.is_idea_repository_url($1) AS valid", [url])).rows[0].valid, false, url);
        }
        await assert.rejects(claim(member, "ffffffff-ffff-4fff-8fff-ffffffffffff"), /Idea not found/);
        for (const status of ["under_review", "planned", "closed", "duplicate"]) {
            await review(claimable, status, status === "closed" ? { resolution: "implemented", note: "Done" }
                : status === "duplicate" ? { duplicate: first } : {});
            await assert.rejects(claim(member), /no longer available/);
        }
        await review(claimable, "open");
        await assert.rejects(review(claimable, "in_progress"), /ideas_claim_status_check/);
    });

    await t.test("cleanup removes the old notification table/function and preserves the claim contract", async () => {
        await db.exec(`CREATE TABLE public.idea_claim_notifications(id uuid);
            CREATE FUNCTION public.take_idea_claim_notifications(integer,uuid)
            RETURNS SETOF public.idea_claim_notifications LANGUAGE sql AS $$ SELECT * FROM public.idea_claim_notifications $$;`);
        await db.exec(removeNotifications);
        await db.exec(removeNotifications);
        assert.equal((await db.query("SELECT to_regclass('public.idea_claim_notifications') AS relation")).rows[0].relation, null);
        const definition = (await db.query("SELECT pg_get_functiondef('public.claim_tool_idea(uuid,text)'::regprocedure) AS definition")).rows[0].definition;
        assert.equal(definition.includes("idea_claim_notifications"), false);
    });

    await t.test("a first-time builder claims once with history and private creator linkage without a notification table", async () => {
        const revision = (await row(claimable)).updated_at;
        const result = await claim(member);
        claimId = result.rows[0].claim_id;
        assert.equal(result.rows[0].already_claimed, false);
        assert.equal((await row(claimable)).status, "in_progress");
        assert.equal((await row(claimable)).updated_by, member);
        const repeated = await claim(member);
        assert.equal(repeated.rows[0].claim_id, claimId);
        assert.equal(repeated.rows[0].already_claimed, true);
        await assert.rejects(claim(admin), /no longer available/);
        await assert.rejects(claim(member, claimable, "https://github.com/a/different"), /no longer available/);
        await assert.rejects(manageClaim("closed", { revision, resolution: "implemented", note: "Stale" }), /Idea changed/);
        const publicRow = (await as("anon", null, () => db.query("SELECT * FROM public.get_ideas_with_claims('') WHERE id=$1", [claimable]))).rows[0];
        assert.equal(publicRow.claimant_name, "New builder");
        assert.equal(publicRow.repository_url, repository);
        for (const privateField of ["creator_user_id", "claimant_id", "email", "install_id"]) assert.ok(!(privateField in publicRow));
        assert.ok(!(await db.query("SELECT id FROM public.get_tool_ideas('')")).rows.some(({ id }) => id === claimable));
        assert.equal((await db.query("SELECT is_tool_developer FROM public.user_profiles WHERE id=$1", [member])).rows[0].is_tool_developer, false);
        assert.equal((await as("authenticated", member, () => db.query("SELECT * FROM public.idea_claims"))).rows.length, 0);
        await assert.rejects(as("authenticated", member, () => db.query(
            "INSERT INTO public.tool_ideas(title,description,install_id,app_version,claim_id) VALUES ('Forged','D','i','web',$1)", [claimId],
        )), /cannot be submitted with a claim/);
        await assert.rejects(db.query("UPDATE public.tool_ideas SET claim_id=$1,status='in_progress' WHERE id=$2", [claimId, second]), /own active claim/);
    });

    await t.test("in-progress voting preserves identity-scoped add/remove behavior", async () => {
        const result = await as("authenticated", admin, () => db.query("SELECT * FROM public.upvote_tool_idea($1,'')", [claimable]));
        assert.equal(result.rows[0].has_upvoted, true);
        const removed = await as("authenticated", admin, () => db.query("SELECT * FROM public.remove_tool_idea_vote($1,'')", [claimable]));
        assert.equal(removed.rows[0].has_upvoted, false);
    });

    await t.test("maintainers can correct repositories, close, release and allow a new claim without losing provenance", async () => {
        await assert.rejects(as("authenticated", member, () => db.query(
            "SELECT public.review_idea_with_claim($1,now(),'open',null,null,null,null,null,true)", [claimable],
        )), /Admin access required/);
        await assert.rejects(review(claimable, "open"), /ideas_claim_status_check/);
        await assert.rejects(db.query("UPDATE public.tool_ideas SET status='open',claim_id=null WHERE id=$1", [claimable]), /Release the previous claim/);
        const corrected = "https://github.com/new-builder/corrected-tool";
        await manageClaim("in_progress", { url: corrected });
        assert.equal((await db.query("SELECT repository_url FROM public.idea_claims WHERE id=$1", [claimId])).rows[0].repository_url, corrected);
        const history = await db.query("SELECT * FROM public.idea_review_history WHERE idea_id=$1 AND new_review->>'repository_url'=$2", [claimable, corrected]);
        assert.equal(history.rows.length, 1);
        assert.equal(history.rows[0].changed_by, admin);
        await manageClaim("closed", { url: corrected, resolution: "implemented", note: "Published" });
        assert.equal((await row(claimable)).claim_id, claimId);
        await assert.rejects(claim(admin), /no longer available/);
        await manageClaim("open", { release: true, url: corrected });
        assert.equal((await row(claimable)).claim_id, null);
        assert.ok((await db.query("SELECT released_at FROM public.idea_claims WHERE id=$1", [claimId])).rows[0].released_at);
        const next = await claim(admin);
        assert.notEqual(next.rows[0].claim_id, claimId);
    });

    await t.test("legacy list columns remain unchanged", async () => {
        const originalColumns = (await db.query("SELECT * FROM public.get_tool_ideas('')")).fields.map(({ name }) => name);
        assert.deepEqual(originalColumns, oldColumns);
    });

    await t.test("history removal preserves claims, votes, review permissions and claim management", async () => {
        const counts = async () => (await db.query(`SELECT
            (SELECT count(*) FROM public.tool_ideas) AS ideas,
            (SELECT count(*) FROM public.idea_claims) AS claims,
            (SELECT count(*) FROM public.tool_idea_votes) AS votes`)).rows[0];
        const before = await counts();
        await db.exec(removeReviewHistory);
        await db.exec(removeReviewHistory);
        assert.deepEqual(await counts(), before);
        assert.equal((await db.query("SELECT to_regclass('public.idea_review_history') AS relation")).rows[0].relation, null);
        await assert.rejects(as("authenticated", member, () => db.query(
            "SELECT public.review_idea_with_claim($1,now(),'open',null,null,null,null,null,true)", [claimable],
        )), /Admin access required/);
        const revision = (await row(claimable)).updated_at;
        await manageClaim("in_progress", { url: "https://github.com/builder/corrected" });
        await assert.rejects(manageClaim("open", { release: true, revision }), /Idea changed/);
        await manageClaim("closed", { resolution: "implemented", note: "Delivered" });
        await manageClaim("open", { release: true });
        assert.equal((await row(claimable)).claim_id, null);
        await claim(member);
        assert.equal((await row(claimable)).status, "in_progress");
        await review(first, "planned");
        assert.equal((await row(first)).status, "planned");
    });

    await t.test("breaking rename preserves data, permissions, triggers and all idea operations", async () => {
        const snapshot = async (ideasTable, votesTable, ideaColumn) => ({
            ideas: (await db.query(`SELECT * FROM public.${ideasTable} ORDER BY id`)).rows,
            votes: (await db.query(`SELECT * FROM public.${votesTable} ORDER BY idea_id,voter_id`)).rows,
            claims: (await db.query("SELECT * FROM public.idea_claims ORDER BY id")).rows,
            links: (await db.query(`SELECT id,${ideaColumn} AS idea_id FROM public.tool_intakes ORDER BY id`)).rows,
        });
        const before = await snapshot("tool_ideas", "tool_idea_votes", "tool_idea_id");
        // Intake resubmission functions also contain column names in JSON keys.
        await db.exec(`CREATE FUNCTION public.test_intake_idea_json(p_values jsonb) RETURNS uuid
            LANGUAGE sql SET search_path = '' AS $$
            SELECT i.id FROM public.tool_ideas i WHERE i.id=(p_values->>'tool_idea_id')::uuid $$;`);
        await db.exec(renameIdeas);
        await db.exec(renameIdeas);
        assert.deepEqual(await snapshot("ideas", "idea_votes", "idea_id"), before);
        const verified = await db.exec(renameVerification);
        assert.ok(Object.values(verified[0].rows[0]).every(Boolean));
        assert.equal(verified[2].rows.length, 0);
        assert.equal((await db.query("SELECT public.test_intake_idea_json($1) AS id", [JSON.stringify({ idea_id: first })])).rows[0].id, first);
        for (const signature of ["upvote_tool_idea(uuid,text)", "remove_tool_idea_vote(uuid,text)", "claim_tool_idea(uuid,text)", "get_tool_ideas(text)"]) {
            assert.equal((await db.query("SELECT to_regprocedure($1) AS fn", [`public.${signature}`])).rows[0].fn, null);
        }
        assert.equal((await db.query("SELECT count(*) FROM pg_constraint WHERE conrelid='public.tool_intakes'::regclass AND conname='tool_intakes_idea_id_fkey'")).rows[0].count, 1);
        await assert.rejects(as("anon", null, () => db.query("SELECT * FROM public.claim_idea($1,$2)", [first, repository])), /permission denied/);
        assert.equal((await as("authenticated", member, () => db.query("SELECT * FROM public.ideas"))).rows.length, 0);
        const newId = "44444444-4444-4444-8444-444444444444";
        await as("authenticated", member, () => db.query(
            "INSERT INTO public.ideas(id,title,description,install_id,app_version) VALUES ($1,'Renamed idea','D','i','web')", [newId],
        ));
        const renamedRow = async (id) => (await db.query("SELECT * FROM public.ideas WHERE id=$1", [id])).rows[0];
        assert.equal((await renamedRow(newId)).creator_user_id, member);
        const voteResult = await as("authenticated", member, () => db.query("SELECT * FROM public.upvote_idea($1,'')", [newId]));
        assert.equal(voteResult.rows[0].has_upvoted, true);
        const claimResult = await as("authenticated", member, () => db.query("SELECT * FROM public.claim_idea($1,$2)", [newId, repository]));
        assert.equal(claimResult.rows[0].already_claimed, false);
        const repeat = await as("authenticated", member, () => db.query("SELECT * FROM public.claim_idea($1,$2)", [newId, repository]));
        assert.equal(repeat.rows[0].already_claimed, true);
        await assert.rejects(as("authenticated", admin, () => db.query("SELECT * FROM public.claim_idea($1,$2)", [newId, repository])), /no longer available/);
        const claimedView = (await as("anon", null, () => db.query("SELECT * FROM public.get_ideas_with_claims('') WHERE id=$1", [newId]))).rows[0];
        assert.equal(claimedView.status, "in_progress");
        assert.equal(claimedView.claim_id, claimResult.rows[0].claim_id);
        assert.equal(claimedView.repository_url, repository);
        const newDesktopId = "55555555-5555-4555-8555-555555555555";
        await as("authenticated", member, () => db.query(
            "INSERT INTO public.ideas(id,title,description,install_id,app_version,idea_type) VALUES ($1,'PPTB idea','D','i','web','pptb_desktop')", [newDesktopId],
        ));
        assert.equal((await renamedRow(newDesktopId)).status, "open");
        await assert.rejects(as("authenticated", member, () => db.query("SELECT * FROM public.claim_idea($1,$2)", [newDesktopId, repository])), /no longer available/);
        const unvoteResult = await as("authenticated", member, () => db.query("SELECT * FROM public.remove_idea_vote($1,'')", [newId]));
        assert.equal(unvoteResult.rows[0].has_upvoted, false);
        const revision = (await renamedRow(newId)).updated_at;
        await assert.rejects(as("authenticated", member, () => db.query(
            "SELECT public.review_idea_with_claim($1,$2,'open',null,null,null,null,null,true)", [newId, revision],
        )), /Admin access required/);
        await as("authenticated", admin, () => db.query(
            "SELECT public.review_idea_with_claim($1,$2,'open',null,null,null,null,null,true)", [newId, revision],
        ));
        assert.equal((await renamedRow(newId)).claim_id, null);
        const desktopRow = await renamedRow(desktop);
        await as("authenticated", admin, () => db.query("SELECT public.review_idea($1,$2,'planned',null,null,null,null)", [desktop, desktopRow.updated_at]));
        await assert.rejects(db.query("INSERT INTO public.tool_intakes(idea_id) VALUES ($1)", [desktop]), /only link to Tool Ideas/);
        await db.query("INSERT INTO public.tool_intakes(idea_id) VALUES ($1)", [newId]);
        const openIdeas = await as("anon", null, () => db.query("SELECT * FROM public.get_open_tool_ideas('')"));
        assert.ok(openIdeas.rows.some(({ id }) => id === newId));
        assert.ok(!openIdeas.rows.some(({ id }) => id === desktop));
        const publicIdea = (await as("anon", null, () => db.query("SELECT * FROM public.get_ideas_with_claims('') WHERE id=$1", [newId]))).rows[0];
        assert.equal(publicIdea.status, "open");
        assert.equal("creator_user_id" in publicIdea, false);
        assert.equal((await db.query("SELECT to_regclass('public.idea_review_history') AS relation")).rows[0].relation, null);
    });
});
