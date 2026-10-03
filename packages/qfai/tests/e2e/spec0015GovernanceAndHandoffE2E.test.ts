/**
 * E2E acceptance for spec-0015 CHG-006 user stories US-0015-0009..0015:
 *   - US-0015-0009: SKILL.md `## Default Autopilot Policy` section /
 *     R-AUTOPILOT-POLICY-MISSING.
 *   - US-0015-0011: canonical cross-skill handoff schema /
 *     R-HANDOFF-SCHEMA-DRIFT.
 *   - US-0015-0015: cross-skill documentation realignment / zero stale
 *     references.
 *
 * Deterministic temp-fixture form: each `it` seeds a `mkdtemp` root with
 * the minimum on-disk shape required to exercise the user story, then
 * invokes the production API surface (validators / CLI command
 * functions) directly. The previous `execFile`-against-dist binary
 * approach was non-deterministic (CWD-dependent); the rewrite drops
 * that coupling while preserving the spec / TC annotations.
 */
// QFAI:BF-0001
// QFAI:BF-0001
// QFAI:BF-0001
// QFAI:BF-0001

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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
import { loadConfig } from "../../src/core/config.js";
import { removeTempTree } from "../helpers/tempTree.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0015-e2e-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

async function writeSkill(skillId: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skill", skillId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), body, "utf-8");
}

/** The shared prototype every qfai-* skill works under. */
const BASELINE = `# Shared Skill Operating Baseline

## Default Autopilot Policy (Shared)

| Bucket          | Prototype entries                        |
| --------------- | ---------------------------------------- |
| \`auto-decide\`   | output formatting; ID / sequence numbering |
| \`ask-user\`      | destructive operations; scope expansions |
| \`hard-required\` | brand intent                             |
`;

async function writeBaseline(body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "rule");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "shared-skill-operating-baseline.md"), body, "utf-8");
}

describe("spec-0015 US-0015-0009 autopilot policy (E2E, deterministic temp-fixture)", () => {
  it("QFAI:BF-0001 — error: a baseline missing the shared section emits R-AUTOPILOT-POLICY-MISSING", async () => {
    await writeBaseline("# Shared Skill Operating Baseline\n\nNo policy section.\n");
    await writeSkill("qfai-x", "# qfai-x\n\nNo policy section.\n");
    const issues = await validateAutopilotPolicy(root);
    expect(issues.some((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toBe(true);
  });

  it("QFAI:BF-0001 — normal: a skill under a 3-bucket baseline passes without R-AUTOPILOT-POLICY-MISSING", async () => {
    await writeBaseline(BASELINE);
    await writeSkill("qfai-x", "# qfai-x\n\nNo policy section of its own.\n");
    const issues = await validateAutopilotPolicy(root);
    expect(issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toBeUndefined();
  });
});

describe("spec-0015 US-0015-0011 handoff schema (E2E, deterministic temp-fixture)", () => {
  it("QFAI:BF-0001 — error: asymmetric Pair IV edit emits R-HANDOFF-SCHEMA-DRIFT", async () => {
    // Schema declares the canonical token; writer omits its expected token.
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
        `// drift: writer omits canonical token\nexport const X = 1;\n`,
        "utf-8",
      );
    }
    const issues = await detectHandoffSchemaDrift(root);
    expect(issues.some((i) => i.code === "R-HANDOFF-SCHEMA-DRIFT")).toBe(true);
  });

  it("QFAI:BF-0001 — normal: a symmetric pair passes without R-HANDOFF-SCHEMA-DRIFT", async () => {
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
        `// writer uses ${pair.writerToken}\nexport function w(a: ${pair.writerToken}) { return a; }\n`,
        "utf-8",
      );
    }
    const issues = await detectHandoffSchemaDrift(root);
    expect(issues.find((i) => i.code === "R-HANDOFF-SCHEMA-DRIFT")).toBeUndefined();
  });
});

describe("spec-0015 US-0015-0015 doc realignment (E2E, deterministic temp-fixture)", () => {
  it("QFAI:BF-0001 — normal: rewritten refs report zero stale references", async () => {
    const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping", "references");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "handoff.md"), "# Handoff\nUses handoff.yaml.\n", "utf-8");
    const issues = await validateStaleReferences(root);
    expect(issues.filter((i) => i.code === "W-STALE-REFERENCE")).toEqual([]);
  });

  it("QFAI:BF-0001 — error: a stale reference at HEAD is reported", async () => {
    const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping", "references");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "handoff.md"),
      "# Handoff\nUses session-handoff.yaml (legacy).\n",
      "utf-8",
    );
    const issues = await validateStaleReferences(root);
    const findings = issues.filter((i) => i.code === "W-STALE-REFERENCE");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.severity).toBe("warning");
  });
});
