# Security Release Notes

These notes track security-impacting changes in the **PPTB desktop app** (`PowerPlatformToolBox/desktop-app`). Web-app-only fixes to pptb-web/Supabase infrastructure are tracked separately in that repository.

## 2026-01-20 Hardening Update

- **`pptb://` Protocol Handler** – Added strict `toolId` validation (alphanumeric/hyphen/underscore only), a 100/200 character length cap, and rate limiting (max 3 requests per 5-second window) to prevent path-traversal, injection, and deep-link spam/DoS attempts.
- **Secure Tool Host** – Hardened per-tool process isolation and Content Security Policy enforcement so a compromised or misbehaving tool cannot access another tool's data or reach unapproved external resources without explicit user consent.
- **Auto-Update Verification** – Confirmed `electron-updater` only applies signed update artifacts fetched from GitHub Releases.

**Upgrade Guidance**: Update to Power Platform ToolBox desktop app v1.2.x or later (auto-updates apply this automatically; manual installs should download the latest signed release).

## 2025-12-05 Critical Patch

- **Windows Code Signing** – Migrated Windows installer/binary signing to Azure Trusted Signing across all three signing phases (app binaries, installers, and installer wrappers) to remove reliance on long-lived local certificates.
- **macOS Notarization** – Hardened the macOS release pipeline so `.dmg`/`.zip` artifacts are signed with a dedicated, isolated keychain and stapled only after Apple notarization succeeds; releases stay in draft until notarization completes.
- **Dependency Updates** – Applied patched versions of vulnerable Electron/npm dependencies flagged by the org-wide Snyk project.

**Upgrade Guidance**: Update to Power Platform ToolBox desktop app v1.2.5 or later to receive signed, notarized installers.
