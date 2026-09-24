import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { legacyLayoutConfig as defaultConfig } from "./legacyLayoutConfig.js";
import { validateDefinedIds } from "../../src/core/validators/ids.js";

/**
 * `QFAI-ID-001` keys an ID on the set of files that define it, so a second
 * definition in the same file is invisible to it. Two headings declaring one
 * ID in a single pack file are what `QFAI-ID-002` reports.
 */
async function withSpecs(
  files: Record<string, string>,
  task: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-heading-ids-"));
  try {
    for (const spec of ["spec-0001", "spec-0002"]) {
      const dir = path.join(root, ".qfai", "specs", spec);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
      await writeFile(path.join(dir, "02_User-stories.md"), "# 02 User Stories\n", "utf-8");
      await writeFile(path.join(dir, "03_Acceptance-Criteria.md"), "# 03 AC\n", "utf-8");
    }
    await mkdir(path.join(root, ".qfai", "specs", "_policies"), { recursive: true });
    for (const [rel, body] of Object.entries(files)) {
      await writeFile(path.join(root, ".qfai", "specs", rel), body, "utf-8");
    }
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const byCode = async (root: string, code: string) =>
  (await validateDefinedIds(root, defaultConfig)).filter((entry) => entry.code === code);

describe("one ID declared by two headings of one file (QFAI-ID-002)", () => {
  it("reports the ID once, naming both headings", async () => {
    const criteria = [
      "# 03 Acceptance Criteria",
      "",
      "## AC-0001-0008: Business Flow Mermaid",
      "",
      "Given a pack, then the flow is a diagram.",
      "",
      "## AC-0001-0008: Missing Markdown Blocks Preflight",
      "",
      "Given a missing block, then preflight stops.",
      "",
    ].join("\n");
    await withSpecs({ "spec-0001/03_Acceptance-Criteria.md": criteria }, async (root) => {
      const issues = await byCode(root, "QFAI-ID-002");
      expect(issues).toHaveLength(1);
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.refs).toEqual(["AC-0001-0008"]);
      expect(issues[0]?.message).toContain('"AC-0001-0008: Business Flow Mermaid" (line 3)');
      expect(issues[0]?.message).toContain(
        '"AC-0001-0008: Missing Markdown Blocks Preflight" (line 7)',
      );
      expect(await byCode(root, "QFAI-ID-001")).toEqual([]);
    });
  });

  it("leaves a summary-table row beside its own heading alone", async () => {
    const criteria = [
      "# 03 Acceptance Criteria",
      "",
      "| AC-ID | Title |",
      "| ----- | ----- |",
      "| AC-0001-0001 | one |",
      "",
      "## AC-0001-0001: one",
      "",
      "```markdown",
      "## AC-0001-0001: an example inside a fence",
      "```",
      "",
    ].join("\n");
    await withSpecs({ "spec-0001/03_Acceptance-Criteria.md": criteria }, async (root) => {
      expect(await byCode(root, "QFAI-ID-002")).toEqual([]);
      expect(await byCode(root, "QFAI-ID-001")).toEqual([]);
    });
  });

  it("keeps a heading in each of two files a cross-file duplicate", async () => {
    const heading = "# 03 Acceptance Criteria\n\n## AC-0001-0003: shared\n";
    await withSpecs(
      {
        "spec-0001/03_Acceptance-Criteria.md": heading,
        "spec-0002/03_Acceptance-Criteria.md": heading,
      },
      async (root) => {
        expect(await byCode(root, "QFAI-ID-002")).toEqual([]);
        const crossFile = await byCode(root, "QFAI-ID-001");
        expect(crossFile).toHaveLength(1);
        expect(crossFile[0]?.message).toContain("AC-0001-0003");
      },
    );
  });
});
