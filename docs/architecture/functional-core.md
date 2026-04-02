# Functional Core, Imperative Shell

## Why this pattern

Taskologist uses Convex as its backend. Convex mutation and query handlers are the natural place
to write business logic — but doing so makes that logic untestable without a running Convex
deployment, and couples it to a specific backend technology.

The **functional core, imperative shell** pattern separates these concerns:

- **Functional core** (`domain/`): pure TypeScript functions and classes. No `ctx`, no `db`, no
  `await`. Takes plain values in, returns plain values out. Independently testable with plain vitest.
- **Imperative shell** (`convex/`): Convex handlers that fetch data, call domain functions, and
  persist/dispatch whatever the domain decided to do.

The domain does not know Convex exists. If you replaced Convex with a Node/Postgres backend
tomorrow, `domain/` would be untouched.

---

## Folder structure

```
domain/                        ← pure TS, zero framework deps
  models/
    MaintenanceTask.ts         ← DB→domain mapping layer (class with computed getters)
    types.ts                   ← shared types (MaintenanceTaskState, etc.)
  operations/
    executeTask.ts             ← domain operation (one file per command)
    createTask.ts
    updateTask.ts
    archiveTask.ts
    setTaskShared.ts
    deleteExecution.ts
    setTaskNotificationsEnabled.ts
  queries/
    sortTasksByPosition.ts     ← pure sort/filter helpers

convex/                        ← imports from ../domain/
  MaintenanceTaskModel.ts      ← re-export shim (backward compat, remove when all migrated)
  maintenanceTasks.ts          ← Convex handlers (thin shells)

src/                           ← React frontend; may import domain/models/ and domain/types
                                  by convention (never domain/operations/)
```

**Ownership rule**: `domain/` has zero imports from `convex/` or `src/`. The dependency arrow
points one way: `convex/` → `domain/` ← `src/` (models/types only).

---

## The DB→domain mapping layer

`domain/models/MaintenanceTask.ts` (moved from `convex/MaintenanceTaskModel.ts`) is a class
that wraps a raw DB document and exposes clean, named getters:

```ts
// domain/models/MaintenanceTask.ts
export class MaintenanceTaskModelImpl implements MaintenanceTaskModel {
  constructor(private readonly data: { /* raw DB fields */ }) {}

  get isArchived(): boolean { return this.data.deletedAt !== null; }
  get isShared(): boolean { return this.data.shared === true; }
  get notificationsEnabled(): boolean { return this.data.notificationsEnabled !== false; }
  get state(): MaintenanceTaskState { /* computed */ }
  // ...
}
```

Domain operations receive a `MaintenanceTaskModel`, never a raw DB document. This:
- Keeps DB field names (`deletedAt`, `shared`) out of domain logic
- Lets the class encapsulate migration defaults (e.g. `notificationsEnabled !== false`)
- Caches derived values naturally (one instantiation per request)

Shell code maps the raw DB doc to the model before calling any domain function:

```ts
const raw = await ctx.db.get(taskId);
if (!raw) throw new ConvexError("not_found");
const task = new MaintenanceTaskModelImpl(raw); // ← mapping happens here
const result = executeTask(task, userId, args.executedAt);
```

---

## Domain operation shape

### Sync operations (no async data needed)

Most operations receive all necessary data pre-fetched by the shell. They are pure synchronous
functions that return a `Result` from `neverthrow`.

```ts
// domain/operations/executeTask.ts
import { ok, err, Result } from "neverthrow";
import type { MaintenanceTaskModel } from "../models/MaintenanceTask";

type ExecuteEffect = { type: "notify_execution"; taskId: string };
type ExecuteError = "not_found" | "unauthorized" | "archived";

export function executeTask(
  task: MaintenanceTaskModel,
  actorId: string,
  executedAt: number,
): Result<{ executedAt: number; updateLastExecutedAt: boolean; effects: ExecuteEffect[] }, ExecuteError> {
  if (task.isArchived) return err("archived");
  if (task.userId !== actorId && !task.isShared) return err("unauthorized");
  const updateLastExecutedAt =
    task.lastExecutedAt === null || executedAt > task.lastExecutedAt;
  return ok({
    executedAt,
    updateLastExecutedAt,
    effects: [], // no notification triggered at execution time; handled by cron
  });
}
```

