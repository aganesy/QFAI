import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { defaultConfig } from "../../src/core/config.js";
import type { ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";

let root: string;
const specs = ".qfai/spec";
const story = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001`;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-validate-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function put(file: string, text: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
}

function configured() {
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = specs;
  config.paths.contractsDir = `${specs}/03_contract`;
  return { config, issues: [], configPath: path.join(root, "qfai.config.yaml") };
}

describe("story-tree layout dispatch", () => {
  // QFAI:EX-0001-0051-01
  it("runs story findings only when the configured spec root has no legacy pack", async () => {
    await put(
      `${specs}/02_business-flow/business-flow-0001/business-flow.md`,
      "# BF-0001: Checkout\n",
    );
    await put(`${story}/01_User-story.md`, "# US-0001-0001: Checkout\n");
    await put(`${story}/02_Acceptance-Criteria.md`, "```gherkin\n# AC-0001-0001-001\n```\n");
    await put(
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Example |\n| --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-001 | paid |\n",
    );
    const storyResult = await validateProject(root, configured(), { profile: "sdd" });
    expect(storyResult.issues.some((item) => item.code === "QFAI-STORY-002")).toBe(true);

    await mkdir(path.join(root, specs, "_policies"), { recursive: true });
    const legacyResult = await validateProject(root, configured(), { profile: "sdd" });
    expect(legacyResult.issues.filter((item) => item.code === "QFAI-LAYOUT-001")).toHaveLength(1);
    expect(legacyResult.issues.some((item) => item.code.startsWith("QFAI-STORY-"))).toBe(false);
  });

  // QFAI:EX-0001-0051-01
  it("fails every profile on the old layout with one migration finding", async () => {
    await mkdir(path.join(root, specs, "spec-0001"), { recursive: true });
    const profiles: ValidationProfile[] = [
      "discussion",
      "sdd",
      "prototyping",
      "atdd",
      "tdd",
      "verify",
      "full",
      "saas-package",
      "drift",
    ];
    for (const profile of profiles) {
      const result = await validateProject(root, configured(), { profile });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe("QFAI-LAYOUT-001");
      expect(result.issues[0]?.message).toContain(path.join(root, specs));
      expect(result.issues[0]?.message).toContain("/qfai-migration-v1-to-v2");
    }
  });

  // QFAI:EX-0001-0051-01
  it("detects the former default spec root when the new root is configured", async () => {
    await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });

    const result = await validateProject(root, configured(), { profile: "full" });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("QFAI-LAYOUT-001");
    expect(result.issues[0]?.file).toBe(path.join(root, ".qfai", "specs"));
  });

  // QFAI:AC-0001-0051-06
  // QFAI:EX-0001-0051-07
  it("reports a constraint row whose ID is not its place in its section", async () => {
    const table = "| ID | Constraint | Rationale |\n| --- | --- | --- |\n";
    const constraints = (technical: string): string =>
      `# Constraints\n\n## Technical Constraints\n\n${table}${technical}\n## Operational Constraints\n\n${table}\n## Business Constraints\n\n${table}`;
    await put(
      `${specs}/01_policy/constraint.md`,
      constraints("| TC-01 | Runs on Linux | Adopters |\n| TC-04 | Runs on Windows | Adopters |\n"),
    );

    const gap = await validateProject(root, configured(), { profile: "sdd" });
    const reported = gap.issues.filter((item) => item.code === "QFAI-STORY-012");
    expect(reported.map((item) => [item.severity, item.refs])).toEqual([["error", ["TC-04"]]]);

    await put(
      `${specs}/01_policy/constraint.md`,
      constraints("| TC-01 | Runs on Linux | Adopters |\n| TC-02 | Runs on Windows | Adopters |\n"),
    );
    const closed = await validateProject(root, configured(), { profile: "sdd" });
    expect(closed.issues.some((item) => item.code === "QFAI-STORY-012")).toBe(false);
  });

  // QFAI:AC-0001-0051-07
  // QFAI:EX-0001-0051-08
  it("reports an architecture whose diagram and table disagree or whose rows are out of order", async () => {
    const table = (rows: string): string =>
      `| Layer | Responsibility | Depends on |\n| --- | --- | --- |\n${rows}`;
    const tech = (diagram: string, rows: string): string =>
      `# Technology\n\n## Architecture\n\n\`\`\`mermaid\nflowchart TD\n${diagram}\`\`\`\n\n${table(rows)}\n## Dependencies\n\n- None.\n`;
    await put(
      `${specs}/03_contract/tech.md`,
      tech("  CLI --> Core\n", "| Core | Validates | - |\n| CLI | Parses | Core |\n"),
    );

    const upward = await validateProject(root, configured(), { profile: "sdd" });
    const reported = upward.issues.filter((item) => item.code === "QFAI-STORY-013");
    expect(reported.map((item) => item.severity)).toEqual(["error"]);
    expect(reported[0]?.message).toContain("CLI depends on Core, which is not in a row below it");

    await put(
      `${specs}/03_contract/tech.md`,
      tech("  CLI --> Core\n", "| CLI | Parses | Core |\n| Core | Validates | - |\n"),
    );
    const ordered = await validateProject(root, configured(), { profile: "sdd" });
    expect(ordered.issues.some((item) => item.code === "QFAI-STORY-013")).toBe(false);
  });

  it("writes only the migration finding to validate.json for an old layout", async () => {
    await mkdir(path.join(root, specs, "spec-0001"), { recursive: true });

    const exit = await runValidate({ root, strict: false, profile: "full" });
    const result = JSON.parse(
      await readFile(path.join(root, ".qfai", "report", "validate.json"), "utf8"),
    ) as { issues: Array<{ code: string }> };

    expect(exit).not.toBe(0);
    expect(result.issues.map((item) => item.code)).toEqual(["QFAI-LAYOUT-001"]);
  });

  it("keeps only the named flow's finding under --flow", async () => {
    // QFAI:EX-0001-0150-02
    for (const number of ["0001", "0002"]) {
      await put(
        `${specs}/02_business-flow/business-flow-${number}/business-flow.md`,
        `# BF-${number}: Flow\n`,
      );
      await put(
        `${specs}/02_business-flow/business-flow-${number}/user-story-${number}-0001/01_User-story.md`,
        `# US-${number}-0001: Story\n`,
      );
    }
    const result = await validateProject(root, configured(), {
      profile: "sdd",
      flowIds: ["BF-0001"],
    });
    expect(result.issues.some((item) => item.file?.includes("business-flow-0002"))).toBe(false);
  });
});
