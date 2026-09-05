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

/**
 * `--strict` が明示 `--fail-on` に上書きされたか。
 *
 * {@link resolveFailOn} の優先順位の裏側であり、同じ 1 箇所に置く。優先順位
 * そのものは仕様だが、`--strict` はヘルプ上「方針」として書かれているため、
 * 既存の `--strict` レーンに後から `--fail-on error` を足すと warning ゲートが
 * 黙って外れ、差分は「締めた」ようにしか見えない。呼び出し側がどちらが勝ったかを
 * 名指しできるよう、判定をここから返す。
 *
 * 閾値が一致する `--strict --fail-on warning` は矛盾ではないので上書きとは
 * 扱わない。`--strict` を受け取らないコマンド (doctor) では常に `false`。
 */
export function strictSupersededBy(options: { failOn?: FailOn; strict?: boolean }): boolean {
  return options.strict === true && options.failOn !== undefined && options.failOn !== "warning";
}