### Async operations (need to fetch data mid-logic)

When domain logic needs data it can't receive upfront (because the shell would have to know
too much about internal branching), inject an async fetcher as a parameter. The domain
stays free of Convex imports; the shell provides the implementation.

```ts
// domain/operations/setTaskShared.ts
import { ok, err, ResultAsync, errAsync, okAsync } from "neverthrow";
import type { MaintenanceTaskModel } from "../models/MaintenanceTask";

const MAX_SHARED_TASKS = 10;
type SetSharedError = "unauthorized" | "limit_exceeded";

export function setTaskShared(
  task: MaintenanceTaskModel,
  actorId: string,
  shared: boolean,
  getOwnerSharedCount: () => Promise<number>, // injected by shell
): ResultAsync<void, SetSharedError> {
  if (task.userId !== actorId) return errAsync("unauthorized");
  if (!shared) return okAsync(undefined); // unsharing is always allowed

  return ResultAsync.fromPromise(getOwnerSharedCount(), () => "limit_exceeded" as const)
    .andThen((count) =>
      count >= MAX_SHARED_TASKS ? err("limit_exceeded") : ok(undefined)
    );
}
```

---

## Effects: how domain operations trigger side effects

Domain operations **never** call `ctx.scheduler`, send notifications, or perform any I/O.
Instead, they return an `effects` array describing what *should* happen. The shell dispatches
each effect after persisting the core result.

```ts
// Shell reads and dispatches effects
const result = executeTask(task, userId, executedAt);
if (result.isErr()) throw new ConvexError(result.error);

const { updateLastExecutedAt, effects } = result.value;
await ctx.db.insert("maintenanceExecutions", { taskId, executedAt });
if (updateLastExecutedAt) {
  await ctx.db.patch(taskId, { lastExecutedAt: executedAt });
}
for (const effect of effects) {
  switch (effect.type) {
    case "notify_execution":
      await ctx.scheduler.runAfter(0, internal.notifications.notifyExecution, { taskId });
      break;
  }
}
```

This keeps all business rules ("when should a notification fire?") in the testable domain.

---

## Error convention

Errors are **string literal unions**. No error classes, no numeric codes.

```ts
type ExecuteError = "not_found" | "unauthorized" | "archived";
```

The shell maps domain errors to Convex errors at the boundary:

```ts
if (result.isErr()) {
  switch (result.error) {
    case "not_found":
    case "archived":
      throw new ConvexError({ code: "not_found" });
    case "unauthorized":
      throw new ConvexError({ code: "unauthorized" });
  }
}
```

TypeScript exhaustiveness checking ensures all errors are handled.

---

## Shell pattern: complete example

Full migrated `addExecution` handler as a reference:

```ts
// convex/maintenanceTasks.ts
import { executeTask } from "../domain/operations/executeTask";
import { MaintenanceTaskModelImpl } from "../domain/models/MaintenanceTask";

export const addExecution = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    executedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await authedUserIdOrThrow(ctx);

    // 1. Fetch raw data
    const raw = await ctx.db.get(args.taskId);
    if (raw === null) throw new ConvexError("not_found");

    // 2. Map to domain model
    const task = new MaintenanceTaskModelImpl(raw);

    // 3. Call domain function (pure, no I/O)
    const result = executeTask(task, userId, args.executedAt);

    // 4. Map domain error to Convex error
    if (result.isErr()) {
      switch (result.error) {
        case "not_found":
        case "archived":
          throw new ConvexError("not_found");
        case "unauthorized":
          throw createUnauthorizedError();
      }
    }

    // 5. Persist and dispatch effects
    const { executedAt, updateLastExecutedAt, effects } = result.value;
    await ctx.db.insert("maintenanceExecutions", { taskId: args.taskId, executedAt });
    if (updateLastExecutedAt) {
      await ctx.db.patch(args.taskId, { lastExecutedAt: executedAt });
    }
    for (const effect of effects) {
      // dispatch scheduled functions based on effect.type
    }
  },
});
```

