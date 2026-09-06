/**
 * The `discussion` profile can see whether the root DESIGN.md parses (#1098).
 *
 * `qfai-discussion` MUSTs a parsable root DESIGN.md and prescribes
 * `--profile discussion` as its gate. That profile ran five validators —
 * mermaid, pack readiness, visuals, research summary, review artifacts — and
 * none of them read DESIGN.md, so `QFAI-DCON-033` reached a run only through
 * the sdd or prototyping readiness gates. A malformed file therefore passed the
 * stage that AUTHORED it and surfaced a review round later, under a different
 * skill.
 *
 * The rows here are the four states the split has to get right: a malformed
 * file is reported, a well-formed one is not, an absent one is not (that is
 * `QFAI-DCON-030`'s), and the lock is left alone — the lock comparison is
 * `/qfai-sdd` Phase 0's to clear, and pulling it in would make a discussion run
 * fail for a reason the discussion stage cannot fix.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateRootDesignMdParse } from "../../src/core/validators/index.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function project(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-dcon033-"));
  dirs.push(dir);
  return dir;
}

// Verbatim from `designContractReadiness.test.ts`, which tests the other
// half of the same validator. Copied rather than imported because a test
// file is not a module other tests should depend on, and a fixture that
// drifted from the one the sibling gate is measured against would make the
// two disagree silently.
const VALID_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand Philosophy",
  "",
].join("\n");

/**
 * The valid fixture with an `accessibility:` block spliced in before the
 * closing front-matter fence.
 *
 * Built by insertion rather than written out, so the required visual tokens
 * cannot fall out of date. A hand-written minimal document failed on
 * `visual.colors.secondary` long before it reached the key under test, which
 * is how this helper came to exist.
 */
function withAccessibility(entry: string): string {
  const fence = VALID_DESIGN_MD.indexOf("\n---\n", 4);
  if (fence === -1) throw new Error("the fixture has no closing front-matter fence");
  return (
    VALID_DESIGN_MD.slice(0, fence) + "\naccessibility:\n" + entry + VALID_DESIGN_MD.slice(fence)
  );
}

describe("the discussion profile's DESIGN.md parse check", () => {
  it("reports an unknown accessibility key, naming the allowed set", async () => {
    // The live failure: a reviewer adds an accessibility obligation as a new
    // key, the discussion gate passes, and the break appears a round later.
    const root = await project();
    await writeFile(path.join(root, "DESIGN.md"), withAccessibility("  wcag_level: AA"), "utf-8");

    const issues = await validateRootDesignMdParse(root);

    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-DCON-033"]);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.file).toBe("DESIGN.md");
    // The allowed set travels with the finding, which is what makes it
    // self-service rather than a trip to the spec.
    expect(issues[0]?.message).toContain("wcag_level");
    expect(issues[0]?.message).toContain("contrast_ratio_min");
    expect(issues[0]?.message).toContain("motion");
  });

  it("stays silent on a DESIGN.md that parses", async () => {
    const root = await project();
    await writeFile(path.join(root, "DESIGN.md"), withAccessibility("  motion: reduced"), "utf-8");

    expect(await validateRootDesignMdParse(root)).toEqual([]);
  });

  it("stays silent when there is no DESIGN.md", async () => {
    // `QFAI-DCON-030` owns missing-file, and a discussion run happens before
    // the file necessarily exists. Reporting here would either double up on one
    // state or fail a project that has not reached this artifact.
    const root = await project();

    expect(await validateRootDesignMdParse(root)).toEqual([]);
  });

  it("does not report lock drift, which is a later stage's to clear", async () => {
    // The reason this is a separate entry point rather than a flag on the
    // readiness gate. A DESIGN.md that parses but no longer matches its frozen
    // hash is `/qfai-sdd` Phase 0's failure; making a discussion run fail on it
    // would block the stage that cannot fix it.
    const root = await project();
    await writeFile(path.join(root, "DESIGN.md"), withAccessibility("  motion: reduced"), "utf-8");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(
      path.join(root, "DESIGN.md.lock.yaml"),
      "sha256: 0000000000000000000000000000000000000000000000000000000000000000\n",
      "utf-8",
    );

    expect(await validateRootDesignMdParse(root)).toEqual([]);
  });
});
