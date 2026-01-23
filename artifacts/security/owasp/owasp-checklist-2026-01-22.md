# OWASP Checklist – 2026-01-22

| OWASP Area       | Control / Question                                             | Status    | Notes                                                                                 |
| ---------------- | -------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| Authentication   | Does PPTB rely on a vetted identity provider with MFA support? | Pass      | MSAL w/ Entra ID; inherits tenant MFA policies                                        |
| Authentication   | Are credentials or tokens ever persisted unencrypted on disk?  | Pass      | Supabase session stored in secure cookies; desktop client keeps tokens in OS keychain |
| Access Control   | Are server routes protected by RLS / role checks?              | Pass      | Supabase RLS policies restrict admin APIs to `pptb_admins` role                       |
| Access Control   | Are admin-only features hidden in UI when unauthenticated?     | Pass      | Header dynamically shows dashboard links only when Supabase session exists            |
| Input Validation | Are form payloads sanitized server-side before persistence?    | Pass      | `tool-intake-validation.ts` enforces schema; additional Supabase validation           |
| Input Validation | Are markdown/HTML outputs sanitized?                           | Follow-up | Need to add DOMPurify step to review detail rendering                                 |
| Cryptography     | Are HTTPS/TLS enforced for all network calls?                  | Pass      | All Supabase/Entra/GitHub calls use HTTPS endpoints                                   |
| Cryptography     | Are secrets stored in source control?                          | Pass      | Environment variables managed via Vercel/Supabase secrets                             |
| Error Handling   | Do API responses avoid leaking stack traces or secrets?        | Pass      | Next.js API routes return normalized error objects                                    |
| Configuration    | Are dependencies routinely patched?                            | Pass      | Dependabot enabled; SBOM generated 2026-01-22                                         |
| Configuration    | Is there a documented procedure for security releases?         | Pass      | See `docs/security/release-notes/security-release-notes.md`                           |
| Data Protection  | Is customer data stored persistently by PPTB services?         | Pass      | No customer data stored; only metadata for tools                                      |

## Follow-up Actions

- [ ] Harden review markdown rendering with DOMPurify (owner: Web team, due: 2026-02-05)
