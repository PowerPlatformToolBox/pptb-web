/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendEmail } from "@/lib/resend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
}

async function authenticateAdmin(request: NextRequest, supabase: SupabaseClient) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(authHeader.slice(7));
    if (error || !user) return null;

    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    return role ? user : null;
}

export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });

        const admin = await authenticateAdmin(request, supabase);
        if (!admin) return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });

        const [{ data: requests, error: requestsError }, { data: criteria, error: criteriaError }] = await Promise.all([
            supabase
                .from("tool_verification_requests")
                .select("id, tool_id, developer_id, status, submitted_at, reviewed_by")
                .in("status", ["queued", "in_review"])
                .order("submitted_at", { ascending: true }),
            supabase.from("tool_verification_criteria").select("key, category, label, reviewer_guidance, required, sort_order").order("sort_order", { ascending: true }),
        ]);
        if (requestsError || criteriaError) throw requestsError || criteriaError;

        const toolIds = [...new Set((requests || []).map((item) => item.tool_id))];
        if (toolIds.length === 0) return NextResponse.json({ requests: [], criteria: criteria || [] });

        const [{ data: tools, error: toolsError }, { data: ratings, error: ratingsError }] = await Promise.all([
            supabase.from("tools").select("id, name, version, repository, csp_exceptions, tool_analytics(downloads, rating, mau)").in("id", toolIds),
            supabase.from("ratings").select("tool_id, rating").in("tool_id", toolIds).gte("rating", 3),
        ]);
        if (toolsError || ratingsError) throw toolsError || ratingsError;

        const toolById = new Map((tools || []).map((tool) => [tool.id, tool]));
        const qualifyingReviewCount = new Map<string, number>();
        ratings?.forEach((rating) => qualifyingReviewCount.set(rating.tool_id, (qualifyingReviewCount.get(rating.tool_id) || 0) + 1));

        const enrichedRequests = (requests || []).map((verificationRequest) => {
            const tool = toolById.get(verificationRequest.tool_id) as any;
            const analytics = Array.isArray(tool?.tool_analytics) ? tool.tool_analytics[0] : tool?.tool_analytics;
            const metrics = {
                mau: analytics?.mau || 0,
                downloads: analytics?.downloads || 0,
                qualifyingReviews: qualifyingReviewCount.get(verificationRequest.tool_id) || 0,
            };
            return {
                ...verificationRequest,
                tool: tool ? { id: tool.id, name: tool.name, version: tool.version, repository: tool.repository } : null,
                usageMetrics: metrics,
                usageMetricsMet: Number(metrics.mau >= 10) + Number(metrics.downloads >= 50) + Number(metrics.qualifyingReviews >= 1),
            };
        });

        return NextResponse.json({ requests: enrichedRequests, criteria: criteria || [] });
    } catch (error) {
        console.error("[maturity-admin] Failed to load verification queue", error);
        return NextResponse.json({ error: "Failed to load verification queue" }, { status: 500 });
    }
}

