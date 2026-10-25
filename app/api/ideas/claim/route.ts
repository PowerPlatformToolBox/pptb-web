import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { validateIdeaClaim } from "@/lib/ideas";
import { sendIdeaClaimNotifications } from "@/lib/idea-claim-notifications";

export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
        if (!token) return NextResponse.json({ error: "Sign in to start working on an idea." }, { status: 401, headers });
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return NextResponse.json({ error: "Database connection not configured" }, { status: 500, headers });
        const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const {
            data: { user },
            error: authError,
        } = await service.auth.getUser(token);
        if (authError || !user) return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers });
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers });
        }
        const validation = validateIdeaClaim(body);
        if (validation) return NextResponse.json({ error: validation }, { status: 400, headers });
        const claim = body as { id: string; repositoryUrl: string };
        const client = createClient(url, key, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await client.rpc("claim_idea", { p_id: claim.id, p_repository_url: claim.repositoryUrl });
        if (error) {
            console.error("Error claiming idea:", error);
            const status =
                error.code === "40001" || error.code === "23505" ? 409 : error.code === "42501" ? 403 : error.code === "P0002" ? 404 : ["22023", "23514", "22P02"].includes(error.code) ? 400 : 500;
            return NextResponse.json(
                {
                    error:
                        status === 409
                            ? "This idea has already been picked up or is no longer available. Its status has been refreshed."
                            : status === 404
                              ? "Idea not found."
                              : status === 403
                                ? "Sign in to claim this idea."
                                : status === 400
                                  ? "Check the idea and GitHub repository URL."
                                  : "The idea could not be claimed. Please try again.",
                },
                { status, headers },
            );
        }
        const result = data?.[0];
        if (!result?.claim_id) throw new Error("Missing claim confirmation");
        let notificationWarning: string | null = null;
        try {
            if (!result.already_claimed) {
                const delivery = await sendIdeaClaimNotifications(service, result.claim_id);
                if (delivery.failed > 0) notificationWarning = "Your claim was saved, but some notifications could not be delivered.";
            }
        } catch (error) {
            console.error("Error sending committed idea claim notifications:", error);
            notificationWarning = "Your claim was saved, but notification delivery could not be confirmed.";
        }
        return NextResponse.json({ claimId: result.claim_id, alreadyClaimed: result.already_claimed, notificationWarning }, { headers });
    } catch (error) {
        console.error("Error claiming idea:", error);
        return NextResponse.json({ error: "The idea could not be claimed. Please retry; an existing claim will not be duplicated." }, { status: 500, headers });
    }
}
