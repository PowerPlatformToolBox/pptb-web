import type { ReactNode } from "react";

export function ReviewText({ text }: { text: string }) {
    const parts: ReactNode[] = [];
    let cursor = 0;

    for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
        let url = match[0].replace(/[.,!?;:]+$/, "");
        // Keep balanced URL parentheses, but exclude surrounding prose punctuation.
        while (/[)\]}]$/.test(url)) {
            const closing = url.at(-1)!;
            const opening = closing === ")" ? "(" : closing === "]" ? "[" : "{";
            if (url.split(closing).length <= url.split(opening).length) break;
            url = url.slice(0, -1).replace(/[.,!?;:]+$/, "");
        }
        if (!URL.canParse(url)) continue;

        parts.push(text.slice(cursor, match.index));
        parts.push(
            <a key={match.index} href={url} target="_blank" rel="noopener noreferrer" className="break-words text-blue-600 underline hover:text-blue-800">
                {url}
            </a>,
        );
        cursor = match.index + url.length;
    }

    parts.push(text.slice(cursor));
    return <>{parts}</>;
}
