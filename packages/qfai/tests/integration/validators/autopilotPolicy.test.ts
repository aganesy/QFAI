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

const POLICY = `# Skill

## Default Autopilot Policy

- auto-decide: output formatting
- ask-user: approval-required operations
- hard-required: brand intent
`;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-autopilot-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("autopilot policy in the story-tree assistant layout", () => {
  it("reports a missing policy in the canonical skill directory", async () => {
    await writeSkill(".qfai/assistant/skill", "qfai-sdd", "# Skill\n");

    const issues = await validateAutopilotPolicy(root);

    expect(issues).toEqual([
      expect.objectContaining({
        code: "R-AUTOPILOT-POLICY-MISSING",
        severity: "error",
        file: ".qfai/assistant/skill/qfai-sdd/SKILL.md",
      }),
    ]);
  });

  it("accepts the three policy buckets and SDD flow inputs", async () => {
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
    await writeSkill(
      ".qfai/assistant/skill",
      "qfai-sdd",
      POLICY.replace("brand intent", "brand intent\n  - primarySpecId"),
    );

    expect((await validateAutopilotPolicy(root)).map((issue) => issue.code)).toContain(
      "QFAI-AUTOPILOT-001",
    );
  });

  it("uses the configured skill directory and ignores the former location", async () => {
    await writeSkill(".qfai/assistant/skills", "qfai-old", "# Skill\n");
    await writeSkill("custom/skill", "qfai-sdd", "# Skill\n");
    const config = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, skillsDir: "custom/skill" },
    };

    const issues = await validateAutopilotPolicy(root, { config });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.file).toBe("custom/skill/qfai-sdd/SKILL.md");
  });
});
