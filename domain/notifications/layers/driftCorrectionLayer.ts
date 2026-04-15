import type { TaskTimingInput, VarianceSafetyOutput, DriftCorrectionOutput } from "../types";

// ---------------------------------------------------------------------------
// Layer 4 – Drift Correction
// ---------------------------------------------------------------------------
//
// Detects whether the user's recent intervals are trending upward (getting
// lazier / less frequent) by computing a simple linear regression slope
// over the last N intervals. If the slope is positive and above a
// threshold, shift the notification earlier to compensate.
//
// Input:  TaskTimingInput          – for the execution history
//         VarianceSafetyOutput     – the candidate time from Layer 3
//
// Output: DriftCorrectionOutput
//           .notifyAt              – (possibly shifted earlier) time
//           .correctionApplied     – whether drift correction was applied
//           .driftRateMs           – slope in ms/cycle (positive = growing)
// ---------------------------------------------------------------------------

/** Number of recent intervals to consider for drift detection. */
const DRIFT_WINDOW = 5;

/** Minimum positive drift rate (ms/cycle) before correction activates. */
const DRIFT_THRESHOLD_MS = 0;

/** Fraction of the detected drift to correct for. < 1 to avoid overcorrection. */
const DRIFT_CORRECTION_FACTOR = 0.5;

export function applyDriftCorrection(
  input: TaskTimingInput,
  varianceSafety: VarianceSafetyOutput,
): DriftCorrectionOutput {
  // TODO: implement
  void input;
  void varianceSafety;
  void DRIFT_WINDOW;
  void DRIFT_THRESHOLD_MS;
  void DRIFT_CORRECTION_FACTOR;
  throw new Error("Not implemented");
}
