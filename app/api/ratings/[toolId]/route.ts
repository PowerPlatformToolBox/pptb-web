import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
    try {
        const { toolId } = await params;

        if (!toolId) {
            return NextResponse.json({ error: "Tool ID is required" }, { status: 400 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
        }

        // Create Supabase client with service role key
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Fetch ratings for the tool
        const { data: ratingsData, error: ratingsError } = await supabase
            .from("ratings")
            .select("id, tool_id, user_id, rating, comment, tool_version, created_at, rating_author_replies(reply, created_at, updated_at)")
            .eq("tool_id", toolId)
            .order("created_at", { ascending: false });

        if (ratingsError) {
            throw ratingsError;
        }

        if (!ratingsData || ratingsData.length === 0) {
            return NextResponse.json({ ratings: [] }, { headers: { "Cache-Control": "no-store" } });
        }

        // Get unique user IDs
        const userIds = Array.from(new Set(ratingsData.map((r) => r.user_id))).filter((id): id is string => typeof id === "string" && id.length > 0);
        const userMap = new Map<string, string>();

        if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase.from("user_profiles").select("id, name").in("id", userIds);

            if (profilesError) {
                throw profilesError;
            }

            for (const profile of profilesData || []) {
                const name = typeof profile.name === "string" ? profile.name.trim() : "";
                // Provider metadata or legacy profiles may contain an email as the name.
                if (name && !name.includes("@")) {
                    userMap.set(profile.id, name);
                }
            }
        }

        // Enrich ratings with user info
        const enrichedRatings = ratingsData.map((r) => {
            const reply = Array.isArray(r.rating_author_replies) ? r.rating_author_replies[0] : r.rating_author_replies;
            return {
                id: r.id,
                toolId: r.tool_id,
                userName: userMap.get(r.user_id) || "Anonymous reviewer",
                rating: r.rating,
                comment: r.comment,
                toolVersion: r.tool_version ?? null,
                createdAt: r.created_at,
                authorReply: reply ? {
                    reply: reply.reply,
                    createdAt: reply.created_at,
                    updatedAt: reply.updated_at,
                } : null,
            };
        });

        return NextResponse.json({ ratings: enrichedRatings }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Error in ratings API:", error);
        return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
    }
}
