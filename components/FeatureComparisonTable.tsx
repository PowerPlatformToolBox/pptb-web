import clsx from "clsx";

import { FadeIn } from "@/components/animations";
import { FEATURE_COMPARISON, type SupportLevel } from "@/lib/constants/feature-comparison";

const LEGEND: Array<{ level: SupportLevel; label: string }> = [
    { level: "yes", label: "Fully supported" },
    { level: "partial", label: "Partially supported" },
    { level: "no", label: "Not supported" },
    { level: "na", label: "Not applicable" },
];

function SupportIcon({ level }: { level: SupportLevel }) {
    switch (level) {
        case "yes":
            return (
                <svg aria-label="Fully supported" className="h-5 w-5 flex-none text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 0 1 .006 1.415l-7.5 7.6a1 1 0 0 1-1.42.006l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.784 2.783 6.797-6.884a1 1 0 0 1 1.42-.006Z"
                        clipRule="evenodd"
                    />
                </svg>
            );
        case "partial":
            return (
                <svg aria-label="Partially supported" className="h-5 w-5 flex-none text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.257 3.099c.53-.918 1.956-.918 2.486 0l6.857 11.867c.53.918-.132 2.034-1.243 2.034H3.643c-1.11 0-1.773-1.116-1.243-2.034L9.257 3.1ZM10 7a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0v-3A.75.75 0 0 0 10 7Zm0 7.25a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" />
                </svg>
            );
        case "no":
            return (
                <svg aria-label="Not supported" className="h-5 w-5 flex-none text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                    <path
                        fillRule="evenodd"
                        d="M10 8.586 6.293 4.879 4.879 6.293 8.586 10l-3.707 3.707 1.414 1.414L10 11.414l3.707 3.707 1.414-1.414L11.414 10l3.707-3.707-1.414-1.414L10 8.586Z"
                        clipRule="evenodd"
                    />
                </svg>
            );
        case "na":
            return (
                <svg aria-label="Not applicable" className="h-5 w-5 flex-none text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 9h10v2H5z" />
                </svg>
            );
    }
}

function SupportCell({ level, note }: { level: SupportLevel; note?: string }) {
    return (
        <div className="flex items-center gap-2">
            <SupportIcon level={level} />
            {note ? <span className="text-xs text-slate-500">{note}</span> : null}
        </div>
    );
}

export function FeatureComparisonTable() {
    return (
        <div className="space-y-12 pt-8">
            <FadeIn direction="up" delay={0.1}>
                <ul role="list" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                    {LEGEND.map(({ level, label }) => (
                        <li key={level} className="flex items-center gap-2">
                            <SupportIcon level={level} />
                            {label}
                        </li>
                    ))}
                </ul>
            </FadeIn>

            {FEATURE_COMPARISON.map((category, index) => (
                <FadeIn key={category.title} direction="up" delay={0.1 + Math.min(index, 5) * 0.05}>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">{category.title}</h3>
                        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <table className="w-full min-w-160 table-fixed border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                        <th scope="col" className="w-1/2 px-4 py-3">
                                            Feature
                                        </th>
                                        <th scope="col" className="w-1/4 px-4 py-3">
                                            Desktop App
                                        </th>
                                        <th scope="col" className="w-1/4 px-4 py-3">
                                            VS Code Extension
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {category.features.map((feature, rowIndex) => (
                                        <tr key={feature.label} className={clsx("border-b border-slate-100 last:border-b-0", rowIndex % 2 === 1 && "bg-slate-50/60")}>
                                            <td className="px-4 py-3 text-slate-700">{feature.label}</td>
                                            <td className="px-4 py-3">
                                                <SupportCell level={feature.desktop} note={feature.desktopNote} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <SupportCell level={feature.vscode} note={feature.vscodeNote} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </FadeIn>
            ))}
        </div>
    );
}
