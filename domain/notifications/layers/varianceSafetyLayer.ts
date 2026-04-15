import type { TaskTimingInput, TimeOfDayOutput, VarianceSafetyOutput } from "../types";

// ---------------------------------------------------------------------------
// Layer 3 – Variance Safety Margin
// ---------------------------------------------------------------------------
//
// If the user's execution intervals have high variance (coefficient of
// variation > CV_THRESHOLD), shift the notification earlier by a safety
// margin proportional to the standard deviation. This makes notifications
// more conservative for inconsistent users and relaxed for consistent ones.
//
// Input:  TaskTimingInput         – for the execution history
//         TimeOfDayOutput         – the candidate time from Layer 2
//
// Output: VarianceSafetyOutput
//           .notifyAt                 – (possibly shifted earlier) time
//           .marginApplied            – whether a margin was subtracted
//           .coefficientOfVariation   – σ/μ of the intervals
//           .marginMs                 – the margin subtracted (ms)
// ---------------------------------------------------------------------------

/** CV above this triggers a safety margin. */
const CV_THRESHOLD = 0.3;

/** How many standard deviations to subtract as the safety margin. */
const SAFETY_SIGMA_MULTIPLIER = 1.5;

/** Minimum executions needed to compute a meaningful variance. */
const MIN_EXECUTIONS_FOR_VARIANCE = 5;

export function applyVarianceSafety(
  input: TaskTimingInput,
  timeOfDay: TimeOfDayOutput,
): VarianceSafetyOutput {
  // TODO: implement
  void input;
  void timeOfDay;
  void CV_THRESHOLD;
  void SAFETY_SIGMA_MULTIPLIER;
  void MIN_EXECUTIONS_FOR_VARIANCE;
  throw new Error("Not implemented");
}
