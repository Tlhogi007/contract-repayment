# Contract Repayment API

Secure NestJS microservice for **device contract repayment calculations**.

Authenticate, submit a device principal, and receive comparable **12 / 24 / 36-month** offerings at **6.5%** interest.

Built as a **team-ready service template**: conventional commits, Husky gates, CI on every PR, and semantic-release from `main`.

## Current status

**Engineering foundation** — NestJS scaffold + delivery standards (hooks, CI, branch model, contributing guide).

Domain work (auth, repayment policy, contracts CRUD) lands as small PRs into `develop`, each with unit and e2e coverage.

## Branch model

| Branch    | Role                                             |
| --------- | ------------------------------------------------ |
| `main`    | Stable / releasable. Semantic-release runs here. |
| `develop` | Integration. Default PR target for features.     |

See [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow, commit rules, and PR expectations.

## Tooling

| Concern       | Tool                                            |
| ------------- | ----------------------------------------------- |
| Framework     | NestJS + TypeScript (Node 20+)                  |
| Lint / format | ESLint + Prettier                               |
| Git hooks     | Husky (`pre-commit`, `commit-msg`, `pre-push`)  |
| Staged checks | lint-staged                                     |
| Commit style  | commitlint + Conventional Commits               |
| Versioning    | semantic-release (GitHub Releases + CHANGELOG)  |
| CI            | GitHub Actions — lint, format, unit, e2e, build |

```bash
npm run validate   # typecheck + lint + format + unit/e2e + build
```

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

## Interest policy (planned)

Amortized (reducing-balance) monthly payment:

\[
M = P \frac{r(1+r)^{n}}{(1+r)^{n}-1}
\]

- \(P\) — principal (device amount)
- \(r\) — \(0.065 / 12\)
- \(n\) — 12 \| 24 \| 36

Money is handled in **integer cents** at the domain boundary. Option snapshots are persisted on write so historical quotes stay stable if policy evolves.

## Prerequisites

- Node.js **20+** (`.nvmrc` → 22)
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
npm run validate
```

## Planned API surface

| Method   | Path             | Auth | Purpose                        |
| -------- | ---------------- | ---- | ------------------------------ |
| `POST`   | `/auth/register` | —    | Create account                 |
| `POST`   | `/auth/login`    | —    | Issue JWT                      |
| `POST`   | `/contracts`     | JWT  | Create contract + term options |
| `GET`    | `/contracts`     | JWT  | List own contracts             |
| `GET`    | `/contracts/:id` | JWT  | Get one (ownership enforced)   |
| `PATCH`  | `/contracts/:id` | JWT  | Update amount → recalc         |
| `DELETE` | `/contracts/:id` | JWT  | Delete                         |
| `GET`    | `/health`        | —    | Liveness                       |
| `GET`    | `/api/docs`      | —    | Swagger UI _(upcoming)_        |

## Delivery plan

1. **Engineering template** — hooks, CI, branches, docs _(this)_
2. **Platform** — config, validation, Swagger, errors, logging
3. **Identity** — register/login, bcrypt, JWT guard
4. **Pricing** — pure `RepaymentPolicy` + golden unit tests
5. **Contracts** — CRUD + ownership + option snapshots
6. **Hardening** — negative paths, IDOR checks
7. **Narrative** — README as design/runbook for assessors
8. **Stretch** — rate limits, thin UI (only if core is solid)

## Engineering notes

- **Scope discipline:** ship reviewable vertical slices; one concern per PR.
- **Authz:** every contract read/mutation is owner-scoped; cross-user access returns 404.
- **Secrets:** never commit `.env`; rotate `JWT_SECRET` before shared environments.
- **Test strategy:** unit tests own pricing correctness; e2e tests own auth and contract journeys.

## License

UNLICENSED — assessment / team submission.
