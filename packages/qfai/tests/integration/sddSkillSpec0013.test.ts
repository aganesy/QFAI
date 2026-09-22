/**
 * Integration: SDD Skill Spec-0013 TDD Backfill
 *
 * Validates that the /qfai-sdd skill (spec-0013) requirements are covered
 * by existing implementation: SKILL.md template and validator modules.
 *
 * All 10 TDD items are Exception-pattern backfill (DR-0013-0001).
 */
// QFAI:SPEC-0013:TC-0013-0001
// QFAI:SPEC-0013:TC-0013-0002
// QFAI:SPEC-0013:TC-0013-0003
// QFAI:SPEC-0013:TC-0013-0004
// QFAI:SPEC-0013:TC-0013-0005
// QFAI:SPEC-0013:TC-0013-0006
// QFAI:SPEC-0013:TC-0013-0007
// QFAI:SPEC-0013:TC-0013-0008
// QFAI:SPEC-0013:TC-0013-0009
// QFAI:SPEC-0013:TC-0013-0010
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../src/core/config.js";
import { validateContracts } from "../../src/core/validators/contracts.js";

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) {
      await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  }
});

function contractConfig(): QfaiConfig {
  return {
    paths: { contractsDir: ".qfai/contracts", specsDir: ".qfai/specs" },
  } as unknown as QfaiConfig;
}

const SKILL_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-sdd",
  "SKILL.md",
);

// TC-0013-0001: Phase Order Enforcement
describe("TC-0013-0001: Phase Order Enforcement", () => {
  it("SKILL.md enforces Contracts-first -> Outline -> Slice -> Plan -> Delta", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/phase order/i);
    expect(content).toContain("Contracts-first");
    expect(content).toContain("Outline");
    expect(content).toContain("Slice");
    expect(content).toContain("Plan");
    expect(content).toContain("Delta");
  });
});

// TC-0013-0002: Contract Index Alignment
describe("TC-0013-0002: Contract Index Alignment", () => {
  it("SKILL.md requires Contract Index in _policies/05_Contracts.md", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Contract Index");
    expect(content).toContain("05_Contracts.md");
  });
});

// TC-0013-0003: Usable-Source Preflight Stop
//
// The obligation is the narrower one: an incomplete or contradictory pack
// continues, and only the absence of every source stops the stage. Asserting
// only that SKILL.md contains the token `discussion-pack` and mentions
// preflight would also pass a stage that stopped on any thin pack. Both
// directions are asserted, because the token check would pass on a stage
// that had lost either half.
describe("TC-0013-0003: Usable-Source Preflight Stop", () => {
  it("SKILL.md stops Stage 0 only when no usable source exists", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/preflight/i);
    expect(content).toContain("Stop only when there is no usable source at all");
  });

  it("SKILL.md does not stop on an incomplete, contradictory or OQ-carrying pack", async () => {
    const content = (await readFile(SKILL_PATH, "utf-8")).replace(/\s+/g, " ");
    expect(content).toContain(
      "an incomplete pack, a contradictory one, or a blocking discussion OQ does not by itself stop this stage",
    );
    // And the pack is not the thing to repair when it is the source of the gap.
    expect(content).toContain("Do NOT edit, repair or re-run a pack");
  });
});

// TC-0013-0004: Slice Gate US->AC->BR->EX->TC
describe("TC-0013-0004: Slice Gate US->AC->BR->EX->TC", () => {
  it("SKILL.md defines slice gate with required edges", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Ss]lice gate/);
  });
});

// TC-0013-0005: Plan After Slice Gate
describe("TC-0013-0005: Plan After Slice Gate", () => {
  it("SKILL.md requires plan after slice gate pass", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/slice.*plan|Plan.*finalize/i);
  });
});

// TC-0013-0006: Reference Direction Enforcement
describe("TC-0013-0006: Reference Direction Enforcement", () => {
  it("SKILL.md enforces reference direction rules", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Rr]eference direction/);
    expect(content).toMatch(/lower-to-upper/);
  });
});

// TC-0013-0007: Validate Gate error=0
describe("TC-0013-0007: Validate Gate error=0", () => {
  it("SKILL.md requires qfai validate --profile sdd --fail-on error", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("qfai validate --profile sdd --fail-on error");
  });
});

