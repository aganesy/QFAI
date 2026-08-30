import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FEEL_FIELDS, ORDINAL_AXES } from "../../src/core/prototyping/evaluatorReview.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped assistant tree plus its root mirror. */
const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant"),
  path.join(repoRoot, ".qfai/assistant"),
];

const SCHEMA_REL = "skills/qfai-prototyping/references/review-payload-schema.md";
const PROMPT_REL = "skills/qfai-prototyping/references/reviewer-prompt.md";
const SKILL_REL = "skills/qfai-prototyping/SKILL.md";

/**
 * The prototyping sources that cite a shipped document as the authority
 * for the reviewer payload. Each one names a `.qfai/assistant/**.md`
 * path that has to survive `qfai init` into a consuming project.
 */
const CITING_SOURCES = [
  "src/core/prototyping/evaluatorReview.ts",
  "src/core/prototyping/reviewerDispatch.ts",
  "src/core/prototyping/licenseVerify.ts",
  "src/cli/commands/prototypingCertify.ts",
];

/** `.qfai/assistant/….md` references, however they are quoted. */
const ASSISTANT_DOC_RE = /\.qfai\/assistant\/[A-Za-z0-9_./-]*\.md/g;

/** The 11 required top-level fields of the closed reviewer payload. */
const REQUIRED_TOP_LEVEL_FIELDS = [
  "specId",
  "screenId",
  "cycle",
  "sessionStatus",
  "retryCount",
  "ordinalAxes",
  "impressions",
  "layoutAntiPatternsDetected",
  "designMdViolations",
  "wallTimeSec",
  "softWarnings",
];

async function readShipped(relative: string): Promise<string[]> {
  return Promise.all(ASSISTANT_ROOTS.map((root) => readFile(path.join(root, relative), "utf-8")));
}

describe("shipped reviewer payload schema", () => {
  // The defect this file guards: five `src/` comments named
  // `.qfai/contracts/cli/qfai-prototyping.md` as the payload SSOT, and
  // `qfai init` ships no `contracts/` tree at all — so the reviewer
  // sub-agent, which runs inside the consuming project, could not open the
  // one document that describes the schema its output is parsed against.
  it("ships every assistant doc the prototyping sources cite", async () => {
    for (const relativeSource of CITING_SOURCES) {
      const source = await readFile(path.join(repoRoot, "packages/qfai", relativeSource), "utf-8");
      const cited = [...new Set(source.match(ASSISTANT_DOC_RE) ?? [])];
      expect(cited.length, `${relativeSource} cites no shipped assistant doc`).toBeGreaterThan(0);
      for (const reference of cited) {
        const withinAssistant = reference.slice(".qfai/assistant/".length);
        for (const root of ASSISTANT_ROOTS) {
          const label = path.relative(repoRoot, root).replace(/\\/g, "/");
          await expect(
            readFile(path.join(root, withinAssistant), "utf-8"),
            `${relativeSource} cites ${reference}, which ${label} does not ship`,
          ).resolves.toBeTypeOf("string");
        }
      }
    }
  });

  it("documents all 11 required fields and the path they live at", async () => {
    for (const schema of await readShipped(SCHEMA_REL)) {
      for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
        expect(schema, `missing field ${field}`).toContain(field);
      }
      for (const axis of ORDINAL_AXES) {
        expect(schema, `missing ordinal axis ${axis}`).toContain(axis);
      }
      for (const feel of FEEL_FIELDS) {
        expect(schema, `missing impressions field ${feel}`).toContain(feel);
      }
      expect(schema).toContain("iter-NN/<spec-id>/<screen>.review.json");
      expect(schema).toContain("closed");
    }
  });

  // A payload written from the prompt's 8-field block is rejected by
  // `parseEvaluatorReview` outright, so the prompt has to say which of its
  // two outputs each schema belongs to.
  it("keeps the reviewer prompt from pointing the per-screen payload at the summary shape", async () => {
    for (const prompt of await readShipped(PROMPT_REL)) {
      expect(prompt).toContain(SCHEMA_REL.slice("skills/qfai-prototyping/".length));
      expect(prompt).toContain("<screen>.review.json");
      // The legacy shape stays documented, but only as the per-cycle
      // summary the orchestrator folds into `prototyping.json`.
      expect(prompt).toContain("Per-cycle summary (`iter-NN/review.json`)");
      expect(prompt).not.toContain("## Output (`iter-NN/review.json`)");
    }
  });

  // A cycle-0 review can itself converge. When the C0 row asks only for
  // the flat `iter-00/review.json`, that run reaches certify with no
  // per-screen payload at all and is rejected (exit 64) — a loop that
  // succeeded cannot be sealed. Both outputs have to be named in the row
  // that actually performs the capture + review, not only in C1..9.
  it("makes cycle 0 emit the per-screen payloads, not only the flat summary", async () => {
    for (const skill of await readShipped(SKILL_REL)) {
      const c0Row = skill.split("\n").find((line) => line.startsWith("| C0"));
      expect(c0Row, "SKILL.md has no C0 loop row").toBeDefined();
      expect(c0Row).toContain("iter-00/<spec-id>/<screen>.review.json");
      expect(c0Row).toContain("iter-00/review.json");
    }
  });
});
