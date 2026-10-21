export const IDEA_TYPES = {
    pptb_desktop: "PPTB Desktop",
    pptb_vscode: "PPTB VSCode Extension",
    tool: "Tool Ideas",
} as const;

export const IDEA_STATUSES = {
    open: "Open",
    under_review: "Under review",
    planned: "Planned",
    closed: "Closed",
    duplicate: "Duplicate",
} as const;

export const IDEA_RESOLUTIONS = {
    implemented: "Implemented",
    not_planned: "Not planned",
    out_of_scope: "Out of scope",
    withdrawn: "Withdrawn",
} as const;

export type IdeaType = keyof typeof IDEA_TYPES;
export type IdeaStatus = keyof typeof IDEA_STATUSES;
export type IdeaResolution = keyof typeof IDEA_RESOLUTIONS;

export interface Idea {
    id: string;
    title: string;
    description: string;
    idea_type: IdeaType;
    status: IdeaStatus;
    resolution: IdeaResolution | null;
    public_note: string | null;
    duplicate_of: string | null;
    github_issue_url: string | null;
    created_at: string;
    updated_at: string;
    upvotes: number;
    has_upvoted: boolean;
}

export function canVoteForIdea(status: IdeaStatus): boolean {
    return status === "open" || status === "under_review" || status === "planned";
}

export function isGithubIssueUrl(value: string, type: IdeaType): boolean {
    const repository = type === "pptb_desktop" ? "desktop-app" : type === "pptb_vscode" ? "vscode-extension" : null;
    return repository !== null && value === value.trim() && new RegExp(`^https://github\\.com/PowerPlatformToolBox/${repository}/issues/[1-9][0-9]*$`).test(value);
}

export function filterIdeas(ideas: Idea[], type: IdeaType | "all", status: IdeaStatus | "all"): Idea[] {
    return ideas.filter((idea) => (type === "all" || idea.idea_type === type) && (status === "all" || idea.status === status));
}

export interface IdeaReview {
    id: string;
    expectedUpdatedAt: string;
    status: IdeaStatus;
    resolution: IdeaResolution | null;
    publicNote: string | null;
    duplicateOf: string | null;
    githubIssueUrl: string | null;
}

export function validateIdeaReview(value: unknown): string | null {
    if (!value || typeof value !== "object") return "An idea update is required.";
    const body = value as Record<string, unknown>;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof body.id !== "string" || !uuid.test(body.id)) return "A valid idea ID is required.";
    if (typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) return "The current idea revision is required.";
    if (typeof body.status !== "string" || !Object.hasOwn(IDEA_STATUSES, body.status)) return "Invalid idea status.";
    if (body.status === "closed") {
        if (typeof body.resolution !== "string" || !Object.hasOwn(IDEA_RESOLUTIONS, body.resolution)) return "A closed resolution is required.";
        if (typeof body.publicNote !== "string" || !body.publicNote.trim()) return "A public explanation is required when closing an idea.";
    } else if (body.resolution !== null) return "Only closed ideas can have a resolution.";
    if (body.publicNote !== null && (typeof body.publicNote !== "string" || body.publicNote.length > 3000)) return "Public explanations must be 3000 characters or fewer.";
    if (body.status === "duplicate") {
        if (typeof body.duplicateOf !== "string" || !uuid.test(body.duplicateOf) || body.duplicateOf === body.id) return "Select a different original idea.";
    } else if (body.duplicateOf !== null) return "Only duplicate ideas can reference an original idea.";
    if (body.githubIssueUrl !== null && (typeof body.githubIssueUrl !== "string" || (!isGithubIssueUrl(body.githubIssueUrl, "pptb_desktop") && !isGithubIssueUrl(body.githubIssueUrl, "pptb_vscode"))))
        return "Use a GitHub issue URL from the PPTB desktop or VSCode extension repository.";
    return null;
}
