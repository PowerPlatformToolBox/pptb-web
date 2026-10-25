import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverDiscordEvent, getSiteUrl } from "@/lib/discord-notify";
import { sendEmail } from "@/lib/resend";

export async function sendIdeaClaimNotifications(supabase: SupabaseClient, claimId: string) {
    const { data: claim, error: claimError } = await supabase.from("idea_claims").select("idea_id, claimant_name, repository_url, created_at").eq("id", claimId).single();
    if (claimError || !claim) throw new Error(`Could not load claim: ${claimError?.message ?? "not found"}`);
    const { data: idea, error: ideaError } = await supabase.from("ideas").select("title, creator_user_id").eq("id", claim.idea_id).single();
    if (ideaError || !idea) throw new Error(`Could not load idea: ${ideaError?.message ?? "not found"}`);
    const ideaUrl = `${getSiteUrl()}/ideas#idea-${claim.idea_id}`;
    const outcomes = await Promise.allSettled([
        deliverDiscordEvent(
            "idea.claimed",
            {
                idea: { id: claim.idea_id, title: idea.title, url: ideaUrl },
                claimedBy: { name: claim.claimant_name },
                repositoryUrl: claim.repository_url,
                claimedAt: claim.created_at,
            },
            { id: claimId, occurredAt: claim.created_at },
        ),
        (async () => {
            if (!idea.creator_user_id) return;
            const result = await sendEmail({
                type: "idea-claimed",
                supabase,
                data: {
                    creatorId: idea.creator_user_id,
                    eventId: claimId,
                    ideaTitle: idea.title,
                    claimantName: claim.claimant_name,
                    repositoryUrl: claim.repository_url,
                    ideaUrl,
                },
            });
            if (!result.success) throw new Error(result.error || "Idea creator email failed");
        })(),
    ]);
    outcomes.forEach((outcome, index) => {
        if (outcome.status === "rejected") {
            console.error(`[idea-claim-notifications] ${claimId} (${index === 0 ? "discord" : "email"}):`, outcome.reason);
        }
    });
    return { failed: outcomes.filter((outcome) => outcome.status === "rejected").length };
}
