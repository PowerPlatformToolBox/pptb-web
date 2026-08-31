import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { mockTools, toToolSummaryApiRecord } from "@/lib/mock-tools";

// Create Supabase client with service role for server-side operations
function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            const mockResponse = mockTools.map(toToolSummaryApiRecord).sort((a, b) => a.name.localeCompare(b.name));
            return NextResponse.json(mockResponse);
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

        const toolIds = (data || []).map((tool) => tool.id);
        const maturityByToolId = new Map<string, string>();
        if (toolIds.length > 0) {
            const { data: maturityRows, error: maturityError } = await supabase.from("tool_maturity").select("tool_id, status").in("tool_id", toolIds);
            if (maturityError) throw maturityError;
            maturityRows?.forEach((row) => maturityByToolId.set(row.tool_id, row.status));
        }

        const tools = (data || [])
            .map((tool) => ({ ...tool, tool_maturity: { status: maturityByToolId.get(tool.id) || "unverified" } }))
            .sort((first, second) => {
                const maturityOrder = Number(second.tool_maturity.status === "verified") - Number(first.tool_maturity.status === "verified");
                return maturityOrder || first.name.localeCompare(second.name);
            });

        return NextResponse.json(tools);
    } catch (error) {
        console.error("Error fetching tools:", error);
        return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
    }
}
