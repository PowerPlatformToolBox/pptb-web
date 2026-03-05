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
            return new NextResponse(
                JSON.stringify({ error: { code: "500", message: "Supabase is not configured" } }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json;odata.metadata=minimal",
                        "OData-Version": "4.0",
                    },
                },
            );
        }

        const { data, error } = await supabase
            .from("tools")
            .select(
                `name, description, icon,
                tool_analytics (downloads, rating, mau),
                tool_categories (categories (name)),
                tool_contributors (contributors (name))`,
            )
            .eq("status", "active")
            .order("name", { ascending: true });

        if (error) {
            throw error;
        }

        const baseUrl = new URL(request.url);
        const contextUrl = `${baseUrl.protocol}//${baseUrl.host}/api/odata/$metadata#Tools`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tools = (data as any[])?.map((tool) => ({
            Name: tool.name as string,
            Description: tool.description as string,
            Icon: (tool.icon as string | null) ?? "📦",
            Downloads: (tool.tool_analytics?.[0]?.downloads as number) ?? 0,
            Rating: (tool.tool_analytics?.[0]?.rating as number) ?? 0,
            MAU: (tool.tool_analytics?.[0]?.mau as number) ?? 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Categories: (tool.tool_categories as any[])?.map((toolCategory: any) => toolCategory.categories?.name as string).filter((name: string | undefined): name is string => !!name) ?? [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Contributors: (tool.tool_contributors as any[])?.map((toolContributor: any) => toolContributor.contributors?.name as string).filter((name: string | undefined): name is string => !!name) ?? [],
        }));

        return new NextResponse(
            JSON.stringify({
                "@odata.context": contextUrl,
                value: tools ?? [],
            }),
            {
                headers: {
                    "Content-Type": "application/json;odata.metadata=minimal",
                    "OData-Version": "4.0",
                },
            },
        );
    } catch (error) {
        console.error("Error fetching tools for OData feed:", error);
        return new NextResponse(
            JSON.stringify({ error: { code: "500", message: "Failed to fetch tools" } }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json;odata.metadata=minimal",
                    "OData-Version": "4.0",
                },
            },
        );
    }
}
