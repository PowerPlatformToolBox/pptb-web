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

        const { data, error } = await supabase.from("categories").select("id, name").order("name");

        if (error) {
            throw error;
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}
