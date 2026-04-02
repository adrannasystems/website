# E2E Testing

> **⚠️ Work in progress — requires more in-depth interviewing before this approach is finalized.**
>
> The decisions below represent a direction based on initial discussion, not a finalized spec.
> Several open questions (listed at the bottom) must be resolved before any implementation begins.
> When picking up the E2E task, start by reviewing those open questions with the user.

---

## Goal

Catch regressions in user-visible flows that unit tests cannot cover: UI rendering, auth
enforcement, multi-user interactions, and end-to-end data flow from button click to DB and back.

---

## Priority flows (agreed)

1. **Task CRUD** — create, edit, archive, restore
2. **Execute task** — mark done, verify state change in UI
3. **Sharing & permissions** — shared tasks visible to other users; private tasks hidden;
   non-owners cannot modify shared tasks

Notifications toggle is lower priority.

---

## Tooling direction (preliminary)

| Concern | Direction | Status |
|---------|-----------|--------|
| Test runner | Playwright (`@playwright/test`) | Agreed |
| Auth | `@clerk/testing` with testing tokens | Direction set, details TBD |
| Backend | Dedicated Convex test deployment | Direction set, details TBD |
| Viewport | 375×812 primary (mobile-first), 1280×800 secondary | Agreed |

---

## Rough file structure

```
e2e/
  fixtures/
    auth.ts          ← Clerk session setup helpers
    tasks.ts         ← task seed/teardown helpers
  task-crud.spec.ts
  task-execute.spec.ts
  task-sharing.spec.ts   ← requires two authenticated sessions

playwright.config.ts
```

---

## Open questions (must resolve before implementing)

### 1. Clerk auth strategy

Two options were surfaced:
- **UI login**: Playwright drives the Clerk sign-in page. Most realistic but fragile (UI changes break tests, slow).
- **Clerk testing tokens** (`@clerk/testing/playwright`, `setupClerkTestingToken`): injects a JWT directly, bypasses UI login. Faster and more stable.

Decision needed: which approach, and what test user accounts to create in Clerk.

### 2. Backend: which Convex deployment?

- **Shared dev deployment**: easy, but test runs pollute dev data and tests can interfere with each other.
- **Dedicated test deployment** (`taskologist-test` or similar): clean, isolated, requires managing a second deployment + env vars.
- **Convex local backend** (`npx convex dev --local`): fully isolated per run, but requires Convex local mode support and adds startup time.

Decision needed: which deployment to target, and how `CONVEX_URL` is configured for test runs.

### 3. Test isolation and data seeding

- Do tests seed their own data and tear it down after?
- Or does each spec assume a fresh deployment with no prior data?
- How are `taskId` values obtained in tests (from UI scraping vs from a seed mutation)?

Decision needed: seeding strategy and whether tests are order-independent.

### 4. Two-user sharing tests

`task-sharing.spec.ts` requires two users with active sessions simultaneously. Options:
- Two separate `storageState` files (one per test user), run in separate browser contexts
- Playwright's multi-context support within a single test

Decision needed: confirmed approach for multi-user tests.

### 5. CI integration

- Should E2E tests run on every PR, or only on demand?
- Does CI need access to Clerk secrets and Convex deployment URL?
- What's the acceptable test suite runtime?

Decision needed before writing the CI config.
