import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { createHmac, randomUUID } from "node:crypto";

export type DiscordEventType =
    | "idea.claimed"
    | "tool-submission.new"
    | "tool-submission.approved"
    | "tool-submission.rejected"
    | "tool-submission.revoked"
    | "tool.update-categories"
    | "tool.deprecated"
    | "tool.deleted"
    | "tool.update"
    | "tool.manual-update"
    | "tool.update-failed"
    | "verify.requested"
    | "verify.assigned"
    | "verify.approved"
    | "verify.rejected"
    | "verify.revoked";

export interface DiscordActor {
    name: string;
    discordHandle?: string;
}

export interface DiscordTool {
    id: string;
    name: string;
    packageName?: string;
    version?: string;
    description?: string;
    authors?: string[];
    url?: string;
    iconUrl?: string;
}

type ContributorLink = { contributors?: { name?: string | null } | { name?: string | null }[] | null };

// Accepts rows from both `tools` and `tool_intakes`, which use different column names.
export interface DiscordToolSource {
    id: string;
    name?: string | null;
    display_name?: string | null;
    packagename?: string | null;
    package_name?: string | null;
    version?: string | null;
    description?: string | null;
    icon?: string | null;
    authors?: string[] | string | null;
    tool_contributors?: ContributorLink[] | null;
    tool_intake_contributors?: ContributorLink[] | null;
}

const REQUEST_TIMEOUT_MS = 5000;
const DEFAULT_SITE_URL = "https://www.powerplatformtoolbox.com";

export function getSiteUrl(): string {
    return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export function truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function nonEmpty(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isAbsoluteHttpsUrl(value: string): boolean {
    try {
        return new URL(value).protocol === "https:";
    } catch {
        return false;
    }
}

function contributorNames(links?: ContributorLink[] | null): string[] {
    return (links || []).flatMap((link) => (Array.isArray(link.contributors) ? link.contributors : [link.contributors])).flatMap((contributor) => nonEmpty(contributor?.name) ?? []);
}

export function toDiscordTool(tool: DiscordToolSource, options: { includeUrl?: boolean } = {}): DiscordTool {
    const packageName = nonEmpty(tool.packagename) ?? nonEmpty(tool.package_name);
    const result: DiscordTool = { id: tool.id, name: nonEmpty(tool.name) ?? nonEmpty(tool.display_name) ?? packageName ?? tool.id };

    if (packageName) result.packageName = packageName;

    const version = nonEmpty(tool.version);
    if (version) result.version = version;

    const description = nonEmpty(tool.description);
    if (description) result.description = truncate(description, 1000);

    const rawAuthors = Array.isArray(tool.authors) ? tool.authors : typeof tool.authors === "string" ? tool.authors.split(",") : [];
    const authors = Array.from(new Set([...rawAuthors.flatMap((author) => nonEmpty(author) ?? []), ...contributorNames(tool.tool_contributors), ...contributorNames(tool.tool_intake_contributors)]));
    if (authors.length > 0) result.authors = authors;

    // Intakes have no public tool page yet, so callers can opt out of the link.
    if (options.includeUrl !== false) result.url = `${getSiteUrl()}/tools/${encodeURIComponent(tool.id)}`;

    const icon = nonEmpty(tool.icon);
    if (icon && isAbsoluteHttpsUrl(icon)) result.iconUrl = icon;

    return result;
}

interface ActorUser {
    user_metadata?: Record<string, unknown> | null;
}

export function toDiscordActor(profile?: { name?: string | null; discord_handle?: string | null } | null, user?: ActorUser | null): DiscordActor {
    const metadata = user?.user_metadata || {};
    const name = nonEmpty(profile?.name) ?? nonEmpty(metadata.full_name) ?? nonEmpty(metadata.name) ?? nonEmpty(metadata.user_name) ?? "Unknown user";
    const discordHandle = nonEmpty(profile?.discord_handle);
    return discordHandle ? { name, discordHandle } : { name };
}

// Never throws; falls back to auth metadata when the profile cannot be loaded.
export async function getDiscordActor(supabase: SupabaseClient, userId: string, user?: ActorUser | null): Promise<DiscordActor> {
    try {
        const { data } = await supabase.from("user_profiles").select("name, discord_handle").eq("id", userId).maybeSingle();
        return toDiscordActor(data, user);
    } catch {
        return toDiscordActor(null, user);
    }
}

export function isDiscordNotifyConfigured(): boolean {
    return Boolean(process.env.DISCORD_EVENTS_URL && process.env.DISCORD_EVENTS_SECRET);
}

export function signDiscordPayload(secret: string, timestamp: string, body: string): string {
    return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

export async function deliverDiscordEvent(type: DiscordEventType, data: Record<string, unknown>, event: { id: string; occurredAt: string }): Promise<void> {
    const url = process.env.DISCORD_EVENTS_URL;
    const secret = process.env.DISCORD_EVENTS_SECRET;
    if (!url || !secret) throw new Error("Discord event delivery is not configured");

    const body = JSON.stringify({ type, id: event.id, occurredAt: event.occurredAt, data });
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-PPTB-Timestamp": timestamp,
            "X-PPTB-Signature": signDiscordPayload(secret, timestamp, body),
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Discord returned status ${response.status}: ${truncate(text, 500)}`);
    }
}

export async function notifyDiscord(type: DiscordEventType, data: Record<string, unknown>): Promise<void> {
    if (!isDiscordNotifyConfigured()) return;
    try {
        await deliverDiscordEvent(type, data, { id: randomUUID(), occurredAt: new Date().toISOString() });
    } catch (error) {
        console.error(`[discord-notify] ${type} failed:`, error instanceof Error ? error.message : error);
    }
}

/**
 * Sends the notification after the HTTP response using Next.js `after()`, so it never delays or alters the response.
 * `buildData` may perform lookups; returning null skips the notification.
 */
export function notifyDiscordAfterResponse(type: DiscordEventType, buildData: () => Promise<Record<string, unknown> | null> | Record<string, unknown> | null): void {
    if (!isDiscordNotifyConfigured()) return;

    const send = async () => {
        try {
            const data = await buildData();
            if (data) await notifyDiscord(type, data);
        } catch (error) {
            console.error(`[discord-notify] ${type} failed to build payload:`, error instanceof Error ? error.message : error);
        }
    };

    try {
        after(send);
    } catch {
        // Outside a request scope `after` is unavailable; fall back to a detached send.
        void send();
    }
}
