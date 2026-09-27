/**
 * A temporary project holding one active spec whose `09_delta.md` carries a given triage table, and
 * the triage findings `validateSpecPacks` reports over it.
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { defaultConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { validateSpecPacks } from "../../src/core/validators/specPack.js";

const PACK_FILES: Record<string, string> = {
  "02_User-stories.md": "# 02 User Stories\n",
  "03_Acceptance-Criteria.md": "# 03 AC\n\n- AC-0001-0001: rule\n",
  "04_Business-Rules.md": "# 04 BR\n",
  "05_Examples.md": "# 05 EX\n",
  "06_Test-Cases.md": "# 06 TC\n\n- TC-0001-0001\n",
  "07_Decisions.md": "# 07 Decisions\n",
  "08_Open-questions.md": "# 08 OQ\n",
};

/** One table row, from its cells in header order. */
export function triageRow(cells: readonly string[]): string {
  return `| ${cells.join(" | ")} |`;
}

/** A triage table from its header cells and its rows. */
export function triageTable(headers: readonly string[], rows: readonly string[][]): string {
  return [
    triageRow(headers),
    triageRow(headers.map(() => "---")),
    ...rows.map((cells) => triageRow(cells)),
  ].join("\n");
}

/** A project under the system temporary directory whose `spec-0001` delta holds `table`. */
export async function seedTriageProject(table: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-triage-"));
  const specsDir = path.join(root, ".qfai", "specs");
  await mkdir(path.join(specsDir, "_policies"), { recursive: true });
  await writeFile(path.join(specsDir, "_policies", "11_Slice-Policy.md"), "# 11 Slice Policy\n");
  await writeTriagePack(root, table);
  return root;
}

/** Writes an active `spec-0001` pack under `root` whose delta holds `table`. */
export async function writeTriagePack(root: string, table: string): Promise<void> {
  const dir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(dir, { recursive: true });
  const spec = [
    "# 01 Spec",
    "",
    "- Spec: spec-0001",
    "- Parent: CAP-0001",
    "- Status: active",
    "- Superseded-by: -",
    "- Deprecated-at: -",
    "",
    "## Scope",
    "",
    "- In: example",
    "- Out: nothing",
    "",
  ].join("\n");
  await writeFile(path.join(dir, "01_Spec.md"), spec);
  for (const [name, body] of Object.entries(PACK_FILES)) {
    await writeFile(path.join(dir, name), body);
  }
  const delta = ["# 09 Delta", "", "## Change Summary", "", "- one change", "", "## Triage", ""];
  await writeFile(path.join(dir, "09_delta.md"), `${[...delta, table, ""].join("\n")}\n`);
}

/** The `QFAI-TRIAGE-*` findings over the project at `root`. */
export async function triageFindings(root: string): Promise<Issue[]> {
  const issues = await validateSpecPacks(root, defaultConfig);
  return issues.filter((finding) => finding.code.startsWith("QFAI-TRIAGE-"));
}
