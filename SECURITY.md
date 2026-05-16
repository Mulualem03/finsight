# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in FinSight, please **do not open a public issue**. Instead, email the maintainer privately:

📧 `your-email@example.com`

I will acknowledge within 72 hours and aim to provide a remediation plan within 7 days.

## Scope

This project is a portfolio demonstration and is **not deployed as a production service**. There is no end-user data at risk. That said, I take the discipline seriously, because the code shape and threat model are meant to mirror what a real banking app would do.

In scope:
- Authentication and session handling (`backend/src/auth`)
- Token-at-rest encryption (`backend/src/open-banking/token-cipher.ts`)
- The OAuth2 + PKCE flow (`backend/src/open-banking/open-banking.service.ts`)
- Any path where user-supplied input reaches a database query

Out of scope:
- DoS via heavy synthetic load (this is a portfolio, not a service)
- Anything requiring a live TrueLayer production account
- Third-party dependency CVEs already tracked by Renovate

## What I'd like reports to include

- A clear description of the issue
- A minimal reproduction (curl, request body, etc.)
- The impact you believe it has
- Your suggested fix, if any

Thank you for helping keep things tidy.
