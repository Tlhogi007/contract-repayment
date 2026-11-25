# Web UI

Vite + React client for the repayment API.

## Local

```bash
npm install --prefix web
npm run web:dev   # from repo root → http://localhost:5173
```

The Vite dev server proxies `/auth`, `/contracts`, `/health`, `/metrics`, and `/api` to the Nest API on `:3000`.
