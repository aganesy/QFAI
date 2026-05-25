/**
 * Scanner suite test-count floor.
 *
 * The scanner suite (every `*.test.ts` under
 * `tests/unit/core/prototyping/scanners/` plus the original
 * `tests/core/prototyping/designMdViolations.test.ts`) MUST carry
 * at least 30 unit-level `it` blocks combined.
 *
 * Why a count floor matters: matrix coverage across scanner kinds
 * (color/font/radius/shadow) × edge cases (preflight allowlist /
 * var() unwrap / CSS-wide keywords / shadow-decl strip) needs a
 * minimum density to catch regressions on edits to the scanner
 * module. The count floor is the cheaper, deterministic half of
 * the coverage gate.
 *
 * Statement-coverage half (the >= 90% threshold on the scanner
 * module itself) is intentionally deferred to a future c8 CI lane
 * — see follow-up DR pointer. This file owns only the test-count
 * floor, which is independently verifiable in-process.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { describe, expect, it } from "vitest";

import fg from "fast-glob";

const here = path.dirname(fileURLToPath(import.meta.url));
// `here` resolves to packages/qfai/tests/unit/core/prototyping/scanners.
// Walk up to the qfai package root and scan the full scanner test
// surface.
const qfaiPkgRoot = path.resolve(here, "../../../../../");

const SCANNER_TEST_GLOBS = [
  "tests/unit/core/prototyping/designMdViolations.tailwindAllowlist.test.ts",
  "tests/unit/core/prototyping/scanners/*.test.ts",
  "tests/core/prototyping/designMdViolations.test.ts",
];

// Match `it(` and `it.each(` calls (count each .each row once).
// Excludes `it.skip` / `it.todo` because they are non-executable.
const IT_BLOCK_RE = /\bit\s*\(/g;

async function countItBlocks(absFile: string): Promise<number> {
  const content = await readFile(absFile, "utf-8");
  return Array.from(content.matchAll(IT_BLOCK_RE)).length;
}

describe("Scanner suite test-count floor", () => {
  it("scanner test file count is at least 4 (matrix coverage floor)", async () => {
    const files = await fg(SCANNER_TEST_GLOBS, { cwd: qfaiPkgRoot, absolute: true });
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it("aggregated scanner `it(` block count is at least 30", async () => {
    const files = await fg(SCANNER_TEST_GLOBS, { cwd: qfaiPkgRoot, absolute: true });
    let total = 0;
    for (const f of files) {
      total += await countItBlocks(f);
    }
    expect(total).toBeGreaterThanOrEqual(30);
  });
});
