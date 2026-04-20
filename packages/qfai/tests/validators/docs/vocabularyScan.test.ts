/**
 * Doc vocabulary scan tests — spec-0037 TDD-0008..TDD-0010, TDD-0023
 *
 * QFAI:SPEC-0014:TC-0014-0008
 * QFAI:SPEC-0014:TC-0014-0010
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  detectContradictions,
  runVocabularyScan,
  scanProhibitedTerms,
} from "../../../src/core/validators/docs/vocabularyScan.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-vocab-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("doc vocabulary", () => {
  it("allowed terms pass", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "README.md"),
      "# Project\n\n## Browser QA\n\nStatus: foundation-only\n\n## Render Evidence\n\nStatus: implemented\n",
      "utf-8",
    );

    const result = await runVocabularyScan(root, ["README.md"]);

    expect(result.prohibitedFindings).toHaveLength(0);
  });

  it("prohibited terms fail", () => {
    const content = "# Features\n\n## Auth\n\nStatus: done\n\n## Payments\n\nStatus: preview\n";

    const findings = scanProhibitedTerms(content, "README.md");

    expect(findings.length).toBeGreaterThan(0);
    const terms = findings.map((f) => f.term);
    expect(terms).toContain("done");
    expect(terms).toContain("preview");
  });

  it("contradiction detection", () => {
    const docs = [
      {
        fileName: "README.md",
        content: "# Features\n\n## Browser QA\n\nStatus: implemented\n",
      },
      {
        fileName: "CHANGELOG.md",
        content: "# Changelog\n\n## Browser QA\n\nCurrently foundation-only\n",
      },
    ];

    const contradictions = detectContradictions(docs);

    expect(contradictions.length).toBeGreaterThan(0);
    const first = contradictions[0];
    expect(first.file1).not.toBe(first.file2);
  });
});
