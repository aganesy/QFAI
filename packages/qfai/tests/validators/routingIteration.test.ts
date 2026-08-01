/**
 * `iteration` is the routing-phase key that says how often a phase runs.
 *
 * The manifest schema had no such concept, so a phase list could only be read
 * as one pass per invocation. `qfai-implement` drives the TDD micro-cycle one
 * ledger row at a time, and that mismatch is what left `qa-gatekeeper` with no
 * phase in which a RED state still existed.
 *
 * The key is optional (`per-invocation` is the default) so existing manifests
 * keep their meaning. What must be validated is the value: a typo such as
 * `per-item` would read as "no iteration declared" and silently restore the
 * collapsed reading the key exists to fix.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";

const CATALOG = `agents:
  - id: qa-gatekeeper
    kind: reviewer
`;

const PROFILES = `profiles:
  - id: default
`;

async function runWith(iteration: string | undefined): Promise<string[]> {
  const root = path.join(
    os.tmpdir(),
    `qfai-routing-iter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const manifest = path.join(root, ".qfai", "assistant", "manifest");
  await mkdir(manifest, { recursive: true });
  await mkdir(path.join(root, ".qfai", "assistant", "agents"), { recursive: true });
  try {
    await writeFile(path.join(manifest, "agent-catalog.yml"), CATALOG, "utf-8");
    await writeFile(path.join(manifest, "review-profiles.yml"), PROFILES, "utf-8");
    await writeFile(
      path.join(manifest, "agent-routing.yml"),
      `routing:
  - skill: demo-skill
    phases:
      - id: only
${iteration === undefined ? "" : `        iteration: ${iteration}\n`}        mandatory_agents: [qa-gatekeeper]
        conditional_agents: []
        parallel_groups: []
        blocking_agents: [qa-gatekeeper]
    review_profile: default
`,
      "utf-8",
    );
    const issues = await validateAgentDefinition(root, defaultConfig);
    return issues.filter((i) => i.code === "QFAI-AGENT-013").map((i) => i.message);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("QFAI-AGENT-013 — routing phase iteration", () => {
  for (const value of ["per-invocation", "per-ledger-item"]) {
    it(`accepts ${value}`, async () => {
      expect(await runWith(value)).toEqual([]);
    });
  }

  // The whole point of validating the value: an unrecognised one must not be
  // treated as an absent one.
  for (const value of ["per-item", "per_ledger_item", "PER-LEDGER-ITEM", "true"]) {
    it(`rejects ${value}`, async () => {
      const messages = await runWith(value);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("per-ledger-item");
    });
  }

  // Manifests written before the key existed still mean "once per invocation".
  it("stays silent when the key is absent", async () => {
    expect(await runWith(undefined)).toEqual([]);
  });
});
