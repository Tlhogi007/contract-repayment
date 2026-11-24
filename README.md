# Contract Repayment API

Secure NestJS microservice for **device contract repayment calculations**.

Authenticate, submit a device principal, and receive comparable **12 / 24 / 36-month** offerings at **6.5%** interest.

Built as a **bounded service under delivery discipline**: clear ownership boundaries, conventional commits, Husky gates, CI on every PR, and semantic-release from `main`.

## Current status

**Contracts** — JWT-guarded CRUD with owner-scoped access (cross-user → 404) and frozen 12/24/36 option snapshots from `RepaymentPolicy`. Identity and pricing are in place. The assessor demo journey (register → quote → CRUD) is complete; this slice is the milestone cut for `main`.

Delivery standards (hooks, CI, protected `main`/`develop`, semantic-release) are enforced.

## Platform decisions

These are the calls this slice makes on purpose — the kind of trade-offs a tech lead is expected to own:

| Decision            | Choice                                  | Why                                                                                                                  |
| ------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Validation coercion | Off by default                          | Money and identity payloads must fail closed; DTOs opt in with `@Type` only when conversion is intentional           |
| Error contract      | One `ApiErrorResponse` shape            | Clients and logs share the same fields; unexpected exceptions never leak internals                                   |
| Request correlation | `x-request-id` + access log on `finish` | Every response, including Nest’s own 404s, can be traced without logging bodies                                      |
| Health              | Liveness only                           | Reports process facts; does not pretend DB/auth readiness before those dependencies exist                            |
| Boot wiring         | Shared `configureApp()`                 | Production and e2e share pipes, filters, middleware, and OpenAPI; keeps the HTTP surface outside module DI by design |
| Scope               | Platform before domain                  | Auth and pricing sit on a stable base so later PRs stay reviewable and auditable                                     |

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

## Architecture

Nest’s layered alternative to MVC — same separation of concerns, different names:

```
HTTP / OpenAPI
  → Controllers (transport)
  → Application services (use-cases + authz)
  → Domain: RepaymentPolicy (deterministic quotes)
  → Prisma persistence (SQLite for local demo; schema Postgres-portable)
```

Cross-cutting concerns stay outside feature modules: `configureApp()` wires validation, exception filter, request-id, access logging, and Swagger for both production and e2e.

### Design patterns

| Pattern                   | Where                                                                                   | Why                                                                |
| ------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Strategy                  | `AmortizationCalculator` + `NativeAmortizationCalculator` via `AMORTIZATION_CALCULATOR` | Swap the formula engine without changing the cents quote API       |
| Dependency injection      | Nest providers (`RepaymentPolicy`, `AuthService`, …)                                    | Callers depend on contracts; tests and overrides stay cheap        |
| Factory                   | `JwtModule.registerAsync({ useFactory })`, `createValidationPipe()`                     | Build configured collaborators once at boot                        |
| Guard + Passport strategy | `JwtAuthGuard` + `JwtStrategy`                                                          | Protect routes; load the current user from a verified JWT          |
| Decorator                 | Nest metadata + `@CurrentUser()`                                                        | Keep transport glue out of services                                |
| Middleware / filter       | request-id + access log; `AllExceptionsFilter`                                          | Correlate requests; one `ApiErrorResponse` shape for every failure |

### SOLID in this codebase

| Principle             | How it shows up                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Single responsibility | Controllers transport; services own use-cases; calculator owns math; Prisma owns persistence   |
| Open/closed           | New amortization engine plugs in behind the token; callers of `RepaymentPolicy` stay untouched |
| Liskov substitution   | Any `AmortizationCalculator` implementation is interchangeable at the DI boundary              |
| Interface segregation | Calculator interface is one method — no fat “pricing” port                                     |
| Dependency inversion  | `RepaymentPolicy` depends on the calculator abstraction, not `NativeAmortizationCalculator`    |

## Interest policy

Amortized (reducing-balance) monthly payment:

\[
M = P \frac{r(1+r)^{n}}{(1+r)^{n}-1}
\]

- \(P\) — principal in **integer cents**
- \(r\) — \(0.065 / 12\)
- \(n\) — 12 \| 24 \| 36
- \(M\) — monthly payment, rounded to the nearest cent (`Math.round`)

`RepaymentPolicy` is a Nest-injectable domain service (no HTTP of its own). Formula math sits behind `AmortizationCalculator` so the engine can be swapped. Contracts will snapshot quoted options on write so historical quotes stay stable if policy evolves.

## Pricing decisions

