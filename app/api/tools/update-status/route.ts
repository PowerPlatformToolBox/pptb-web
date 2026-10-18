import { TOOL_STATUSES, ToolStatus, VALID_TOOL_STATUSES } from "@/lib/constants/tool-statuses";
import { getDiscordActor, notifyDiscordAfterResponse, toDiscordTool, truncate } from "@/lib/discord-notify";
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

interface UpdateStatusRequest {
    toolId: string;
    status: ToolStatus;
    reason?: string;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();

        if (!supabase) {
            return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
        }

        // Verify user is authenticated
        const authHeader = request.headers.get("authorization");
        let userId: string | null = null;

        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.slice(7);
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser(token);

            if (!authError && user) {
                userId = user.id;
            } else {
                return NextResponse.json({ error: "Unauthorized. Valid user token required." }, { status: 401 });
            }
        }

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
        }

        // Parse request body
        const body = (await request.json()) as UpdateStatusRequest;
        const { toolId, status, reason } = body;

        if (!toolId || !status) {
            return NextResponse.json({ error: "toolId and status are required" }, { status: 400 });
        }

        // Validate status value
        if (!VALID_TOOL_STATUSES.includes(status as ToolStatus)) {
            return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_TOOL_STATUSES.join(", ")}` }, { status: 400 });
        }

        if (reason !== undefined && typeof reason !== "string") {
            return NextResponse.json({ error: "reason must be a string" }, { status: 400 });
        }

        // Verify the tool belongs to the user, or that the user is an admin
        const { data: tool, error: fetchError } = await supabase
            .from("tools")
            .select("id, user_id, status, name, packagename, version, description, icon, tool_contributors (contributors (name))")
            .eq("id", toolId)
            .single();

        if (fetchError || !tool) {
            return NextResponse.json({ error: "Tool not found" }, { status: 404 });
        }

        const isOwner = tool.user_id === userId;
        if (!isOwner) {
            const { data: adminRole } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
            if (!adminRole) {
                return NextResponse.json({ error: "You do not have permission to update this tool" }, { status: 403 });
            }
        }

        // Update the tool status
        const { error: updateError } = await supabase
            .from("tools")
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq("id", toolId);

        if (updateError) {
            console.error("Error updating tool status:", updateError);
            return NextResponse.json({ error: "Failed to update tool status" }, { status: 500 });
        }

        if (tool.status !== status && (status === TOOL_STATUSES.DEPRECATED || status === TOOL_STATUSES.DELETED)) {
            const actorId = userId;
            const cleanReason = reason?.trim() ? truncate(reason.trim(), 1000) : undefined;
            const discordTool = toDiscordTool(tool);
            if (status === TOOL_STATUSES.DEPRECATED) {
                notifyDiscordAfterResponse("tool.deprecated", () => ({ tool: discordTool, reason: cleanReason }));
            } else if (isOwner) {
                notifyDiscordAfterResponse("tool.deleted", () => ({ tool: discordTool, reason: cleanReason }));
            } else {
                notifyDiscordAfterResponse("tool-submission.revoked", async () => ({ tool: discordTool, reason: cleanReason, revokedBy: await getDiscordActor(supabase, actorId) }));
            }
        }

        return NextResponse.json({
            success: true,
            message: `Tool status updated to ${status}`,
            data: {
                toolId,
                status,
            },
        });
    } catch (error) {
        console.error("Error updating tool status:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
