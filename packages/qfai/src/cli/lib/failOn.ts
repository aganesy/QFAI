import type { FailOn } from "../../core/config.js";
import type { ValidationResult } from "../../core/types.js";

export type { FailOn };

export function shouldFail(result: ValidationResult, failOn: FailOn): boolean {
  if (failOn === "never") {
    return false;
  }
  if (failOn === "error") {
    return result.counts.error > 0;
  }
  return result.counts.error + result.counts.warning > 0;
}
