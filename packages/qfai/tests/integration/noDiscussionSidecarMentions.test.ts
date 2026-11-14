import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ASSETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets");
const TEXT_EXTENSIONS = new Set([".md", ".yaml", ".yml", ".json", ".toml", ".txt"]);

// The discussion pack and its `uiux/` sidecars were removed. A shipped file that
// still names a discussion or UI/UX sidecar sends an agent looking for files a
// project no longer has.
const STALE_SIDECAR =
  /(discussion|ui[-/ ]?ux)[^\n]{0,40}\bsidecars?\b|\bsidecars?\b[^\n]{0,40}(discussion|ui[-/ ]?ux)|\bsidecar artifacts\b/i;

// The file names of the removed `uiux/` sidecars. A shipped prompt that names one
// sends an agent looking for a file a project no longer has.
const REMOVED_SIDECAR_FILE =
  /\b(?:00_index|10_implementation_strategy|10_strategy|11_design_taste_interview|12_design_system|20_design_eval_invariant|20_trend_scan|21_design_eval_trend_derived|22_design_eval_product_specific|23_design_eval_aggregate|24_design_eval_dynamic_overrides|30_exploration_brief|30_option_comparison|31_anchor|31_reference_pool|31_selected_anchor_screen|32_design_anti_goals|33_exploration_rubric|34_evaluator_calibration|40_screen_contracts|50_review_input_bundle|60_critique_loop)\.md\b/;

async function listTextFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listTextFiles(full);
      }
      return entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
    }),
  );
  return nested.flat();
}

describe("shipped assets after the discussion pack removal", () => {
  it("name no discussion or UI/UX sidecar, nor a removed sidecar file", async () => {
    const files = await listTextFiles(ASSETS);
    const offenders: string[] = [];
    for (const file of files) {
      const lines = (await readFile(file, "utf8")).split("\n");
      lines.forEach((line, index) => {
        if (STALE_SIDECAR.test(line) || REMOVED_SIDECAR_FILE.test(line)) {
          offenders.push(`${path.relative(ASSETS, file)}:${index + 1}`);
        }
      });
    }
    expect(files.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
