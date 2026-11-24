# Contributing

This repository is set up like a shared team service: protected quality gates locally and in CI, conventional commits, and predictable releases.

## Branch model

| Branch                        | Purpose                                             |
| ----------------------------- | --------------------------------------------------- |
| `main`                        | Production-ready. Semantic-release runs here.       |
| `develop`                     | Integration branch. Default target for feature PRs. |
| `feature/*`                   | New capability (from `develop`)                     |
| `fix/*`                       | Bug fix (from `develop`, or `main` for hotfixes)    |
| `chore/*` / `ci/*` / `docs/*` | Tooling and docs                                    |

```
feature/foo ──PR──► develop ──PR──► main ──► GitHub Release + CHANGELOG
```

Never commit directly to `main` or `develop` in day-to-day work. Open a PR.

## Local setup

```bash
# Use Node 22+ (any install method: official installer, Homebrew, nvm, etc.)
node -v
npm install      # installs deps + husky hooks via prepare
cp .env.example .env
npm run start:dev
```

If you use a Node version manager, `.nvmrc` pins `22` for convenience. It is not required.

## Quality gates

### Local (Husky)

| Hook         | Runs                                            |
| ------------ | ----------------------------------------------- |
| `pre-commit` | lint-staged (ESLint + Prettier on staged files) |
| `commit-msg` | commitlint (conventional commits)               |
| `pre-push`   | typecheck + unit tests                          |

### Before you open a PR

```bash
npm run validate
```

That runs typecheck, lint, format check, unit + e2e tests, and build.

Unit coverage must stay at **≥ 90%** statements/branches/functions/lines (`jest` `coverageThreshold`). Nest bootstrap/module wiring is excluded from that unit gate and is covered by e2e.

### CI (GitHub Actions)

Every push/PR to `main` or `develop` runs lint, format, unit (coverage gate), e2e, and build on Node 22.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). They drive semantic-release.

```
<type>(optional-scope): <summary>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Examples:**

```
feat(contracts): calculate 12/24/36 month repayment options
fix(auth): reject expired JWT with 401
test(repayment): add golden vectors for amortized formula
ci: run e2e on pull requests
chore(release): 1.2.0 [skip ci]
```

**Version bumps (on `main`):**

| Commit                        | Release |
| ----------------------------- | ------- |
| `fix:`                        | patch   |
| `feat:`                       | minor   |
| `BREAKING CHANGE:` / `feat!:` | major   |

## Pull requests

1. Branch from `develop` (hotfix from `main` only when needed).
2. Keep PRs small — one concern, with unit and e2e coverage for that concern.
3. Fill in the PR template.
4. Target `develop` unless it is a release PR (`develop` → `main`) or a production hotfix.
5. Squash-merge is preferred so history stays conventional.

## Releases

Pushing to `main` triggers `.github/workflows/release.yml`:

- Analyzes conventional commits since the last release
- Updates `CHANGELOG.md` and `package.json` version
- Creates a GitHub Release

App packages are **not** published to npm (`npmPublish: false`).

## Suggested GitHub settings (maintainers)

After the remote exists, configure:

- Default branch: `develop` for day-to-day PRs (or keep `main` and require PRs into both)
- Branch protection on `main` and `develop`:
  - Require PR
  - Require CI status checks
  - No force push
- Allow GitHub Actions `contents: write` for semantic-release (workflow already requests it)

## Code standards

- TypeScript strict NestJS modules; keep controllers thin
- Domain rules (e.g. repayment math) stay pure and unit-tested
- Money in integer cents at the domain boundary
- No secrets in git; use `.env.example` as the contract for config
- Public API changes update Swagger/OpenAPI and README examples
