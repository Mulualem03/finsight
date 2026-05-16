# API Reference

The full, accurate API reference is auto-generated and served at **`/api/docs`** when the backend is running (Swagger UI, powered by `@nestjs/swagger`). What's below is a human-friendly summary of the endpoints.

All endpoints are prefixed with `/api`. All authenticated endpoints require a `Bearer` access token in the `Authorization` header.

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Exchange credentials for an access + refresh token pair |
| `POST` | `/auth/refresh` | Rotate refresh token, issue new access token |
| `POST` | `/auth/logout` | Revoke current refresh token |

Refresh tokens are returned as `HttpOnly; Secure; SameSite=Strict` cookies and never exposed to JS. Access tokens are returned in the response body and held in memory by the frontend.

## Open Banking

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/open-banking/connect/start` | Begin OAuth2 + PKCE flow. Returns `authUrl` for redirect. |
| `POST` | `/open-banking/connect/callback` | Exchange `code` for tokens, create connection, trigger initial sync. |
| `GET` | `/open-banking/connections` | List active bank connections. |
| `DELETE` | `/open-banking/connections/:id` | Revoke a connection. |
| `POST` | `/open-banking/connections/:id/sync` | Manually trigger a sync. |

## Accounts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/accounts` | List all accounts across all connections. |
| `GET` | `/accounts/:id` | Account detail with current balance. |

## Transactions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/transactions` | List transactions. Supports `?accountId`, `?category`, `?from`, `?to`, `?search`, `?page`, `?pageSize`. |
| `GET` | `/transactions/:id` | Transaction detail. |
| `PATCH` | `/transactions/:id` | Update category and/or notes. Creates a personal rule if requested. |

## Insights

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/insights/summary` | This month vs last month: total spend, change, top categories. |
| `GET` | `/insights/by-category` | Spend grouped by category over a date range. |
| `GET` | `/insights/forecast` | Naive end-of-month forecast with explanation. |
| `GET` | `/insights/trends` | Spend by month for the last 12 months. |

## Goals

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/goals` | List savings goals. |
| `POST` | `/goals` | Create a goal. |
| `PATCH` | `/goals/:id` | Update name/target/deadline. |
| `DELETE` | `/goals/:id` | Delete. |
| `POST` | `/goals/:id/contributions` | Record progress toward a goal. |

## Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness + readiness, including DB and Redis. Used by k8s probes. |

## Errors

All errors return a uniform envelope:

```json
{
  "statusCode": 422,
  "code": "VALIDATION_FAILED",
  "message": "amount must not be negative",
  "correlationId": "01HMW8...",
  "timestamp": "2026-01-15T09:12:33.451Z"
}
```

`correlationId` matches the `x-correlation-id` response header and is the only identifier safe to share when contacting support.
