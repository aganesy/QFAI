/**
 * Migrating a legacy CAP catalog onto the declared `Spec` column.
 *
 * A `_policies/03_Capabilities.md` written before the column existed carries no
 * mapping, so `validateSpecSplitByCapability` derives CAP -> spec from row
 * position. That derivation cannot hold an ID gap, which is what an approved
 * DELETE leaves behind: the removed directory draws `QFAI-SPLIT-103`, every
 * survivor after it draws `-104`, and each shifted pairing draws `-105`. All
 * three are errors, so a project on the old catalog cannot complete a DELETE at
 * all until the column is there.
 *
 * `qfai init` treats `.qfai/specs/**` as the project's own data and never
 * rewrites it, `--force` included, so no upgrade adds the column. This module
 * is the migration, and it is deliberately not a side effect of an upgrade:
 * `qfai doctor` reports the condition, and `--autoremediate` performs the write
 * after the operator has asked for it.
 *
 * Two rules shape it.
 *
 * **Every row or none.** The column's PRESENCE selects the declared mapping,
 * however few cells are filled, so a half-written column is worse than none: a
 * catalog with one empty cell reports `QFAI-SPLIT-106` for that row rather than
 * falling back to the positional derivation it was working under.
 *
 * **Only where the positional derivation is currently correct.** Row N's value
 * is `spec-000N`, and writing that is honest exactly when the directory it
 * names is on disk and carries the row's CAP. Where the positions already
 * disagree with the tree, the pairing a human wants is not recoverable from the
 * file — the tool says so and writes nothing.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { collectSpecEntries } from "../specLayout.js";
import { locateCapCatalogTable } from "../validators/specSplitByCapability.js";
import { exists, readSafe, to4 } from "../validators/utils.js";

/** What the catalog is, and what a migration could do about it. */
export type CapCatalogMigrationPlan =
  /** No `_policies/03_Capabilities.md`, or no catalog table in it. */
  | { readonly state: "no-catalog" }
  /** The catalog already declares the column; nothing to migrate. */
  | { readonly state: "declared" }
  /** Every row's positional pairing holds, so the column can be written. */
  | {
      readonly state: "migratable";
      readonly file: string;
      /** `CAP-000N` -> `spec-000N`, in table order. */
      readonly pairs: ReadonlyArray<{ readonly capId: string; readonly specId: string }>;
    }
  /** The positions do not describe the tree; a human has to decide the pairing. */
  | { readonly state: "ambiguous"; readonly file: string; readonly reasons: readonly string[] };

/** The header cell the migration writes, and the value shape it writes under it. */
const SPEC_COLUMN_HEADER = "Spec";

/**
 * Reads the catalog and decides which of the four states it is in.
 *
 * `specsRoot` is the resolved `paths.specsDir`, so a project that moved its
 * specs is read where it actually keeps them.
 */
export async function planCapCatalogSpecColumn(
  specsRoot: string,
): Promise<CapCatalogMigrationPlan> {
  const file = path.join(specsRoot, "_policies", "03_Capabilities.md");
  if (!(await exists(file))) {
    return { state: "no-catalog" };
  }
  const text = await readSafe(file);
  const table = locateCapCatalogTable(text);
  if (table === null) {
    return { state: "no-catalog" };
  }
  if (table.specColumn >= 0) {
    return { state: "declared" };
  }

  const entries = await collectSpecEntries(specsRoot);
  const onDisk = new Map<string, string>();
  for (const entry of entries) {
    const key = path.basename(entry.dir).toLowerCase();
    if (!onDisk.has(key)) {
      onDisk.set(key, entry.dir);
    }
  }

  const pairs: Array<{ capId: string; specId: string }> = [];
  const reasons: string[] = [];
  for (const [index, capId] of table.rowCapIds.entries()) {
    const specId = `spec-${to4(index + 1)}`;
    const dir = onDisk.get(specId);
    if (dir === undefined) {
      reasons.push(`${capId} sits at row ${String(index + 1)}, and ${specId} is not on disk`);
      continue;
    }
    // The directory existing is not the pairing. `QFAI-SPLIT-105` asks the spec
    // to name its CAP, and that back-reference is the only evidence in the tree
    // that this row and this directory belong together — without it the write
    // would record a pairing the validator is about to reject.
    const specText = await readSafe(path.join(dir, "01_Spec.md"));
    if (!specText.includes(capId)) {
      reasons.push(
        `${specId}/01_Spec.md does not name ${capId}, which row ${String(index + 1)} pairs it with`,
      );
      continue;
    }
    pairs.push({ capId, specId });
  }

  if (reasons.length > 0) {
    return { state: "ambiguous", file, reasons };
  }
  if (pairs.length === 0) {
    // A confirmed table with no CAP row declares an empty catalog. Adding a
    // column to it changes nothing a reader or the validator can act on.
    return { state: "no-catalog" };
  }
  return { state: "migratable", file, pairs };
}

/**
 * Writes the `Spec` column into the catalog table, all rows at once.
 *
 * The column goes immediately after the CAP column, which is where the shipped
 * template puts it, so a migrated catalog and a freshly seeded one read the
 * same. Rows are written from the plan rather than re-derived here: the plan is
 * what was reported to the operator, and re-deriving would let the write differ
 * from what they approved.
 */
export async function applyCapCatalogSpecColumn(plan: CapCatalogMigrationPlan): Promise<void> {
  if (plan.state !== "migratable") {
    return;
  }
  const original = await readFile(plan.file, "utf-8");
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.replace(/\r\n/g, "\n").split("\n");
  const table = locateCapCatalogTable(original);
  if (table === null || table.specColumn >= 0) {
    // The file moved under the plan. Writing against stale line numbers is the
    // one way this can corrupt a catalog, so it declines instead.
    return;
  }
  if (table.rowLines.length !== plan.pairs.length) {
    return;
  }

  const insertAt = table.capColumn + 1;
  const withCell = (line: string, cell: string): string => {
    const cells = splitRow(line);
    if (cells === null) {
      return line;
    }
    cells.splice(insertAt, 0, cell);
    return `| ${cells.join(" | ")} |`;
  };

  lines[table.headerLine] = withCell(lines[table.headerLine] ?? "", SPEC_COLUMN_HEADER);
  lines[table.delimiterLine] = withCell(lines[table.delimiterLine] ?? "", "---------");
  for (const [index, rowLine] of table.rowLines.entries()) {
    const specId = plan.pairs[index]?.specId;
    if (specId === undefined) {
      return;
    }
    lines[rowLine] = withCell(lines[rowLine] ?? "", specId);
  }

  await writeFile(plan.file, lines.join(eol), "utf-8");
}

/**
 * The cells of a pipe table row, or `null` when the line is not one.
 *
 * Deliberately not `splitMarkdownRow`: that reader trims for comparison, and
 * this one is rebuilding the line. Escaped pipes stay escaped because the split
 * skips them, so a `Notes` cell holding `a \| b` survives the rewrite.
 */
function splitRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|") || trimmed.length < 2) {
    return null;
  }
  const cells: string[] = [];
  let cell = "";
  for (let index = 1; index < trimmed.length - 1; index += 1) {
    const char = trimmed.charAt(index);
    if (char === "\\") {
      cell += char + trimmed.charAt(index + 1);
      index += 1;
      continue;
    }
    if (char === "|") {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell.trim());
  return cells;
}