---

## Testing: plain vitest, no convex-test

Domain functions are pure TypeScript. Test them with plain vitest — no running server, no
mocks, no `convex-test` library needed.

```ts
// domain/operations/executeTask.test.ts
import { describe, it, expect } from "vitest";
import { executeTask } from "./executeTask";
import type { MaintenanceTaskModel } from "../models/MaintenanceTask";

// Minimal stub — no Convex deps whatsoever
function makeTask(overrides: Partial<MaintenanceTaskModel> = {}): MaintenanceTaskModel {
  return {
    id: "task1" as Id<"maintenanceTasks">,
    userId: "user1",
    name: "Oil change",
    periodHours: 720,
    lastExecutedAt: null,
    isArchived: false,
    archivedAt: null,
    isShared: false,
    notificationsEnabled: true,
    state: "Never Done",
    periodsDue: Infinity,
    ...overrides,
  };
}

describe("executeTask", () => {
  it("returns archived error when task is archived", () => {
    const result = executeTask(makeTask({ isArchived: true }), "user1", Date.now());
    expect(result._unsafeUnwrapErr()).toBe("archived");
  });

  it("returns unauthorized when non-owner tries to execute a private task", () => {
    const result = executeTask(makeTask({ isShared: false }), "other", Date.now());
    expect(result._unsafeUnwrapErr()).toBe("unauthorized");
  });

  it("allows non-owner to execute a shared task", () => {
    const result = executeTask(makeTask({ isShared: true }), "other", Date.now());
    expect(result.isOk()).toBe(true);
  });

  it("sets updateLastExecutedAt=true when task has no prior execution", () => {
    const result = executeTask(makeTask({ lastExecutedAt: null }), "user1", 1000);
    expect(result._unsafeUnwrap().updateLastExecutedAt).toBe(true);
  });

  it("sets updateLastExecutedAt=false when executedAt is older than current", () => {
    const result = executeTask(makeTask({ lastExecutedAt: 2000 }), "user1", 1000);
    expect(result._unsafeUnwrap().updateLastExecutedAt).toBe(false);
  });
});
```

Run with: `npm run test:unit`

---

## Migration strategy: strangler fig

Migrate **one handler per session**. Never leave a handler half-migrated. The codebase will
temporarily contain a mix of old-style and new-style handlers — that is fine and expected.

**Per-handler checklist:**
1. Create `domain/operations/<operation>.ts` with the domain function
2. Write `domain/operations/<operation>.test.ts` with unit tests covering all Result branches
3. Update the Convex handler to use the domain function (fetch → map → call → dispatch)
4. Run `npm run test:unit` — all tests pass
5. Run `npm run precommit` — no type/lint failures
6. Manual smoke test: exercise the handler in the running app

**Suggested migration order** (simplest first):
1. `addExecution` — sync, no effects, clear permission rule
2. `archiveTask` / `unarchiveTask` — sync, owner-only
3. `createTask` — sync, input validation
4. `updateTask` — sync, shared ownership logic
5. `setTaskNotificationsEnabled` — sync, owner-only
6. `deleteExecution` — sync, owner-only via linked task
7. `setTaskShared` — async (needs shared count fetcher)

---

## tsconfig setup

`convex/tsconfig.json` must include `../domain` so imports from `convex/` into `domain/` resolve:

```json
{
  "extends": "../node_modules/convex/package.json#convex/tsconfig",
  "include": ["../domain/**/*", "./**/*"]
}
```

Root `tsconfig.json` must include `domain` in its `include` array.

---

## One-time scaffold (run before first handler migration)

```sh
git pull origin main
npm install neverthrow
npm install -D vitest
# create domain/ folder structure
# move convex/MaintenanceTaskModel.ts → domain/models/MaintenanceTask.ts
# leave convex/MaintenanceTaskModel.ts as re-export shim
# update tsconfig files
# add test:unit script to package.json
```

`vitest.config.ts` at project root:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["domain/**/*.test.ts"],
  },
});
```

`package.json` scripts to add:
```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```
