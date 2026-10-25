"use client";

import { ArrowUpIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { Container } from "@/components/Container";
import { IdeaBadges, IdeaLinks } from "@/components/IdeaDetails";
import { IdeaClaimForm } from "@/components/IdeaClaimForm";
import { canVoteForIdea, filterIdeas, IDEA_STATUSES, IDEA_TYPES, type Idea, type IdeaStatus, type IdeaType } from "@/lib/ideas";
import { useSupabase } from "@/lib/useSupabase";

export default function IdeasPage() {
    const { supabase, error: connectionError } = useSupabase();
    const [userId, setUserId] = useState<string | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [typeFilter, setTypeFilter] = useState<IdeaType | "all">("all");
    const [statusFilter, setStatusFilter] = useState<IdeaStatus | "all">("all");
    const [ideaType, setIdeaType] = useState<IdeaType | "">("");
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [actionError, setActionError] = useState("");
    const [success, setSuccess] = useState("");
    const [voteError, setVoteError] = useState("");
    const [voteSuccess, setVoteSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [votingId, setVotingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (checkingAuth || loading) return;
        const returnedIdea = new URLSearchParams(window.location.search).get("idea");
        if (returnedIdea && /^[0-9a-f-]{36}$/i.test(returnedIdea)) {
            window.history.replaceState(null, "", `/ideas#idea-${returnedIdea}`);
        }
        if (ideas.length && window.location.hash.startsWith("#idea-")) {
            document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
        }
    }, [ideas, typeFilter, statusFilter, checkingAuth, loading]);

    function showOriginalIdea(id: string) {
        setTypeFilter("all");
        setStatusFilter("all");
        window.history.pushState(null, "", `/ideas#idea-${id}`);
        document.getElementById(`idea-${id}`)?.scrollIntoView();
    }

    useEffect(() => {
        if (!supabase) return;
        let active = true;
        void supabase.auth.getUser().then(({ data: { user } }) => {
            if (active) {
                setUserId(user?.id ?? null);
                setCheckingAuth(false);
            }
        });
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user.id ?? null);
            setCheckingAuth(false);
        });
        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    useEffect(() => {
        if (!supabase || checkingAuth) return;
        let active = true;
        async function loadIdeas() {
            const { data, error } = await supabase!.rpc("get_ideas_with_claims", { p_install_id: "" });
            if (!active) return;
            setLoading(false);
            if (error) {
                console.error("Error loading ideas:", error);
                setListError("Ideas could not be loaded. Please try again later.");
            } else {
                setIdeas(data ?? []);
                setListError("");
            }
        }
        void loadIdeas();
        return () => {
            active = false;
        };
    }, [supabase, checkingAuth, userId]);

    async function submitIdea(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!supabase || !userId || submitting) return;
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user || user.id !== userId) {
            setActionError("Please sign in again before submitting an idea.");
            return;
        }
        const cleanTitle = title.trim();
        const cleanDescription = description.trim();
        if (!cleanTitle || !cleanDescription || !ideaType) {
            setActionError("Choose an idea type and enter a title and description.");
            return;
        }
        setSubmitting(true);
        setActionError("");
        setSuccess("");
        const { error } = await supabase.from("ideas").insert({
            title: cleanTitle,
            description: cleanDescription,
            email: email.trim() || null,
            install_id: user.id,
            app_version: "web",
            idea_type: ideaType,
        });
        if (error) {
            console.error("Error submitting idea:", error);
            setActionError("Your idea could not be submitted. Please try again.");
        } else {
            setTitle("");
            setDescription("");
            setEmail("");
            setIdeaType("");
            setSuccess("Your idea has been submitted.");
            const { data, error: reloadError } = await supabase.rpc("get_ideas_with_claims", { p_install_id: "" });
            if (reloadError) setListError("Ideas could not be refreshed. Please reload the page.");
            else {
                setIdeas(data ?? []);
                setListError("");
            }
        }
        setSubmitting(false);
    }

    async function changeVote(idea: Idea) {
        if (!supabase || !userId || votingId) return;
        setVotingId(idea.id);
        setVoteError("");
        setVoteSuccess("");
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user || user.id !== userId) {
                setVoteError("Please sign in again before voting.");
                return;
            }
            const shouldHaveVote = !idea.has_upvoted;
            const { data, error } = await supabase.rpc(idea.has_upvoted ? "remove_idea_vote" : "upvote_idea", { p_idea_id: idea.id, p_install_id: "" });
            const result = data?.[0];
            if (error) throw error;
            if (!result || result.has_upvoted !== shouldHaveVote || !Number.isSafeInteger(result.upvotes) || result.upvotes < 0) throw new Error("Missing or invalid vote confirmation");
            setIdeas((current) =>
                current
                    .map((entry) => (entry.id === idea.id ? { ...entry, upvotes: result.upvotes, has_upvoted: result.has_upvoted } : entry))
                    .sort((first, second) => second.upvotes - first.upvotes || second.created_at.localeCompare(first.created_at)),
            );
            setVoteSuccess(shouldHaveVote ? "Your vote has been added." : "Your vote has been removed.");
        } catch (error) {
            console.error("Error changing idea vote:", error);
            setVoteError("Your vote could not be changed. The idea may no longer accept vote changes. Please reload and try again.");
        } finally {
            setVotingId(null);
        }
    }

    async function refreshClaims() {
        if (!supabase) throw new Error("Database connection is unavailable.");
        const { data, error } = await supabase.rpc("get_ideas_with_claims", { p_install_id: "" });
        if (error) throw error;
        setIdeas(data ?? []);
        setStatusFilter("all");
        setListError("");
    }

    return (
        <main className="py-10 sm:py-16">
            <Container>
                <div className="mx-auto max-w-5xl">
                    <header className="border-b border-slate-200 pb-8">
                        <div className="flex items-center gap-3 text-blue-700">
                            <LightBulbIcon className="h-7 w-7" aria-hidden="true" />
                            <span className="text-sm font-semibold uppercase">Community ideas</span>
                        </div>
                        <h1 className="mt-4 text-4xl font-bold text-slate-900 sm:text-5xl">Ideas</h1>
                        <p className="mt-4 max-w-2xl text-lg text-slate-600">Help shape PPTB Desktop, the PPTB VSCode Extension, and community-built tools. Share an idea or vote for one.</p>
                        <p className="mt-3 text-sm text-slate-500">Maintainers manage idea statuses here. Linked GitHub issues are the source of truth for PPTB implementation progress.</p>
                        <p className="mt-3 text-sm text-slate-600">Want to build a tool? Any signed-in user can pick up an open Tool Idea and share a GitHub repository. No existing developer profile is needed.</p>
                    </header>

                    <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
                        <section aria-labelledby="ideas-heading" className="min-w-0">
                            <h2 id="ideas-heading" className="text-2xl font-semibold text-slate-900">
                                Ideas from the community
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">Most upvoted first</p>
                            <p className="mt-1 text-sm text-slate-500">Click your vote again to remove it. Votes can only be changed on open, under-review, or planned ideas.</p>
                            {voteError && (
                                <p role="alert" className="mt-4 text-sm text-red-700">
                                    {voteError}
                                </p>
                            )}
                            {voteSuccess && (
                                <p role="status" className="mt-4 text-sm text-green-700">
                                    {voteSuccess}
                                </p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-4">
                                <label className="text-sm font-medium text-slate-700">
                                    Idea type
                                    <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as IdeaType | "all")} className="mt-1 block rounded-md border-slate-300">
                                        <option value="all">All types</option>
                                        {Object.entries(IDEA_TYPES).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-sm font-medium text-slate-700">
                                    Status
                                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IdeaStatus | "all")} className="mt-1 block rounded-md border-slate-300">
                                        <option value="all">All statuses</option>
                                        {Object.entries(IDEA_STATUSES).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            {!checkingAuth && !userId && (
                                <p className="mt-4 text-sm text-slate-600">
                                    <Link href="/auth/signin" className="font-semibold text-blue-700 hover:underline">
                                        Sign in
                                    </Link>{" "}
                                    to vote for ideas.
                                </p>
                            )}
                            {connectionError && (
                                <p role="alert" className="mt-6 text-red-700">
                                    Ideas are unavailable right now. Please try again later.
                                </p>
                            )}
                            {listError && (
                                <p role="alert" className="mt-6 text-red-700">
                                    {listError}
                                </p>
                            )}
                            {loading && !connectionError && (
                                <p role="status" className="mt-6 text-slate-600">
                                    Loading ideas...
                                </p>
                            )}
                            {!loading && !listError && filterIdeas(ideas, typeFilter, statusFilter).length === 0 && <p className="mt-6 text-slate-600">No ideas match these filters.</p>}
                            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
                                {filterIdeas(ideas, typeFilter, statusFilter).map((idea) => (
                                    <article id={`idea-${idea.id}`} key={idea.id} className="flex scroll-mt-24 gap-4 py-6 sm:gap-6">
                                        <button
                                            type="button"
                                            onClick={() => void changeVote(idea)}
                                            disabled={!userId || !!votingId || !canVoteForIdea(idea.status)}
                                            title={!canVoteForIdea(idea.status) ? "Votes cannot be changed for this idea" : idea.has_upvoted ? "Remove your vote" : "Upvote this idea"}
                                            aria-label={`${idea.has_upvoted ? "Remove your vote for" : "Upvote"} ${idea.title}`}
                                            aria-pressed={idea.has_upvoted}
                                            className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-md border text-sm font-semibold transition ${idea.has_upvoted ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-700 disabled:opacity-50"}`}
                                        >
                                            <ArrowUpIcon className="h-5 w-5" aria-hidden="true" />
                                            {idea.upvotes}
                                        </button>
                                        <div className="min-w-0">
                                            <IdeaBadges idea={idea} />
                                            <h3 className="wrap-break-word text-lg font-semibold text-slate-900">{idea.title}</h3>
                                            <p className="mt-2 wrap-break-word whitespace-pre-wrap text-sm text-slate-600">{idea.description}</p>
                                            <time className="mt-3 block text-xs text-slate-500" dateTime={idea.created_at}>
                                                {new Date(idea.created_at).toLocaleDateString()}
                                            </time>
                                            <div className="mt-3">
                                                <IdeaLinks idea={idea} onOriginalIdea={showOriginalIdea} />
                                                {idea.idea_type === "tool" && <IdeaClaimForm idea={idea} userId={userId} supabase={supabase} onChanged={refreshClaims} />}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section aria-labelledby="submit-heading">
                            <h2 id="submit-heading" className="text-2xl font-semibold text-slate-900">
                                Share an idea
                            </h2>
                            <p className="mt-2 text-sm text-slate-600">What would make your Power Platform work easier?</p>
                            {!checkingAuth && !userId ? (
                                <p className="mt-6 text-sm text-slate-600">
                                    <Link href="/auth/signin" className="font-semibold text-blue-700 hover:underline">
                                        Sign in
                                    </Link>{" "}
                                    to submit an idea.
                                </p>
                            ) : (
                                <form onSubmit={(event) => void submitIdea(event)} className="mt-6 space-y-5">
                                    <div>
                                        <label htmlFor="idea-type" className="block text-sm font-medium text-slate-700">
                                            Idea type
                                        </label>
                                        <select
                                            id="idea-type"
                                            required
                                            value={ideaType}
                                            onChange={(event) => setIdeaType(event.target.value as IdeaType | "")}
                                            className="mt-1 w-full rounded-md border-slate-300"
                                        >
                                            <option value="" disabled>
                                                Choose an idea type
                                            </option>
                                            {Object.entries(IDEA_TYPES).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="idea-title" className="block text-sm font-medium text-slate-700">
                                            Title
                                        </label>
                                        <input
                                            id="idea-title"
                                            required
                                            maxLength={120}
                                            value={title}
                                            onChange={(event) => setTitle(event.target.value)}
                                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-blue-600"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="idea-description" className="block text-sm font-medium text-slate-700">
                                            Description
                                        </label>
                                        <textarea
                                            id="idea-description"
                                            required
                                            maxLength={3000}
                                            rows={5}
                                            value={description}
                                            onChange={(event) => setDescription(event.target.value)}
                                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-blue-600"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="idea-email" className="block text-sm font-medium text-slate-700">
                                            Contact email <span className="font-normal text-slate-500">(optional)</span>
                                        </label>
                                        <input
                                            id="idea-email"
                                            type="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-blue-600"
                                        />
                                    </div>
                                    {actionError && (
                                        <p role="alert" className="text-sm text-red-700">
                                            {actionError}
                                        </p>
                                    )}
                                    {success && (
                                        <p role="status" className="text-sm text-green-700">
                                            {success}
                                        </p>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={!supabase || !userId || submitting}
                                        className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {submitting ? "Submitting..." : "Submit idea"}
                                    </button>
                                </form>
                            )}
                        </section>
                    </div>
                </div>
            </Container>
        </main>
    );
}
