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
