import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: the reads below must resolve
// the same way whether the suite is launched from the repo root, from
// `packages/qfai`, or by an IDE runner with its own CWD.
// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
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

    it(`${relativePath}: distinguishes a configured guardrail from a judgement call`, async () => {
      const section = unwrap(
        volumePolicy(await readFile(path.join(repoRoot, relativePath), "utf-8")),
      );
      // `report.ts::collectTestStrategy` measures a configured
      // maxE2eScenarioRatio / maxE2eScenarioCount and warns on breach, so
      // "no tool-checkable meaning" was wrong for those projects.
      expect(section).toContain("`validation.testStrategy.maxE2eScenarioRatio`");
      expect(section).toContain("`maxE2eScenarioCount`");
      expect(section).toContain("`ratioExceeded` / `countExceeded`");
      expect(section).toContain(
        "record the configured value, the measured value and the report warning",
      );
      // Still non-blocking in both cases.
      expect(section).toContain("Either way completion is not blocked");
      expect(section).not.toContain('so "unmet" has no tool-checkable meaning');
    });

    it(`${relativePath}: names both sources the guardrail can measure`, async () => {
      const section = unwrap(
        volumePolicy(await readFile(path.join(repoRoot, relativePath), "utf-8")),
      );
      // `collectTestStrategy` reads Gherkin `@layer-*` tags where they parse and
      // the ledger's `Layer` column where they do not, and #1197 made the two
      // knobs measure whichever one produced the numbers. The paragraph used to
      // say they "never inspect" anything but Gherkin, which stopped being true
      // of the layered layout — the shape the same paragraph calls normal.
      expect(section).toContain("**What it counts.**");
      expect(section).toContain("Gherkin scenarios parsed out of each spec's Examples file");
      expect(section).toContain("the `Layer` column of every active spec's `tdd/test-list.md`");
      expect(section).toContain("`report.testStrategy.layerSource` names which one");
      expect(section).not.toContain("never inspect `<testsDir>/e2e/**` or any other code test");

      // What it still does not count, which is the honest half of the old claim.
      expect(section).toContain("**What it still does not count**");
      expect(section).toContain("an E2E test written with no ledger row behind it is invisible");

      // And that an unreadable distribution is not a measured one.
      expect(section).toContain("**When both sources are empty**");
      expect(section).toContain('never as "no E2E tests"');
      expect(section).toContain("how the distribution was counted");
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
      // Assert the heading exists before slicing: `indexOf` returns -1 when it
      // does not, and `slice(-1)` would run both assertions against the last
      // character of the file — a failure that names the wrong problem.
      const antiPatternsIndex = content.indexOf("## Anti-patterns");
      expect(
        antiPatternsIndex,
        `${relativePath} must carry an ## Anti-patterns section`,
      ).toBeGreaterThanOrEqual(0);
      const antiPatterns = content.slice(antiPatternsIndex);
      expect(antiPatterns).toContain("Do not inflate tests only to satisfy floor numbers.");
      expect(antiPatterns).toMatch(/re-label/i);
    });
  }
});
