# Security Artifact Workflows

Use this guide whenever a customer, partner, or internal reviewer asks for the artifacts that are highlighted on the security landing page. These artifacts describe the **PPTB desktop app** (`PowerPlatformToolBox/desktop-app`) that end users install, not this `pptb-web` repository. Clone `desktop-app` locally (`git clone https://github.com/PowerPlatformToolBox/desktop-app.git`) before running the commands below, then store the generated artifacts back here under `artifacts/security/`.

## 1. Software Bill of Materials (SBOM)

**Purpose**: Provide a CycloneDX-formatted inventory of every dependency (direct and transitive) bundled into the desktop app.

**Prerequisites**

- Node.js 20+ and `pnpm` (see `packageManager` in `desktop-app/package.json`)
- `pnpm install` inside the `desktop-app` checkout
- CLI: [`@cyclonedx/cyclonedx-npm`](https://github.com/CycloneDX/cyclonedx-npm) (invoked through `pnpm dlx`)

**Steps**

1. Ensure dependencies are up to date in the `desktop-app` checkout:
    ```bash
    pnpm install
    ```
2. Generate the SBOM (JSON). Update the timestamp in the filename before running:
    ```bash
    pnpm dlx @cyclonedx/cyclonedx-npm --output-format json --output-file pptb-sbom-$(date +%Y%m%d).json
    ```
3. (Optional) Produce a matching XML file if a customer requests it:
    ```bash
    pnpm dlx @cyclonedx/cyclonedx-npm --output-format xml --output-file pptb-sbom-$(date +%Y%m%d).xml
    ```
4. Capture the SHA256 checksum alongside the files for integrity verification.
5. Copy the generated file(s) into `artifacts/security/sbom/` in this repo (or upload through the secure channel the requester specifies).

## 2. OWASP Secure Coding Checklist

**Purpose**: Demonstrate the desktop app's alignment with OWASP ASVS (Level 1) and the OWASP Top 10.

**Prerequisites**

- Latest `desktop-app` code (usually `dev` or the current `main` release branch)
- Ability to run lint/build/test steps locally

**Steps**

1. Duplicate the checklist template using the current date, e.g. `artifacts/security/owasp/owasp-checklist-2026-01-22.md`. Copy/paste the template below when creating a new record.
2. Run automated quality gates in the `desktop-app` checkout and note the results in the checklist:
    ```bash
    pnpm run lint
    pnpm run typecheck
    pnpm run test
    ```
3. Manually review each category (Authentication, Access Control, Tool Isolation/CSP, Code Signing, Input Validation, Logging, etc.) and record the status (`Pass`, `--`, or `Follow-up`).
4. Document remediation owners and target dates for any `Follow-up` items.
5. Store the completed checklist in `artifacts/security/owasp/` and link it in the ticket or customer response.

**Template Snippet**

```markdown
| OWASP Area       | Control/Question                                         | Status | Notes                                     |
| ---------------- | -------------------------------------------------------- | ------ | ----------------------------------------- |
| Authentication   | MFA enforced via identity provider for Dataverse sign-in | Pass   | Uses Entra ID + `@azure/msal-node`        |
| Access Control   | Are tools isolated from each other and the host process? | Pass   | Secure Tool Host (Extension Host pattern) |
| Input Validation | Is the `pptb://` protocol handler input validated?       | Pass   | Regex + length limits + rate limiting     |
```

## 3. Release Notes for Security Fixes

**Purpose**: Provide an auditable narrative of security-impacting changes per desktop app release.

**Steps**

1. Update `artifacts/security/security-release-notes.md`. Append a new section per release using the structure below.
2. Collect merged PRs with security impact from the `desktop-app` repo:
    ```bash
    git log --merges --since="2025-12-01" --grep "security" --oneline
    ```
3. Summarize each fix with:
    - Component/feature (e.g., protocol handler, Secure Tool Host, code signing pipeline)
    - Vulnerability description + severity
    - CVE/CWE (if applicable)
    - Mitigation verification (test/scan reference)
4. Close the section with upgrade instructions (e.g., "Update to PPTB Desktop v1.2.6 or later").
5. Share the markdown file or copy its contents into the requester’s preferred template.

**Release Note Skeleton**

```markdown
## 2026-01 Security Patch Bundle

- **`pptb://` protocol handler** – Added rate limiting and strict `toolId` validation to block deep-link injection/DoS attempts (CWE-20). Verified via manual + automated test cases.
- **Windows signing pipeline** – Migrated to Azure Trusted Signing across all installer phases to remove long-lived local certificates.
```

## 4. Threat Model Outline & Data-Flow Diagrams

**Purpose**: Visualize trust boundaries and document mitigations for key attack paths in the desktop app.

**Prerequisites**

- [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) for diagram exports (`npm install -D @mermaid-js/mermaid-cli` once per machine)

**Steps**

1. Edit the Mermaid source diagram in `artifacts/security/threat-model/pptb-threat-model.mmd`. The file should include:
    - External actors (maker, Azure AD/Entra ID, GitHub)
    - PPTB Electron desktop client and its Secure Tool Host
    - Supabase tool registry (catalog metadata only) and customer Dataverse/Power Platform endpoints
    - Trust boundaries (`TB_1`, `TB_2`, etc.)
2. Generate PNG/SVG outputs for reviewers:
    ```bash
    npx @mermaid-js/mermaid-cli -i artifacts/security/threat-model/pptb-threat-model.mmd -o artifacts/security/threat-model/pptb-threat-model.png
    ```
3. Summarize threats and mitigations in `artifacts/security/threat-model/README.md` using the STRIDE categories.
4. Version-control both the `.mmd` and rendered assets.
5. Provide the diagram plus the outline to the requesting org.

--

For questions or deviations from these workflows, email `powermaverick.tools@outlook.com` so the core team can review before sharing artifacts externally.
