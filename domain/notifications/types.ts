import type { Id, MsSinceEpoch, UserId } from "../models/MaintenanceTask";

// ---------------------------------------------------------------------------
// Core domain types for the notification-timing pipeline
// ---------------------------------------------------------------------------

/** A single recorded execution of a task. */
export type Execution = {
  taskId: Id<"maintenanceTasks">;
  executedAt: MsSinceEpoch;
};

/** The subset of task data each layer needs to make timing decisions. */
export type TaskTimingInput = {
  taskId: Id<"maintenanceTasks">;
  userId: UserId;
  periodHours: number;
  lastExecutedAt: MsSinceEpoch | null;
  /** Past executions, ordered oldest → newest. */
  executions: Execution[];
};

// ---------------------------------------------------------------------------
// Per-layer outputs
// ---------------------------------------------------------------------------

/**
 * Layer 1 – Base Timing
 *
 * Input:  TaskTimingInput
 * Output: a candidate notification timestamp computed from either a fixed
 *         offset (cold start) or EMA of historical intervals.
 */
export type BaseTimingOutput = {
  /** The candidate notification time (ms since epoch). */
  notifyAt: MsSinceEpoch;
  /** Which strategy was used. */
  strategy: "fixed_offset" | "ema";
  /** If EMA was used, the computed EMA interval in ms. */
  emaIntervalMs?: number;
};

/**
 * Layer 2 – Time-of-Day Snapping
 *
 * Input:  TaskTimingInput + BaseTimingOutput
 * Output: the (possibly adjusted) notification time, snapped to the user's
 *         preferred hour if one can be detected from history.
 */
export type TimeOfDayOutput = {
  /** The (possibly adjusted) notification time. */
  notifyAt: MsSinceEpoch;
  /** Whether snapping was applied. */
  snapped: boolean;
  /** The detected preferred hour (0-23), if any. */
  detectedPreferredHour?: number;
};

/**
 * Layer 3 – Variance Safety Margin
 *
 * Input:  TaskTimingInput + TimeOfDayOutput
 * Output: the (possibly shifted earlier) notification time if the user's
 *         execution intervals have high variance.
 */
export type VarianceSafetyOutput = {
  /** The (possibly shifted earlier) notification time. */
  notifyAt: MsSinceEpoch;
  /** Whether a safety margin was applied. */
  marginApplied: boolean;
  /** Coefficient of variation of the user's intervals. */
  coefficientOfVariation?: number;
  /** The safety margin subtracted, in ms. */
  marginMs?: number;
};

/**
 * Layer 4 – Drift Correction
 *
 * Input:  TaskTimingInput + VarianceSafetyOutput
 * Output: the (possibly shifted earlier) notification time if the user's
 *         recent intervals show an upward trend (getting lazier).
 */
export type DriftCorrectionOutput = {
  /** The (possibly shifted earlier) notification time. */
  notifyAt: MsSinceEpoch;
  /** Whether drift correction was applied. */
  correctionApplied: boolean;
  /** Detected drift rate (ms per cycle). Positive = intervals growing. */
  driftRateMs?: number;
};

/**
 * Layer 5 – Escalation
 *
 * Input:  TaskTimingInput + DriftCorrectionOutput
 * Output: the primary notification time plus any follow-up escalation
 *         notifications if the user hasn't completed the task.
 */
export type EscalationOutput = {
  /** The primary notification time. */
  notifyAt: MsSinceEpoch;
  /** Follow-up notification times if the task remains incomplete. */
  followUps: { notifyAt: MsSinceEpoch; urgency: "gentle" | "moderate" | "urgent" }[];
  /** Maximum number of escalation steps configured. */
  maxEscalationSteps: number;
};

/**
 * Layer 6 – Fatigue Management
 *
 * Input:  EscalationOutput + context about other tasks' notifications
 * Output: the final notification schedule, possibly deferred or dropped
 *         to respect per-user notification limits.
 */
export type FatigueManagementOutput = {
  /** The final notification time (may be deferred from the escalation output). */
  notifyAt: MsSinceEpoch;
  /** Follow-ups surviving fatigue filtering. */
  followUps: { notifyAt: MsSinceEpoch; urgency: "gentle" | "moderate" | "urgent" }[];
  /** Whether fatigue management deferred or dropped any notifications. */
  throttled: boolean;
  /** How many notifications were dropped due to fatigue limits. */
  droppedCount: number;
};

/** Context about other tasks' notifications, needed by the fatigue layer. */
export type UserNotificationContext = {
  userId: UserId;
  /** Timestamps of all notifications already scheduled or sent in the
   *  recent window (e.g. last 24h) for this user, across all tasks. */
  recentNotificationTimestamps: MsSinceEpoch[];
  /** The maximum number of notifications per 24h window for this user. */
  dailyLimit: number;
};

// ---------------------------------------------------------------------------
// Final pipeline result
// ---------------------------------------------------------------------------

/** The complete output of the notification-timing pipeline for one task. */
export type NotificationSchedule = {
  taskId: Id<"maintenanceTasks">;
  userId: UserId;
  /** The primary notification time. */
  notifyAt: MsSinceEpoch;
  /** Follow-up escalation notifications. */
  followUps: { notifyAt: MsSinceEpoch; urgency: "gentle" | "moderate" | "urgent" }[];
  /** Diagnostic trace: what each layer computed (for debugging / observability). */
  trace: {
    baseTiming: BaseTimingOutput;
    timeOfDay: TimeOfDayOutput;
    varianceSafety: VarianceSafetyOutput;
    driftCorrection: DriftCorrectionOutput;
    escalation: EscalationOutput;
    fatigueManagement: FatigueManagementOutput;
  };
};
