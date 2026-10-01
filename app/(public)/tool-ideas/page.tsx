"use client";

import { ArrowUpIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { Container } from "@/components/Container";
import { useSupabase } from "@/lib/useSupabase";

type ToolIdea = {
    id: string;
    title: string;
    description: string;
    upvotes: number;
    created_at: string;
    has_upvoted: boolean;
};

export default function ToolIdeasPage() {
    const { supabase, error: connectionError } = useSupabase();
    const [userId, setUserId] = useState<string | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [ideas, setIdeas] = useState<ToolIdea[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [actionError, setActionError] = useState("");
    const [success, setSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [votingId, setVotingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [email, setEmail] = useState("");

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
            const { data, error } = await supabase!.rpc("get_tool_ideas", { p_install_id: "" });
            if (!active) return;
            setLoading(false);
            if (error) setListError("Ideas could not be loaded. Please try again later.");
            else {
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
        if (!user || user.id !== userId) return;
        const cleanTitle = title.trim();
        const cleanDescription = description.trim();
        if (!cleanTitle || !cleanDescription) return;
        setSubmitting(true);
        setActionError("");
        setSuccess("");
        const { error } = await supabase.from("tool_ideas").insert({
            title: cleanTitle,
            description: cleanDescription,
            email: email.trim() || null,
            install_id: user.id,
            app_version: "web",
        });
        if (error) {
            setActionError("Your idea could not be submitted. Please try again.");
        } else {
            setTitle("");
            setDescription("");
            setEmail("");
            setSuccess("Your idea has been submitted.");
            const { data, error: reloadError } = await supabase.rpc("get_tool_ideas", { p_install_id: "" });
            if (reloadError) setListError("Ideas could not be refreshed. Please reload the page.");
            else {
                setIdeas(data ?? []);
                setListError("");
            }
        }
        setSubmitting(false);
    }

    async function upvote(ideaId: string) {
        if (!supabase || !userId || votingId) return;
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user || user.id !== userId) return;
        setVotingId(ideaId);
        setActionError("");
        const { data, error } = await supabase.rpc("upvote_tool_idea", { p_idea_id: ideaId, p_install_id: "" });
        if (error || !data?.[0]?.has_upvoted) {
            setActionError("Your vote could not be saved. Please try again.");
        } else {
            setIdeas((current) =>
                current
                    .map((idea) => (idea.id === ideaId ? { ...idea, upvotes: data[0].upvotes, has_upvoted: true } : idea))
                    .sort((first, second) => second.upvotes - first.upvotes || second.created_at.localeCompare(first.created_at)),
            );
        }
        setVotingId(null);
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
                        <h1 className="mt-4 text-4xl font-bold text-slate-900 sm:text-5xl">Tool ideas</h1>
                        <p className="mt-4 max-w-2xl text-lg text-slate-600">Vote for tools you would like to see in Power Platform ToolBox, or share an idea of your own.</p>
                    </header>

                    <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
                        <section aria-labelledby="ideas-heading" className="min-w-0">
                            <h2 id="ideas-heading" className="text-2xl font-semibold text-slate-900">
                                Ideas from the community
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">Most upvoted first</p>
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
                            {!loading && !listError && ideas.length === 0 && <p className="mt-6 text-slate-600">No ideas yet. Be the first to share one.</p>}
                            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
                                {ideas.map((idea) => (
                                    <article key={idea.id} className="flex gap-4 py-6 sm:gap-6">
                                        <button
                                            type="button"
                                            onClick={() => void upvote(idea.id)}
                                            disabled={!userId || idea.has_upvoted || !!votingId}
                                            aria-label={`${idea.has_upvoted ? "Voted for" : "Upvote"} ${idea.title}`}
                                            aria-pressed={idea.has_upvoted}
                                            className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-md border text-sm font-semibold transition ${idea.has_upvoted ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-700 disabled:opacity-50"}`}
                                        >
                                            <ArrowUpIcon className="h-5 w-5" aria-hidden="true" />
                                            {idea.upvotes}
                                        </button>
                                        <div className="min-w-0">
                                            <h3 className="wrap-break-word text-lg font-semibold text-slate-900">{idea.title}</h3>
                                            <p className="mt-2 wrap-break-word whitespace-pre-wrap text-sm text-slate-600">{idea.description}</p>
                                            <time className="mt-3 block text-xs text-slate-500" dateTime={idea.created_at}>
                                                {new Date(idea.created_at).toLocaleDateString()}
                                            </time>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section aria-labelledby="submit-heading">
                            <h2 id="submit-heading" className="text-2xl font-semibold text-slate-900">
                                Suggest a tool
                            </h2>
                            <p className="mt-2 text-sm text-slate-600">What would make your Power Platform work easier?</p>
                            {!checkingAuth && !userId ? (
                                <p className="mt-6 text-sm text-slate-600">
                                    <Link href="/auth/signin" className="font-semibold text-blue-700 hover:underline">
                                        Sign in
                                    </Link>{" "}
                                    to submit a tool idea.
                                </p>
                            ) : (
                                <form onSubmit={(event) => void submitIdea(event)} className="mt-6 space-y-5">
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