// TC-0013-0008: Business Flow Mermaid
describe("TC-0013-0008: Business Flow Mermaid", () => {
  it("SKILL.md requires Mermaid in _policies/04_Business-Flow.md", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("04_Business-Flow.md");
    expect(content).toMatch(/[Mm]ermaid/);
  });
});

// TC-0013-0009: Delta Rejected Guardrails
describe("TC-0013-0009: Delta Rejected Guardrails", () => {
  it("SKILL.md defines Delta Rejected Guard", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Delta Rejected Guard");
    expect(content).toMatch(/rejected/i);
  });
});

// TC-0013-0010: Batch Mode Targets Every Capability
describe("TC-0013-0010: Batch Mode Targets Every Capability", () => {
  it("SKILL.md targets every capability when invoked with no argument", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("### No-argument batch delegation (MUST)");
    expect(content).toContain(
      "Without argument: target all capabilities in `_policies/03_Capabilities.md`",
    );
  });

  it("SKILL.md delegates the per-spec phase rather than running it once", async () => {
    // Targeting every capability and running one pass over them are different
    // things, and only the second is what the example describes.
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Delegate Slice in parallel per spec");
  });
});

// TC-0013-0011: Plan Finalized After A Slice Is Grounded
// QFAI:SPEC-0013:TC-0013-0011
describe("TC-0013-0011: Plan Finalized After A Slice Is Grounded", () => {
  it("SKILL.md puts Plan finalize behind a passing slice gate", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain(
      "Plan finalize MUST happen after at least one user-story slice is grounded",
    );
    expect(content).toMatch(/Phase 3: Plan finalize \(after at least one slice gate passes\)/);
  });

  it("SKILL.md keeps the plan in the spec's own file", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("10_Plan.md");
    expect(content, "a shared plan file is not where a plan goes").not.toContain("specs/plan.md");
  });
});

// TC-0013-0012: Contract Stub Is Parseable Or Declared `none`
// QFAI:SPEC-0013:TC-0013-0012
describe("TC-0013-0012: Contract Stub Is Parseable Or Declared `none`", () => {
  async function findingsFor(apiContract: string): Promise<string[]> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-contract-"));
    roots.push(root);
    await mkdir(path.join(root, ".qfai", "contracts", "api"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "contracts", "api", "orders.yaml"),
      apiContract,
      "utf-8",
    );
    const issues = await validateContracts(root, contractConfig());
    return issues
      .filter((entry) => entry.file?.endsWith("orders.yaml") === true)
      .map((entry) => entry.code);
  }

  it("reports a stub that does not parse", async () => {
    const broken = [
      "# QFAI-CONTRACT-ID: CON-API-0001",
      "openapi: 3.1.0",
      "paths:",
      "  /orders:",
      "   get: [unclosed",
      "",
    ].join("\n");
    expect(await findingsFor(broken)).toContain("QFAI-CONTRACT-021");
  });

  it("reports a stub that parses but declares no API", async () => {
    // Parsing is not the whole of validity: a YAML document with no `openapi`
    // key is a well-formed file that is not an API contract.
    const noApi = [
      "# QFAI-CONTRACT-ID: CON-API-0001",
      "# QFAI-CONTRACT-DEPENDS-ON: -",
      "title: not an api contract",
      "",
    ].join("\n");
    expect(await findingsFor(noApi)).toContain("QFAI-CONTRACT-020");
  });

  it("leaves a parseable API stub alone", async () => {
    const good = [
      "# QFAI-CONTRACT-ID: CON-API-0001",
      "# QFAI-CONTRACT-DEPENDS-ON: -",
      "openapi: 3.1.0",
      "info:",
      "  title: Orders",
      "  version: 1.0.0",
      "paths:",
      "  /orders:",
      "    get:",
      "      responses:",
      '        "200":',
      "          description: ok",
      "",
    ].join("\n");
    const codes = await findingsFor(good);
    expect(codes).not.toContain("QFAI-CONTRACT-021");
    expect(codes).not.toContain("QFAI-CONTRACT-020");
  });
});
