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

/**
 * Resolution order for the failure condition: explicit `--fail-on` >
 * `--strict` > the configured value (`validation.failOn`, whose shipped
 * default is `error`).
 *
 * Both validate and doctor use this one function. When doctor ignored the
 * config and always returned 0 without a flag, two commands reading the same
 * config disagreed on how much an `[error]` weighs.
 */
export function resolveFailOn(
  options: { failOn?: FailOn; strict?: boolean },
  fallback: FailOn,
): FailOn {
  if (options.failOn) {
    return options.failOn;
  }
  if (options.strict) {
    return "warning";
  }
  return fallback;
}

/**
 * Whether `--strict` was overridden by an explicit `--fail-on`.
 *
 * This is the other side of the {@link resolveFailOn} precedence, so it lives
 * beside it. The precedence itself is specified, but the help describes
 * `--strict` as a policy, so adding `--fail-on error` to an existing
 * `--strict` lane silently drops the warning gate while the diff looks like a
 * tightening. The check is returned from here so a caller can name which flag
 * won.
 *
 * `--strict --fail-on warning` agrees on the threshold, so it is not an
 * override. For a command that does not accept `--strict` (doctor) the result
 * is always `false`.
 */
export function strictSupersededBy(options: { failOn?: FailOn; strict?: boolean }): boolean {
  return options.strict === true && options.failOn !== undefined && options.failOn !== "warning";
}
