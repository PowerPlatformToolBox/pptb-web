---
title: "Insider"
date: "2026-07-01"
description: "Rolling release notes for Insider (dev) builds — all _-dev._ versions map here."
heroImage: "/images/updates/Insider.png"
---

## Highlights

- Implement headless mode support for tools, adding globals for toolboxAPI, dataverseAPI, and powerplatformAPI in Node.js environment. Update MCP server to handle headless invocations with connection management and logging. Enhance type definitions for headless API access and ensure compatibility with existing tools.
- Added MCP to preview feature and added preview feature enablement in settings
- [Feature] Add preview feature flagging, gate MCP Server behind it, move MCP icon to activity bar footer (#589)
- added ElicitRequest to MCP
- [Feature] side by side toolview (#588)
- Removed the incorrect filter and updated the wording on connection selection modal for PP API (#586)
- feat: Add notification history panel with bell icon in footer (#585)
- Enhanced Terminal Hardening Rules plus added Test Suites (#583)
- Add MCP Headless for fully unattended flow (#582)

## Fixes

- fix: remove unused getPowerPlatformManager variable in headlessToolRuntime.ts

## Developer & Build

- Version: 1.2.4-dev.20260701
- Branch: dev
- Commits: 3 in the last 24 hours
- Build Date: 28488361701

## Notes

- No manual migration needed; existing settings and connections continue to work.
- This page currently reflects Insider build `v1.2.4-dev.20260701` (and newer).

## Getting an Insider build

- Use the site’s Versions page and select **Insider Release**.
- Or download directly from the desktop app releases page: https://github.com/PowerPlatformToolBox/desktop-app/releases

## Feedback

- File bugs and feature requests in GitHub Issues: https://github.com/PowerPlatformToolBox/desktop-app/issues
