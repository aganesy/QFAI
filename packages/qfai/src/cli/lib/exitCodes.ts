/**
 * SSOT for the exit codes the qfai CLI returns.
 *
 * The commands import these constants at their `return` sites and
 * `usage()` renders the `Exit codes:` help block from the same table,
 * so the documented matrix cannot drift away from actual behaviour.
 * Consumers installing qfai from npm have no access to the framework's
 * own CLI contracts, which makes `--help` the only reachable statement
 * of this mapping.
 *
 * The block documents what the CLI *currently returns*, not what the
 * contracts reserve: a code path that is specified but not yet wired to
 * a command stays out of the table until it can actually be observed.
 */
export const EXIT_CODES = {
  /**
   * 成功 / fail-on 閾値未満。prototyping iterate では「継続」に加えて、
   * UI-bearing spec が 1 件も解決されない cycle 0 の terminal no-op
   * (iteration artifact を作らずに終わる正常スキップ) もこの値。
   */
  ok: 0,
  /**
   * validate / doctor / preflight: --fail-on 閾値に到達。
   * guardrails check: 検査エラーを検出。
   * 実行時エラーの既定値でもある。加えて、未知の *コマンド* 名 (--help を
   * 伴う場合も含む) はこの値で停止する — CLI 引数エラーとは別の行であり、
   * init CLI contract の exit-code 表が 2 を予約しているのは未知のフラグと
   * 値の不正だけなので、綴り誤りのコマンドをそこへ寄せない。
   * ここでいう実行時エラーはトップレベルの catch が拾う送出全般で、
   * prototyping certify の証明書書き込み失敗、validate の JSON 出力や
   * doctor / preflight の --out 書き込み失敗、prototyping show-spec が
   * spec 本文を ENOENT 以外の理由で読めない場合もこの値になる。
   * どれも検査結果の不合格ではないため、復旧手段 (権限 / ディスク /
   * パスの修正) が閾値到達とは異なる点に注意。
   */
  findings: 1,
  /**
   * CLI 引数エラー (未知のフラグ, 値の不正 / 欠落) — `parseArgs` の
   * `invalidExitCode` が全コマンド共通で返す値で、init CLI contract の
   * exit-code 表が予約している行。パーサが値を拒否する値フラグ
   * (--cycle に非負整数以外、--fail-on に never / warning / error 以外) も、
   * peek / 本処理へ進まずここで停止する。
   *
   * 入力 / lock drift エラーも同じ値。guardrails では使用法エラーも、
   * report / prototyping show-spec では入力ファイルの欠落 / 破損も、
   * prototyping certify では証明書 mismatch / 品質ゲート拒否もこの値。
   * prototyping iterate では --auto-serve のサーバ起動失敗や --capture の
   * runner 拒否 / 例外 / HTML コピー失敗といった実行環境エラーも含む
   * (入力修正ではなくポート解放・依存修復・権限修正で復旧する)。
   */
  inputError: 2,
  /**
   * prototyping: STOP — 「これ以上ループを回しても結果が変わらない」ことを
   * 証拠が示した、という 1 つの拒否クラス。同じ番号がコマンドによって別の
   * 事象を指すため、名前は事象ではなくクラスを指している:
   *
   * - iterate: 収束 (全 4 軸 exceptional)。ループとしては成功側の終端。
   * - certify: review.json のカバレッジ不足。multi-spec frozen set を legacy
   *   flat layout の accepted iteration で証明しようとした layout 非互換
   *   (per-spec layout への移行、または frozen set の単一 spec 化が必要) も
   *   ここに含む。
   *
   * `prototypingConverged` という名前だった: certify 側の 5 箇所は収束を
   * 意味しないので、次に 64 を返す分岐を足す人を誤らせる。
   *
   * 65 / 66 が別定数なのは同じ理由の裏返しで、あちらは原因が 1 つに定まる
   * (バジェット枯渇 / license-verify 失敗)。64 だけがコマンド横断の
   * 「証拠による終端」クラスとして CLI contract に予約されている。
   */
  prototypingStop: 64,
  /** prototyping iterate: STOP — バジェット (max iterations) 枯渇。 */
  prototypingBudgetExhausted: 65,
  /** prototyping iterate: STOP — license-verify 失敗。 */
  prototypingLicenseFailure: 66,
} as const;

type ExitCodeRow = {
  readonly label: string;
  readonly lines: readonly string[];
};

const LABEL_WIDTH = 29;

