Railway deployment steps (manual)

1. Install Railway CLI and login: `railway login`
2. Create a new project: `railway init` or `railway link`.
3. Add environment variables: `JWT_SECRET`, `DATABASE_URL` (Postgres), any storage credentials.
4. Build and deploy with Docker or via Railway's Node deploy (Railway will use `npm run start`).

Notes:
- This repo includes a `Dockerfile` suitable for Railway.
- The `railway.json` is a template. Set `DATABASE_URL` and `JWT_SECRET` in Railway environment.
