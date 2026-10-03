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
  /** Success, or below the fail-on threshold. */
  ok: 0,
  /**
   * validate / doctor / preflight: the --fail-on threshold was reached.
   * Also the default for runtime errors. An unknown *command* name
   * (including one given with --help) stops with this value too. That is a
   * row of its own, separate from CLI argument errors: the init CLI contract's
   * exit-code table reserves 2 only for an unknown flag or a bad value, so a
   * misspelled command is not moved there.
   * A runtime error here means anything thrown that the top-level catch
   * picks up: a failed JSON output in validate or --out write in doctor /
   * preflight.
   * None of these is a failed check result, so note that the recovery
   * (fixing permissions, disk or paths) differs from reaching the threshold.
   */
  findings: 1,
  /**
   * CLI argument error (an unknown flag, a bad or missing value). This is
   * the value `invalidExitCode` in `parseArgs` returns for every command,
   * and the row the init CLI contract's exit-code table reserves. A value
   * flag whose value the parser rejects (--fail-on with anything but never /
   * warning / error) also stops here, before any main processing.
   *
   * Input and lock-drift errors use the same value. In report, a missing
   * input file does too.
   */
  inputError: 2,
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
    label: "db-drift",
    lines: [
      `${EXIT_CODES.ok} = no difference, nothing configured to compare, or --fail-on never,`,
      `${EXIT_CODES.findings} = the contracts and the migrations differ,`,
      `${EXIT_CODES.inputError} = the comparison could not be made (a file on either side`,
      "      would not apply, or the schemas could not be read)",
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
    label: "atdd scaffold",
    lines: [
      `${EXIT_CODES.ok} = success,`,
      `${EXIT_CODES.findings} = a runtime read or write failure,`,
      `${EXIT_CODES.inputError} = a usage error or an ID absent from the story tree`,
    ],
  },
  {
    label: "workflow",
    lines: [
      `${EXIT_CODES.ok} = a plan or candidate routes,`,
      `${EXIT_CODES.findings} = a file cannot be read or a shipped plan does not load,`,
      `${EXIT_CODES.inputError} = the input is refused`,
    ],
  },
  {
    label: "other commands",
    lines: [
      `${EXIT_CODES.ok} = success, ${EXIT_CODES.inputError} = a usage error,`,
      `${EXIT_CODES.findings} = a runtime error`,
      "(init / discussion)",
    ],
  },
];

const USAGE_ERROR_NOTE = [
  // The exit code for a CLI argument error is set in one place, the
  // `invalidExitCode` of `parseArgs`, and does not vary by command. The second
  // row of the init CLI contract's exit-code table (unknown flag / malformed
  // value) is the single source of truth.
  `  Note: a CLI argument error (an unknown flag, a bad or missing value) is ${EXIT_CODES.inputError} on every command.`,
  // An unknown option used to be skipped by the parser's `default` branch, so
  // a misspelled `--dry-run` ran a real init and exited 0. It is now refused.
  `  Note: an unknown option (--typo, say) stops at ${EXIT_CODES.inputError} without reaching the command.`,
  `     An unknown *command* name is a row of its own: a usage error at ${EXIT_CODES.findings} even with --help`,
  "     (so --help cannot make a misspelled command read as a success).",
  // The parser rejects a bad value for a value flag. Reading an unknown
  // --fail-on threshold as the default would silently make the written flag and
  // the gate in effect disagree.
  `  Note: a bad --fail-on value (--fail-on typo, say) is refused by the parser rather than read as`,
  `     the default threshold, so it returns ${EXIT_CODES.inputError} without reaching the command.`,
].join("\n");

/** CJK punctuation / kana / ideographs / fullwidth forms. */
const FULL_WIDTH_RE = /[\u3000-\u30ff\u3400-\u9fff\uff01-\uff60]/u;

/** Count a full-width character as 2 columns so the label column stays aligned. */
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
  // When the label exceeds the column width, it takes a whole line and the
  // description continues aligned on the next lines. That reads better than
  // breaking the alignment to fit everything on one line.
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
