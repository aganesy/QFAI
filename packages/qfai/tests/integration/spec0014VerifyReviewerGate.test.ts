/**
 * The gates `/qfai-verify` holds completion behind when a review comes back
 * `REVISE`.
 *
 * Verify blocks in two places. Its binding gate is a command,
 * `npx qfai validate --profile verify --fail-on error`, and a review artifact
 * carrying a `REVISE` fails it: the first cases feed that command's validation a
 * render critique the reviewer sent back, and the same critique passed.
 *
 * The routed reviewers' gate is a clause an agent executes, not a code path, so
 * what a test can hold there is that the clauses stay: the reviewer answers only
 * `PASS` or `REVISE`, and no DONE is declared until every finding of the one
 * review is fixed or answered. The first two are the shared delegation
 * baseline's, which every skill inherits; the handoff clause is the skill's own.
 * Each clause is read under the section that makes it binding, in the copy
 * `qfai init` ships and in the copy this repository runs.
 */
// QFAI:EX-0001-0157-01

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { shouldFail } from "../../src/cli/lib/failOn.js";
import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";
import { validateProject } from "../../src/core/validate.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");
const SKILL_REL = ".qfai/assistant/skill/qfai-verify/SKILL.md";
const BASELINE_REL = ".qfai/assistant/rule/shared-skill-delegation-baseline.md";

const COPIES = [
  ["shipped", path.join(PACKAGE_ROOT, "assets", "init")],
  ["installed", REPO_ROOT],
] as const;

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

/** A project whose only review artifact is a render critique with this mobile verdict. */
async function projectWithCritique(mobileVerdict: "PASS" | "REVISE"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-verify-gate-"));
  roots.push(root);
  await writeFile(path.join(root, ".gitignore"), QFAI_GITIGNORE_BLOCK, "utf-8");
  const evidence = path.join(root, ".qfai", "evidence");
  await mkdir(evidence, { recursive: true });
  await writeFile(
    path.join(evidence, "critique-001.md"),
    [
      "# Critique 001",
      "",
      "date: 2026-08-22",
      "",
      "## Desktop viewport",
      "",
      "viewport: desktop",
      "verdict: PASS",
      "findings: none",
      "",
      "## Mobile viewport",
      "",
      "viewport: mobile",
      `verdict: ${mobileVerdict}`,
      "findings: the primary CTA falls below the fold.",
      "",
    ].join("\n"),
    "utf-8",
  );
  return root;
}

/** The body of the section a heading line opens, up to the next heading of any level. */
function section(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,6} /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

describe("TC-0014-0009: verify holds completion behind a reviewer PASS", () => {
  it("verify's binding gate fails on a render critique the reviewer returned REVISE", async () => {
    const result = await validateProject(await projectWithCritique("REVISE"), undefined, {
      profile: "verify",
    });

    const blocking = result.issues.filter(
      (found) => found.code === "QFAI-CRIT-008" && found.severity === "error",
    );
    expect(blocking.map((found) => found.message)).toEqual([
      "Iterative loop not completed: mobile viewport not PASS.",
    ]);
    expect(shouldFail(result, "error")).toBe(true);
  });

  it("verify's binding gate raises no critique finding once the reviewer returns PASS", async () => {
    const result = await validateProject(await projectWithCritique("PASS"), undefined, {
      profile: "verify",
    });

    expect(result.issues.filter((found) => found.code === "QFAI-CRIT-008")).toEqual([]);
  });

  for (const [copy, root] of COPIES) {
    it(`${copy}: the reviewer answers only PASS or REVISE`, async () => {
      const baseline = await readFile(path.join(root, BASELINE_REL), "utf-8");
      expect(section(baseline, "### Verdict vocabulary")).toContain(
        "- Reviewer responses use `Result: PASS | REVISE` (this file).",
      );
    });

    it(`${copy}: a REVISE finding blocks DONE until it is fixed or answered`, async () => {
      const baseline = await readFile(path.join(root, BASELINE_REL), "utf-8");
      expect(section(baseline, "## Reviewer Gate Baseline")).toContain(
        "- Final completion gate must be delegated to an independent reviewer, except where the skill runs no review",
      );
      expect(baseline).toContain(
        "- Do not declare DONE until every finding of its one review is fixed or answered",
      );
      expect(baseline).toContain(
        "- An in-scope blocking finding from a routed reviewer prevents DONE until it is fixed or answered; no reviewer is rerun.",
      );
      const completion = section(
        await readFile(path.join(root, SKILL_REL), "utf-8"),
        "## Completion",
      ).replace(/\s+/g, " ");
      expect(completion).toContain("every finding of the code review above is fixed or answered");
    });
  }
});
