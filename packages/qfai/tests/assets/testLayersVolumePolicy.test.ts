import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const TEST_LAYERS = [
  "packages/qfai/assets/init/.qfai/assistant/catalog/test-layers.md",
  ".qfai/assistant/catalog/test-layers.md",
];

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which the sentence happened to break.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

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

    it(`${relativePath}: records into evidence, which the drift protocol whitelists`, async () => {
      const section = unwrap(
        volumePolicy(await readFile(path.join(repoRoot, relativePath), "utf-8")),
      );
      // A downstream stage may not write `*_delta.md` or the per-spec Open
      // Questions file without approval, so recording there would re-impose
      // the STOP-and-wait this section removes.
      expect(section).toContain("stage's evidence file under `.qfai/evidence/`");
      expect(section).toContain(".qfai/evidence/atdd-<spec-id>.md");
      expect(section).toContain(".qfai/evidence/implement-<spec-id>.md");
      expect(section).toContain("whitelists `.qfai/evidence/**` append/update");
      expect(section).not.toMatch(/Record the observed distribution[^.]*`\*_delta\.md`/);
    });

    it(`${relativePath}: names the per-spec Open Questions file each layout actually uses`, async () => {
      const section = unwrap(
        volumePolicy(await readFile(path.join(repoRoot, relativePath), "utf-8")),
      );
      // `09_Open-questions.md` is the shared `_policies` file; the per-spec
      // names are `08_` (layered) and `15_` (spec pack).
      expect(section).toContain("`08_Open-questions.md` in a layered spec");
      expect(section).toContain("`15_Open-questions.md` in a spec pack");
      expect(section).toContain(
        "(`09_Open-questions.md` is the shared `_policies` file, not a per-spec one.)",
      );
    });

    it(`${relativePath}: forbids re-labelling a declared layer to clear a signal`, async () => {
      const content = await readFile(path.join(repoRoot, relativePath), "utf-8");
      const antiPatterns = content.slice(content.indexOf("## Anti-patterns"));
      expect(antiPatterns).toContain("Do not inflate tests only to satisfy floor numbers.");
      expect(antiPatterns).toMatch(/re-label/i);
    });
  }
});
