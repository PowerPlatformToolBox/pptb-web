import fs from "node:fs";
import path from "node:path";

const DESKTOP_OWNER = "PowerPlatformToolBox";
const DESKTOP_REPO = "desktop-app";

const UPDATES_DIR = path.join(process.cwd(), "content", "updates");
const INSIDER_PATH = path.join(UPDATES_DIR, "insider.md");
const AGENT_SPEC_PATH = path.join(process.cwd(), ".github", "agents", "desktop-release-notes.md");

const STABLE_TEMPLATE_MARKERS = {
    start: "<!-- PPTB_TEMPLATE_STABLE_START -->",
    end: "<!-- PPTB_TEMPLATE_STABLE_END -->",
};

const INSIDER_TEMPLATE_MARKERS = {
    start: "<!-- PPTB_TEMPLATE_INSIDER_BODY_START -->",
    end: "<!-- PPTB_TEMPLATE_INSIDER_BODY_END -->",
};

function parseArgs(argv) {
    const args = { mode: "both" };
    for (let i = 2; i < argv.length; i++) {
        const part = argv[i];
        if (part === "--mode" && argv[i + 1]) {
            args.mode = argv[i + 1];
            i++;
        }
    }
    if (!["stable", "insider", "both"].includes(args.mode)) {
        throw new Error(`Invalid --mode: ${args.mode} (expected stable|insider|both)`);
    }
    return args;
}

function toIsoDateOnly(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}

function stableSlugFromTag(tag) {
    // v1.2.3 -> v1_2_3
    return tag.replace(/\./g, "_");
}

function isStableTag(tag) {
    return /^v\d+\.\d+\.\d+$/i.test(tag);
}

function isDevOrPrereleaseTag(tag) {
    return /-dev\./i.test(tag);
}

function stripMarkdownInline(text) {
    return text
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/<[^>]+>/g, "")
        .trim();
}

function firstMeaningfulLine(markdown) {
    const lines = (markdown ?? "").split(/\r?\n/);
    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        if (line.startsWith("#")) continue;
        if (line === "---") continue;
        const cleaned = stripMarkdownInline(line.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, ""));
        if (!cleaned) continue;
        return cleaned;
    }
    return "";
}

function truncate(text, maxLen) {
    if (text.length <= maxLen) return text;
    return text.slice(0, Math.max(0, maxLen - 1)).trimEnd() + "…";
}

