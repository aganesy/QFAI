/**
 * `qfai cross-spec` — the cross-spec re-review input for a change.
 *
 * Lists every completed ledger row, in any spec, that the files changed since
 * the base put at risk, with the selector and command to re-run and the
 * current proof to replay. It runs nothing: the list is what the re-review is
 * performed from.
 */
import path from "node:path";

import { loadConfig } from "../../core/config.js";
import { crossSpecRereview, type BlockedRow } from "../../core/crossSpecRereview.js";
import { getChangedFilesAgainstBase, uncommittedPaths } from "../../core/gitChanges.js";
import { EXIT_CODES } from "../lib/exitCodes.js";
import { error, info } from "../lib/logger.js";

export type CrossSpecOptions = {
  root: string;
  /** The revision the change is measured from; the config's `baseBranch` when absent. */
  base?: string;
  format?: "text" | "json";
};

function proofLines(row: BlockedRow): string[] {
  const round = row.round === null ? "" : ` (round ${row.round})`;
  switch (row.proof.kind) {
    case "oracle-proof":
      return [`  proof${round}: ${row.proof.proof}`];
    case "falsifiability":
      return [
        `  falsifiability command${round}: ${row.proof.command}`,
        `  falsifiability result: ${row.proof.result ?? "(not recorded)"}`,
      ];
    case "none":
      return ["  proof: none recorded"];
  }
}

function formatRow(row: BlockedRow): string[] {
  const blocked =
    row.fallbackReason === null
      ? `${row.blockedBy}: ${row.files.join(", ")}`
      : `${row.blockedBy}: ${row.files.join(", ")} (${row.fallbackReason})`;
  return [
    `${row.spec} ${row.tddId} [${row.layer}] ${row.testFile}`,
    `  blocked by ${blocked}`,
    `  selector: ${row.selector}`,
    `  GREEN command: ${row.greenCommand ?? "(not recorded)"}`,
    `  evidence: ${row.evidence ?? "(no entry found)"}`,
    ...proofLines(row),
  ];
}

function formatText(base: string, changed: readonly string[], rows: readonly BlockedRow[]): string {
  const header = `${rows.length} completed row(s) blocked by ${changed.length} file(s) changed since ${base}.`;
  return [header, ...rows.flatMap((row) => ["", ...formatRow(row)])].join("\n");
}

export async function runCrossSpec(options: CrossSpecOptions): Promise<number> {
  const root = path.resolve(options.root);
  const { config } = await loadConfig(root);
  const base = options.base ?? config.baseBranch ?? "origin/main";
  const committed = getChangedFilesAgainstBase(root, base);
  const uncommitted = uncommittedPaths(root);
  if (committed === null || uncommitted === null) {
    error(
      `qfai cross-spec: cannot list the files changed since ${base}. Pass --base with a revision this clone holds.`,
    );
    return EXIT_CODES.inputError;
  }
  const changed = [...new Set([...committed, ...uncommitted])].sort();
  const rows = await crossSpecRereview(root, config, changed);
  info(
    options.format === "json"
      ? JSON.stringify({ base, changed, rows }, null, 2)
      : formatText(base, changed, rows),
  );
  return EXIT_CODES.ok;
}
