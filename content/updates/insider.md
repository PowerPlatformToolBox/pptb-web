---
title: "Insider"
date: "2026-03-19"
description: "Rolling release notes for Insider (dev) builds — all *-dev.* versions map here."
heroImage: "/images/updates/Insider.png"
---

## Highlights

- Import connections from XrmToolBox XML files.
- Settings now opens in a dedicated tab with a VS Code-style layout (and is available from the View menu).
- Share connections via connection file import/export.

## Fixes

- Auto-update: update notification no longer forces always-on-top behavior.
- Fix BrowserView sizing and connection prompt behavior after force-reload.
- Loading overlay window settings adjusted to avoid conflicts with system modals.
- `pptb://` protocol handling is gated so dev builds don’t interfere with installed (packaged) versions.

## Developer & Build

- Add “What’s New” surface with auto-update notification.
- Add tab/feature context menu.
- Sidebar search inputs now include clear buttons.

## Notes

- No manual migration needed; existing settings and connections continue to work.
- This page currently reflects Insider build `v1.2.1-dev.20260319` (and newer).

## Getting an Insider build

- Use the site’s Versions page and select **Insider Release**.
- Or download directly from the desktop app releases page: https://github.com/PowerPlatformToolBox/desktop-app/releases

## Feedback

- File bugs and feature requests in GitHub Issues: https://github.com/PowerPlatformToolBox/desktop-app/issues