function parseSectionsByH2(markdown) {
    // Very small parser: splits on "## " headings.
    const lines = (markdown ?? "").split(/\r?\n/);
    const sections = new Map();
    let current = null;
    let buf = [];

    function flush() {
        if (!current) return;
        const content = buf.join("\n").trim();
        sections.set(current, content);
    }

    for (const line of lines) {
        const h2 = line.match(/^##\s+(.+?)\s*$/);
        if (h2) {
            flush();
            current = h2[1].trim();
            buf = [];
            continue;
        }
        if (current) buf.push(line);
    }

    flush();
    return sections;
}

function stripEmojiAndPunctuation(text) {
    return (text ?? "")
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
        .replace(/[\u2600-\u27BF]/g, "")
        .replace(/[\p{P}\p{S}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function parseSectionsByHeading(markdown, levels = [2, 3]) {
    // Parses sections for headings like "## Title" and "### Title".
    const lines = (markdown ?? "").split(/\r?\n/);
    const sections = new Map();
    let current = null;
    let buf = [];

    const flush = () => {
        if (!current) return;
        sections.set(current, buf.join("\n").trim());
    };

    const re = /^(#{1,6})\s+(.+?)\s*$/;
    for (const line of lines) {
        const m = line.match(re);
        if (m) {
            const level = m[1].length;
            if (levels.includes(level)) {
                flush();
                current = m[2].trim();
                buf = [];
                continue;
            }
        }
        if (current) buf.push(line);
    }

    flush();
    return sections;
}

function extractBullets(markdown) {
    const lines = (markdown ?? "").split(/\r?\n/);
    const bullets = [];
    for (const raw of lines) {
        const line = raw.trimEnd();
        const m = line.match(/^\s*[-*+]\s+(.*)$/);
        if (m) bullets.push(m[1].trim());
    }
    return bullets;
}

function normalizeBulletText(text) {
    // Remove leading short SHA and common separators.
    const t = (text ?? "")
        .replace(/^[0-9a-f]{7,40}\s+/i, "")
        .replace(/^[-–—]\s+/, "")
        .trim();
    return stripMarkdownInline(t);
}

function bulletsToMarkdown(bullets) {
    const cleaned = (bullets ?? [])
        .map(normalizeBulletText)
        .filter(Boolean)
        .map((b) => `- ${b}`);
    return cleaned.length ? cleaned.join("\n") : "- N/A";
}

function isFixLike(text) {
    return /\bfix\b|\bfixes\b|\bbug\b|\bbugfix\b|hotfix|regression|patch/i.test(text ?? "");
}

function findSectionContent(sections, keywords) {
    for (const [key, value] of sections.entries()) {
        const normalized = stripEmojiAndPunctuation(key).toLowerCase();
        if (keywords.some((k) => normalized.includes(k))) return value;
    }
    return "";
}

function extractDevBuildInfo(markdown) {
    const lines = (markdown ?? "").split(/\r?\n/);
    const wanted = [
        { label: "Version", re: /^\*\*Version:\*\*\s*(.+)\s*$/i },
        { label: "Branch", re: /^\*\*Branch:\*\*\s*(.+)\s*$/i },
        { label: "Commits", re: /^\*\*Commits:\*\*\s*(.+)\s*$/i },
        { label: "Build Date", re: /^\*\*Build Date:\*\*\s*(.+)\s*$/i },
    ];
    const out = [];
    for (const line of lines) {
        for (const w of wanted) {
            const m = line.trim().match(w.re);
            if (m) out.push(`- ${w.label}: ${stripMarkdownInline(m[1])}`);
        }
    }
    return out.length ? out.join("\n") : "- N/A";
}

function extractHighlightsFixesDev(markdown) {
    const body = markdown ?? "";
    const sections = parseSectionsByHeading(body, [2, 3]);

    const primary = findSectionContent(sections, ["what s new", "whats new", "what s changed", "whats changed", "changes", "what is new", "new"]) || body;

    const allBullets = extractBullets(primary).map(normalizeBulletText).filter(Boolean);
    const fixBullets = allBullets.filter(isFixLike);
    const highlightBullets = allBullets.filter((b) => !isFixLike(b));

    const highlights = bulletsToMarkdown(highlightBullets.length ? highlightBullets : allBullets);
    const fixes = bulletsToMarkdown(fixBullets);
    const devBuild = extractDevBuildInfo(body);

    return { highlights, fixes, devBuild };
}

function pickSection(sections, matcher) {
    for (const [key, value] of sections.entries()) {
        if (matcher(key.toLowerCase())) {
            return value;
        }
    }
    return "";
}

function bulletsOrNA(content) {
    const trimmed = (content ?? "").trim();
    if (!trimmed) return "- N/A";

    // If it already looks like a list, keep as-is.
    if (/^[-*+]\s+/m.test(trimmed)) return trimmed;

    // Otherwise, turn into a single bullet.
    return `- ${stripMarkdownInline(trimmed)}`;
}

function buildInstallSectionFromAssets(assets) {
    const names = (assets ?? []).map((a) => a?.name).filter(Boolean);

    const windows = names.filter((n) => /\.(exe|msi)$/i.test(n) || /windows/i.test(n)).sort();
    const macos = names.filter((n) => /\.(dmg|pkg)$/i.test(n) || /(mac|darwin)/i.test(n)).sort();
    const linux = names.filter((n) => /\.(appimage|deb|rpm)$/i.test(n) || /linux/i.test(n)).sort();

    const lines = [];
    if (windows.length) lines.push(`- Windows: \`${windows[0]}\``);
    else lines.push("- Windows: N/A");

    if (macos.length) lines.push(`- macOS: \`${macos[0]}\``);
    else lines.push("- macOS: N/A");

    if (linux.length) lines.push(`- Linux: \`${linux[0]}\``);
    else lines.push("- Linux: N/A");

    return lines.join("\n");
}

function parseFrontmatter(raw) {
    // Returns { fm: string (including delimiters), body: string }
    const text = raw ?? "";
    if (!text.startsWith("---\n")) {
        return { frontmatter: "", body: text };
    }

    const end = text.indexOf("\n---\n", 4);
    if (end === -1) {
        return { frontmatter: "", body: text };
    }

    const fm = text.slice(0, end + "\n---\n".length);
    const body = text.slice(end + "\n---\n".length);
    return { frontmatter: fm, body };
}

function updateFrontmatterDate(frontmatter, date) {
    if (!frontmatter) return frontmatter;
    const lines = frontmatter.split(/\r?\n/);
    const out = lines.map((l) => (l.startsWith("date:") ? `date: \"${date}\"` : l));
    return out.join("\n");
}

function readFileIfExists(filePath) {
    try {
        return fs.readFileSync(filePath, "utf8");
    } catch {
        return null;
    }
}

function stripFencedCodeBlock(text) {
    const trimmed = (text ?? "").trim();
    if (!trimmed.startsWith("```")) return trimmed;

    const lines = trimmed.split(/\r?\n/);
    const lastFenceIndex = lines.length - 1;
    if (!lines[lastFenceIndex].startsWith("```")) return trimmed;

    // Drop opening and closing fence lines, keep everything inside.
    return lines.slice(1, lastFenceIndex).join("\n").trim();
}

function extractBetween(text, startMarker, endMarker) {
    const start = text.indexOf(startMarker);
    if (start === -1) return "";
    const afterStart = start + startMarker.length;
    const end = text.indexOf(endMarker, afterStart);
    if (end === -1) return "";
    return text.slice(afterStart, end).trim();
}

function loadTemplates() {
    const spec = readFileIfExists(AGENT_SPEC_PATH);
    if (!spec) {
        throw new Error(`Agent spec not found at ${AGENT_SPEC_PATH}.`);
    }

    const stableRaw = extractBetween(spec, STABLE_TEMPLATE_MARKERS.start, STABLE_TEMPLATE_MARKERS.end);
    const insiderRaw = extractBetween(spec, INSIDER_TEMPLATE_MARKERS.start, INSIDER_TEMPLATE_MARKERS.end);

    const stableTemplate = stripFencedCodeBlock(stableRaw);
    const insiderBodyTemplate = stripFencedCodeBlock(insiderRaw);

    if (!stableTemplate) {
        throw new Error(`Stable template block not found in ${AGENT_SPEC_PATH}.`);
    }

    if (!insiderBodyTemplate) {
        throw new Error(`Insider template block not found in ${AGENT_SPEC_PATH}.`);
    }

    return { stableTemplate, insiderBodyTemplate };
}

function renderTemplate(template, values) {
    let out = template;
    for (const [key, value] of Object.entries(values)) {
        const needle = `{{${key}}}`;
        out = out.split(needle).join(value ?? "");
    }
    return out;
}

function writeIfChanged(filePath, next) {
    const prev = readFileIfExists(filePath);
    if (prev === next) return false;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, next, "utf8");
    return true;
}

async function fetchJson(url, token) {
    const baseHeaders = {
        Accept: "application/vnd.github+json",
        "User-Agent": "pptb-web-release-notes-bot",
        "X-GitHub-Api-Version": "2022-11-28",
    };

    const tryFetch = async (authToken) => {
        const headers = { ...baseHeaders };
        if (authToken) headers.Authorization = `Bearer ${authToken}`;
        return fetch(url, { headers });
    };

    let res = await tryFetch(token);

    // Fine-grained PATs can be scoped to a single repo and may not be able to read other repos.
    // If that happens for a public endpoint, retry without auth.
    if (token && res.status === 403) {
        const text = await res.text().catch(() => "");
        if (/resource not accessible by personal access token/i.test(text)) {
            res = await tryFetch("");
        } else {
            throw new Error(`GitHub API request failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ""}`);
        }
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GitHub API request failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ""}`);
    }

    return res.json();
}

function getPublishedAt(release) {
    return release?.published_at || release?.created_at || "";
}

function findLatestStableRelease(releases) {
    return releases.find((r) => !r.draft && !r.prerelease && isStableTag(r.tag_name));
}

function findPreviousStableRelease(releases, currentTag) {
    const idx = releases.findIndex((r) => r.tag_name === currentTag);
    if (idx === -1) return null;

    for (let i = idx + 1; i < releases.length; i++) {
        const r = releases[i];
        if (!r.draft && !r.prerelease && isStableTag(r.tag_name)) return r;
    }
    return null;
}

function findLatestInsiderRelease(releases) {
    return releases.find((r) => !r.draft && (r.prerelease || isDevOrPrereleaseTag(r.tag_name)));
}

function buildStableMarkdown({ template, tag, date, description, heroImage, highlights, fixes, devBuild, install, notes, changelog }) {
    return (
        renderTemplate(template, {
            TAG: tag,
            DATE: date,
            DESCRIPTION: description,
            HERO_IMAGE: heroImage,
            HIGHLIGHTS: highlights,
            FIXES: fixes,
            DEV_BUILD: devBuild,
            INSTALL: install,
            NOTES: notes,
            CHANGELOG: changelog,
        }).trimEnd() + "\n"
    );
}

function buildInsiderBody({ template, highlights, fixes, devBuild, notes, tail }) {
    return (
        renderTemplate(template, {
            HIGHLIGHTS: highlights,
            FIXES: fixes,
            DEV_BUILD: devBuild,
            NOTES: notes,
            TAIL: tail.trimEnd(),
        }).trimEnd() + "\n"
    );
}

function extractTailFromInsider(existingBody) {
    const lines = (existingBody ?? "").split(/\r?\n/);
    const idx = lines.findIndex((l) => l.trim().toLowerCase() === "## getting an insider build");
    if (idx === -1) {
        return [
            "## Getting an Insider build",
            "",
            "- Use the site’s Versions page and select **Insider Release**.",
            "- Or download directly from the desktop app releases page: https://github.com/PowerPlatformToolBox/desktop-app/releases",
            "",
            "## Feedback",
            "",
            "- File bugs and feature requests in GitHub Issues: https://github.com/PowerPlatformToolBox/desktop-app/issues",
        ].join("\n");
    }
    return lines.slice(idx).join("\n").trimEnd();
}

function updateInsiderNotesLine(existingNotesSection, tag) {
    const lines = (existingNotesSection ?? "").split(/\r?\n/).filter((l) => l.trim().length > 0);
    const nextLine = `- This page currently reflects Insider build \`${tag}\` (and newer).`;

    // Remove any previous "reflects Insider build" bullet.
    const filtered = lines.filter((l) => !/reflects insider build/i.test(l));
    if (filtered.length === 0) {
        return nextLine;
    }

    // Ensure the line is present.
    if (!filtered.some((l) => l.trim() === nextLine)) {
        filtered.push(nextLine);
    }

    // Ensure bullets formatting.
    const bulletized = filtered.map((l) => (l.trim().startsWith("-") ? l.trim() : `- ${l.trim()}`));
    return bulletized.join("\n");
}

async function main() {
    const { mode } = parseArgs(process.argv);
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

    const { stableTemplate, insiderBodyTemplate } = loadTemplates();

    const url = `https://api.github.com/repos/${DESKTOP_OWNER}/${DESKTOP_REPO}/releases?per_page=50`;
    const releases = await fetchJson(url, token);

    let changed = false;

    if (mode === "insider" || mode === "both") {
        const insiderRelease = findLatestInsiderRelease(releases);
        if (!insiderRelease) {
            console.log("[insider] No prerelease/dev releases found; skipping.");
        } else {
            const tag = insiderRelease.tag_name;
            const date = toIsoDateOnly(getPublishedAt(insiderRelease));
            const { highlights, fixes, devBuild } = extractHighlightsFixesDev(insiderRelease.body || "");

            const existing = readFileIfExists(INSIDER_PATH) ?? "";
            const { frontmatter, body } = parseFrontmatter(existing);
            const tail = extractTailFromInsider(body);

            // Preserve existing Notes content but update the "reflects Insider build" line.
            const existingSections = parseSectionsByH2(body);
            const existingNotes = pickSection(existingSections, (t) => t === "notes");
            const notes = updateInsiderNotesLine(bulletsOrNA(existingNotes), tag);

            const nextFrontmatter = updateFrontmatterDate(frontmatter, date);
            const nextBody = buildInsiderBody({ template: insiderBodyTemplate, highlights, fixes, devBuild, notes, tail });
            const next = `${nextFrontmatter.trimEnd()}\n\n${nextBody}`;

            const wrote = writeIfChanged(INSIDER_PATH, next);
            changed = changed || wrote;
            console.log(wrote ? `[insider] Updated ${path.relative(process.cwd(), INSIDER_PATH)} (${tag})` : `[insider] No changes needed (${tag})`);
        }
    }

    if (mode === "stable" || mode === "both") {
        const stableRelease = findLatestStableRelease(releases);
        if (!stableRelease) {
            console.log("[stable] No stable release found; skipping.");
        } else {
            const tag = stableRelease.tag_name;
            const slug = stableSlugFromTag(tag);
            const filePath = path.join(UPDATES_DIR, `${slug}.md`);

            if (fs.existsSync(filePath)) {
                console.log(`[stable] ${path.relative(process.cwd(), filePath)} already exists; skipping.`);
            } else {
                const date = toIsoDateOnly(getPublishedAt(stableRelease));
                const { highlights, fixes, devBuild } = extractHighlightsFixesDev(stableRelease.body || "");

                const install = buildInstallSectionFromAssets(stableRelease.assets);

                const rawSummary = firstMeaningfulLine(stableRelease.body || "");
                const description = truncate(rawSummary || `Release notes for ${tag}.`, 150).replace(/\"/g, "'");

                const notes = "- No manual migration needed; existing settings and connections continue to work.";

                const prevStable = findPreviousStableRelease(releases, tag);
                const changelog = prevStable ? `[${prevStable.tag_name}...${tag}](https://github.com/${DESKTOP_OWNER}/${DESKTOP_REPO}/compare/${prevStable.tag_name}...${tag})` : "- N/A";

                const heroImage = `/images/updates/${slug}.png`;
                const markdown = buildStableMarkdown({
                    template: stableTemplate,
                    tag,
                    date,
                    description,
                    heroImage,
                    highlights,
                    fixes,
                    devBuild,
                    install,
                    notes,
                    changelog,
                });

                fs.mkdirSync(UPDATES_DIR, { recursive: true });
                fs.writeFileSync(filePath, markdown, "utf8");
                changed = true;
                console.log(`[stable] Created ${path.relative(process.cwd(), filePath)} (${tag})`);
            }
        }
    }

    if (!changed) {
        console.log("No changes.");
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
