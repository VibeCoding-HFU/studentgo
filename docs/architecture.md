# StudentGo Modular Architecture

StudentGo uses a feature-first structure. Shared technical helpers live in `src/shared`, while domain-specific code should move into `src/features`.

## Frontend

- `app/` stays responsible for Expo Router routes.
- `src/shared/api` contains backend request helpers and common error handling.
- `src/shared/types` contains cross-feature types such as roles.
- `src/shared/utils` contains reusable pure helpers such as date and time options.
- Future feature modules should use this shape:

```txt
src/features/<feature>/
  api.ts
  types.ts
  components/
  hooks.ts
```

Good feature boundaries for this app are:

- `auth`
- `schedule`
- `meals`
- `contacts`
- `deadlines`
- `manager`
- `admin`
- `sync`
- `crypto`

Keep route files in `app/(tabs)` thin over time by rendering feature screen components from `src/features`.

## Backend

- `backend/src/server.ts` only starts and stops the HTTP server.
- `backend/src/app.ts` owns the Express app and route registration.
- `backend/src/modules/auth` contains authentication/account routes plus password, session, role, and pending-account services.
- `backend/src/modules/account` contains account-specific authenticated views such as statistics.
- `backend/src/modules/admin` contains admin user management and manager/admin change-request workflows.
- `backend/src/modules/contacts`, `meals`, `deadlines`, `todos`, and `study-info` contain compact resource modules.
- `backend/src/modules/schedule` contains schedule routes, schedule helpers, and StarPlan/SWFR import services.
- `backend/src/shared` contains backend-only reusable utilities, for example date/time helpers used by schedule and meal import logic.
- `UserPublicKey` is the canonical storage for account public keys. `User.publicKeyJson` remains ignored in Prisma as a legacy database column for migration compatibility.
- `MealPlan.source` and `Lesson.source` use the `DataSource` enum instead of free-form strings.
- The Prisma model for study modules is named `StudyModule` and maps to the existing `Module` table.

## Backend Patterns

Use the following patterns for new backend work and for refactoring existing modules:

- Router - Service - Repository: routes handle HTTP, services handle business workflows, repositories own Prisma access.
- Command handlers / use cases: complex actions live in `use-cases`, for example approving or rejecting change requests.
- DTO validators: parse and validate request params/bodies before calling services.
- Policies: keep authorization decisions in explicit policy functions instead of scattering role checks through routes.
- Mappers: keep API response shapes in mapper functions instead of building ad hoc response objects in routes.
- Domain events: emit internal events for business milestones such as account invites and change-request reviews.
- External adapters: isolate third-party API and HTML parsing in `backend/src/integrations`.

Current examples:

- `backend/src/modules/admin/admin.routes.ts`
- `backend/src/modules/admin/admin.service.ts`
- `backend/src/modules/admin/admin.repository.ts`
- `backend/src/modules/admin/admin.schemas.ts`
- `backend/src/modules/admin/admin.mapper.ts`
- `backend/src/modules/admin/use-cases`
- `backend/src/modules/auth/auth.policies.ts`
- `backend/src/shared/events/domain-events.ts`
- `backend/src/integrations/starplan`
- `backend/src/integrations/swfr`
- Future backend modules should move route handlers and business logic into:

```txt
backend/src/modules/<module>/
  <module>.routes.ts
  <module>.service.ts
  <module>.repository.ts
  <module>.types.ts
```

Good backend module boundaries are:

- `auth`
- `users`
- `admin`
- `change-requests`
- `contacts`
- `meals`
- `deadlines`
- `todos`
- `study-info`
- `schedule`

Prefer services for Prisma/business logic and routes for HTTP-only concerns.
