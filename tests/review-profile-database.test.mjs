import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const privacy = await readFile(new URL("../docs/sql/review-profile-privacy.sql", import.meta.url), "utf8");
const names = await readFile(new URL("../docs/sql/profile-name-sync.sql", import.meta.url), "utf8");
const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";

test("profile migrations protect private rows and preserve names without changing review access", async (t) => {
    const db = new PGlite();
    t.after(() => db.close());
    await db.exec(`
        CREATE ROLE anon;
        CREATE ROLE authenticated;
        CREATE ROLE service_role BYPASSRLS;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
            $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        CREATE TABLE auth.users (
            id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'
        );
        CREATE TABLE public.user_profiles (
            id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email text, name text, avatar_url text,
            created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
            linkedin_profile_url text, discord_handle text,
            is_tool_developer boolean NOT NULL DEFAULT false
        );
        CREATE TABLE public.ratings (id uuid PRIMARY KEY, user_id uuid, rating integer);
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow public read access on user_profiles"
            ON public.user_profiles FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "Allow users to update their own profile"
            ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
        CREATE POLICY "Allow public read access on ratings"
            ON public.ratings FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "Allow authenticated users to insert ratings"
            ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Allow users to update their own ratings"
            ON public.ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
        GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
        GRANT ALL ON public.user_profiles, public.ratings TO anon, authenticated, service_role;
        -- Explicit column grants must not survive the table-level revocation.
        GRANT SELECT (email) ON public.user_profiles TO anon, PUBLIC;
    `);
    await db.exec(privacy);
    await db.exec(privacy);
    await db.exec(names);
    await db.exec(`
        CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();
        INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES
            ('${first}', 'first@example.test', '{"name":"  First Reviewer  "}'),
            ('${second}', 'second@example.test', '{}');
        INSERT INTO public.ratings VALUES ('${first}', '${first}', 5);
    `);

    async function as(role, user, action) {
        await db.exec(`SET ROLE ${role}`);
        await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user || ""]);
        try {
            return await action();
        } finally {
            await db.exec("RESET ROLE");
        }
    }

    await t.test("anonymous clients cannot select profiles, including explicitly granted email", async () => {
        for (const columns of ["*", "email", "id, name"]) {
            await assert.rejects(as("anon", null, () => db.query(`SELECT ${columns} FROM public.user_profiles`)), /permission denied/);
        }
    });

    await t.test("authenticated users can read/update themselves but cannot read/update another profile", async () => {
        const own = await as("authenticated", first, () => db.query("SELECT id, email FROM public.user_profiles"));
        assert.deepEqual(own.rows, [{ id: first, email: "first@example.test" }]);
        const other = await as("authenticated", first, () => db.query("UPDATE public.user_profiles SET name='Changed' WHERE id=$1 RETURNING id", [second]));
        assert.equal(other.rows.length, 0);
        const updated = await as("authenticated", first, () => db.query("UPDATE public.user_profiles SET name='Chosen Name' WHERE id=$1 RETURNING name", [first]));
        assert.equal(updated.rows[0].name, "Chosen Name");
    });

    await t.test("service role still resolves profiles and public rating reads still work", async () => {
        const profiles = await as("service_role", null, () => db.query("SELECT id, name FROM public.user_profiles"));
        assert.equal(profiles.rows.length, 2);
        const ratings = await as("anon", null, () => db.query("SELECT * FROM public.ratings"));
        assert.equal(ratings.rows.length, 1);
        await as("authenticated", second, () => db.query("INSERT INTO public.ratings VALUES ($1, $1, 4)", [second]));
        await as("authenticated", second, () => db.query("UPDATE public.ratings SET rating=3 WHERE user_id=$1", [second]));
    });

    await t.test("client roles cannot truncate either table despite broad original grants", async () => {
        for (const role of ["anon", "authenticated"]) {
            for (const table of ["user_profiles", "ratings"]) {
                await assert.rejects(as(role, first, () => db.query(`TRUNCATE public.${table}`)), /permission denied/);
            }
        }
    });

    await t.test("auth updates without name metadata preserve an existing profile name", async () => {
        await db.query("UPDATE auth.users SET raw_user_meta_data='{}', email='new@example.test' WHERE id=$1", [first]);
        const result = await db.query("SELECT name, email FROM public.user_profiles WHERE id=$1", [first]);
        assert.deepEqual(result.rows, [{ name: "Chosen Name", email: "new@example.test" }]);
    });

    await t.test("blank name falls back to trimmed full_name on updates and inserts", async () => {
        await db.query(`UPDATE auth.users SET raw_user_meta_data='{"name":"  ","full_name":" Full Name "}' WHERE id=$1`, [second]);
        assert.equal((await db.query("SELECT name FROM public.user_profiles WHERE id=$1", [second])).rows[0].name, "Full Name");
        const third = "33333333-3333-4333-8333-333333333333";
        await db.query(`INSERT INTO auth.users(id, raw_user_meta_data) VALUES ($1, '{"name":"","full_name":" New Name "}')`, [third]);
        assert.equal((await db.query("SELECT name FROM public.user_profiles WHERE id=$1", [third])).rows[0].name, "New Name");
    });

    await t.test("accounts without metadata are not assigned invented names", async () => {
        const fourth = "44444444-4444-4444-8444-444444444444";
        await db.query("INSERT INTO auth.users(id) VALUES ($1)", [fourth]);
        assert.equal((await db.query("SELECT name FROM public.user_profiles WHERE id=$1", [fourth])).rows[0].name, null);
    });
});
