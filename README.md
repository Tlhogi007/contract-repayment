# Contract Repayment API

Secure NestJS microservice for **device contract repayment calculations**.

Authenticate, submit a device principal, and receive comparable **12 / 24 / 36-month** offerings at **6.5%** interest.

Built as a **bounded service under delivery discipline**: clear ownership boundaries, conventional commits, Husky gates, CI on every PR, and semantic-release from `main`.

## Current status

**Pricing** — pure `RepaymentPolicy` quotes 12 / 24 / 36-month amortized options at 6.5% in integer cents (golden unit tests). Identity (register/login JWT) and platform foundation remain in place. Contracts CRUD is next.

Delivery standards (hooks, CI, protected `main`/`develop`, semantic-release) are enforced.

## Platform decisions

These are the calls this slice makes on purpose — the kind of trade-offs a tech lead is expected to own:

| Decision            | Choice                                  | Why                                                                                                        |
| ------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Validation coercion | Off by default                          | Money and identity payloads must fail closed; DTOs opt in with `@Type` only when conversion is intentional |
| Error contract      | One `ApiErrorResponse` shape            | Clients and logs share the same fields; unexpected exceptions never leak internals                         |
| Request correlation | `x-request-id` + access log on `finish` | Every response, including Nest’s own 404s, can be traced without logging bodies                            |
| Health              | Liveness only                           | Reports process facts; does not pretend DB/auth readiness before those dependencies exist                  |
| Boot wiring         | Shared `configureApp()`                 | Production and e2e exercise the same pipes, filters, and docs surface                                      |
| Scope               | Platform before domain                  | Auth and pricing sit on a stable base so later PRs stay reviewable and auditable                           |

## Identity decisions

| Decision         | Choice                                         | Why                                                                                          |
| ---------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Login path       | `AuthService` (not passport-local)             | Credential check is one use-case; Passport is reserved for JWT on protected routes           |
| Failed login     | Same `401` / `Invalid credentials` always      | Avoids leaking whether an email is registered                                                |
| Tokens           | Access JWT only (no refresh / sessions)        | Enough for a Bearer API demo; refresh adds surface area without changing the assessment path |
| Password storage | bcrypt (cost 10); never returned in responses  | Standard one-way hash; hash stays off the wire                                               |
| Persistence      | Prisma + SQLite locally; schema Postgres-ready | Fast clone → run for assessors; swap the URL later without rewriting the domain              |

## Branch model

| Branch    | Role                                             |
| --------- | ------------------------------------------------ |
| `main`    | Stable / releasable. Semantic-release runs here. |
| `develop` | Integration. Default PR target for features.     |

