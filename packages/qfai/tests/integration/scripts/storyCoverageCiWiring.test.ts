import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

describe("story coverage in the repository CI", () => {
  it("runs the BF, AC and EX validators through the full dogfood profile", async () => {
    const [manifestText, workflow, validator] = await Promise.all([
      readFile(path.join(repoRoot, "package.json"), "utf-8"),
      readFile(path.join(repoRoot, ".github/workflows/ci.yml"), "utf-8"),
      readFile(path.join(repoRoot, "packages/qfai/src/core/validate.ts"), "utf-8"),
    ]);
    const manifest = JSON.parse(manifestText) as { scripts: Record<string, string> };

    expect(manifest.scripts["ci:lint:scans"]).not.toContain("check-atdd-annotation-ledger");
    expect(workflow).toContain("node scripts/check-dogfood-backlog.mjs --profile full");
    expect(validator).toContain('validateStoryTreeObligations(root, config, "atdd", model)');
    expect(validator).toContain("validateStoryTreeCoverageDepth(");
    expect(validator).toContain('validateStoryTreeObligations(root, config, "tdd", model)');
    expect(validator).toMatch(
      /case "full":[\s\S]*?\.\.\.\(await atdd\(\)\)[\s\S]*?\.\.\.\(await tdd\(false, false\)\)/,
    );
  });
});
