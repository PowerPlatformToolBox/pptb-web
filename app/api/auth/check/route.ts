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

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
        }

        // Get authorization token from headers
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ authenticated: false, user: null, isAdmin: false }, { status: 200 });
        }

        const token = authHeader.substring(7);

        // Verify the JWT token
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return NextResponse.json({ authenticated: false, user: null, isAdmin: false }, { status: 200 });
        }

        // Check if user is admin
        const { data: roleRows, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1);

        const isAdmin = !roleError && roleRows && roleRows.length > 0;

        return NextResponse.json({
            authenticated: true,
            user: {
                id: user.id,
                email: user.email,
                user_metadata: user.user_metadata,
            },
            isAdmin,
        });
    } catch (error) {
        console.error("Error checking authentication:", error);
        return NextResponse.json({ error: "Failed to check authentication" }, { status: 500 });
    }
}
