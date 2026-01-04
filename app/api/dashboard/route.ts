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
                iconurl, 
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

        return NextResponse.json({
            user,
            isAdmin,
            tools: transformedTools,
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
    }
}
