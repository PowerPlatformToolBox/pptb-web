# Security Artifact Workflows

Use this guide whenever a customer, partner, or internal reviewer asks for the artifacts that are highlighted on the security landing page. All commands are run from the repository root.

## 1. Software Bill of Materials (SBOM)

**Purpose**: Provide a CycloneDX-formatted inventory of every npm dependency (direct and transitive).

**Prerequisites**

- Node.js 18+
- `npm install`
- CLI: [`@cyclonedx/cyclonedx-npm`](https://github.com/CycloneDX/cyclonedx-npm) (invoked through `npx`)

**Steps**

1. Ensure `node_modules` is up to date:
    ```bash
    npm install
    ```
2. Generate the SBOM (JSON). Update the timestamp in the filename before running:
    ```bash
    npx @cyclonedx/cyclonedx-npm --output-format json --output-file artifacts/security/sbom/pptb-sbom-$(date +%Y%m%d).json
    ```
3. (Optional) Produce a matching XML file if a customer requests it:
    ```bash
    npx @cyclonedx/cyclonedx-npm --output-format xml --output-file artifacts/security/sbom/pptb-sbom-$(date +%Y%m%d).xml
    ```
4. Capture the SHA256 checksum alongside the files for integrity verification.
5. Commit or upload the SBOM through the secure channel the requester specifies.

## 2. OWASP Secure Coding Checklist

**Purpose**: Demonstrate alignment with OWASP ASVS (Level 1) and the OWASP Top 10.

**Prerequisites**

- Latest code (usually `main`)
- Ability to run lint/build steps locally

**Steps**

1. Duplicate the checklist template using the current date, e.g. `docs/security/checklists/owasp-checklist-2026-01-22.md`. The template lives below; copy/paste it when creating a new record.
2. Run automated quality gates and note the results in the checklist:
    ```bash
    npm run lint
    npm run build
    ```
3. Manually review each category (Authentication, Access Control, Input Validation, Logging, etc.) and record the status (`Pass`, `--`, or `Follow-up`).
4. Document remediation owners and target dates for any `Follow-up` items.
5. Store the completed checklist in `docs/security/checklists/` and link it in the ticket or customer response.

**Template Snippet**

```markdown
| OWASP Area       | Control/Question                                    | Status    | Notes                        |
| ---------------- | --------------------------------------------------- | --------- | ---------------------------- |
| Authentication   | MFA enforced for admin-only features                | Pass      | Uses Entra ID + MSAL         |
| Access Control   | API routes gated by session/sessionless auth layers | Pass      | Supabase server-side checks  |
| Input Validation | All form inputs validated on server and client      | Follow-up | Harden tool submission regex |
```

## 3. Release Notes for Security Fixes

**Purpose**: Provide an auditable narrative of security-impacting changes per release.

**Steps**

1. Create (or update) a file named `docs/security/release-notes/security-release-notes.md`. Append a new section per release using the structure below.
2. Collect merged PRs with security impact:
    ```bash
    git log --merges --since="2025-12-01" --grep "security" --oneline
    ```
3. Summarize each fix with:
    - Component/feature
    - Vulnerability description + severity
    - CVE/CWE (if applicable)
    - Mitigation verification (test/scan reference)
4. Close the section with upgrade instructions (e.g., "Update to PPTB Desktop v0.9.4 or later").
5. Share the markdown file or copy its contents into the requester’s preferred template.

**Release Note Skeleton**

```markdown
## 2026-01 Security Patch Bundle

- **Tool submission endpoint** – Sanitized markdown rendering to block stored XSS (CWE-79). Verified via Playwright regression suite.
- **Supabase admin API** – Tightened RLS policies; write access now scoped to `pptb_admins` role only.
```

## 4. Threat Model Outline & Data-Flow Diagrams

**Purpose**: Visualize trust boundaries and document mitigations for key attack paths.

**Prerequisites**

- [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) for diagram exports (`npm install -D @mermaid-js/mermaid-cli` once per machine)

**Steps**

1. Edit the Mermaid source diagram in `docs/security/threat-model/pptb-threat-model.mmd`. The file should include:
    - External actors (maker, Azure AD, GitHub)
    - PPTB desktop client
    - Supabase APIs / Power Platform endpoints
    - Trust boundaries (`TB_1`, `TB_2`, etc.)
2. Generate PNG/SVG outputs for reviewers:
    ```bash
    npx @mermaid-js/mermaid-cli -i docs/security/threat-model/pptb-threat-model.mmd -o docs/security/threat-model/pptb-threat-model.png
    ```
3. Summarize threats and mitigations in `docs/security/threat-model/README.md` using the STRIDE categories.
4. Version-control both the `.mmd` and rendered assets.
5. Provide the diagram plus the outline to the requesting org.

--

For questions or deviations from these workflows, email `powermaverick.tools@outlook.com` so the core team can review before sharing artifacts externally.
