import { err, ok, type Result } from "neverthrow";

export function scaleAmount(amount: number, factor: number): number {
  return amount * factor;
}

export function scaleFactorFromReference(
  originalAmount: number,
  desiredAmount: number,
): Result<number, "zeroOriginal"> {
  if (originalAmount === 0) {
    return err("zeroOriginal");
  } else {
    return ok(desiredAmount / originalAmount);
  }
}
