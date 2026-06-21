import type { TaskTimingInput, BaseTimingOutput } from "../types";

// ---------------------------------------------------------------------------
// Layer 1 – Base Timing
// ---------------------------------------------------------------------------
//
// Decides the initial candidate notification time.
//
// Strategy selection:
//   - Cold start (< 3 executions): fixed offset at 80% of the task period.
//   - Warm (≥ 3 executions): EMA (exponential moving average) of
//     inter-execution intervals, multiplied by a lead factor (0.85) so
//     the notification arrives slightly before the user would typically act.
//
// Input:  TaskTimingInput
//           .periodHours      – target period
//           .lastExecutedAt   – last known execution timestamp
//           .executions[]     – full history, oldest → newest
//
// Output: BaseTimingOutput
//           .notifyAt         – candidate notification time (ms epoch)
//           .strategy         – "fixed_offset" | "ema"
//           .emaIntervalMs?   – the computed EMA interval when strategy=ema
// ---------------------------------------------------------------------------

/** Minimum number of executions before we switch from fixed offset to EMA. */
const WARM_THRESHOLD = 3;

/** Fraction of the period to use as the fixed offset (cold start). */
const COLD_START_OFFSET_FRACTION = 0.8;

/** EMA smoothing factor. Higher = more weight on recent intervals. */
const EMA_ALPHA = 0.3;

/** Lead factor applied to the EMA interval. < 1 means we notify before the
 *  predicted next execution. */
const EMA_LEAD_FACTOR = 0.85;

export function computeBaseTiming(input: TaskTimingInput): BaseTimingOutput {
  // TODO: implement
  void input;
  void WARM_THRESHOLD;
  void COLD_START_OFFSET_FRACTION;
  void EMA_ALPHA;
  void EMA_LEAD_FACTOR;
  throw new Error("Not implemented");
}
