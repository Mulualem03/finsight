# Roadmap

What I'd build next, roughly ordered by value-to-effort ratio.

## Near term

- [ ] **ML categorisation** - FastText classifier on `merchant + description`, trained on the rules engine's output to bootstrap, then improved on user corrections. Inference is sub-millisecond CPU-only.
- [ ] **Subscription detection** - recurring debit detection over the last 6 months, surfaced as "recurring" tags and a dedicated "Subscriptions" view. Likely a fixed-amount cadence check before reaching for anything ML-ish.
- [ ] **Webhook-driven sync** - replace the poll-on-login pattern with TrueLayer's webhooks; introduces an event bus (Redis Streams to start) for downstream services.
- [ ] **Pact contract tests** between frontend and backend.

## Medium term

- [ ] **Plaid as a second AISP** - validates that the `OpenBankingProvider` abstraction holds water. Plaid's transaction model is subtly different from TrueLayer's; expect schema churn.
- [ ] **Multi-currency** - currently GBP only. Storage already uses minor units (pence/cents), so the work is mostly UI + an FX rate snapshot per transaction.
- [ ] **Budget envelopes** - set monthly caps per category, get warned when projected to exceed.
- [ ] **CSV / PDF export** - for tax-time, mortgage applications, etc. Lloyds advisers ask for "3 months of bank statements" - let users hand them a polished one.

## Longer term

- [ ] **Carbon footprint overlay** - attach a `kgCO₂e` estimate to each transaction (Connect Earth or merchant-category lookup), surface a monthly footprint. Aligns with Lloyds' published net-zero commitments and is genuinely useful product differentiation.
- [ ] **Payment Initiation (PIS)** - move money between own accounts via Open Banking. Requires production AISP+PISP credentials and a meaningfully tighter security review.
- [ ] **iOS / Android app** - React Native sharing the data layer with the web client.
- [ ] **Multi-user / joint accounts** - share an account view between two users with proper access controls.

## Engineering, not features

- [ ] **OpenTelemetry** end-to-end (browser → API → DB) with traces in Tempo/Jaeger.
- [ ] **k6 load tests** for the read APIs; a heavy user with 10k transactions/year should see p95 < 200ms.
- [ ] **WCAG 2.2 AA audit** in CI via axe-core; FCA Consumer Duty makes this less optional than it used to be.
- [ ] **Chaos tests** - kill Redis mid-sync, verify graceful degradation.
- [ ] **Migration to PostgreSQL row-level security** for defence-in-depth on tenant isolation.
