/**
 * Integration acceptance for spec-0015 CHG-006 test cases
 * TC-0015-0020..0033 (autopilot policy gate, handoff schema drift, doc
 * realignment / stale-reference report).
 *
 * Deterministic temp-fixture form: each `it` seeds a `mkdtemp` root
 * with the minimum on-disk shape required and invokes the production
 * API surface directly (validators / CLI command runners). Replaces
 * the earlier `execFile`-against-dist-binary approach with an
 * isolation-safe variant.
 */
// QFAI:EX-0001-0169-01
// QFAI:EX-0001-0169-01
// QFAI:EX-0001-0169-01
// QFAI:EX-0001-0171-01
// QFAI:EX-0001-0171-01
// QFAI:EX-0001-0174-01
// QFAI:EX-0001-0174-01

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validateAutopilotPolicy } from "../../src/core/validators/autopilotPolicy.js";
import { detectHandoffSchemaDrift } from "../../src/core/validators/handoffSchemaDrift.js";
import {
  HANDOFF_SCHEMA_REL,
  HANDOFF_WRITER_PAIRS,
} from "../../src/core/validators/handoffSchemaPairs.js";
import { validateStaleReferences } from "../../src/core/validators/staleReferences.js";
import { validateHandoff } from "../../src/core/schemas/handoff.js";
import { loadConfig } from "../../src/core/config.js";
import { removeTempTree } from "../helpers/tempTree.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0015-int-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

async function writeSkillMd(skillId: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skill", skillId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), body, "utf-8");
}

/** The shared prototype every qfai-* skill works under, as `qfai init` ships it. */
const BASELINE_3_BUCKET = `# Shared Skill Operating Baseline

## Default Autopilot Policy (Shared)

| Bucket          | Prototype entries                                                                   |
| --------------- | ----------------------------------------------------------------------------------- |
| \`auto-decide\`   | output formatting; ID / sequence numbering; equivalent-option pick                  |
| \`ask-user\`      | approval-required governance operations; destructive operations; scope expansions |
| \`hard-required\` | brand intent                                                                        |
`;

async function writeBaseline(body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "rule");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "shared-skill-operating-baseline.md"), body, "utf-8");
}

/** A skill's own section: only what it adds to the prototype. */
const SKILL_OWN_POLICY = `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - equivalent-option pick
- hard-required:
  - brand intent
`;

