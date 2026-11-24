# Contract Repayment API

Secure NestJS microservice for **device contract repayment calculations**.

Authenticate, submit a device principal, and receive comparable **12 / 24 / 36-month** offerings at **6.5%** interest.

This repository is the delivery vehicle for an S² technical assessment. The bar is production-minded engineering in a tightly scoped service — not feature sprawl.

## Current status

**Phase 0 — Bootstrap** (this commit)

- NestJS + TypeScript scaffold
- Health endpoint
- Environment template
- Project conventions documented below

Next: platform wiring (config, validation, Swagger, logging), then auth, repayment policy, and contracts CRUD.

## Goals

| In scope | Out of scope (v1) |
|----------|-------------------|
| Register / login (JWT) | Payment gateway / real money movement |
| Contract CRUD owned by the authenticated user | Multi-tenant orgs / admin roles |
| Deterministic 12/24/36 options @ 6.5% | Mobile clients |
| Validation, consistent errors, logging | Premature distributed architecture |
| Unit + e2e tests, OpenAPI/Swagger | |
| Clone → run README for assessors | |

## Architecture (target)

```
HTTP / OpenAPI
  → Controllers (transport)
  → Application services (use-cases + authz)
  → Domain: RepaymentPolicy (pure, deterministic)
  → Prisma persistence (SQLite for local demo; schema Postgres-portable)
```

Cross-cutting: JWT guard, validation pipe, exception filter, request logging, env-based config.

## Interest policy (planned)

Amortized (reducing-balance) monthly payment:

\[
M = P \frac{r(1+r)^{n}}{(1+r)^{n}-1}
\]

- \(P\) — principal (device amount)
- \(r\) — \(0.065 / 12\)
- \(n\) — 12 | 24 | 36

Money is handled in **integer cents** at the domain boundary to avoid floating-point drift. Option snapshots are persisted on write so historical quotes remain stable if policy evolves.

## Prerequisites

- Node.js **20+**
- npm 10+

## Quick start

```bash
npm install
cp .env.example .env
npm run start:dev
```

- API: `http://localhost:3000`
- Health: `GET http://localhost:3000/health`

```bash
npm test
npm run test:e2e
npm run lint
```

## Planned API surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Issue JWT |
| `POST` | `/contracts` | JWT | Create contract + term options |
| `GET` | `/contracts` | JWT | List own contracts |
| `GET` | `/contracts/:id` | JWT | Get one (ownership enforced) |
| `PATCH` | `/contracts/:id` | JWT | Update amount → recalc |
| `DELETE` | `/contracts/:id` | JWT | Delete |
| `GET` | `/health` | — | Liveness |
| `GET` | `/api/docs` | — | Swagger UI *(Phase 1)* |

## Delivery plan

1. **Bootstrap** — scaffold, health, env, README *(done)*
2. **Platform** — config, validation, Swagger, errors, logging
3. **Identity** — register/login, bcrypt, JWT guard
4. **Pricing** — pure `RepaymentPolicy` + golden unit tests
5. **Contracts** — CRUD + ownership + option snapshots
6. **Hardening** — negative paths, IDOR checks
7. **Narrative** — README as design/runbook for assessors
8. **Stretch** — CI, rate limits, thin UI (only if 1–7 are solid)

## Engineering notes

- **Scope discipline:** ship a reviewable vertical slice assessors can run without ceremony.
- **Authz:** every contract read/mutation is owner-scoped; cross-user access returns 404 (no existence leak).
- **Secrets:** never commit `.env`; rotate `JWT_SECRET` before any shared environment.
- **Test strategy:** unit tests own pricing correctness; e2e tests own auth and contract journeys.

## License

UNLICENSED — assessment submission.
