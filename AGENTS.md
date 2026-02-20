# AGENTS.md

This file defines guardrails for agentic coding in this repo.

## Required Workflow
- Always inspect the repo state before changes (`rg --files`, `ls`, or `git status`).
- Summarize what changed.

## Safety
- Never run destructive commands unless explicitly requested.
- Ask before installing new dependencies or modifying global config.

## Communication
- Be explicit about assumptions.
- If blocked, propose the smallest next step to unblock.
