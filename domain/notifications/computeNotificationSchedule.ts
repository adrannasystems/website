import type { TaskTimingInput, UserNotificationContext, NotificationSchedule } from "./types";
import { computeBaseTiming } from "./layers/baseTimingLayer";
import { applyTimeOfDaySnapping } from "./layers/timeOfDayLayer";
import { applyVarianceSafety } from "./layers/varianceSafetyLayer";
import { applyDriftCorrection } from "./layers/driftCorrectionLayer";
import { computeEscalation } from "./layers/escalationLayer";
import { applyFatigueManagement } from "./layers/fatigueManagementLayer";

// ---------------------------------------------------------------------------
// Pipeline Orchestrator
// ---------------------------------------------------------------------------
//
// Chains the six layers sequentially. Each layer receives the original
// TaskTimingInput plus the output of the previous layer.
//
//   TaskTimingInput
//       │
//       ▼
//   ┌─────────────────────┐
//   │  Layer 1: Base       │  → BaseTimingOutput
//   │  (fixed offset / EMA)│
//   └──────────┬──────────┘
//              ▼
//   ┌─────────────────────┐
//   │  Layer 2: Time-of-Day│  → TimeOfDayOutput
//   │  (snap to preferred) │
//   └──────────┬──────────┘
//              ▼
//   ┌─────────────────────┐
//   │  Layer 3: Variance   │  → VarianceSafetyOutput
//   │  (safety margin)     │
//   └──────────┬──────────┘
//              ▼
//   ┌─────────────────────┐
//   │  Layer 4: Drift      │  → DriftCorrectionOutput
//   │  (trend correction)  │
//   └──────────┬──────────┘
//              ▼
//   ┌─────────────────────┐
//   │  Layer 5: Escalation │  → EscalationOutput
//   │  (follow-up schedule)│
//   └──────────┬──────────┘
//              ▼
//   ┌─────────────────────┐
//   │  Layer 6: Fatigue    │  → FatigueManagementOutput
//   │  (per-user throttle) │
//   └──────────┬──────────┘
//              ▼
//     NotificationSchedule
//
// ---------------------------------------------------------------------------

/**
 * Compute the full notification schedule for a single task.
 *
 * Pure function — no side effects, no database access.
 * All data is passed in; the result is a deterministic schedule
 * plus a diagnostic trace showing what each layer decided.
 */
export function computeNotificationSchedule(
  input: TaskTimingInput,
  userContext: UserNotificationContext,
): NotificationSchedule {
  // Layer 1: Base timing (fixed offset or EMA)
  const baseTiming = computeBaseTiming(input);

  // Layer 2: Snap to preferred time-of-day
  const timeOfDay = applyTimeOfDaySnapping(input, baseTiming);

  // Layer 3: Apply variance-aware safety margin
  const varianceSafety = applyVarianceSafety(input, timeOfDay);

  // Layer 4: Correct for upward drift in intervals
  const driftCorrection = applyDriftCorrection(input, varianceSafety);

  // Layer 5: Add escalation follow-ups
  const escalation = computeEscalation(input, driftCorrection);

  // Layer 6: Enforce per-user fatigue limits
  const fatigueManagement = applyFatigueManagement(input, escalation, userContext);

  return {
    taskId: input.taskId,
    userId: input.userId,
    notifyAt: fatigueManagement.notifyAt,
    followUps: fatigueManagement.followUps,
    trace: {
      baseTiming,
      timeOfDay,
      varianceSafety,
      driftCorrection,
      escalation,
      fatigueManagement,
    },
  };
}
