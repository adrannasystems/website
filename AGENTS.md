# AGENTS.md

This file defines guardrails for agentic coding in this repo.

## Required Workflow
- Always inspect the repo state before changes (`rg --files`, `ls`, or `git status`).
- Summarize what changed.
- Do not use raw `fetch` for backend calls. Use type-safe server functions or route loaders instead.
- After changes, start the dev server and ensure it starts without errors.
- If the app runs, visit all routes/pages and confirm there are no visible errors and no server-side errors logged.
- Always run `npm run lint` after changes and fix any lint errors before reporting back.

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
- Use descriptive names; avoid abbreviations unless standard.
- Keep functions small and focused; extract helpers when logic grows.
- Avoid deep nesting; prefer early returns.
- Avoid complex inline conditionals; use named variables for clarity.
- Add short comments only when intent is non-obvious.
- Order members top-down: exports first, then the members they use, with helpers placed below callers.
- Keep files readable from top to bottom (high-level intent to low-level detail).
- If ordering conflicts with JavaScript/TypeScript hoisting rules, prefer function declarations over const to keep this ordering.
- Avoid single-use local type aliases/interfaces that are only used to annotate one function in the same file.
- Prefer type inference for local return values and intermediate objects when the inferred type is clear.
- Create named types only when reused, exported, or needed to document a non-obvious contract.
