"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";

interface Props {
    packageName: string;
    version?: string;
}

export function PackageIconPreview({ packageName, version }: Props) {
    const name = packageName.trim().toLowerCase();
    if (!name) return null;
    return <IconPreview key={`${name}@${version || "latest"}`} packageName={name} version={version} />;
}

function IconPreview({ packageName, version }: Props) {
    const { supabase, error: authError } = useSupabase();
    const [icon, setIcon] = useState<{ svg: string; displayName: string; version: string; iconPath: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (!supabase) return;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const sessionResult = await supabase.auth.getSession();
                if (sessionResult.error) throw sessionResult.error;
                const token = sessionResult.data.session?.access_token;
                if (!token) throw new Error("Sign in to preview the package icon");
                const params = new URLSearchParams({ packageName, ...(version ? { version } : {}) });
                const response = await fetch(`/api/package-icon?${params}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Failed to load package icon");
                if (!controller.signal.aborted) setIcon(data);
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("Error loading package icon:", error);
                    setError(error instanceof Error ? error.message : "Failed to load package icon");
                }
            }
        }, 600);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [packageName, version, supabase]);

    return (
        <section aria-label="Package icon preview" className="mb-6 rounded-lg border border-slate-200 p-4">
            <h4 className="font-medium text-slate-900">Icon appearance</h4>
            <p className="mt-1 text-sm text-slate-600">
                Check the original SVG colors against both desktop tool card themes. Icons are not recolored. Reviewers can request changes in their review notes.
            </p>
            {error || authError ? (
                <p role="alert" className="mt-3 text-sm text-red-700">
                    {error || authError}
                </p>
            ) : !icon ? (
                <p role="status" className="mt-3 text-sm text-slate-500">
                    Loading package icon...
                </p>
            ) : (
                <>
                    <p className="mt-2 break-all text-xs text-slate-500">
                        {packageName}@{icon.version} / {icon.iconPath}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {(["light", "dark"] as const).map((theme) => (
                            <div key={theme} className="min-w-0">
                                <p className="mb-2 text-sm font-medium text-slate-700">{theme === "light" ? "Light theme" : "Dark theme"}</p>
                                <div
                                    aria-label={`${icon.displayName} compact tool card in ${theme} theme`}
                                    className="rounded-lg border px-3 py-2 shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                                    style={{
                                        backgroundColor: theme === "light" ? "#ffffff" : "#2d2d30",
                                        borderColor: theme === "light" ? "#edebe9" : "#3e3e42",
                                        color: theme === "light" ? "#323130" : "#f3f2f1",
                                        colorScheme: theme,
                                        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                                    }}
                                >
                                    <div className="mb-0.5 flex items-center gap-2">
                                        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[5px]">
                                            {/* Preserve authored colors without injecting package SVG markup. */}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg)}`}
                                                alt={`${packageName} icon on ${theme} theme`}
                                                width={20}
                                                height={20}
                                                className="h-5 w-5 object-contain"
                                                onError={() => setImageError(true)}
                                            />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="break-words text-[13px] font-medium leading-normal">{icon.displayName}</div>
                                            <div className="mt-1 font-mono text-[11px] leading-normal text-[#8a8886]">v{icon.version}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {imageError && (
                        <p role="alert" className="mt-3 text-sm text-red-700">
                            The SVG could not be rendered. Check the packaged icon before approval.
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
