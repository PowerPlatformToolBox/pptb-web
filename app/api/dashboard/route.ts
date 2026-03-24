import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create Supabase client with service role for server-side operations
function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Compare two semver strings. Returns:
 *  > 0 if a > b
 *  0   if a === b
 *  < 0 if a < b
 * Non-numeric pre-release segments are compared lexicographically.
 */
function compareSemver(a: string, b: string): number {
    const parse = (v: string) =>
        v
            .replace(/^v/, "")
            .split(".")
            .map((p) => {
                const n = parseInt(p, 10);
                return isNaN(n) ? p : n;
            });

    const aParts = parse(a);
    const bParts = parse(b);
    const len = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < len; i++) {
        const ap = aParts[i] ?? 0;
        const bp = bParts[i] ?? 0;
        if (ap < bp) return -1;
        if (ap > bp) return 1;
    }
    return 0;
}

export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
        }

        // Get authorization token from headers
        const authHeader = request.headers.get("authorization");
        let user = null;
        let isAdmin = false;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);

            // Verify the JWT token
            const {
                data: { user: authUser },
            } = await supabase.auth.getUser(token);

            if (authUser) {
                user = {
                    id: authUser.id,
                    email: authUser.email,
                    user_metadata: authUser.user_metadata,
                };

                // Check if user is admin
                const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", authUser.id).eq("role", "admin").limit(1);

                isAdmin = !!(roleRows && roleRows.length > 0);
            }
        }

        // Fetch all tools data with analytics and categories
        const { data: toolsData, error } = await supabase
            .from("tools")
            .select(
                `
                id, 
                name, 
                description, 
                icon, 
                packagename,
                version,
                user_id,
                status,
                tool_analytics (downloads, rating, mau),
                tool_categories (
                    categories (id, name)
                )
            `,
            )
            .order("name", { ascending: true });

        if (error) {
            throw error;
        }

        // Transform tool_categories for easier rendering
        const transformedTools =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toolsData?.map((tool: any) => ({
                ...tool,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                categories: tool.tool_categories?.map((tc: any) => tc.categories).filter(Boolean) || [],
            })) || [];

        // Fetch failed tool updates for the authenticated user's tools
        let failedToolUpdates: Array<{ id: string; package_name: string; version: string; validation_warnings: string[] | null }> = [];
        if (user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userTools = (toolsData || []).filter((t: any) => t.user_id === user.id && t.packagename);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userToolPackageNames = userTools.map((t: any) => t.packagename);

            if (userToolPackageNames.length > 0) {
                const { data: failedUpdates } = await supabase
                    .from("tool_updates")
                    .select("id, package_name, version, validation_warnings")
                    .in("package_name", userToolPackageNames)
                    .eq("status", "validation_failed");

                if (failedUpdates) {
                    // Only surface failed updates whose version is >= the tool's current published version
                    failedToolUpdates = failedUpdates.filter((update) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const tool = userTools.find((t: any) => t.packagename === update.package_name);
                        if (!tool || !tool.version || !update.version) return true;
                        return compareSemver(update.version, tool.version) >= 0;
                    });
                }
            }
        }

        return NextResponse.json({
            user,
            isAdmin,
            tools: transformedTools,
            failedToolUpdates,
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
    }
}
