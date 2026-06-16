---
title: "Insider"
date: "2026-06-16"
description: "Rolling release notes for Insider (dev) builds — all _-dev._ versions map here."
heroImage: "/images/updates/Insider.png"
---

## Highlights

- feat: support beta/pre-release npm packages (#382)
- Initial plan
- refactor(terminal): reorganize imports and improve logging for stdout processing
- refactor(terminal): extract flushStdoutBuffer helper to remove duplication

## Fixes

- fix(version): update version to 1.2.3 in package.json
- fix(styles): adjust button alignment and layout in settings and tool item sections
- fix(terminal): filter sentinel echo lines from stdout display
- fix: pass raw command string to shell stdin so && and other operators work correctly
- fix: log warning when sentinel exit code is malformed
- fix: address code review — cmd flags, pwsh exit code capture, sentinel default, shell injection guard

## Developer & Build

- Version: 1.2.3-dev.20260616
- Branch: dev
- Commits: 8 in the last 24 hours
- Build Date: 27589524512

## Notes

- No manual migration needed; existing settings and connections continue to work.
- This page currently reflects Insider build `v1.2.3-dev.20260616` (and newer).

## Getting an Insider build

- Use the site’s Versions page and select **Insider Release**.
- Or download directly from the desktop app releases page: https://github.com/PowerPlatformToolBox/desktop-app/releases

## Feedback

- File bugs and feature requests in GitHub Issues: https://github.com/PowerPlatformToolBox/desktop-app/issues
