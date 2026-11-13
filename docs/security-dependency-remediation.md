# Dependency security remediation — 2026-11-13

This change addresses the supplied dependency alerts on a separate security branch. It uses OWASP Top 10:2025 as a review framework, primarily A03 Software Supply Chain Failures. It is not a full application penetration test or an OWASP certification.

## Alert coverage

| Package | Alert numbers | Resolved version |
| --- | --- | --- |
| source-map-js | 56 | 1.2.2 |
| Vite / bundled launch-editor | 59, 60, 61, 62, 63 | Vite 6.4.6 |
| js-yaml | 32 | 4.3.2 |
| SixLabors.ImageSharp | 49, 50, 68, 69, 70, 71, 72 | 4.1.2 |
| undici | 34, 37, 38, 39, 41, 42, 67, 74, 75, 76, 77 | 7.30.2 |
| Vitest / @vitest/mocker | 30, 31, 64 | 4.1.12 |
| brace-expansion | 47, 48 | 1.1.22 and 5.0.13 |
| minimatch | 79 | 11.0.8 for former v10 consumers |

The existing follow-redirects 1.16.3 fix is preserved. Overrides are scoped by dependency major where needed. In particular, minimatch v3 consumers retain their existing API; only v10 consumers move to v11. Vite is aligned through the npm `$vite` override to avoid a separate Vite major under Vitest. The committed lockfile pins the exact resolved versions.

## Preventing recurrence

- Frontend CI uses `npm ci`, enforcing the committed dependency graph.
- Trivy includes development dependencies and LOW/MEDIUM/HIGH/CRITICAL findings. Its existing fail-on-findings behavior and ignore-unfixed policy remain enabled.
- A separate NuGet audit restores the full solution, checks direct and transitive packages at every severity, and fails on NU1900–NU1905 (including unavailable audit data).
- The security workflow has read-only repository permissions, runs on security branches and PRs, and schedules weekly scans. Scheduled workflows run from the default branch once merged there.
- Dependabot checks npm, NuGet and GitHub Actions weekly against dev. GitHub alert closure depends on the vulnerable manifest being fixed on the default branch and GitHub rescanning it.
- The pre-existing React Router RSC exception in `.trivyignore` is unchanged. No new exclusions were added to silence these alerts.

## OWASP Top 10:2025 review scope

| Category | Evidence or scope boundary |
| --- | --- |
| A01 Broken Access Control | DailyReportsController has authentication, Owner-only listing and an Owner write prohibition. Existing daily-report tests pass. No full cross-service authorization audit was performed. |
| A02 Security Misconfiguration | Security workflow token permissions are restricted to contents:read. Deployment TLS, CORS and infrastructure configuration need environment-specific assessment. |
| A03 Software Supply Chain Failures | Dependency patches, lockfile enforcement, broader scans and automated update checks implemented here. |
| A04 Cryptographic Failures | No cryptographic behavior changed; deployed key storage and TLS were not assessed. |
| A05 Injection | No query or rendering behavior changed; dependency scans do not establish injection resistance. |
| A06 Insecure Design | No system-wide threat model was performed. |
| A07 Authentication Failures | Shared JWT configuration validates issuer, audience, signature and lifetime; Identity configures rate limiting. Deployed settings and complete authentication flows remain outside this review. |
| A08 Software or Data Integrity Failures | npm ci verifies the committed lockfile and package integrity metadata. CI action versions remain version tags rather than immutable commit hashes. |
| A09 Security Logging and Alerting Failures | CI exposes dependency findings and runs periodically. Application audit-log coverage and operational alert delivery were not assessed. |
| A10 Mishandling of Exceptional Conditions | Patched parser/decoder libraries address the listed DoS and invalid-data findings. The shared upload validator enforces 5 MB, allowed extensions, MIME types and signatures; decompressed pixel/frame budgets and broader resource-exhaustion tests remain follow-up work. |

## Validation

- Clean npm install using `npm ci` succeeded.
- npm audit: zero vulnerabilities, including development dependencies.
- Trivy 0.76.0 with a freshly downloaded database, all severities and development dependencies: zero findings on a clean tracked-source snapshot. NuGet coverage is provided separately by the full-solution audit.
- Full-solution NuGet audit: passed with vulnerability and audit-source warnings treated as errors.
- Frontend: 49 test files, 250 tests passed; production build passed.
- QC service: 7 tests passed against ImageSharp 4.1.2.
- ts-morph glob selection and ESLint configuration smoke checks passed with minimatch 11.
- Frontend test output includes jsdom canvas warnings; build output includes bundle-size warnings. Neither failed the checks.

## References

- OWASP: https://top10.owasp.org/2025/A03_2025-Software_Supply_Chain_Failures/
- minimatch maintainer advisory: https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249
- ImageSharp advisory: https://github.com/advisories/GHSA-j3p4-wp97-rph4
