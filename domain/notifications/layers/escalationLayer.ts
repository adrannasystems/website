import type { TaskTimingInput, DriftCorrectionOutput, EscalationOutput } from "../types";

// ---------------------------------------------------------------------------
// Layer 5 – Escalation
// ---------------------------------------------------------------------------
//
// Adds follow-up notifications after the primary notification if the user
// hasn't completed the task. Each follow-up has increasing urgency.
//
// The follow-up delays are expressed as fractions of the task period so
// that a 720h (30-day) task gets wider-spaced follow-ups than a 24h task.
//
// Input:  TaskTimingInput          – for periodHours
//         DriftCorrectionOutput    – the primary notification time from Layer 4
//
// Output: EscalationOutput
//           .notifyAt              – primary notification time (unchanged)
//           .followUps[]           – scheduled follow-up notifications
//           .maxEscalationSteps    – how many follow-ups were configured
// ---------------------------------------------------------------------------

/** Follow-up schedule: delay as a fraction of the task period, plus urgency. */
const ESCALATION_STEPS: { delayFraction: number; urgency: "gentle" | "moderate" | "urgent" }[] = [
  { delayFraction: 0.1, urgency: "gentle" },
  { delayFraction: 0.25, urgency: "moderate" },
  { delayFraction: 0.5, urgency: "urgent" },
];

export function computeEscalation(
  input: TaskTimingInput,
  driftCorrection: DriftCorrectionOutput,
): EscalationOutput {
  // TODO: implement
  void input;
  void driftCorrection;
  void ESCALATION_STEPS;
  throw new Error("Not implemented");
}
