# Contract Repayment API

NestJS microservice for **device contract repayment calculations**.

**Demo journey:** register / login → submit a principal in **integer cents** → receive comparable **12 / 24 / 36-month** offerings at **6.5%** → manage your own contracts (JWT).

**Status:** Complete and released on [`main`](https://github.com/Tlhogi007/contract-repayment-api) as **v1.1.0**. Clone, run, and exercise Swagger without extra setup beyond Node 22+.

---

## Quick start

**Prerequisites:** Node.js **22+**, npm 10+

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run start:dev
```

|         |                                |
| ------- | ------------------------------ |
| API     | http://localhost:3000          |
| Health  | http://localhost:3000/health   |
| Swagger | http://localhost:3000/api/docs |

```bash
npm run validate   # typecheck + lint + format + unit/e2e + build
```

Unit tests gate **≥ 90%** coverage (wiring like modules/controllers/DTOs excluded; e2e owns the HTTP surface).

---

## Try the journey (curl)

```bash
# 1) Register
curl -s http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password123"}'

# 2) Create a contract (R1 000.00 → 100000 cents). Use the accessToken from step 1.
curl -s http://localhost:3000/contracts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"principalCents":100000}'
```

Golden options for `100000` cents: monthly **8630 / 4455 / 3065** (12 / 24 / 36). Prefer Swagger “Authorize” for the full CRUD path.

---

## API surface

| Method   | Path             | Auth | Purpose                               |
| -------- | ---------------- | ---- | ------------------------------------- |
| `POST`   | `/auth/register` | —    | Create account                        |
| `POST`   | `/auth/login`    | —    | Issue JWT                             |
| `GET`    | `/auth/me`       | JWT  | Current user                          |
| `POST`   | `/contracts`     | JWT  | Create + snapshot term options        |
| `GET`    | `/contracts`     | JWT  | List own contracts (`limit`/`cursor`) |
| `GET`    | `/contracts/:id` | JWT  | Get one (owner only)                  |
| `PATCH`  | `/contracts/:id` | JWT  | Update principal → recalc             |
| `DELETE` | `/contracts/:id` | JWT  | Delete                                |
| `GET`    | `/health`        | —    | Liveness                              |
| `GET`    | `/api/docs`      | —    | Swagger UI                            |

Cross-user contract access returns **404** (not 403) so existence is not leaked. `GET /` has no route by design.

---

## Architecture

Nest’s layered alternative to MVC:

```
HTTP / OpenAPI
  → Controllers (transport)
  → Application services (use-cases + authz)
  → Domain: RepaymentPolicy (deterministic quotes)
  → Prisma (SQLite locally; schema Postgres-portable)
```

`configureApp()` wires validation, exception filter, request-id, access logging, and Swagger for both production and e2e.

### Patterns (PDF: design patterns)

| Pattern                   | Where                                                  | Why                                                |
| ------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Strategy                  | `AmortizationCalculator` via `AMORTIZATION_CALCULATOR` | Swap formula engine without changing the cents API |
| DI                        | Nest providers                                         | Depend on contracts; cheap tests/overrides         |
| Factory                   | `JwtModule.registerAsync`, `createValidationPipe()`    | Configure collaborators at boot                    |
| Guard + Passport strategy | `JwtAuthGuard` + `JwtStrategy`                         | Protect routes; resolve current user               |
| Decorator                 | `@CurrentUser()`                                       | Keep transport glue out of services                |
| Middleware / filter       | request-id + log; `AllExceptionsFilter`                | Correlate requests; one error shape                |

### SOLID

| Principle | How it shows up                                                                  |
| --------- | -------------------------------------------------------------------------------- |
| SRP       | Controllers transport; services use-cases; calculator math; Prisma persistence   |
| OCP       | New calculator plugs in behind the token; callers stay untouched                 |
| LSP       | Any `AmortizationCalculator` is interchangeable                                  |
| ISP       | Calculator interface is one method                                               |
| DIP       | `RepaymentPolicy` depends on the abstraction, not `NativeAmortizationCalculator` |

---

## Interest policy

Amortized (reducing-balance) monthly payment:

\[
M = P \frac{r(1+r)^{n}}{(1+r)^{n}-1}
\]

- \(P\) — principal in **integer cents**
- \(r\) — \(0.065 / 12\)
- \(n\) — 12 \| 24 \| 36
- \(M\) — monthly payment, `Math.round` to nearest cent

Contracts **snapshot** quoted options (+ rate) on create/update so historical rows stay stable if policy evolves.

---

## Design decisions

Trade-offs a tech lead is expected to own. Skim the table that matches the question you’re asking.

### Platform

| Decision            | Choice                                  | Why                                                       |
| ------------------- | --------------------------------------- | --------------------------------------------------------- |
| Validation coercion | Off by default                          | Money/identity fail closed; `@Type` only when intentional |
| Error contract      | One `ApiErrorResponse`                  | Same fields for clients and logs; no internal leaks       |
| Correlation         | `x-request-id` + access log on `finish` | Trace every response, including Nest 404s                 |
| Health              | Liveness only                           | Honest process facts; not fake readiness                  |
| Boot                | Shared `configureApp()`                 | Prod and e2e share the real HTTP surface                  |

### Identity

| Decision     | Choice                                  | Why                                     |
| ------------ | --------------------------------------- | --------------------------------------- |
| Login        | `AuthService` (not passport-local)      | One use-case; Passport reserved for JWT |
| Failed login | Same `401` / `Invalid credentials`      | No email-enumeration leak               |
| Tokens       | Access JWT only                         | Enough for a Bearer demo                |
| Passwords    | bcrypt (cost 10)                        | Never returned in responses             |
| DB           | Prisma + SQLite (Postgres-ready schema) | Fast clone → run                        |

### Pricing

| Decision          | Choice                          | Why                                                    |
| ----------------- | ------------------------------- | ------------------------------------------------------ |
| Interest          | Amortized @ 6.5%                | Matches the brief; golden-testable                     |
| Money             | Integer cents                   | Avoid float drift at the domain boundary               |
| Rounding          | `Math.round` on monthly payment | One explicit rule; totals = monthly × term             |
| Decimal lib       | Not used                        | Fixed rate + three terms; cents + golden tests suffice |
| Formula engine    | Strategy + Nest DI              | Swap engines without touching callers                  |
| Principal ceiling | `MAX_PRINCIPAL_CENTS` (1e9)     | Keeps option totals inside SQLite/Prisma Int           |

### Contracts

| Decision           | Choice                                     | Why                                               |
| ------------------ | ------------------------------------------ | ------------------------------------------------- |
| Ownership          | Owner-scoped; cross-user → `404`           | Don’t leak other users’ ids                       |
| Quotes             | Snapshot on write                          | Stable history if policy changes                  |
| List reads         | Cursor pagination (`limit` ≤ 100, def 20)  | Unbounded `findMany` is the first list bottleneck |
| Concurrent `PATCH` | Last-write-wins in a transaction           | Single-actor demo; coherent snapshot either way   |
| Concurrency test   | E2e race → both 200 + consistent final row | No corruption claim ≠ serializability             |
| Later upgrade      | Optimistic `version` / `updatedAt` → `409` | When multi-writer edits become real               |

---

## Scale & performance

Pricing math is not the bottleneck (three O(1) quotes, snapshotted on write). Pressure shows up in **I/O, auth, and abuse**.

| Pressure           | What we do now                                                         | Next if load grows                                |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------- |
| `GET /contracts`   | Cursor page + hard max page size                                       | Keep `userId` index; covering indexes if needed   |
| Auth / write abuse | Global 120/min; auth 10/min; contract writes 30/min; `/health` skipped | Redis-backed throttle across instances            |
| SQLite locally     | Fast assessor clone → run                                              | Swap `DATABASE_URL` to Postgres (schema portable) |
| JWT validation     | DB check user still exists                                             | Short TTL cache if auth QPS dominates             |
| bcrypt             | Cost 10 on register/login                                              | Keep; isolate auth tier only after measuring      |
| Concurrent edits   | LWW + coherent snapshot                                                | Optimistic concurrency → `409`                    |
| Observability      | Correlated access logs (no bodies)                                     | Metrics/alerts; sample logs under load            |

**Deliberately not yet:** Redis for quotes, microservices split, read replicas — cost exceeds signal until measured.

---

## Scope

| In scope                             | Out of scope (v1)               |
| ------------------------------------ | ------------------------------- |
| Register / login (JWT)               | Payment gateway                 |
| Owner-scoped contract CRUD           | Multi-tenant orgs / admin roles |
| Deterministic 12/24/36 @ 6.5%        | Mobile clients                  |
| Validation, errors, logging, OpenAPI | Distributed architecture        |
| Unit + e2e per feature               |                                 |

---

## Tooling & branches

| Concern     | Tool                                             |
| ----------- | ------------------------------------------------ |
| Runtime     | NestJS + TypeScript (Node 22+)                   |
| Persistence | Prisma + SQLite (local)                          |
| Auth        | bcrypt + JWT Bearer                              |
| Quality     | ESLint, Prettier, Husky, lint-staged, commitlint |
| Release     | semantic-release → GitHub Releases + CHANGELOG   |
| CI          | GitHub Actions on `main` / `develop`             |

| Branch    | Role                                   |
| --------- | -------------------------------------- |
| `main`    | Releasable; semantic-release runs here |
| `develop` | Integration; default PR target         |

See [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow details.

---

## Delivery (done)

1. Engineering template — hooks, CI, branches
2. Platform — config, validation, Swagger, errors, logging
3. Identity — register/login, bcrypt, JWT
4. Pricing — `RepaymentPolicy` + Strategy DI + golden tests
5. Contracts — CRUD + ownership + snapshots
6. Hardening — expired JWT, IDOR, ceiling, cascade, race smoke
7. Milestone release — **v1.1.0** on `main`
8. Scale posture — list pagination + rate limits; Postgres path documented
9. Stretch (optional) — thin UI, optimistic `409`, Redis throttle store

---

## Engineering notes

- Ship reviewable vertical slices; one concern per PR.
- Secrets stay out of git; rotate `JWT_SECRET` before shared environments.
- Unit tests own pricing/platform invariants; e2e owns auth and contract journeys.
- Decisions live in this README when the “why” matters more than the code.

## License

UNLICENSED — assessment / team submission.
