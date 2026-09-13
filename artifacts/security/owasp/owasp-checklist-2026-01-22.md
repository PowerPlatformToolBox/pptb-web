# OWASP Checklist – 2026-01-22 (Desktop App)

This checklist evaluates the **PPTB desktop app** (`PowerPlatformToolBox/desktop-app`, Electron client) that end users download and run, not the pptb-web marketing/catalog site.

| OWASP Area       | Control / Question                                               | Status | Notes                                                                                                              |
| ---------------- | ---------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| Authentication   | Does PPTB rely on a vetted identity provider with MFA support?   | Pass   | `@azure/msal-node` OAuth against Microsoft Entra ID; inherits tenant MFA/Conditional Access                        |
| Authentication   | Are credentials or tokens ever transmitted to PPTB servers?      | Pass   | Auth flows go directly to Microsoft; tokens/connections stay on the local device                                   |
| Access Control   | Is each tool isolated from other tools and the host app?         | Pass   | "Secure Tool Host" runs each tool in an isolated process, VS Code Extension Host-inspired                          |
| Access Control   | Can a tool reach arbitrary external resources?                   | Pass   | Per-tool Content Security Policy requires explicit user consent for external resources                             |
| Input Validation | Is the `pptb://` deep-link protocol handler input validated?     | Pass   | Strict `toolId` regex, length limits, whitelisted actions, and 5s/3-request rate limiting                          |
| Input Validation | Does the protocol handler auto-install without confirmation?     | Pass   | User must explicitly confirm install in a modal; no silent installs                                                |
| Cryptography     | Are HTTPS/TLS enforced for all network calls?                    | Pass   | GitHub release checks, Supabase registry reads, and Entra ID calls all use HTTPS                                   |
| Cryptography     | Are release binaries signed before distribution?                 | Pass   | Windows binaries signed via Azure Trusted Signing; macOS builds notarized by Apple                                 |
| Cryptography     | Are secrets/signing credentials stored in source control?        | Pass   | Signing certs/API keys are GitHub Actions secrets, never committed                                                 |
| Error Handling   | Are crash/error reports reviewed for sensitive data leakage?     | Pass   | Sentry telemetry is scoped to diagnostics and is user-disableable in settings                                      |
| Configuration    | Are dependencies routinely patched?                              | Pass   | Snyk continuously scans every PowerPlatformToolBox org repo (incl. desktop-app); CodeQL runs in CI on every change |
| Configuration    | Is there a documented procedure for security releases?           | Pass   | See `artifacts/security/security-release-notes.md`                                                                 |
| Data Protection  | Is customer Dataverse data stored persistently by PPTB services? | Pass   | No customer data stored; Supabase only serves public tool catalog metadata                                         |
| Data Protection  | Are auto-updates verified before installation?                   | Pass   | `electron-updater` validates signed update artifacts from GitHub Releases                                          |

## Follow-up Actions

- [ ] Track Snyk-reported dependency fixes to closure and confirm no regression in tool-host isolation (owner: Desktop team)
- [ ] Publish a `SECURITY.md` / coordinated disclosure policy at the org level so external researchers have a documented reporting channel (owner: Core team)
- [ ] Attach a generated SBOM to every GitHub Release instead of producing it only on request (owner: Desktop team)