| Decision          | Choice                                         | Why                                                                                                                                           |
| ----------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Interest          | Amortized reducing-balance @ 6.5% annual       | Matches the assessment offerings; deterministic and easy to golden-test                                                                       |
| Money unit        | Integer cents at the domain boundary           | Avoids float drift in stored totals; display formatting stays out of the domain                                                               |
| Rounding          | `Math.round` on the monthly payment            | Single, explicit rule; totals are `monthly × term` from that rounded payment                                                                  |
| Decimal library   | Not used (`decimal.js` / Dinero / etc.)        | Fixed rate + three terms; cents + one round + golden tests are enough for now                                                                 |
| Formula engine    | Strategy + Nest DI (`AMORTIZATION_CALCULATOR`) | `RepaymentPolicy` owns the cents API; the token binds the formula. Override the provider to plug in a decimal engine without touching callers |
| Formula float     | Inside `NativeAmortizationCalculator` only     | Accepted trade-off today; a decimal calculator plugs in behind the same interface                                                             |
| Delivery          | Pricing module before contracts HTTP           | Pricing correctness is proven in isolation; CRUD stays a thin owner of persistence + authz                                                    |
| HTTP amounts      | Contracts must accept cents (or parse once)    | Never trust JSON number floats as money at the API boundary                                                                                   |
| Principal ceiling | `MAX_PRINCIPAL_CENTS` (1e9)                    | Keeps option totals inside SQLite/Prisma Int at 6.5% / 36 months; DTO + domain both enforce it                                                |

## Contracts decisions

| Decision              | Choice                                                             | Why                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ownership             | Owner-scoped queries; cross-user → `404`                           | Avoids leaking whether another user’s contract id exists                                                                                                   |
| Quote persistence     | Snapshot options (+ rate) on create/update                         | Historical contracts stay stable if pricing policy evolves later                                                                                           |
| Concurrent `PATCH`    | Last-write-wins; options replaced inside a transaction             | Demo is single-actor; each write still leaves a coherent snapshot. No optimistic `version` / `409` until multi-writer edits are a real product requirement |
| Concurrency test      | E2e race asserts both succeed + final snapshot is consistent       | Proves no corruption under overlap; does **not** claim a deterministic winner or serializability                                                           |
| Next step (if needed) | Optimistic concurrency on `updatedAt` / `version` → `409 Conflict` | Cheap upgrade path when two tabs or roles can edit the same contract; locking is deferred until then                                                       |

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

| Method   | Path             | Auth | Status | Purpose                        |
| -------- | ---------------- | ---- | ------ | ------------------------------ |
| `POST`   | `/auth/register` | —    | Live   | Create account                 |
| `POST`   | `/auth/login`    | —    | Live   | Issue JWT                      |
| `GET`    | `/auth/me`       | JWT  | Live   | Current user (guard proof)     |
| `POST`   | `/contracts`     | JWT  | Live   | Create contract + term options |
| `GET`    | `/contracts`     | JWT  | Live   | List own contracts             |
| `GET`    | `/contracts/:id` | JWT  | Live   | Get one (ownership enforced)   |
| `PATCH`  | `/contracts/:id` | JWT  | Live   | Update amount → recalc         |
| `DELETE` | `/contracts/:id` | JWT  | Live   | Delete                         |
| `GET`    | `/health`        | —    | Live   | Liveness                       |
| `GET`    | `/api/docs`      | —    | Live   | Swagger UI                     |

## Delivery plan

1. **Engineering template** — hooks, CI, branches, docs
2. **Platform** — config, validation, Swagger, errors, logging
3. **Identity** — register/login, bcrypt, JWT guard
4. **Pricing** — `RepaymentPolicy` + Strategy DI + golden unit tests
5. **Contracts** — CRUD + ownership + option snapshots
6. **Hardening** — auth/contracts edge cases (expired JWT, IDOR, principal ceiling, cascade, race smoke)
7. **Milestone release** — `develop` → `main` _(this)_
8. **Stretch** — rate limits, thin UI (only if core is solid)

## Engineering notes

- **Scope discipline:** ship reviewable vertical slices; one concern per PR; refuse premature distribution.
- **Authz:** every contract read/mutation is owner-scoped; cross-user access returns 404 (not 403) so existence is not leaked.
- **Secrets:** never commit `.env`; rotate `JWT_SECRET` before shared environments.
- **Test strategy:** unit tests own pricing correctness and platform invariants; e2e tests own auth and contract journeys.
- **Explainability:** code stays direct enough to defend in review; decisions live in this README when the “why” is the point.

## License

UNLICENSED — assessment / team submission.
