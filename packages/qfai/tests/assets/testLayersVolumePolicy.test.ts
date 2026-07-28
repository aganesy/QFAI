import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const TEST_LAYERS = [
  "packages/qfai/assets/init/.qfai/assistant/catalog/test-layers.md",
  ".qfai/assistant/catalog/test-layers.md",
];

/** Returns the body of `## Volume policy` up to the next `## ` heading. */
function volumePolicy(content: string): string {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "## Volume policy");
  if (start === -1) {
    return "";
  }
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) {
      break;
    }
    body.push(line);
  }
  return body.join("\n");
}

describe("test-layers.md volume policy is a recording obligation, not a gate", () => {
  for (const relativePath of TEST_LAYERS) {
    it(`${relativePath}: does not mandate a Change Request for a volume observation`, async () => {
      const section = volumePolicy(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      expect(section).not.toBe("");

      // The section previously said both "signals, not completion gates" and
      // "STOP / raise a Change Request / wait for explicit user approval".
      expect(section).not.toContain("STOP auto-adjustment");
      expect(section).not.toContain("Wait for explicit user approval");
      expect(section).toContain("Floors and ratios are signals, not completion gates");
      expect(section).toContain("The stage is not blocked");
    });

    it(`${relativePath}: routes a Change Request to the drift protocol instead`, async () => {
      const section = volumePolicy(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      expect(section).toContain("constitution/drift-protocol.md");
      expect(section).toMatch(/record the observed distribution/i);
    });

    it(`${relativePath}: forbids re-labelling a declared layer to clear a signal`, async () => {
      const content = await readFile(path.join(repoRoot, relativePath), "utf-8");
      const antiPatterns = content.slice(content.indexOf("## Anti-patterns"));
      expect(antiPatterns).toContain("Do not inflate tests only to satisfy floor numbers.");
      expect(antiPatterns).toMatch(/re-label/i);
    });
  }
});
