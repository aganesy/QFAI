/**
 * The reviewer gate every skill inherits is checked once, in the shared
 * delegation baseline, and a skill is not required to restate it.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateAssistantAssets } from "../../../src/core/validators/assistantAssets.js";

const SHIPPED_BASELINE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../assets/init/.qfai/assistant/rule/shared-skill-delegation-baseline.md",
);

const BASELINE = [
  "# Shared Skill Delegation Baseline",
  "",
  "## Reviewer Gate Baseline",
  "",
  "Every skill and step inherits this gate.",
  "",
  "### Definition: independent reviewer (NORMATIVE)",
  "",
  "- Reviewers must verify Drift Protocol enforcement.",
  "- Reviewers must verify `.qfai/assistant/rule/test-layers.md` when relevant.",
  "- Test volume ratios are signals, not gates.",
  "",
  "## Inside a workflow run",
  "",
].join("\n");

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

/** A project with one skill that carries no reviewer gate of its own. */
async function project(baseline: string | null): Promise<{ root: string; baselinePath: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reviewer-gate-"));
  roots.push(root);
  const assistant = path.join(root, ".qfai", "assistant");
  await mkdir(path.join(assistant, "skill", "qfai-example"), { recursive: true });
  await writeFile(
    path.join(assistant, "skill", "qfai-example", "SKILL.md"),
    ["---", "name: qfai-example", "---", "", "[DRIFT-PROTOCOL:REQUIRED]", ""].join("\n"),
    "utf-8",
  );
  const baselinePath = path.join(assistant, "rule", "shared-skill-delegation-baseline.md");
  if (baseline !== null) {
    await mkdir(path.dirname(baselinePath), { recursive: true });
    await writeFile(baselinePath, baseline, "utf-8");
  }
  return { root, baselinePath };
}

const gateFindings = async (
  root: string,
): Promise<Awaited<ReturnType<typeof validateAssistantAssets>>> =>
  (await validateAssistantAssets(root, defaultConfig)).filter(
    (finding) => finding.code === "QFAI-SKILLS-011" || finding.code === "QFAI-SKILLS-012",
  );

describe("the reviewer gate lives in the shared baseline", () => {
  it("accepts a skill with no reviewer gate section under a complete baseline", async () => {
    const { root } = await project(BASELINE);
    expect(await gateFindings(root)).toEqual([]);
  });

  it("accepts the shipped baseline", async () => {
    const { root } = await project(await readFile(SHIPPED_BASELINE, "utf-8"));
    expect(await gateFindings(root)).toEqual([]);
  });

  it("reports the baseline when its reviewer gate section is gone", async () => {
    const { root, baselinePath } = await project("# Shared Skill Delegation Baseline\n");
    const findings = await gateFindings(root);
    expect(findings.map((finding) => [finding.code, finding.severity, finding.file])).toEqual([
      ["QFAI-SKILLS-011", "error", baselinePath],
    ]);
  });

  it("reports the baseline when the file is gone", async () => {
    const { root, baselinePath } = await project(null);
    const findings = await gateFindings(root);
    expect(findings.map((finding) => [finding.code, finding.file])).toEqual([
      ["QFAI-SKILLS-011", baselinePath],
    ]);
  });

  it("names the obligation the baseline no longer states", async () => {
    const { root, baselinePath } = await project(
      BASELINE.replace("`.qfai/assistant/rule/test-layers.md`", "the test-layer policy"),
    );
    const findings = await gateFindings(root);
    expect(findings.map((finding) => [finding.code, finding.severity, finding.file])).toEqual([
      ["QFAI-SKILLS-012", "warning", baselinePath],
    ]);
    expect(findings[0]?.message).toContain("test-layers.md");
  });
});