See [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow, commit rules, and PR expectations.

## Tooling

| Concern       | Tool                                            |
| ------------- | ----------------------------------------------- |
| Framework     | NestJS + TypeScript (Node 22+)                  |
| Persistence   | Prisma + SQLite (local); schema Postgres-ready  |
| Auth          | bcrypt + JWT Bearer                             |
| Lint / format | ESLint + Prettier                               |
| Git hooks     | Husky (`pre-commit`, `commit-msg`, `pre-push`)  |
| Staged checks | lint-staged                                     |
| Commit style  | commitlint + Conventional Commits               |
| Versioning    | semantic-release (GitHub Releases + CHANGELOG)  |
| CI            | GitHub Actions — lint, format, unit, e2e, build |

```bash
npm run validate   # typecheck + lint + format + unit/e2e + build
```

Unit tests enforce **≥ 90%** coverage (statements, branches, functions, lines). Nest bootstrap/module/controller/DTO wiring is excluded from that unit gate; e2e covers the HTTP surface.

## Goals

| In scope                                      | Out of scope (v1)                     |
| --------------------------------------------- | ------------------------------------- |
| Register / login (JWT)                        | Payment gateway / real money movement |
| Contract CRUD owned by the authenticated user | Multi-tenant orgs / admin roles       |
| Deterministic 12/24/36 options @ 6.5%         | Mobile clients                        |
| Validation, consistent errors, logging        | Premature distributed architecture    |
| Unit + e2e per feature PR                     |                                       |
| Clone → run docs for reviewers                |                                       |

## Architecture (target)

```
HTTP / OpenAPI
  → Controllers (transport)
  → Application services (use-cases + authz)
  → Domain: RepaymentPolicy (pure, deterministic)
  → Prisma persistence (SQLite for local demo; schema Postgres-portable)
```

## Interest policy

Amortized (reducing-balance) monthly payment:

\[
M = P \frac{r(1+r)^{n}}{(1+r)^{n}-1}
\]

- \(P\) — principal in **integer cents**
- \(r\) — \(0.065 / 12\)
- \(n\) — 12 \| 24 \| 36
- \(M\) — monthly payment, rounded to the nearest cent (`Math.round`)

`RepaymentPolicy` is pure domain code (no Nest/HTTP). Contracts will snapshot quoted options on write so historical quotes stay stable if policy evolves.

## Pricing decisions

| Decision        | Choice                                        | Why                                                                                                                                                                                              |
| --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Interest        | Amortized reducing-balance @ 6.5% annual      | Matches the assessment offerings; deterministic and easy to golden-test                                                                                                                          |
| Money unit      | Integer cents at the domain boundary          | Avoids float drift in stored totals; display formatting stays out of the domain                                                                                                                  |
| Rounding        | `Math.round` on the monthly payment           | Single, explicit rule; totals are `monthly × term` from that rounded payment                                                                                                                     |
| Decimal library | Not used (`decimal.js` / Dinero / etc.)       | Fixed rate + three terms; cents + one round + golden tests are enough. A decimal lib is the upgrade path if schedules must match a bank ledger exactly — not worth the dependency for this scope |
| Formula float   | JS `number` only inside the amortization step | Accepted trade-off: intermediates may be binary floats; outputs are integer cents pinned by tests                                                                                                |
| Delivery        | Pure policy module before contracts HTTP      | Pricing correctness is proven in isolation; CRUD stays a thin owner of persistence + authz                                                                                                       |
| HTTP amounts    | Contracts must accept cents (or parse once)   | Never trust JSON number floats as money at the API boundary                                                                                                                                      |

## Prerequisites

- Node.js **22+**
- npm 10+

## Quick start

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run start:dev
```

- API: `http://localhost:3000`
- Health: `GET http://localhost:3000/health`
- Docs: `http://localhost:3000/api/docs`

```bash
npm test
npm run test:e2e
npm run lint
npm run validate
```

## API surface

| Method   | Path             | Auth | Status  | Purpose                        |
| -------- | ---------------- | ---- | ------- | ------------------------------ |
| `POST`   | `/auth/register` | —    | Live    | Create account                 |
| `POST`   | `/auth/login`    | —    | Live    | Issue JWT                      |
| `POST`   | `/contracts`     | JWT  | Planned | Create contract + term options |
| `GET`    | `/contracts`     | JWT  | Planned | List own contracts             |
| `GET`    | `/contracts/:id` | JWT  | Planned | Get one (ownership enforced)   |
| `PATCH`  | `/contracts/:id` | JWT  | Planned | Update amount → recalc         |
| `DELETE` | `/contracts/:id` | JWT  | Planned | Delete                         |
| `GET`    | `/health`        | —    | Live    | Liveness                       |
| `GET`    | `/api/docs`      | —    | Live    | Swagger UI                     |

## Delivery plan

1. **Engineering template** — hooks, CI, branches, docs
2. **Platform** — config, validation, Swagger, errors, logging
3. **Identity** — register/login, bcrypt, JWT guard
4. **Pricing** — pure `RepaymentPolicy` + golden unit tests _(this)_
5. **Contracts** — CRUD + ownership + option snapshots
6. **Hardening** — negative paths, IDOR checks
7. **Narrative** — README as design/runbook for assessors
8. **Stretch** — rate limits, thin UI (only if core is solid)

## Engineering notes

- **Scope discipline:** ship reviewable vertical slices; one concern per PR; refuse premature distribution.
- **Authz:** every contract read/mutation is owner-scoped; cross-user access returns 404 (not 403) so existence is not leaked.
- **Secrets:** never commit `.env`; rotate `JWT_SECRET` before shared environments.
- **Test strategy:** unit tests own pricing correctness and platform invariants; e2e tests own auth and contract journeys.
- **Explainability:** code stays direct enough to defend in review; decisions live in this README when the “why” is the point.

## License

UNLICENSED — assessment / team submission.
