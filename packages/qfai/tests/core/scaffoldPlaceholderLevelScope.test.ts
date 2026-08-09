/**
 * An unfilled L1/L2 skeleton kept blocking the ATDD gate after L1/L2 left it.
 *
 * `qfai atdd scaffold` does not route by `Level` — it writes a skeleton to
 * `tests/integration/<spec>/` for every declared TC. `validateScaffoldPlaceholder`
 * then escalates an unfilled one to `error`, so `validate --profile atdd|full`
 * failed on a placeholder for a TC that ATDD no longer owes anything for. The
 * exclusion has to reach this rule too, or `QFAI-ATDD-112` was merely traded
 * for `D-SCAFFOLD-PLACEHOLDER`.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { SCAFFOLD_PLACEHOLDER_MARKER } from "../../src/core/atdd/scaffold.js";
import { validateScaffoldPlaceholder } from "../../src/core/validators/scaffoldPlaceholder.js";

async function withSkeletons(
  levels: Record<string, string>,
  task: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-level-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(
      path.join(specDir, "06_Test-Cases.md"),
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        ...Object.entries(levels).map(
          ([id, level]) => `| ${id} | ${level} | AC-0001 | - | s | e |`,
        ),
        "",
      ].join("\n"),
      "utf-8",
    );
    const scaffoldDir = path.join(root, "tests", "integration", "spec-0001");
    await mkdir(scaffoldDir, { recursive: true });
    for (const id of Object.keys(levels)) {
      await writeFile(
        path.join(scaffoldDir, `${id}.test.ts`),
        `${SCAFFOLD_PLACEHOLDER_MARKER}\n// TODO: implement assertion for ${id}\n`,
        "utf-8",
      );
    }
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const refs = (issues: Awaited<ReturnType<typeof validateScaffoldPlaceholder>>): string =>
  issues.map((entry) => `${entry.file ?? ""} ${entry.message}`).join("\n");

describe("D-SCAFFOLD-PLACEHOLDER follows the same Level exclusion as QFAI-ATDD-112", () => {
  it("says nothing about an unfilled skeleton for an L1 TC", async () => {
    await withSkeletons({ "TC-0001-0001": "L1" }, async (root) => {
      expect(await validateScaffoldPlaceholder(root, defaultConfig)).toEqual([]);
    });
  });

  it("still reports an unfilled skeleton for an L3 TC", async () => {
    await withSkeletons({ "TC-0001-0002": "L3" }, async (root) => {
      const issues = await validateScaffoldPlaceholder(root, defaultConfig);
      expect(issues.length).toBeGreaterThan(0);
      expect(refs(issues)).toContain("TC-0001-0002");
    });
  });

  it("reports only the owed TC when a file carries both", async () => {
    await withSkeletons({ "TC-0001-0003": "L2", "TC-0001-0004": "L3" }, async (root) => {
      const reported = refs(await validateScaffoldPlaceholder(root, defaultConfig));
      expect(reported).toContain("TC-0001-0004");
      expect(reported).not.toContain("TC-0001-0003");
    });
  });
});
