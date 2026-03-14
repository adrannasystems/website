Process specific tasks from TASKS.md that the user selects.

The user invokes this as `/work-task <task description or number(s)>`. Use the argument(s) to identify which task(s) to work on. If no argument is given, list the pending tasks and ask which one(s) the user wants to work on before proceeding.

Follow these steps exactly:

1. Read TASKS.md.
2. Match the user's argument(s) against the `[ ]` pending tasks. If a match is ambiguous, ask for clarification. If a specified task is not found or is already done/in-progress, tell the user and stop.
3. For each matched task, update its status from `[ ]` to `[~]` in TASKS.md before spawning agents (do all updates in one edit).
4. Spawn one general-purpose agent per matched task **in parallel** (single message with multiple Agent tool calls). Pass each agent:
   - The full task description.
   - That it is working in the repo at the current working directory.
   - That it MUST use the AskUserQuestion tool if it needs clarification before or during the work.
   - That it should NOT run `npm run lint` or `npm run typecheck` itself — the orchestrator will do that after all tasks complete.
5. Wait for all agents to finish.
6. Run `npm run lint` and `npm run typecheck`. Fix any failures yourself before marking tasks done.
7. For each completed task, update its status from `[~]` to `[x]` in TASKS.md.
8. Report a brief summary of what each agent did.
