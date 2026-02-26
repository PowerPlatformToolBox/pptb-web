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

        const { data, error } = await supabase
            .from("tools")
            .select(
                `id, name, description, icon, status,
                tool_analytics (downloads, rating, mau),
                tool_categories (categories (name)),
                tool_contributors (contributors (name))`,
            )
            .eq("status", "active")
            .order("name", { ascending: true });

        if (error) {
            throw error;
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching tools:", error);
        return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
    }
}
