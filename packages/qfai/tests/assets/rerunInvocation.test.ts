/**
 * "Rerun the owner skill for the upstream artifact" named no invocation and no
 * mode.
 *
 * The Drift Protocol makes that phrase the mandatory remedy for every approved
 * Change Request, and requires the CR to carry an "owner skill rerun plan". But
 * `/qfai-sdd` accepted only `[<spec-id-or-name>] [--auto]` and ran a fixed,
 * explicitly non-reorderable seven-phase pass: there was no contract-scoped
 * entry point, and no distinction between confirming an artifact and
 * re-deriving it. Neither the CR's author nor its approver could state what the
 * rerun would execute or what it cost.
 *
 * The only rerun vocabulary qfai shipped — `rerun_policy`, on all 23 routed
 * phases — was defined nowhere, read by nothing, and absent from the routing
 * validator's own type.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const DRIFT = "assistant/constitution/drift-protocol.md";
const SDD = "assistant/skills/qfai-sdd/SKILL.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("names a concrete invocation per upstream artifact class", async () => {
    const drift = await read(tree, DRIFT);
    expect(drift).toContain("`/qfai-sdd <spec-id>`");
    expect(drift).toContain("`/qfai-sdd --contract <CON-ID-or-path>`");
  });

  it("makes the contract selector usable for contracts that carry no ID", async () => {
    // `.qfai/contracts/design/**` declares no `QFAI-CONTRACT-ID`, so an
    // ID-only selector cannot be assembled for it and the "every upstream
    // class has an owner rerun" rule was unsatisfiable for that class.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain("**The contract selector is an ID _or_ a path.**");
    expect(drift).toContain("`/qfai-sdd --contract .qfai/contracts/design/DESIGN.md.lock.yaml`");
    expect(drift).toContain(
      "a defect CR whose subject _is_ a missing or wrong ID has none to cite either",
    );

    const sdd = await read(tree, SDD);
    expect(sdd).toContain(
      "The argument is a `CON-*` ID **or** a repo-relative path under `.qfai/contracts/`",
    );
    expect(sdd).toContain("an ID-only selector left those reruns unaddressable");

    // The ID exemption and the path form must be stated together, or a reader
    // who reaches the exemption first still has no invocation.
    const rules = await read(
      tree,
      "assistant/skills/qfai-sdd/references/contract-artifact-rules.md",
    );
    expect(rules).toContain(
      "they are addressed by repo-relative path when an owner rerun targets them: " +
        "`/qfai-sdd --contract .qfai/contracts/design/<file>`",
    );
  });

  it("requires the CR to name a rerun mode, and defines both", async () => {
    // Without a mode, "rerun the owner skill" is the whole plan and the approver
    // is agreeing to an unbounded action.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain("**`confirm-only`**");
    expect(drift).toContain("**`re-derive`**");
    expect(drift).toContain("MUST name one");
  });

  it("distinguishes the two modes by what they write", async () => {
    const drift = await read(tree, DRIFT);
    expect(drift).toContain("Writes nothing but the CR reference");
    expect(drift).toContain("May rewrite any part of it");
  });

  it("gives qfai-sdd the contract-scoped target the protocol names", async () => {
    // A contract-only Change Request previously had no rerun narrower than the
    // whole spec.
    const sdd = await read(tree, SDD);
    expect(sdd).toContain("Contract-scoped (`/qfai-sdd --contract <CON-ID-or-path>`)");
    // One phase list, carrying both facts. The route runs the Phase 2b API-row
    // delta - a contract-only status flip owes a new `Layer = API` row, or the
    // retirement of a stale one - and it runs Phase 2c, both to reconcile the
    // obligations the in-scope specs ALREADY hold (Phase 2 never ran here) and to
    // name an owner for a contract the delta finds none for. Two sentences would
    // be two contracts; this asserts the one the skill states.
    expect(sdd).toContain(
      "Stage 0 + Phase 0 (Contracts-first) + the **Phase 2b API-row delta** + **Phase 2c (Obligation reconciliation, limited to the existing `BR` / `AC` of the specs that reference any contract this run touched, and the step that names an owner for a contract that delta finds none for)** + Phase 4 (Delta update) only",
    );
  });

  it("advertises it in the argument hint, not only in prose", async () => {
    const sdd = await read(tree, SDD);
    expect(sdd).toContain(
      'argument-hint: "[<spec-id-or-name>] [--contract <CON-ID-or-path>] [--auto]"',
    );
  });

  it("documents the rerun_policy vocabulary where the key lives", async () => {
    const routing = await read(tree, "assistant/manifest/agent-routing.yml");
    expect(routing).toContain("`failed-agents-only`");
    expect(routing).toContain("`changed-scope-dependents`");
  });
});

describe("QFAI-AGENT-013 — rerun_policy is validated, not folklore", () => {
  async function runWith(policy: string): Promise<string[]> {
    const root = path.join(
      os.tmpdir(),
      `qfai-rerun-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    const manifest = path.join(root, ".qfai", "assistant", "manifest");
    await mkdir(manifest, { recursive: true });
    await mkdir(path.join(root, ".qfai", "assistant", "agents"), { recursive: true });
    try {
      await writeFile(
        path.join(manifest, "agent-catalog.yml"),
        "agents:\n  - id: qa-gatekeeper\n    kind: reviewer\n",
        "utf-8",
      );
      await writeFile(
        path.join(manifest, "review-profiles.yml"),
        "profiles:\n  - id: default\n",
        "utf-8",
      );
      await writeFile(
        path.join(manifest, "agent-routing.yml"),
        [
          "routing:",
          "  - skill: demo-skill",
          "    phases:",
          "      - id: only",
          `        rerun_policy: ${policy}`,
          "        mandatory_agents: [qa-gatekeeper]",
          "        conditional_agents: []",
          "        parallel_groups: []",
          "        blocking_agents: [qa-gatekeeper]",
          "    review_profile: default",
          "",
        ].join("\n"),
        "utf-8",
      );
      const issues = await validateAgentDefinition(root, defaultConfig);
      return issues.filter((i) => i.code === "QFAI-AGENT-013").map((i) => i.message);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  for (const policy of ["failed-agents-only", "changed-scope-dependents"]) {
    it(`accepts ${policy}`, async () => {
      expect(await runWith(policy)).toEqual([]);
    });
  }

  // The point of validating it: a typo was previously indistinguishable from a
  // deliberate value, on a key nothing read.
  for (const policy of ["failed-agents", "changed-scope", "all"]) {
    it(`rejects ${policy}`, async () => {
      const messages = await runWith(policy);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("changed-scope-dependents");
    });
  }
});
