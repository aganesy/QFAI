/**
 * verify semantics audit tests — spec-0014 migration / compatibility alignment
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

// QFAI:AC-0001-0156-03
// QFAI:EX-0001-0156-02
describe("TC-0014-0019: removed compatibility surface", () => {
  it("package surface exposes no legacy namespace or compatibility category", async () => {
    const [validatorsIndexSrc, typesSrc] = await Promise.all([
      readFile(
        path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "index.ts"),
        "utf-8",
      ),
      readFile(path.join(repoRoot, "packages", "qfai", "src", "core", "types.ts"), "utf-8"),
    ]);

    expect(validatorsIndexSrc).not.toContain("validators/legacy");
    expect(validatorsIndexSrc).not.toContain("runLegacyUixCompatibilityValidators");
    expect(typesSrc).toMatch(/type\s+IssueCategory\s*=\s*"canonical"\s*\|\s*"change"/);
    expect(typesSrc).not.toContain('"compatibility"');
  });
});
