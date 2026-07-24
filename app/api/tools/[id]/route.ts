import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { mockTools, toToolDetailApiRecord } from "@/lib/mock-tools";

// Create Supabase client with service role for server-side operations
function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = getSupabaseClient();
        if (!supabase) {
            const mockTool = mockTools.find((tool) => tool.id === id);
            if (!mockTool) {
                return NextResponse.json({ error: "Tool not found" }, { status: 404 });
            }

            return NextResponse.json(toToolDetailApiRecord(mockTool));
        }

        const { data, error } = await supabase
            .from("tools")
            .select(
                `id, name, description, icon, status,
                readmeurl, downloadurl, version, repository, website,
                tool_analytics (downloads, rating, mau),
                tool_categories (categories (name)),
                tool_contributors (contributors (name))`,
            )
            .eq("id", id)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            return NextResponse.json({ error: "Tool not found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching tool:", error);
        return NextResponse.json({ error: "Failed to fetch tool" }, { status: 500 });
    }
}
