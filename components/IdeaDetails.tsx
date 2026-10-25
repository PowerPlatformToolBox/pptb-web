import { IDEA_RESOLUTIONS, IDEA_STATUSES, IDEA_TYPES, type Idea } from "@/lib/ideas";

export function IdeaBadges({ idea }: { idea: Pick<Idea, "idea_type" | "status" | "resolution"> }) {
    return (
        <span className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-800">{IDEA_TYPES[idea.idea_type]}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{IDEA_STATUSES[idea.status]}</span>
            {idea.resolution && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{IDEA_RESOLUTIONS[idea.resolution]}</span>}
        </span>
    );
}

export function IdeaLinks({ idea, onOriginalIdea }: { idea: Pick<Idea, "public_note" | "duplicate_of" | "github_issue_url" | "claim_id" | "claimant_name" | "repository_url" | "claimed_at">; onOriginalIdea?: (id: string) => void }) {
    return (
        <div className="space-y-2 text-sm">
            {idea.claim_id && (
                <div className="rounded-md bg-blue-50 p-3 text-slate-700">
                    <p>Picked up by <span className="font-semibold">{idea.claimant_name}</span>
                        {idea.claimed_at && <> on <time dateTime={idea.claimed_at}>{new Date(idea.claimed_at).toLocaleDateString()}</time></>}.
                    </p>
                    {idea.repository_url && <a href={idea.repository_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">Follow development on GitHub</a>}
                </div>
            )}
            {idea.public_note && <p className="wrap-break-word whitespace-pre-wrap text-slate-700">Maintainer note: {idea.public_note}</p>}
            {idea.duplicate_of && (
                <p>
                    <a
                        href={`/ideas#idea-${idea.duplicate_of}`}
                        onClick={(event) => {
                            if (onOriginalIdea && idea.duplicate_of && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
                                event.preventDefault();
                                onOriginalIdea(idea.duplicate_of);
                            }
                        }}
                        className="font-semibold text-blue-700 hover:underline"
                    >
                        View original idea
                    </a>
                </p>
            )}
            {idea.github_issue_url && (
                <p>
                    <a href={idea.github_issue_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">
                        View GitHub issue
                    </a>
                    <span className="block text-xs text-slate-500">Follow GitHub for authoritative implementation progress.</span>
                </p>
            )}
        </div>
    );
}
