import React from "react";

import GithubSlugger from "github-slugger";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function extractText(node: React.ReactNode): string {
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (!node) return "";
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (React.isValidElement(node)) {
        const element = node as React.ReactElement<{ children?: React.ReactNode }>;
        return extractText(element.props.children);
    }
    return "";
}

export function UpdatesMarkdown({ markdown }: { markdown: string }) {
    const slugger = new GithubSlugger();

    return (
        <div className="text-slate-700">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{children}</h1>,
                    h2: ({ children }) => {
                        const text = extractText(children).trim();
                        const id = slugger.slug(text || "section");
                        return (
                            <h2 id={id} className="mt-10 scroll-mt-28 text-2xl font-bold tracking-tight text-slate-900">
                                {children}
                            </h2>
                        );
                    },
                    h3: ({ children }) => {
                        const text = extractText(children).trim();
                        const id = slugger.slug(text || "section");
                        return (
                            <h3 id={id} className="mt-8 scroll-mt-28 text-xl font-semibold text-slate-900">
                                {children}
                            </h3>
                        );
                    },
                    p: ({ children }) => <p className="mt-4 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6">{children}</ul>,
                    ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6">{children}</ol>,
                    li: ({ children }) => <li className="marker:text-slate-400">{children}</li>,
                    a: ({ href, children }) => (
                        <a href={href} className="font-semibold text-blue hover:underline underline-offset-4">
                            {children}
                        </a>
                    ),
                    blockquote: ({ children }) => <blockquote className="mt-6 border-l-4 border-slate-200 pl-4 text-slate-600">{children}</blockquote>,
                    hr: () => <hr className="my-10 border-slate-200" />,
                    code: ({ className, children }) => {
                        const isBlock = typeof className === "string" && className.includes("language-");
                        if (isBlock) {
                            return <code className={className}>{children}</code>;
                        }
                        return <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.95em] text-slate-900">{children}</code>;
                    },
                    pre: ({ children }) => <pre className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-900">{children}</pre>,
                    table: ({ children }) => (
                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="border-b border-slate-200 bg-slate-50">{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y divide-slate-200">{children}</tbody>,
                    tr: ({ children }) => <tr className="align-top">{children}</tr>,
                    th: ({ children }) => <th className="px-4 py-3 font-semibold text-slate-900">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-3">{children}</td>,
                }}
            >
                {markdown}
            </ReactMarkdown>
        </div>
    );
}