describe("spec-0015 autopilot policy CHG-006", () => {
  it("QFAI:EX-0001-0169-01 — error: a baseline without the shared section emits R-AUTOPILOT-POLICY-MISSING", async () => {
    await writeBaseline("# Shared Skill Operating Baseline\n");
    await writeSkillMd("qfai-x", "# qfai-x\nNo policy.\n");
    const issues = await validateAutopilotPolicy(root);
    const f = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(f?.severity).toBe("error");
    expect(f?.file).toBe(".qfai/assistant/rule/shared-skill-operating-baseline.md");
    expect(f?.message).toMatch(/justification/i);
  });

  it("QFAI:EX-0001-0169-01 — error: a shared section missing buckets emits R-AUTOPILOT-POLICY-MISSING naming the missing bucket(s)", async () => {
    // Heading present, buckets gone: every skill loses the prototype at once,
    // so the finding names each missing bucket against the baseline.
    await writeBaseline(
      "# Shared Skill Operating Baseline\n\n## Default Autopilot Policy (Shared)\n\nbody without buckets.\n",
    );
    await writeSkillMd("qfai-x", "# qfai-x\nNo policy.\n");
    const issues = await validateAutopilotPolicy(root);
    const f = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(f?.severity).toBe("error");
    expect(f?.message).toMatch(/auto-decide/);
    expect(f?.message).toMatch(/ask-user/);
    expect(f?.message).toMatch(/hard-required/);
  });

  it("QFAI:EX-0001-0169-01 — error: a skill whose section drops a declared input emits R-AUTOPILOT-POLICY-MISSING naming it", async () => {
    await writeBaseline(BASELINE_3_BUCKET);
    await writeSkillMd(
      "qfai-sdd",
      SKILL_OWN_POLICY.replace("  - brand intent", "  - an identifiable affected flow"),
    );
    const issues = await validateAutopilotPolicy(root);
    const f = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(f?.file).toBe(".qfai/assistant/skill/qfai-sdd/SKILL.md");
    expect(f?.message).toContain("requirement source");
  });

  // QFAI:EX-0001-0169-04
  it("QFAI:EX-0001-0169-01 — normal: the baseline and a skill adding only its own entries pass; widened auto-decide flagged as warning", async () => {
    await writeBaseline(BASELINE_3_BUCKET);
    await writeSkillMd("qfai-x", SKILL_OWN_POLICY);
    await writeSkillMd("qfai-z", "# qfai-z\nNo policy of its own.\n");
    const issues = await validateAutopilotPolicy(root);
    expect(issues).toEqual([]);

    // Widening: add an extra non-canonical entry to auto-decide.
    const widened = SKILL_OWN_POLICY.replace(
      "  - equivalent-option pick",
      "  - equivalent-option pick\n  - destructive operations",
    );
    await writeSkillMd("qfai-y", widened);
    const issues2 = await validateAutopilotPolicy(root);
    expect(issues2.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toBeUndefined();
    expect(issues2.find((i) => i.code === "R-AUTOPILOT-POLICY-WIDENED")?.severity).toBe("warning");
  });
});

describe("spec-0015 handoff schema CHG-006", () => {
  it("QFAI:EX-0001-0171-01 — error: asymmetric Pair IV emits R-HANDOFF-SCHEMA-DRIFT", async () => {
    await mkdir(path.dirname(path.join(root, HANDOFF_SCHEMA_REL)), { recursive: true });
    await writeFile(
      path.join(root, HANDOFF_SCHEMA_REL),
      `export const HANDOFF_MINIMUM_FIELDS = ["companyName"] as const;\n`,
      "utf-8",
    );
    for (const pair of HANDOFF_WRITER_PAIRS) {
      const abs = path.join(root, pair.writerRel);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(
        abs,
        `// drift: writer omits the canonical schema token\nexport const X = 1;\n`,
        "utf-8",
      );
    }
    const issues = await detectHandoffSchemaDrift(root);
    const f = issues.find((i) => i.code === "R-HANDOFF-SCHEMA-DRIFT");
    expect(f?.severity).toBe("error");
    expect(f?.message).toMatch(/justification/i);
  });

  it("QFAI:EX-0001-0171-01 — normal: a handoff with extra keys passes validateHandoff (additionalProperties: true)", () => {
    const issues = validateHandoff({
      companyName: "Acme",
      primarySpecId: "spec-0012",
      extraKey: { foo: 1 },
    });
    expect(issues).toEqual([]);
  });
});

describe("spec-0015 stale-ref report CHG-006", () => {
  it("QFAI:EX-0001-0174-01 — normal: rewritten in-PR refs report zero stale references at HEAD", async () => {
    const dir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping", "references");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "handoff.md"), "# Handoff\nUses handoff.yaml.\n", "utf-8");
    const issues = await validateStaleReferences(root, { config: (await loadConfig(root)).config });
    expect(issues.filter((i) => i.code === "W-STALE-REFERENCE")).toEqual([]);
  });

  it("QFAI:EX-0001-0174-01 — error: a stale ref at HEAD reports warning", async () => {
    const dir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping", "references");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "handoff.md"),
      "# Handoff\nUses session-handoff.yaml.\n",
      "utf-8",
    );
    const findings = (
      await validateStaleReferences(root, { config: (await loadConfig(root)).config })
    ).filter((i) => i.code === "W-STALE-REFERENCE");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.severity).toBe("warning");
  });
});
