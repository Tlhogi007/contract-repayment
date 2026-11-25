# Web UI

Vite + React client for the repayment API.

## Local

```bash
npm install --prefix web
npm run web:dev   # from repo root → http://localhost:5173
```

The Vite dev server proxies `/auth`, `/contracts`, `/health`, `/metrics`, and `/api` to the Nest API on `:3000`.

## Production build

Set `VITE_API_BASE_URL` to the Nest origin (see [`.env.example`](./.env.example)). Leave it unset for local proxy-based development.
