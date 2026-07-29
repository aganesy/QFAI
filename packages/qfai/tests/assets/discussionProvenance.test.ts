import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped surface plus its root mirror; both must carry the same contract. */
const SPEC_TEMPLATE_DIRS = [
  path.join(
    repoRoot,
    "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/spec",
  ),
  path.join(repoRoot, ".qfai/assistant/skills/qfai-sdd/templates/specs/spec"),
];

async function readTemplate(dir: string, name: string): Promise<string> {
  return readFile(path.join(dir, name), "utf-8");
}

describe("discussion provenance carried into the spec layer", () => {
  // Every discussion pack renumbers from DUS-001 / DAC-001-01, so a bare
  // discussion ID cannot identify its pack. A spec that a second pack later
  // UPDATE:APPENDs would then carry two different origins under one Source.
  it("qualifies every Source with the pack id", async () => {
    for (const dir of SPEC_TEMPLATE_DIRS) {
      const stories = await readTemplate(dir, "02_User-stories.md");
      expect(stories).toContain("- Source: discussion-YYYYMMDDhhmmssSSS#DUS-XXX");
      expect(stories).toContain("`<pack-id>#<discussion-id>`");
      expect(stories).not.toMatch(/^- Source: DUS-/m);

      const criteria = await readTemplate(dir, "03_Acceptance-Criteria.md");
      expect(criteria).toContain("# Source: discussion-YYYYMMDDhhmmssSSS#DAC-001-01");
      expect(criteria).toContain("`<pack-id>#<discussion-id>`");
    }
  });

  // The AC Catalog is optional. Holding Source only there meant a spec that
  // skipped it had nowhere to record provenance at all.
  it("keeps the AC Source in the required Gherkin block and nowhere else", async () => {
    for (const dir of SPEC_TEMPLATE_DIRS) {
      const criteria = await readTemplate(dir, "03_Acceptance-Criteria.md");

      const gherkinStart = criteria.indexOf("## AC Gherkin (required)");
      const catalogStart = criteria.indexOf("## AC Catalog (optional)");
      expect(gherkinStart).toBeGreaterThanOrEqual(0);
      expect(catalogStart).toBeGreaterThan(gherkinStart);

      const requiredSection = criteria.slice(gherkinStart, catalogStart);
      expect(requiredSection).toContain("# Source:");

      // The optional catalog must not carry a second, drift-prone copy.
      const catalogSection = criteria.slice(catalogStart);
      const catalogHeaderRow = catalogSection
        .split("\n")
        .find((line) => line.startsWith("| AC-ID"));
      expect(catalogHeaderRow).toBeDefined();
      expect(catalogHeaderRow).not.toContain("Source");
    }
  });
});
