export interface AuthorReply {
    reply: string;
    createdAt: string;
    updatedAt: string;
}

export interface PublicRating {
    id: string;
    toolId: string;
    userName?: string | null;
    rating: number;
    comment?: string;
    toolVersion: string | null;
    createdAt: string;
    authorReply: AuthorReply | null;
}

export function getToolIssuesUrl(repository?: string | null): string | null {
    if (!repository) return null;
    try {
        const url = new URL(repository);
        const parts = url.pathname.split("/").filter(Boolean);
        if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || parts.length !== 2) return null;
        if (!parts.every((part) => /^[\w.-]+$/.test(part))) return null;
        return `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/, "")}/issues`;
    } catch {
        return null;
    }
}
