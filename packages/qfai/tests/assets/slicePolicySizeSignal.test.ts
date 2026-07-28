import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const TEMPLATES = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/_policies/11_Slice-Policy.md",
  ".qfai/assistant/skills/qfai-sdd/templates/specs/_policies/11_Slice-Policy.md",
];

/** Returns the `## APPEND vs CREATE algorithm` body. */
function algorithm(content: string): string {
  const start = content.indexOf("## APPEND vs CREATE algorithm");
  if (start === -1) {
    return "";
  }
  const rest = content.slice(start + 1);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}

describe("11_Slice-Policy.md treats item counts as a signal, not a SPLIT trigger", () => {
  for (const relativePath of TEMPLATES) {
    it(`${relativePath}: no algorithm step decides SPLIT on a count alone`, async () => {
      const section = algorithm(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      expect(section).not.toBe("");

      expect(section).not.toContain("exceeds the AC/TC\n   thresholds → **SPLIT**");
      expect(section).not.toContain("Upgrade to **SPLIT**");
      expect(section).toContain("size signal, not an operation");
      expect(section).toContain("capability-ownership review");
    });

    it(`${relativePath}: the algorithm cites the validator that makes a count-split illegal`, async () => {
      const section = algorithm(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      expect(section).toContain("QFAI-SPLIT-102");
      expect(section).toContain("QFAI-SPLIT-104");
      expect(section).toContain("validateSpecSplitByCapability");
    });

    it(`${relativePath}: obligation-conserving re-granulation is named as a non-trigger`, async () => {
      const section = algorithm(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      expect(section).toMatch(/obligation-conserving re-granulation/i);
      expect(section).toContain("zero added and zero removed");
    });

    it(`${relativePath}: the SPLIT trigger stays capability-based in the operation table`, async () => {
      const content = await readFile(path.join(repoRoot, relativePath), "utf-8");
      expect(content).toContain("Existing spec covers >1 capability");
    });
  }
});
