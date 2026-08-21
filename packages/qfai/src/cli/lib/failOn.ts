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
 * 失敗条件の解決順序: 明示 `--fail-on` > `--strict` > 設定値
 * (`validation.failOn`, 同梱既定値は `error`)。
 *
 * validate / doctor の双方がこの 1 箇所を使う。doctor が設定を読まず
 * フラグ未指定時に必ず 0 を返していた頃は、同じ config を読む 2 つの
 * コマンドが `[error]` の重みで食い違っていた。
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
