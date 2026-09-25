/**
 * Integration: `qfai validate` applies the governed-layer provenance checks to the installed
 * workflow plans, and never to the migration memos beside them.
 */
// QFAI:SPEC-0004:TC-0004-0080
// QFAI:SPEC-0004:TC-0004-0081
// QFAI:SPEC-0004:TC-0004-0082
// QFAI:SPEC-0004:TC-0004-0083
import { existsSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import type { Issue } from "../../../src/core/types.js";
import { validateAssistantAssets } from "../../../src/core/validators/assistantAssets.js";
import { EDITED_MEMO, EDITED_PLAN, assistantFile, withInstall } from "../init/upgradeStates.js";

/** The `QFAI-ASSETS-*` findings whose file sits under `dir`, a path relative to the tree. */
async function assetFindingsUnder(root: string, dir: string): Promise<Issue[]> {
  const issues = await validateAssistantAssets(root, defaultConfig);
  const prefix = assistantFile(root, dir);
  return issues.filter(
    (found) =>
      found.code.startsWith("QFAI-ASSETS-") &&
      found.file !== undefined &&
      (found.file === prefix || found.file.startsWith(`${prefix}${path.sep}`)),
  );
}

describe("the installed plans are a governed layer", () => {
  it("TC-0004-0080: An edited plan is reported as a differing governed file", async () => {
    await withInstall(["edited-plan"], async (root) => {
      const findings = await assetFindingsUnder(root, "process/workflows");

      expect(findings.map((found) => [found.code, found.severity, found.file])).toEqual([
        ["QFAI-ASSETS-005", "error", assistantFile(root, EDITED_PLAN)],
      ]);
    });
  });

  it("TC-0004-0081: A deleted plans layer is reported once, against the layer", async () => {
    await withInstall([], async (root) => {
      await rm(assistantFile(root, "process/workflows"), { recursive: true, force: true });
      const findings = await assetFindingsUnder(root, "process/workflows");

      expect(findings.map((found) => [found.code, found.file])).toEqual([
        ["QFAI-ASSETS-007", assistantFile(root, "process/workflows")],
      ]);
    });
  });

  it("TC-0004-0082: Nothing under process/migrations is reported", async () => {
    await withInstall(["edited-memo"], async (root) => {
      await writeFile(assistantFile(root, "process/migrations/added.md"), "# Added\n", "utf-8");
      expect(existsSync(assistantFile(root, EDITED_MEMO)), "the edited memo is installed").toBe(
        true,
      );

      expect(await assetFindingsUnder(root, "process/migrations")).toEqual([]);
    });
  });

  it("TC-0004-0083: A fresh init tree has no finding under process/workflows", async () => {
    await withInstall([], async (root) => {
      expect(await assetFindingsUnder(root, "process/workflows")).toEqual([]);
    });
  });
});