interface ChecklistResultInput {
    criterionKey: string;
    passed: boolean;
    waived?: boolean;
    comment?: string;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });

        const admin = await authenticateAdmin(request, supabase);
        if (!admin) return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });

        const body = await request.json();
        if (!body.requestId || !["claim", "decide"].includes(body.action)) {
            return NextResponse.json({ error: "requestId and a valid action are required" }, { status: 400 });
        }

        const { data: verificationRequest, error: requestError } = await supabase
            .from("tool_verification_requests")
            .select("id, tool_id, developer_id, status, reviewed_by")
            .eq("id", body.requestId)
            .maybeSingle();
        if (requestError) throw requestError;
        if (!verificationRequest) return NextResponse.json({ error: "Verification request not found" }, { status: 404 });

        if (body.action === "claim") {
            if (verificationRequest.status === "in_review") {
                if (verificationRequest.reviewed_by !== admin.id) {
                    return NextResponse.json({ error: "This request is already being reviewed by another admin" }, { status: 409 });
                }
                return NextResponse.json({ success: true, request: verificationRequest });
            }
            if (verificationRequest.status !== "queued") {
                return NextResponse.json({ error: "Only queued requests can be opened" }, { status: 409 });
            }

            const { data: claimed, error: claimError } = await supabase
                .from("tool_verification_requests")
                .update({ status: "in_review", reviewed_by: admin.id, updated_at: new Date().toISOString() })
                .eq("id", body.requestId)
                .eq("status", "queued")
                .select("id, tool_id, developer_id, status, reviewed_by")
                .maybeSingle();
            if (claimError) throw claimError;
            if (!claimed) return NextResponse.json({ error: "This request was claimed by another admin" }, { status: 409 });
            return NextResponse.json({ success: true, request: claimed });
        }

        if (verificationRequest.status !== "in_review" || verificationRequest.reviewed_by !== admin.id) {
            return NextResponse.json({ error: "Open and claim this request before deciding it" }, { status: 409 });
        }
        if (!["approve", "reject"].includes(body.decision) || !Array.isArray(body.results)) {
            return NextResponse.json({ error: "A valid decision and checklist results are required" }, { status: 400 });
        }

        const { data: criteria, error: criteriaError } = await supabase.from("tool_verification_criteria").select("key, label, required, sort_order").order("sort_order", { ascending: true });
        if (criteriaError) throw criteriaError;

        const results = body.results as ChecklistResultInput[];
        const resultByKey = new Map(results.map((result) => [result.criterionKey, result]));
        if (!criteria || results.length !== criteria.length || criteria.some((criterion) => !resultByKey.has(criterion.key))) {
            return NextResponse.json({ error: "Every checklist criterion must have one result" }, { status: 400 });
        }
        if (results.some((result) => typeof result.passed !== "boolean" || (result.waived && result.criterionKey !== "usage_thresholds"))) {
            return NextResponse.json({ error: "Checklist results or waiver are invalid" }, { status: 400 });
        }

        const { data: tool, error: toolError } = await supabase.from("tools").select("id, name, csp_exceptions, tool_analytics(downloads, mau)").eq("id", verificationRequest.tool_id).single();
        if (toolError) throw toolError;

        const usageResult = resultByKey.get("usage_thresholds");
        const analytics = Array.isArray(tool.tool_analytics) ? tool.tool_analytics[0] : tool.tool_analytics;
        const { count: qualifyingReviews, error: ratingCountError } = await supabase.from("ratings").select("id", { count: "exact", head: true }).eq("tool_id", tool.id).gte("rating", 3);
        if (ratingCountError) throw ratingCountError;

        const usageMetricsMet = Number((analytics?.mau || 0) >= 10) + Number((analytics?.downloads || 0) >= 50) + Number((qualifyingReviews || 0) >= 1);
        if (usageResult && !usageResult.waived && usageResult.passed !== usageMetricsMet >= 2) {
            return NextResponse.json({ error: `Usage result must reflect the measured thresholds (${usageMetricsMet}/3 met)` }, { status: 400 });
        }

        if (usageResult?.waived) {
            const allOtherCriteriaPass = criteria.every((criterion) => criterion.key === "usage_thresholds" || resultByKey.get(criterion.key)?.passed === true);
            const hasNoUsageHistory = (analytics?.mau || 0) === 0 && (analytics?.downloads || 0) === 0 && (qualifyingReviews || 0) === 0;
            if (!allOtherCriteriaPass || !hasNoUsageHistory) {
                return NextResponse.json({ error: "Usage can only be waived when every other criterion passes and the tool has no prior usage history" }, { status: 400 });
            }
        }

        const failedRequiredCriteria = criteria.filter((criterion) => {
            if (!criterion.required) return false;
            const result = resultByKey.get(criterion.key)!;
            return !result.passed && !(criterion.key === "usage_thresholds" && result.waived);
        });
        const expectedDecision = failedRequiredCriteria.length === 0 ? "approve" : "reject";
        if (body.decision !== expectedDecision) {
            return NextResponse.json(
                { error: expectedDecision === "approve" ? "All required criteria pass; this request must be approved" : "A required criterion failed; this request must be rejected" },
                { status: 400 },
            );
        }

        const checklistRows = criteria.map((criterion) => {
            const result = resultByKey.get(criterion.key)!;
            return {
                request_id: verificationRequest.id,
                criterion_key: criterion.key,
                passed: result.passed,
                waived: criterion.key === "usage_thresholds" && Boolean(result.waived),
                comment: result.comment?.trim() || null,
                reviewed_by: admin.id,
                updated_at: new Date().toISOString(),
            };
        });
        const { error: checklistError } = await supabase.from("tool_verification_checklist_results").upsert(checklistRows, { onConflict: "request_id,criterion_key" });
        if (checklistError) throw checklistError;

        const decidedAt = new Date().toISOString();
        if (body.decision === "approve") {
            const { error: maturityError } = await supabase.from("tool_maturity").upsert(
                {
                    tool_id: tool.id,
                    status: "verified",
                    verified_at: decidedAt,
                    verified_request_id: verificationRequest.id,
                    verified_csp_exceptions_snapshot: tool.csp_exceptions,
                    last_change_reason: "initial_approval",
                    last_changed_at: decidedAt,
                    updated_at: decidedAt,
                },
                { onConflict: "tool_id" },
            );
            if (maturityError) throw maturityError;
        }

        const finalStatus = body.decision === "approve" ? "approved" : "rejected";
        const { data: decidedRequest, error: decisionError } = await supabase
            .from("tool_verification_requests")
            .update({ status: finalStatus, decided_at: decidedAt, updated_at: decidedAt })
            .eq("id", verificationRequest.id)
            .eq("status", "in_review")
            .eq("reviewed_by", admin.id)
            .select("id, status, decided_at")
            .maybeSingle();
        if (decisionError || !decidedRequest) {
            if (body.decision === "approve") {
                await supabase.from("tool_maturity").update({ status: "unverified", verified_at: null, verified_request_id: null, updated_at: decidedAt }).eq("tool_id", tool.id);
            }
            throw decisionError || new Error("Verification request changed before the decision was saved");
        }

        const emailResult =
            body.decision === "approve"
                ? await sendEmail({
                      type: "verification-approved",
                      supabase,
                      data: { developerId: verificationRequest.developer_id, toolName: tool.name },
                  })
                : await sendEmail({
                      type: "verification-rejected",
                      supabase,
                      data: { developerId: verificationRequest.developer_id, toolName: tool.name, failedCriteria: failedRequiredCriteria.map((criterion) => criterion.label) },
                  });
        if (!emailResult.success) console.warn(`[maturity-admin] Decision email was not sent for ${verificationRequest.id}: ${emailResult.error}`);

        return NextResponse.json({
            success: true,
            decision: finalStatus,
            request: decidedRequest,
            notificationSent: emailResult.success,
            notificationError: emailResult.success ? null : "Decision saved, but the developer email could not be sent",
        });
    } catch (error) {
        console.error("[maturity-admin] Failed to process verification request", error);
        return NextResponse.json({ error: "Failed to process verification request" }, { status: 500 });
    }
}
