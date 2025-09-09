<!--
Rule: R-018
Title: Documentation Discipline (Rules, READMEs, and CLAUDE.md Maintenance)
Status: enabled
-->

# R-018 — Documentation Discipline (Rules, READMEs, and CLAUDE.md Maintenance)

Purpose & Scope

- Keep documentation synchronized with code and schema changes to ensure contributors and tools operate with the correct context.
- Maintain a single source of truth across directory-level `CLAUDE.md` files, README, and toggleable rule files under `.cline/rules/`.

Do

- Update relevant docs whenever behavior, contracts, or architecture change:
  - Root `CLAUDE.md`: high-level architecture (multi-tenant isolation, security model, modes).
  - `app/CLAUDE.md`: routing structure, page/component patterns, loading and error boundaries.
  - `app/api/CLAUDE.md`: API categories, auth modes, rate limits, request/response patterns.
  - `components/CLAUDE.md`: component patterns, tenant context validation, UI conventions.
  - `lib/CLAUDE.md`: utilities, validation, security, parsing/transform helpers.
  - `scripts/CLAUDE.md`: schema/migration order, RLS, indexes, constraints.
  - `README.md`: environment setup, Docker/Dev flows, deployment and integration guide.
  - `.cline/rules/*`: create or amend a dedicated rule file for any new unique policy or convention.
- Keep rule groups unique and toggleable:
  - Avoid duplicating guidance across rule files; link to the relevant rule (e.g., reference R-001 for tenant isolation).
- Include references and examples:
  - Each new API/migration/component pattern must include a short code example and PR checklist items.
- Document migration changes:
  - Add the new SQL file with a sequential number, explain purpose, dependencies, and rollback notes in comments and in `scripts/CLAUDE.md`.
- Record API surface changes:
  - For new endpoints: category (internal/public/upload), auth mode, headers, status codes, and example requests/responses in `app/api/CLAUDE.md`.
- Keep testing notes in sync:
  - If behavior changes (auth, limits, isolation), add or update checklists/examples in R-015 and point to new/updated tests.

Don’t

- Merge changes that alter contracts (auth headers, response shapes, rate limits) without updating the corresponding docs.
- Duplicate the same rule content in multiple files; instead, reference the canonical rule file.
- Leave placeholder documentation or TODOs in production branches.

Required Patterns

1. When adding an API endpoint

```md
## New Endpoint: /api/internal/widgets

- Category: Internal
- Auth: JWT (Authorization: Bearer <token>), X-Tenant-ID required
- Purpose: CRUD operations for widgets
- Status Codes: 200/201/400/401/403/404/429/500
- Example:
  GET /api/internal/widgets?tenantId=<uuid>
  Response: { "data": [ ... ] }
```

2. When adding a migration

```sql
-- 013_add_widgets_table.sql
-- Purpose: Add widgets table (tenant-scoped)
-- Depends on: 001 tenants, 003 dashboards
-- Rollback: DROP TABLE widgets;
```

And update `scripts/CLAUDE.md` with:

```md
013_add_widgets_table.sql — Adds widgets (tenant-scoped). Indexes on tenant_id, FK cascade.
```

3. When adding a new rule

```md
# .cline/rules/21-widgets.md

- Purpose, Do/Don’t, Required Patterns, PR Checklist, References
- Reference tenant isolation (R-001) rather than restating it.
```

4. PR template snippet (concept)

```md
- [ ] Updated related docs: README.md / CLAUDE.md / .cline/rules/\*
- [ ] Added examples and status codes for APIs
- [ ] Updated migration order and notes (if applicable)
- [ ] Adjusted tests and testing checklists in R-015 as needed
```

PR Checklist

- [ ] All behavior-affecting changes update the relevant `CLAUDE.md` and/or `.cline/rules/*`.
- [ ] New APIs include category, auth, headers, examples, and error codes in `app/api/CLAUDE.md`.
- [ ] New migrations documented in `scripts/CLAUDE.md` with order, dependencies, and rollback notes.
- [ ] README updated if environment, Docker, or integration flows changed.
- [ ] Rule files remain unique and cross-reference instead of duplicating content.
- [ ] Testing (R-015) notes/checklists are aligned with the new/changed behavior.

References

- Root: `CLAUDE.md` — “This documentation is shared across the team. Update it when adding new patterns or changing core architecture.”
- `app/CLAUDE.md`, `app/api/CLAUDE.md`, `components/CLAUDE.md`, `lib/CLAUDE.md`, `scripts/CLAUDE.md` — directory-level authoritative docs.
- README.md — Quick start, environment, integration, deployment.
