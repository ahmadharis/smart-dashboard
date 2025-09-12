<!--
Rule: R-017
Title: Deployment, Environments, and Secret Management
Status: enabled
-->

# R-017 — Deployment, Environments, and Secret Management

Purpose & Scope

- Ensure secure, reproducible deployments across local/dev/staging/production.
- Centralize environment configuration and secret handling, and enforce production hardening steps (RLS, CORS, auth).

Do

- Manage environment variables via `.env.local` (local) and platform secret stores (CI/CD, Docker, Vercel, etc.).
  - Required Supabase vars:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to client)
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
  - Common app vars:
    - `NODE_ENV`, `NEXT_TELEMETRY_DISABLED`, `PORT`
- Keep secrets out of source control:
  - Never commit `.env*` with real keys; provide `*.example` templates only.
  - Use CI/CD secret stores, Vercel/Cloud secrets managers, or Docker env files injected at runtime.
- Enforce production database security:
  - Run RLS policies (`scripts/012_enable_row_level_security.sql`) before go-live.
  - Verify policies exist post-migration and that tenant tables are protected.
- Configure CORS allowlist for deployed domains (no wildcards in production).
- Use Docker-based workflows for consistent builds:
  - Dev: `npm run docker:dev`, logs, down, rebuild.
  - Prod: `npm run docker:prod:build` and `npm run docker:prod`, or compose `docker-compose.prod.yml`.
- Validate upload and public flows in production-like environments:
  - `/api/upload-xml` size/rate limits and headers.
  - `/shared/[token]` and `/api/public/shared/{token}` read-only security.

Don’t

- Expose `SUPABASE_SERVICE_ROLE_KEY` to the client; never reference it in browser code.
- Deploy without running RLS migrations in production.
- Leave CORS open to `*` or reflect untrusted origins.
- Log secrets, API keys, or JWTs in any environment.

Required Patterns

1. Environment templates and usage

```bash
# .env.local (template)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
PORT=3000
```

```ts
// Server-side usage only (service role)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // never expose to client
```

2. Docker workflows

```bash
# Development
npm run docker:dev
npm run docker:dev:logs
npm run docker:dev:down
npm run docker:rebuild

# Production
npm run docker:prod:build
npm run docker:prod
# or
docker compose -f docker-compose.prod.yml up -d
```

3. CI/CD secret injection (concept)

```yaml
# Example (pseudo)
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

4. RLS enforcement before production

```sql
-- Ensure RLS policies exist in production DB
SELECT tablename, policyname FROM pg_policies;
```

5. Safe public/anon vs service-role boundaries

```ts
// Client: only anon key via NEXT_PUBLIC_SUPABASE_ANON_KEY
// Server/API: service role, but always validate tenant and filter by tenant_id
```

PR Checklist

- [ ] `.env*` files with real secrets are not committed; templates provided.
- [ ] All required Supabase and app variables are configured per environment.
- [ ] RLS migration (012) executed and verified before production.
- [ ] CORS allowlist configured for deployed domains; no wildcards.
- [ ] Service role key used only server-side; never leaked to client logs or code.
- [ ] Docker/Vercel/CI workflows documented and reproducible.

References

- README.md — Environment variables, Docker commands, Deployment options, RLS notice.
- Scripts: `scripts/CLAUDE.md` — RLS enablement and hybrid security rationale.
- Root: `CLAUDE.md` — Security Model (auth, CORS, rate limits), Environment setup.
