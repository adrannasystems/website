---
name: conform
description: Applies the project's readability and style guidelines to all files changed on the current branch (diff vs latest main). Triggers on /conform.
user-invocable: true
---

# Conform Changed Code

Apply the project's readability and style guidelines to every file touched in the current branch.

## When to run

Run this skill:

- Before opening a PR
- After making any changes to a PR branch

## Workflow

1. Fetch and pull the latest `main`:
   ```bash
   git fetch origin main && git merge-base HEAD origin/main
   ```
2. Find every file changed relative to `origin/main`:
   ```bash
   git diff --name-only origin/main...HEAD
   ```
3. For each changed file, read the full file (not just the diff) and apply the guidelines below.
4. Edit files in place. Do not change logic — only style, structure, and naming.
5. Run `npm run precommit`. Fix every reported error — do not skip or suppress. Repeat until it passes.
6. Summarise what was changed, file by file.

## Readability & Style Guidelines

Apply every rule below to the changed files. When a rule conflicts with preserving behaviour, skip the mechanical change and note the conflict in your summary.

### Control flow

- Make control flow visually explicit with `if (...) { ... } else if (...) { ... } else { ... }` when handling decision branches. Do **not** stack early returns as a substitute for explicit branches.
- For simple two-way branches that are short and concise (not long blocks), prefer a ternary return: `return <condition> ? <a> : <b>`.
- Avoid complex inline conditionals; use named variables for clarity.

### Naming

- Use descriptive names; avoid abbreviations unless they are standard in the domain.

### Functions & helpers

- Keep functions small and focused; extract helpers when logic grows.
- Do not duplicate near-identical logic across files; extract shared helpers or components when the behaviour is identical.
- Do not extract a component into a separate file when it is used only once; keep it local to the usage file (as a non-exported helper component if needed for readability).

### File structure (top-to-bottom)

- Order members top-down: exports first, then the members they use, with helpers placed below their callers.
- Keep files readable from top to bottom — high-level intent at the top, low-level detail at the bottom.
- When ordering conflicts with JavaScript/TypeScript hoisting rules, prefer `function` declarations over `const` arrow functions so the top-down order can be maintained.

### Types

- Avoid single-use local type aliases or interfaces that annotate only one function in the same file.
- Prefer type inference for local return values and intermediate objects when the inferred type is clear.
- Create named types only when they are reused, exported, or needed to document a non-obvious contract.
- Never use `as SomeType` to satisfy the type checker. If a cast feels necessary, derive the type instead (`FunctionReturnType`, `ReturnType`, `NonNullable`, indexed access, `typeof`), or narrow the value at runtime (`find`, a type guard, or an explicit `if` check). The only acceptable `as` casts are unavoidable interop with untyped third-party APIs — those must carry a comment explaining why the assertion is safe.

### Comments

- Add short comments only when intent is non-obvious. Do not add comments that restate what the code already says clearly.

### Data access

- Never access raw database fields to apply migration defaults (e.g. `dbo.field !== false`, `dbo.field ?? default`). Encapsulate that coercion in the model class as a getter so business logic always reads a clean, typed value. The model is the single place where "undefined means X" is spelled out.

### General

- Prefer clarity over cleverness.