const EXIT_CODE_ROWS: readonly ExitCodeRow[] = [
  {
    label: "validate / doctor",
    lines: [
      `${EXIT_CODES.ok} = success,`,
      `${EXIT_CODES.findings} = the --fail-on threshold was reached, or a runtime error`,
      "      (an output I/O exception: a failed validate JSON write, a failed doctor --out write)",
    ],
  },
  {
    label: "prototyping preflight",
    lines: [
      `${EXIT_CODES.ok} = success,`,
      `${EXIT_CODES.findings} = the --fail-on threshold was reached, or a runtime error`,
      "      (an output I/O exception, such as a failed --out write — the same path as doctor)",
    ],
  },
  {
    label: "guardrails",
    lines: [
      `${EXIT_CODES.ok} = success, ${EXIT_CODES.findings} = check found a violation,`,
      `${EXIT_CODES.inputError} = an input error, or a usage error`,
    ],
  },
  {
    label: "report",
    lines: [
      `${EXIT_CODES.ok} = success,`,
      `${EXIT_CODES.findings} = the input validate.json is corrupt or off-schema, or a runtime error`,
      "      (a read or write I/O failure),",
      `${EXIT_CODES.inputError} = the input validate.json is missing (--in, or the config default)`,
    ],
  },
  {
    label: "prototyping iterate",
    lines: [
      `${EXIT_CODES.ok} = continue (next cycle), or a no-op exit with no UI-bearing spec,`,
      `${EXIT_CODES.inputError} = an input or lock-drift error, or a runtime error`,
      `      (--auto-serve could not start the server; --capture was refused by the runner or failed on I/O),`,
      `${EXIT_CODES.prototypingStop} = STOP: converged (all four axes exceptional),`,
      `${EXIT_CODES.prototypingBudgetExhausted} = STOP: budget exhausted (max iterations),`,
      `${EXIT_CODES.prototypingLicenseFailure} = STOP: license-verify failed`,
    ],
  },
  {
    label: "prototyping iterate --check-convergence",
    lines: [
      `${EXIT_CODES.ok} = converged,`,
      `${EXIT_CODES.inputError} = not converged (including a missing or corrupt prototyping.json),`,
      `      --cycle is not a non-negative integer (-1 / 1.5 / abc — the parser refuses the`,
      `      value and the peek is never reached), or --cycle is out of range (10 or more stops without peeking)`,
    ],
  },
  {
    label: "prototyping certify",
    lines: [
      `${EXIT_CODES.ok} = success,`,
      `${EXIT_CODES.findings} = a runtime error (a certificate I/O exception, such as a`,
      `      failed certificate write),`,
      `${EXIT_CODES.inputError} = an input error, or a quality gate refused it (a validate error, a failed`,
      `      verify, a DESIGN.md breach), or --check found a certificate digest or gate mismatch,`,
      `${EXIT_CODES.prototypingStop} = coverage is short (review.json is missing, or a`,
      `      multi-spec frozen set on a flat layout, which is unsupported)`,
    ],
  },
  {
    label: "prototyping show-spec",
    lines: [
      `${EXIT_CODES.ok} = success,`,
      `${EXIT_CODES.findings} = a runtime error (an I/O exception while resolving the spec — a`,
      "      permission error, say; a spec body read failure other than ENOENT is re-thrown),",
      `${EXIT_CODES.inputError} = prototyping.json is missing or corrupt`,
    ],
  },
  {
    label: "other commands",
    lines: [
      `${EXIT_CODES.ok} = success, ${EXIT_CODES.inputError} = a usage error,`,
      `${EXIT_CODES.findings} = a runtime error`,
      "(init / discussion / audit log / handoff upgrade / atdd scaffold)",
    ],
  },
];

const USAGE_ERROR_NOTE = [
  // CLI-arg エラーの終了コードは `parseArgs` の `invalidExitCode` 一箇所で
  // 決まり、コマンド差はない。init CLI contract の exit-code 表の 2 行目
  // (unknown flag / malformed value) がその SSOT。
  `  Note: a CLI argument error (an unknown flag, a bad or missing value) is ${EXIT_CODES.inputError} on every command.`,
  // 未知オプションはかつてパーサの `default` 分岐で読み飛ばされ、`--dry-run`
  // の綴り誤りが本物の init を exit 0 で実行していた。現在は拒否される。
  `  Note: an unknown option (--typo, say) stops at ${EXIT_CODES.inputError} without reaching the command.`,
  `     An unknown *command* name is a row of its own: a usage error at ${EXIT_CODES.findings} even with --help`,
  "     (so --help cannot make a misspelled command read as a success).",
  // 値フラグの不正値はパーサが拒否する。--fail-on の未知の閾値を既定へ読み替えると、
  // 書かれたフラグと実際に効くゲートが黙って食い違うため、--cycle と同じ扱いになる。
  `  Note: a bad --fail-on value (--fail-on typo, say) is refused by the parser rather than read as`,
  `     the default threshold, so it returns ${EXIT_CODES.inputError} without reaching the command (the same as --cycle).`,
].join("\n");

/** CJK punctuation / kana / ideographs / fullwidth forms. */
const FULL_WIDTH_RE = /[\u3000-\u30ff\u3400-\u9fff\uff01-\uff60]/u;

/** 全角文字を 2 桁として数え、ラベル列の桁揃えを崩さないようにする。 */
function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += FULL_WIDTH_RE.test(char) ? 2 : 1;
  }
  return width;
}

function padLabel(label: string): string {
  return label + " ".repeat(Math.max(1, LABEL_WIDTH - displayWidth(label)));
}

function formatRow(row: ExitCodeRow): string {
  const continuationIndent = `  ${" ".repeat(LABEL_WIDTH)}`;
  // ラベルが列幅を超える場合は 1 行使い切り、説明を次行から揃える。
  // 桁揃えを壊してまで 1 行に押し込むより読みやすい。
  if (displayWidth(row.label) >= LABEL_WIDTH) {
    return [`  ${row.label}`, ...row.lines.map((line) => `${continuationIndent}${line}`)].join(
      "\n",
    );
  }
  const [first, ...rest] = row.lines;
  const head = `  ${padLabel(row.label)}${first ?? ""}`;
  const continuation = rest.map((line) => `${continuationIndent}${line}`);
  return [head, ...continuation].join("\n");
}

/**
 * Render the `Exit codes:` block appended to `qfai --help`.
 * Per-command rather than one flat table: the same numeric code carries
 * a different meaning per command, so a flat list would mislead.
 */
export function formatExitCodesSection(): string {
  return ["Exit codes:", ...EXIT_CODE_ROWS.map(formatRow), USAGE_ERROR_NOTE].join("\n");
}
