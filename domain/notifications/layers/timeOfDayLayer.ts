import type { TaskTimingInput, BaseTimingOutput, TimeOfDayOutput } from "../types";

// ---------------------------------------------------------------------------
// Layer 2 – Time-of-Day Snapping
// ---------------------------------------------------------------------------
//
// Detects the user's preferred hour for executing this task from their
// execution history, then snaps the candidate notification time to that
// hour — but only if the snap is within a ±MAX_SNAP_HOURS window of the
// base candidate. This avoids jarring shifts while still aligning with
// the user's natural rhythm.
//
// Detection method:
//   - Build a histogram of execution hours (0-23).
//   - Use circular mean (because 23:00 and 01:00 are close together)
//     to find the preferred hour.
//   - Require a minimum number of data points before activating.
//
// Input:  TaskTimingInput        – for the execution history
//         BaseTimingOutput       – the candidate time from Layer 1
//
// Output: TimeOfDayOutput
//           .notifyAt              – (possibly snapped) notification time
//           .snapped               – whether snapping was applied
//           .detectedPreferredHour – the detected hour (0-23), if any
// ---------------------------------------------------------------------------

/** Don't snap if the shift would be more than this many hours. */
const MAX_SNAP_HOURS = 4;

/** Minimum executions needed to detect a preferred hour. */
const MIN_EXECUTIONS_FOR_DETECTION = 5;

export function applyTimeOfDaySnapping(
  input: TaskTimingInput,
  baseTiming: BaseTimingOutput,
): TimeOfDayOutput {
  // TODO: implement
  void input;
  void baseTiming;
  void MAX_SNAP_HOURS;
  void MIN_EXECUTIONS_FOR_DETECTION;
  throw new Error("Not implemented");
}
