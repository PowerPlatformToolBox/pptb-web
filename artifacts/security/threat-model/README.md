# PPTB Desktop App Threat Model Artifacts

These artifacts describe the **desktop app** (github.com/PowerPlatformToolBox/desktop-app) that makers download and run, not this web repository.

- `pptb-threat-model.mmd`: Mermaid source diagram describing actors, trust boundaries, and data flows for the Electron desktop client, its Secure Tool Host, GitHub-based distribution/updates, and Microsoft/Dataverse connectivity.
- `pptb-threat-model.png` / `.svg`: Generated assets produced via `npx @mermaid-js/mermaid-cli`.
- `notes.md`: Optional narrative expanding on STRIDE findings.

Update the Mermaid file first, regenerate the images, then commit everything together so reviewers can track changes.
