# AGENTS.md

This file defines guardrails for agentic coding in this repo.

## Required Workflow
- Always inspect the repo state before changes (`rg --files`, `ls`, or `git status`).
- Before introducing a new dependency, external system, or platform integration, read the official docs first and implement from that source of truth.
- Summarize what changed.
- Do not use raw `fetch` for backend calls. Use type-safe server functions or route loaders instead.
- Use TanStack Start environment file conventions: server-only code in `*.server.ts(x)` and client-only code in `*.client.ts(x)`.
- For API queries, check whether results are paginated. If pagination is possible, ask the user how to handle it before implementing.
- Before pushing, run `npm run lint` and `npm run typecheck`, plus any relevant tests, and fix any failures.

## Safety
- Never run destructive commands unless explicitly requested.
- Ask before installing new dependencies or modifying global config.
- Never hard-code secrets (API keys, tokens). Always use environment variables.
- Never log secrets or include them in error messages.
- Never silently default missing/invalid data to a "sensible" value.
- For missing/invalid input or API data, explicitly choose: fail parsing or return `undefined`.
- If the correct behavior is unclear, ask before implementing.

## Communication
- Be explicit about assumptions.
- If blocked, propose the smallest next step to unblock.

## Readability
- Prefer clarity over cleverness.
- Do not duplicate near-identical logic across files; extract shared helpers/components when behavior is the same.
- Do not extract a component into a separate file when it is used only once; keep it local to the usage file (as a non-exported helper component if needed for readability).
- Use descriptive names; avoid abbreviations unless standard.
- Keep functions small and focused; extract helpers when logic grows.
- Make control flow visually explicit with `if (...) { ... } else if (...) { ... } else { ... }` when handling decision branches, instead of stacking early returns.
- If appropriate and concise (not long blocks), prefer ternary returns for simple two-way branches: `return <condition> ? <a> : <b>`.
- Avoid complex inline conditionals; use named variables for clarity.
- Add short comments only when intent is non-obvious.
- Order members top-down: exports first, then the members they use, with helpers placed below callers.
- Keep files readable from top to bottom (high-level intent to low-level detail).
- If ordering conflicts with JavaScript/TypeScript hoisting rules, prefer function declarations over const to keep this ordering.
- Avoid single-use local type aliases/interfaces that are only used to annotate one function in the same file.
- Prefer type inference for local return values and intermediate objects when the inferred type is clear.
- Create named types only when reused, exported, or needed to document a non-obvious contract.
