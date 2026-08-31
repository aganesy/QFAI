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
   * 使用法エラーおよび実行時エラーの既定値でもある (guardrails を除く)。
   * ここでいう実行時エラーはトップレベルの catch が拾う送出全般で、
   * prototyping certify の証明書書き込み失敗、validate の JSON 出力や
   * doctor / preflight の --out 書き込み失敗、prototyping show-spec が
   * spec 本文を ENOENT 以外の理由で読めない場合もこの値になる。
   * どれも検査結果の不合格ではないため、復旧手段 (権限 / ディスク /
   * パスの修正) が閾値到達とは異なる点に注意。
   * パーサが値を拒否する値フラグ (--cycle に非負整数以外、--fail-on に
   * never / warning / error 以外) も、peek / 本処理へ進まずこの使用法
   * エラーで停止する。
   */
  findings: 1,
  /**
   * 入力 / lock drift エラー。guardrails では使用法エラーも、
   * report / prototyping show-spec では入力ファイルの欠落 / 破損も、
   * prototyping certify では証明書 mismatch / 品質ゲート拒否もこの値。
   * prototyping iterate では --auto-serve のサーバ起動失敗や --capture の
   * runner 拒否 / 例外 / HTML コピー失敗といった実行環境エラーも含む
   * (入力修正ではなくポート解放・依存修復・権限修正で復旧する)。
   */
  inputError: 2,
  /**
   * prototyping: STOP — iterate は収束 (全 4 軸 exceptional)、
   * certify は review.json のカバレッジ不足に同じ拒否クラスとして使う。
   * certify のカバレッジ不足には、multi-spec frozen set を legacy flat
   * layout の accepted iteration で証明しようとした layout 非互換
   * (per-spec layout への移行、または frozen set の単一 spec 化が必要) も
   * 含まれる。
   */
  prototypingConverged: 64,
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
      `${EXIT_CODES.ok} = 成功,`,
      `${EXIT_CODES.findings} = --fail-on 閾値に到達, または実行時エラー`,
      "      (validate の JSON 出力 / doctor --out の書き込み失敗など、出力 I/O の例外)",
    ],
  },
  {
    label: "prototyping preflight",
    lines: [
      `${EXIT_CODES.ok} = 成功,`,
      `${EXIT_CODES.findings} = --fail-on 閾値に到達, または実行時エラー`,
      "      (--out の書き込み失敗など、出力 I/O の例外 — doctor と同じ実装経路)",
    ],
  },
  {
    label: "guardrails",
    lines: [
      `${EXIT_CODES.ok} = 成功, ${EXIT_CODES.findings} = check で検査エラーを検出,`,
      `${EXIT_CODES.inputError} = 入力エラー / 使用法エラー`,
    ],
  },
  {
    label: "report",
    lines: [
      `${EXIT_CODES.ok} = 成功,`,
      `${EXIT_CODES.findings} = 入力 validate.json の破損 / スキーマ不正, または実行時エラー`,
      "      (読み込み・出力の I/O 失敗),",
      `${EXIT_CODES.inputError} = 入力 validate.json の欠落 (--in / config 既定)`,
    ],
  },
  {
    label: "prototyping iterate",
    lines: [
      `${EXIT_CODES.ok} = 継続 (次 cycle へ) / UI-bearing spec なしの no-op 終了,`,
      `${EXIT_CODES.inputError} = 入力 / lock drift エラー, または実行時エラー`,
      `      (--auto-serve のサーバ起動失敗, --capture の runner 拒否 / I/O 失敗),`,
      `${EXIT_CODES.prototypingConverged} = STOP: 収束 (全 4 軸 exceptional),`,
      `${EXIT_CODES.prototypingBudgetExhausted} = STOP: バジェット枯渇 (max iterations),`,
      `${EXIT_CODES.prototypingLicenseFailure} = STOP: license-verify 失敗`,
    ],
  },
  {
    label: "prototyping iterate --check-convergence",
    lines: [
      `${EXIT_CODES.ok} = 収束済み,`,
      `${EXIT_CODES.findings} = --cycle が非負整数でない (-1 / 1.5 / abc — パーサが値を拒否し,`,
      `      peek に到達せず使用法エラーとして停止),`,
      `${EXIT_CODES.inputError} = 未収束 (prototyping.json の欠落 / 破損を含む),`,
      `      または --cycle 範囲エラー (10 以上の非負整数は peek せず入力エラーとして停止)`,
    ],
  },
  {
    label: "prototyping certify",
    lines: [
      `${EXIT_CODES.ok} = 成功,`,
      `${EXIT_CODES.findings} = 実行時エラー (certificate の書き込み失敗など、`,
      `      証明書 I/O の例外),`,
      `${EXIT_CODES.inputError} = 入力エラー / 品質ゲート拒否 (validate エラー, verify 不合格,`,
      `      DESIGN.md 違反) / --check の証明書 digest・gate mismatch,`,
      `${EXIT_CODES.prototypingConverged} = カバレッジ不足 (review.json 欠落 /`,
      `      multi-spec frozen set × flat layout 非対応)`,
    ],
  },
  {
    label: "prototyping show-spec",
    lines: [
      `${EXIT_CODES.ok} = 成功,`,
      `${EXIT_CODES.findings} = 実行時エラー (spec 解決時の I/O 例外 — 権限エラー等,`,
      "      ENOENT 以外の spec 本文読み込み失敗は再送出される),",
      `${EXIT_CODES.inputError} = prototyping.json の欠落 / 破損`,
    ],
  },
  {
    label: "その他のコマンド",
    lines: [
      `${EXIT_CODES.ok} = 成功, ${EXIT_CODES.findings} = 使用法エラー / 実行時エラー`,
      "(init / discussion / audit log / handoff upgrade / atdd scaffold)",
    ],
  },
];

const USAGE_ERROR_NOTE = [
  `  ※ 使用法エラーは guardrails のみ ${EXIT_CODES.inputError}、` +
    `他コマンドは ${EXIT_CODES.findings} を返す (既存互換のための差異)。`,
  // 未知オプションはパーサの default 分岐で読み飛ばされる (args.ts)。
  // 挙動を変えると positional / 将来フラグの互換に波及するため、当面は
  // 「終了コードでは検出できない」ことを明示する側で穴を塞ぐ。
  `  ※ 未知のオプション (例: --typo) は無視されるため、コマンド本体が成功すれば ${EXIT_CODES.ok} を返す。`,
  "     オプション名の誤記は終了コードでは検出できない (未知の *コマンド* 名は --help を伴う場合も",
  `     使用法エラーとして ${EXIT_CODES.findings})。`,
  // 値フラグの不正値はパーサが拒否する。--fail-on の未知の閾値を既定へ読み替えると、
  // 書かれたフラグと実際に効くゲートが黙って食い違うため、--cycle と同じ扱いになる。
  `  ※ --fail-on の不正値 (例: --fail-on typo) はパーサが拒否し、既定の閾値へ読み替えないため、`,
  `     コマンド本体へ進まず使用法エラーとして ${EXIT_CODES.findings} を返す (--cycle と同じ)。`,
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
