---
title: "Insider"
date: "2026-06-13"
description: "Rolling release notes for Insider (dev) builds — all _-dev._ versions map here."
heroImage: "/images/updates/Insider.png"
---

## Highlights

- refactor: use Tool type instead of any casts in callee tab listener
- docs: reorganize Table of Contents in INTERTOOLINVOCATION.md for improved navigation
- feat: Inter-Tool Launch Context v2 — capabilities, auto-close, FXS inherit, one-at-a-time, banner, noReturn + multi-connection prompt + capability registry (#552)
- feat: enhance DataverseConnection interface with optional fields for category and timestamps (#553)
- chore: update package version to 1.2.2 and release notes for consistency
- feat: Open URLs in external browser using connection's browser profile (#547)

## Fixes

- fix: offset BrowserView bounds by banner height to prevent tool content overlap
- fix: move invocation banner into content-wrapper and update text labels
- fix: open callee tool in its own tab during inter-tool invocation
- docs: fix markdown escaping in parameter table

## Developer & Build

- Version: 1.2.2-dev.20260613
- Branch: dev
- Commits: 8 in the last 24 hours
- Build Date: 27453201094

## Notes

- No manual migration needed; existing settings and connections continue to work.
- This page currently reflects Insider build `v1.2.2-dev.20260613` (and newer).

## Getting an Insider build

- Use the site’s Versions page and select **Insider Release**.
- Or download directly from the desktop app releases page: https://github.com/PowerPlatformToolBox/desktop-app/releases

## Feedback

- File bugs and feature requests in GitHub Issues: https://github.com/PowerPlatformToolBox/desktop-app/issues
