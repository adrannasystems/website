import type {
  TaskTimingInput,
  EscalationOutput,
  FatigueManagementOutput,
  UserNotificationContext,
} from "../types";

// ---------------------------------------------------------------------------
// Layer 6 – Fatigue Management
// ---------------------------------------------------------------------------
//
// Enforces per-user notification limits to prevent notification fatigue.
// If the user has already received (or is scheduled to receive) too many
// notifications in the recent window, defer or drop lower-priority ones.
//
// Priority rules:
//   - Primary notifications take precedence over follow-ups.
//   - "urgent" follow-ups take precedence over "moderate" and "gentle".
//   - If even the primary notification would exceed the limit, defer it
//     to the next available slot outside the congested window.
//
// Input:  TaskTimingInput            – for task identification
//         EscalationOutput           – the schedule from Layer 5
//         UserNotificationContext    – other notifications for this user
//
// Output: FatigueManagementOutput
//           .notifyAt                – final notification time (may be deferred)
//           .followUps[]             – surviving follow-ups after filtering
//           .throttled               – whether any deferral/dropping occurred
//           .droppedCount            – how many notifications were dropped
// ---------------------------------------------------------------------------

/** Default daily notification limit per user if not configured. */
const DEFAULT_DAILY_LIMIT = 5;

export function applyFatigueManagement(
  input: TaskTimingInput,
  escalation: EscalationOutput,
  context: UserNotificationContext,
): FatigueManagementOutput {
  // TODO: implement
  void input;
  void escalation;
  void context;
  void DEFAULT_DAILY_LIMIT;
  throw new Error("Not implemented");
}
