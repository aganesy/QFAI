import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateAutopilotPolicy } from "../../../src/core/validators/autopilotPolicy.js";

let root: string;

async function writeSkill(relativeRoot: string, skillId: string, body: string): Promise<void> {
  const directory = path.join(root, relativeRoot, skillId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "SKILL.md"), body, "utf8");
}

/** The shared prototype every qfai-* skill works under. */
const BASELINE = `# Shared Skill Operating Baseline

## Default Autopilot Policy (Shared)

| Bucket          | Prototype entries                         |
| --------------- | ----------------------------------------- |
| \`auto-decide\`   | output formatting; equivalent-option pick |
| \`ask-user\`      | destructive operations                    |
| \`hard-required\` | brand intent                              |

## Next section
`;

async function writeBaseline(assistantRoot: string, body = BASELINE): Promise<void> {
  const directory = path.join(root, assistantRoot, "rule");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "shared-skill-operating-baseline.md"), body, "utf8");
}

const POLICY = `# Skill

## Default Autopilot Policy

- hard-required: brand intent
`;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-autopilot-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("autopilot policy in the story-tree assistant layout", () => {
  it("accepts a skill with no section of its own under the shared baseline", async () => {
    await writeBaseline(".qfai/assistant");
    await writeSkill(".qfai/assistant/skill", "qfai-atdd", "# Skill\n");

    expect(await validateAutopilotPolicy(root)).toEqual([]);
  });

  it("reports the baseline when it no longer carries the shared section", async () => {
    await writeBaseline(".qfai/assistant", "# Shared Skill Operating Baseline\n");
    await writeSkill(".qfai/assistant/skill", "qfai-atdd", "# Skill\n");

    expect(await validateAutopilotPolicy(root)).toEqual([
      expect.objectContaining({
        code: "QFAI-POLICY-001",
        severity: "error",
        file: ".qfai/assistant/rule/shared-skill-operating-baseline.md",
      }),
    ]);
  });

  it("reports the baseline when it is gone", async () => {
    await writeSkill(".qfai/assistant/skill", "qfai-atdd", "# Skill\n");

    const issues = await validateAutopilotPolicy(root);

    expect(issues.map((issue) => [issue.code, issue.file])).toEqual([
      ["QFAI-POLICY-001", ".qfai/assistant/rule/shared-skill-operating-baseline.md"],
    ]);
  });

  it("names the bucket the baseline has lost", async () => {
    await writeBaseline(".qfai/assistant", BASELINE.replace(/^\| `ask-user`.*\n/m, ""));
    await writeSkill(".qfai/assistant/skill", "qfai-atdd", "# Skill\n");

    const [finding] = await validateAutopilotPolicy(root);

    expect(finding?.code).toBe("QFAI-POLICY-001");
    expect(finding?.message).toContain("missingBuckets=[ask-user]");
  });

  it("reads no baseline when the tree holds no qfai-* skill", async () => {
    await writeSkill(".qfai/assistant/skill", "my-skill", "# Skill\n");

    expect(await validateAutopilotPolicy(root)).toEqual([]);
  });

  it("reports a skill whose section drops an input declared for it", async () => {
    await writeBaseline(".qfai/assistant");
    await writeSkill(
      ".qfai/assistant/skill",
      "qfai-sdd",
      POLICY.replace("brand intent", "brand intent, an affected flow"),
    );

    const issues = await validateAutopilotPolicy(root);

    expect(issues).toEqual([
      expect.objectContaining({
        code: "QFAI-POLICY-001",
        severity: "error",
        file: ".qfai/assistant/skill/qfai-sdd/SKILL.md",
      }),
    ]);
    expect(issues[0]?.message).toContain("missingEntries=[requirement source]");
  });

  it("reports every declared input of a skill with no section of its own", async () => {
    await writeBaseline(".qfai/assistant");
    await writeSkill(".qfai/assistant/skill", "qfai-maintain", "# Skill\n");

    const [finding] = await validateAutopilotPolicy(root);

    expect(finding?.code).toBe("QFAI-POLICY-001");
    expect(finding?.message).toContain("missingEntries=[edit target]");
  });

  it("accepts the SDD flow inputs", async () => {
    await writeBaseline(".qfai/assistant");
    await writeSkill(
      ".qfai/assistant/skill",
      "qfai-sdd",
      POLICY.replace(
        "brand intent",
        "a usable requirement source, an affected flow, and brand intent",
      ),
    );

    expect(await validateAutopilotPolicy(root)).toEqual([]);
  });

  it("rejects the retired primarySpecId hard-required input", async () => {
    await writeBaseline(".qfai/assistant");
    await writeSkill(
      ".qfai/assistant/skill",
      "qfai-atdd",
      POLICY.replace("brand intent", "brand intent\n  - primarySpecId"),
    );

    expect((await validateAutopilotPolicy(root)).map((issue) => issue.code)).toContain(
      "QFAI-AUTOPILOT-001",
    );
  });

  // QFAI:EX-0001-0169-05
  it("does not read the retired CON-UI-NNNN form as the UI-NNNN that qfai-verify declares", async () => {
    const entry = (id: string): string =>
      [
        "brand intent",
        `  - a full \`${id}\` when a prototyping-scoped run cannot resolve its primary UI contract`,
        "  - a usable story source when a flow-scoped run cannot resolve it",
        "  - an affected `BF-NNNN` when a flow-scoped run cannot resolve it",
      ].join("\n");
    await writeBaseline(".qfai/assistant");
    await writeSkill(
      ".qfai/assistant/skill",
      "qfai-verify",
      POLICY.replace("brand intent", entry("CON-UI-NNNN")),
    );

    const retired = await validateAutopilotPolicy(root);

    expect(retired.map((issue) => [issue.code, issue.severity])).toEqual([
      ["QFAI-POLICY-001", "error"],
      ["QFAI-AUTOPILOT-001", "error"],
    ]);
    expect(retired[1]?.message).toContain("does not declare ([a full `CON-UI-NNNN` when");

    await writeSkill(
      ".qfai/assistant/skill",
      "qfai-verify",
      POLICY.replace("brand intent", entry("UI-NNNN")),
    );

    expect(await validateAutopilotPolicy(root)).toEqual([]);
  });

  it("uses the configured skill directory and ignores the former location", async () => {
    await writeSkill(".qfai/assistant/skills", "qfai-old", "# Skill\n");
    await writeSkill("custom/skill", "qfai-maintain", "# Skill\n");
    await writeBaseline("custom");
    const config = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, skillsDir: "custom/skill" },
    };

    const issues = await validateAutopilotPolicy(root, { config });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.file).toBe("custom/skill/qfai-maintain/SKILL.md");
  });
});
