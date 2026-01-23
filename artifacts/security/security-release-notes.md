# Security Release Notes

## 2026-01-20 Hardening Update

- **Supabase Admin APIs** – Tightened Row Level Security to limit writes to members of the `pptb_admins` role only. Verified via Supabase policy tests.
- **Tool Intake Validation** – Strengthened schema validation in `tool-intake-validation.ts` to close gaps that previously allowed malformed URLs. Covered by new unit tests.
- **Dashboard Session Handling** – Fixed a regression that could keep stale Supabase sessions alive after sign-out. Added integration test to ensure tokens are revoked immediately.

**Upgrade Guidance**: Deploy the latest `/api` routes and re-run `supabase db push`. Desktop users no impact; web app users should clear cookies to ensure fresh sessions.

## 2025-12-05 Critical Patch

- **Markdown Rendering** – Patched the tool review renderer to escape HTML, preventing stored XSS (CWE-79). Manual pen test validated the fix.
- **Dependency Updates** – Applied patched versions of `marked` and `next` to remove known CVEs (GHSA-xxxxx). Tracked via Dependabot PRs #312 and #314.

**Upgrade Guidance**: Update the web app to commit `7c4d1bf` or later and run `npm install` to pull the safe dependency graph.
