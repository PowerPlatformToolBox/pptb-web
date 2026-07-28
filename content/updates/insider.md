---
title: "Insider"
date: "2026-07-28"
description: "Rolling release notes for Insider (dev) builds — all _-dev._ versions map here."
heroImage: "/images/updates/Insider.png"
---

## Highlights

- Apply suggestions from code review
- some improvements to the workflows and updating the release notes

## Fixes

- [Fix] Bundle app-update.yml into Windows installers so auto-update works (#611)
- fix: add step to generate app-update.yml metadata for Windows in release workflows
- fix: move app-update.yml validation to the correct job in release workflows
- fix: update paths for types package version validation in workflows
- fix: reorder comments for clarity in connection button handling
- fix: update .gitignore to include test-results directory and remove obsolete .last-run.json file
- fix: enhance preflight check comments and handling for PRs
- fix: make notification panel and toast respect the selected app theme

## Developer & Build

- Version: 1.2.4-dev.20260728
- Branch: dev
- Commits: 11 in the last 24 hours
- Build Date: 30319579837

## Notes

- No manual migration needed; existing settings and connections continue to work.
- This page currently reflects Insider build `v1.2.4-dev.20260728` (and newer).

## Getting an Insider build

- Use the site’s Versions page and select **Insider Release**.
- Or download directly from the desktop app releases page: https://github.com/PowerPlatformToolBox/desktop-app/releases

## Feedback

- File bugs and feature requests in GitHub Issues: https://github.com/PowerPlatformToolBox/desktop-app/issues
