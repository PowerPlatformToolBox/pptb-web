---
title: "Insider"
date: "2026-08-08"
description: "Rolling release notes for Insider (dev) builds — all _-dev._ versions map here."
heroImage: "/images/updates/Insider.png"
---

## Highlights

- [Feature] Implement Sentry telemetry for Electron main and renderer with PII scrubbing (#622)
- [Feature] Private marketplace: Restart app modal (#618)
- [Feature] Enable Private Marketplace (#616)
- [Feature] Re-trigger CSP consent when tool adds new permissions since last approval (#613)
- chore: bump version to 1.2.5 in package.json
- Fixed the issue when Supabase creds are missing; ensureing mock data loads

## Fixes

- [Fix] Bundle app-update.yml into Windows installers so auto-update works (#611)
- fix: add step to generate app-update.yml metadata for Windows in release workflows
- fix: move app-update.yml validation to the correct job in release workflows
- fix: update paths for types package version validation in workflows

## Developer & Build

- Version: 1.2.5-dev.20260808
- Branch: dev
- Commits: 1 in the last 24 hours
- Build Date: 31230578378

## Notes

- No manual migration needed; existing settings and connections continue to work.
- This page currently reflects Insider build `v1.2.5-dev.20260808` (and newer).

## Getting an Insider build

- Use the site’s Versions page and select **Insider Release**.
- Or download directly from the desktop app releases page: https://github.com/PowerPlatformToolBox/desktop-app/releases

## Feedback

- File bugs and feature requests in GitHub Issues: https://github.com/PowerPlatformToolBox/desktop-app/issues
