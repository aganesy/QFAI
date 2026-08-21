/**
 * `### Change Type` printed `decision entries: 0` for a tree full of deltas.
 *
 * `parseDeltaV1` reads one shape only (`## Decision Log` / `### DL-` /
 * `#### Meta`), and the shipped template did not carry it, so every populated
 * `09_delta.md` parsed to nothing and the whole section reported zeros while
 * `delta coverage: ok (issues=0)` sat underneath it (#545).
 *
 * A count of zero has to name the input it counted: "no delta was classified"
 * and "deltas were read and none could be parsed" are different claims, and
 * only the second one is a defect the author can act on.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createReportData, formatReportMarkdown } from "../../src/core/report.js";

/** The shape the shipped template used to teach: no `## Decision Log` at all. */
const UNPARSABLE_DELTA = `# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-08-22
- Primary: Behavior
- Tags: @api
- Summary: something real happened here
`;

const PARSABLE_DELTA = `# 09 Delta

## Decision Log

### DL-0001

#### Meta

\`\`\`yaml
id: DL-0001
date: 2026-08-22
primary: Behavior
tags: ["@api"]
compat: Change
scope:
  - src/core/report.ts
notes: something real happened here
\`\`\`
`;

async function withProject<T>(
  fn: (root: string) => Promise<T>,
  opts: { delta?: string } = {},
): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-deltascan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["05_Examples.md", "# 05 Examples\n\n| EX-ID | BR-Ref |\n| --- | --- |\n"],
      ["06_Test-Cases.md", "# TC\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    if (opts.delta !== undefined) {
      await writeFile(path.join(specDir, "09_delta.md"), opts.delta, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the Change Type summary names the input it counted", () => {
  it("says how many delta files were read when none of them parses", async () => {
    await withProject(
      async (root) => {
        const data = await createReportData(root);

        expect(data.changeType.summary.deltaFilesScanned).toBe(1);
        expect(data.changeType.summary.totalEntries).toBe(0);

        const markdown = formatReportMarkdown(data);
        expect(markdown).toContain("- delta files scanned: 1");
        expect(markdown).toContain("- decision entries: 0");
        expect(markdown).toContain("nothing parsed, not because nothing is wrong");
      },
      { delta: UNPARSABLE_DELTA },
    );
  });

  it("does not cry wolf when there is no delta file to read", async () => {
    await withProject(async (root) => {
      const data = await createReportData(root);

      expect(data.changeType.summary.deltaFilesScanned).toBe(0);

      const markdown = formatReportMarkdown(data);
      expect(markdown).toContain("- delta files scanned: 0");
      expect(markdown).not.toContain("nothing parsed, not because nothing is wrong");
    });
  });

  it("stays quiet once the delta carries the structure the parser reads", async () => {
    await withProject(
      async (root) => {
        const data = await createReportData(root);

        expect(data.changeType.summary.deltaFilesScanned).toBe(1);
        expect(data.changeType.summary.totalEntries).toBe(1);
        expect(data.changeType.summary.primary.Behavior).toBe(1);
        expect(data.changeType.summary.compat.Change).toBe(1);

        const markdown = formatReportMarkdown(data);
        expect(markdown).toContain("- delta files scanned: 1");
        expect(markdown).not.toContain("nothing parsed, not because nothing is wrong");
      },
      { delta: PARSABLE_DELTA },
    );
  });
});
