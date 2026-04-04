# Tasks

Tasks for the agent loop. Use `/next-task` to process all pending tasks.

## Status legend

- `[ ]` — pending
- `[~]` — in progress
- `[x]` — done

## Queue

- [ ] [arch] Adopt functional-core architecture: migrate all Convex handlers to functional-core / imperative-shell pattern. See `docs/architecture/functional-core.md` for the full target picture, code patterns, and per-handler checklist. Use strangler fig: migrate one handler per session, starting with `addExecution`. Run `npm run precommit` and `npm run test:unit` after each handler. Includes one-time scaffold (install neverthrow + vitest, create domain/ folder, move MaintenanceTaskModel, update tsconfigs).
- [ ] update `docs/architecture/functional-core.md` with the handler patterns we settled on: `UserId` and `MsSinceEpoch` type aliases, `if/else if/else` control flow in domain operations, and `test:unit` added to `precommit`.
- [ ] [arch/e2e] Set up Playwright E2E test suite. See `docs/architecture/e2e-testing.md` — NOTE: open questions in that doc must be resolved via user interview before any implementation begins. Start by reviewing the open questions with the user.
- [x] allow user to change maintenance task order (custom ordering) instead of sorting only by dueness / name
- [x] add mcp or similar for feedback loop so agents can open a browser and check visual changes to the app. in particular, when they create html/css I want them to check the result and make sure that it is "mobile first"
- [ ] add billing. see @docs/tasks/billing-setup.md
- [ ] allow shared tasks (multiple users can collaborate on the same maintenance tasks)
- [ ] add multilanguage support, consider using [General Translation](https://soydev.link/gt)
- [x] fix task query data leak: `listTasksForMaintenanceOverview` and `listArchivedTasksForMaintenanceOverview` must filter by current user `userId` so authenticated users only see their own tasks
- [x] fix task mutation authorization: `updateTask`, `archiveTask`, and `unarchiveTask` must verify `task.userId === identity.subject` before allowing any modification
- [x] fix execution mutation authorization: `addExecution` must verify `task.userId === identity.subject` before creating execution records
- [x] fix execution deletion authorization: `deleteExecution` must verify the linked task belongs to `identity.subject` before deleting execution records
- [x] fix execution query authorization: `findTaskExecutions` must verify the task belongs to `identity.subject` before returning execution history
