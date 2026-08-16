---
title: "Insider"
date: "2026-08-15"
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

- [Fix] Update connection modal to include 'Configure App' button and adjust related functionality (#628)
- [Fix] Add repository links in installed tool details and context menu (#626)
- [Fix] Update telemetry consent messaging for clarity and adjust modal height
- [Fix] Capture download and MAU analytics errors in Sentry (#623)

## Developer & Build

- Version: 1.2.5-dev.20260815
- Branch: dev
- Commits: 1 in the last 24 hours
- Build Date: 31853594604

## Notes

- No manual migration needed; existing settings and connections continue to work.
- This page currently reflects Insider build `v1.2.5-dev.20260815` (and newer).

## Getting an Insider build

- Use the site’s Versions page and select **Insider Release**.
- Or download directly from the desktop app releases page: https://github.com/PowerPlatformToolBox/desktop-app/releases

## Feedback

- File bugs and feature requests in GitHub Issues: https://github.com/PowerPlatformToolBox/desktop-app/issues
