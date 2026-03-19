---
name: Desktop App Release Notes
description: Generate a new `content/updates/vX_Y_Z.md` entry from https://github.com/PowerPlatformToolBox/desktop-app/releases.
argument-hint: "Default: generate the next missing stable update markdown under content/updates. If user asks for Insider/prerelease notes, update content/updates/insider.md instead."
tools: ["edit", "web/fetch", "search", "execute/getTerminalOutput", "execute/runInTerminal", "read/terminalLastCommand", "read/terminalSelection"]
user-invokable: true
---

# Desktop App Release Notes Agent

## Goal

Look at the Desktop App GitHub Releases page (https://github.com/PowerPlatformToolBox/desktop-app/releases), identify the newest stable release that does **not** yet have a corresponding file under `content/updates/`, and generate a new version markdown file.

Default behavior is **stable** releases. Only update **Insider** (prerelease/dev) notes when the user explicitly asks (for example: “update Insider notes”, “include prereleases”, “generate Insider release notes”).

This repo’s update pages expect:

- A safe slug filename, e.g. `v1_2_0.md`.
- Frontmatter fields used by the UI: `title`, `date`, `description`, `heroImage`.
- Release notes content written as Markdown with `##` / `###` headings (the UI generates a TOC from H2/H3).

## Version → filename rules

- Stable tags look like `vX.Y.Z` (example: `v1.2.0`).
- Convert dots to underscores for the file slug: `v1.2.0` → `v1_2_0`.
- The output file must be: `content/updates/v1_2_0.md`.

### Insider / prerelease mapping (only when user asks)

- Dev build tags typically look like `vX.Y.Z-dev.YYYYMMDD`.
- These map to the rolling Insider page: `content/updates/insider.md`.
- Do **not** create `content/updates/vX_Y_Z-dev_*.md` files.
- If the user did not ask for Insider/prerelease notes, ignore prereleases/dev builds and proceed with stable releases only.

## How to fetch releases (preferred)

Use the GitHub API. Prefer GitHub CLI when available, but be prepared for environments where `gh` and/or `python` are not installed and the terminal is PowerShell.

Notes about common agent environments:

- In PowerShell, bash heredocs like `python - <<'PY'` do **not** work.
- `python` may not be available.
- `gh` may not be available.
- `curl` may be an alias (especially on Windows PowerShell). When in doubt, use PowerShell-native `Invoke-RestMethod`.

### Option A: GitHub CLI

```sh
# Latest releases JSON (includes tag_name, body, published_at, assets)
gh api repos/PowerPlatformToolBox/desktop-app/releases?per_page=30 > /tmp/pptb_desktop_releases.json
```

### Option B: curl

```sh
curl -sL "https://api.github.com/repos/PowerPlatformToolBox/desktop-app/releases?per_page=30" > /tmp/pptb_desktop_releases.json
```

### Option C: PowerShell (recommended fallback)

Use this when `gh` isn’t available or you’re already operating in PowerShell.

```powershell
$uri = "https://api.github.com/repos/PowerPlatformToolBox/desktop-app/releases?per_page=30"

$headers = @{}

# If you hit rate limits, uncomment and ensure $env:GITHUB_TOKEN is set.
# $headers.Authorization = "Bearer $env:GITHUB_TOKEN"

$releases = Invoke-RestMethod -Uri $uri -Headers $headers
$releases | ConvertTo-Json -Depth 12 | Set-Content /tmp/pptb_desktop_releases.json
```

If you hit API rate limits, re-run with a token:

- `gh` will use your logged-in auth.
- For curl: set `Authorization: Bearer $GITHUB_TOKEN`.
- For PowerShell: pass `-Headers @{ Authorization = "Bearer $env:GITHUB_TOKEN" }`.

## Pick the release to document

From `/tmp/pptb_desktop_releases.json`, choose the newest release where:

- `draft` is false
- `prerelease` is false
- `tag_name` matches `^v\d+\.\d+\.\d+$`
- The corresponding `content/updates/<tag_name with dots replaced by underscores>.md` file does not exist yet

If the latest stable release already exists in `content/updates/`, pick the next newest stable one.

### Practical selection helpers (PowerShell)

These snippets avoid `python` and work well in PowerShell-based agent terminals.

**Select newest stable (non-draft, non-prerelease, vX.Y.Z):**

```powershell
$releases = Get-Content /tmp/pptb_desktop_releases.json -Raw | ConvertFrom-Json
$stable = $releases |
    Where-Object { -not $_.draft -and -not $_.prerelease -and $_.tag_name -match '^v\d+\.\d+\.\d+$' }

$stable[0] | Select-Object tag_name, published_at, name
```

**Select newest Insider (non-draft, prerelease or -dev.\*):**

```powershell
$releases = Get-Content /tmp/pptb_desktop_releases.json -Raw | ConvertFrom-Json
$insider = $releases |
    Where-Object { -not $_.draft -and ( $_.prerelease -or ($_.tag_name -like '*-dev.*') ) }

$insider[0] | Select-Object tag_name, published_at, name
```

**Format `published_at` as `YYYY-MM-DD`:**

```powershell
$published = $insider[0].published_at
# Some PowerShell JSON parsers materialize this as DateTime already; handle both.
$date = if ($published -is [datetime]) { $published } else { [datetime]::Parse($published) }
$date.ToString('yyyy-MM-dd')
```

### If (and only if) the user asks for Insider/prerelease notes

Instead of creating a new version file:

1. Select the newest release where `draft` is false and either:
    - `prerelease` is true, OR
    - `tag_name` contains `-dev.` (dev build)

2. Update the existing rolling file `content/updates/insider.md`:
    - Keep the current frontmatter shape.
    - Update the `date` field to the selected release’s `published_at` date (YYYY-MM-DD).
    - Update the body content by incorporating relevant bullets from the selected release notes under the existing sections.
    - Keep the tone consistent with the existing Insider page and avoid inventing changes not present in the release body.
    - Prefer omitting raw commit SHAs from bullets (summarize the human meaning instead).

## Create the markdown file

Create `content/updates/<slug>.md` with the following structure.

### Frontmatter (required)

```md
---
title: "vX.Y.Z"
date: "YYYY-MM-DD"
description: "One-sentence summary of what matters in this release."
heroImage: "/images/updates/vX_Y_Z.png"
---
```

Notes:

- `date` should be the release `published_at` date in `YYYY-MM-DD`.
- `description` should be a concise summary derived from the release body. If the release body doesn’t contain a clear summary, write a neutral one.
- `heroImage` should follow the existing convention; do not add image assets in this task.

### Body (recommended sections)

After the frontmatter, include (at minimum) these H2 sections so the Updates UI produces a consistent TOC:

```md
## Highlights

## Fixes

## Developer & Build

## Install

## Notes

## Full Changelog
```

Populate content as follows:

- Prefer using the GitHub release `body` as the source of truth.
- If the release body already contains well-structured headings, you may adapt it into the sections above.
- Keep changes minimal: do not invent features; summarize only what’s present in the release notes.
- For **Install**, list the most relevant asset filenames from the release (Windows/macOS/Linux) if available.
- For **Full Changelog**, include a compare link if you can identify the previous stable tag (example):
    - `https://github.com/PowerPlatformToolBox/desktop-app/compare/vPREV...vX.Y.Z`

## Quality checklist

Before finishing:

- Confirm the file name matches the version: `vX_Y_Z.md`.
- Confirm frontmatter has `title`, `date`, `description`, `heroImage`.
- Ensure headings are `##` / `###` (not `#`) for TOC consistency.
- Ensure the markdown ends with a trailing newline.
