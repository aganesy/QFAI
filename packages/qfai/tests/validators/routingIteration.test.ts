import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";

const CARD = `---
name: qa-gatekeeper
description: Guards quality gates.
tools: [Read]
kind: reviewer
domain: quality
mission: Guard the gates.
replaces: []
owned_artifacts: []
tool_profile: read-only
permission_profile: read-only
specialization_tags: []
---

# QA Gatekeeper

## Mission

Guard the gates.

## Domain Responsibilities

Check quality.

## Inputs you must read

Read the spec.

## Deliverables

Return findings.

## Stop conditions

Stop on missing evidence.

## Sign-off

Record the result.
`;

async function runWith(phase: Record<string, unknown>): Promise<string[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-routing-phase-"));
  const agentDir = path.join(root, ".qfai", "assistant", "agent");
  await mkdir(agentDir, { recursive: true });
  try {
    await writeFile(path.join(agentDir, "qa-gatekeeper.md"), CARD);
    const issues = await validateAgentDefinition(root, {
      ...defaultConfig,
      routing: [
        {
          skill: "demo-skill",
          phases: [
            {
              id: "only",
              mandatory_agents: ["qa-gatekeeper"],
              blocking_agents: ["qa-gatekeeper"],
              ...phase,
            },
          ],
          review_profile: "default",
        },
      ],
    });
    return issues.filter((issue) => issue.code === "QFAI-AGENT-013").map((issue) => issue.message);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("routing phase vocabulary", () => {
  for (const iteration of ["per-invocation", "per-ledger-item"]) {
    it(`accepts iteration ${iteration}`, async () => {
      expect(await runWith({ iteration })).toEqual([]);
    });
  }

  for (const iteration of ["per-item", "per_ledger_item", "PER-LEDGER-ITEM", true]) {
    it(`rejects iteration ${String(iteration)}`, async () => {
      expect(await runWith({ iteration })).toEqual([
        expect.stringContaining("allowed: per-invocation, per-ledger-item"),
      ]);
    });
  }

  for (const rerun_policy of ["failed-agents-only", "changed-scope-dependents"]) {
    it(`accepts rerun policy ${rerun_policy}`, async () => {
      expect(await runWith({ rerun_policy })).toEqual([]);
    });
  }

  for (const rerun_policy of ["failed-only", "changed_scope_dependents", true]) {
    it(`rejects rerun policy ${String(rerun_policy)}`, async () => {
      expect(await runWith({ rerun_policy })).toEqual([
        expect.stringContaining("allowed: changed-scope-dependents, failed-agents-only"),
      ]);
    });
  }
});
