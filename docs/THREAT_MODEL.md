# Threat Model

A STRIDE-based threat analysis of FinSight's primary trust boundaries. The goal is not to be exhaustive - it is to demonstrate that security was considered as a design constraint, not bolted on.

## Trust boundaries

```
┌────────────────────────┐   1   ┌──────────────────────┐   2   ┌────────────────┐
│ Browser (Untrusted)    │ ────► │ FinSight API         │ ────► │ TrueLayer      │
│ React SPA              │       │ NestJS + Postgres    │       │ Bank's OB API  │
└────────────────────────┘       └──────────────────────┘       └────────────────┘
                                          │
                                          │  3
                                          ▼
                                   ┌────────────────┐
                                   │ Operator       │
                                   │ (deployer)     │
                                   └────────────────┘
```

Three boundaries to analyse:

1. **Browser ↔ API** - the public attack surface
2. **API ↔ TrueLayer** - outbound, but tokens cross here
3. **API ↔ Operator** - secrets, logs, infrastructure

## Boundary 1: Browser ↔ API

| STRIDE | Threat | Mitigation |
|--------|--------|------------|
| **S**poofing | Attacker uses stolen credentials to log in as a user | bcrypt cost 12; account lockout after 5 failed attempts (Redis counter, 15-min window); future: TOTP 2FA |
| **S**poofing | Attacker forges a JWT | Access tokens signed with HS256 + 256-bit secret from env; in production, asymmetric RS256 with key in KMS |
| **T**ampering | Attacker modifies request body to e.g. set someone else's `userId` | Every endpoint extracts `userId` from the JWT, never from the body. Validated via `@CurrentUser()` decorator |
| **T**ampering | XSS injects JS that calls the API as the user | Strict CSP (no `unsafe-inline`, no third-party script origins); React's default escaping; no `dangerouslySetInnerHTML` anywhere |
| **R**epudiation | User claims they didn't perform a sensitive action | Audit log table records `(userId, action, resourceId, ip, userAgent, timestamp)` for security-relevant actions |
| **I**nformation disclosure | Error responses leak stack traces or SQL | Global exception filter strips internals in production; only correlation ID is returned to the client |
| **I**nformation disclosure | Logged-in user A reads user B's transactions | Every query is scoped by `userId` at the repository layer; covered by integration tests |
| **I**nformation disclosure | Browser extension reads tokens from `localStorage` | Refresh tokens are stored in `HttpOnly; Secure; SameSite=Strict` cookies, never accessible to JS. Access tokens are short-lived (15 min) and live in memory only |
| **D**enial of service | Credential stuffing | Rate limit on `/auth/login`: 10 attempts per IP per 15 min, Redis-backed |
| **D**enial of service | API flood | Global rate limit (100 req/min per IP) via `@nestjs/throttler` |
| **E**levation of privilege | Regular user accesses admin endpoint | Role-based guards on every admin endpoint; default-deny |

## Boundary 2: API ↔ TrueLayer

| STRIDE | Threat | Mitigation |
|--------|--------|------------|
| **S**poofing | Attacker pretends to be TrueLayer in the OAuth callback | The callback returns to **our** frontend, which posts the code to **our** API; we then call TrueLayer's token endpoint over TLS using pinned hostname. Code+state are validated server-side |
| **T**ampering | Authorisation code intercepted on the redirect leg | PKCE: the `code_verifier` never leaves our server, and TrueLayer requires it to redeem the code. Even if an attacker grabs the code, they can't exchange it |
| **R**epudiation | TrueLayer denies sending data we hold | Raw provider payloads are retained in `jsonb` with the request ID returned by TrueLayer, in non-prod environments. Production retains only the request ID + hash |
| **I**nformation disclosure | Database breach exposes bank tokens | Access/refresh tokens are encrypted at the application layer with AES-256-GCM before being written. Key is sourced from env (KMS in production). A database dump without the key is useless for bank access |
| **D**enial of service | TrueLayer outage cascades | Sync is async and isolated per connection; failures are captured per-connection and surfaced in the UI without blocking other features. Circuit breaker on the TrueLayer HTTP client (opossum) |
| **E**levation of privilege | A user's TrueLayer tokens are used to read another user's data | Tokens are partitioned by `userId` + `connectionId` in the database; service queries always include `userId` |

## Boundary 3: API ↔ Operator

| STRIDE | Threat | Mitigation |
|--------|--------|------------|
| **S**poofing | A malicious dependency exfiltrates secrets at build time | `npm ci` with `package-lock.json`; Renovate PRs reviewed; CodeQL + `npm audit` in CI; only direct deps reviewed for new additions |
| **T**ampering | Attacker pushes a malicious image to the registry | Images built in GitHub Actions from `main`, signed (cosign) and pinned by digest in the deployment manifests |
| **R**epudiation | Operator change has no trail | All infrastructure changes go through PRs; merges to `main` produce immutable, signed artefacts |
| **I**nformation disclosure | Logs contain PII or tokens | Pino logger with a redact list: `authorization`, `password`, `access_token`, `refresh_token`, `email` (hashed), `card_*`. Sample tests assert the redact list works |
| **I**nformation disclosure | `.env` committed to git | `.gitignore` excludes `.env`; `git-secrets` pre-commit hook; CI fails if any high-entropy strings appear in diffs |
| **D**enial of service | Misconfigured deployment | Health and readiness probes; deployment uses rolling updates with automatic rollback on probe failure |
| **E**levation of privilege | Container breakout | Containers run as non-root, read-only root filesystem, dropped capabilities; only `:80` exposed |

## Known gaps

Honest disclosure - these are *not* mitigated in this codebase, because they're out of scope for a portfolio project but would be required for production:

- **No 2FA / MFA.** Email+password is the only factor.
- **Encryption key rotation** is not automated.
- **No WAF.** In production this would sit in front of the API.
- **No formal SOC 2 / ISO 27001 controls.** Real banks need these.
- **Tokens are encrypted at rest but the key lives in env.** A real deployment uses KMS-managed envelope encryption with automated key rotation.

In an interview, calling these out yourself reads better than being asked about them.
