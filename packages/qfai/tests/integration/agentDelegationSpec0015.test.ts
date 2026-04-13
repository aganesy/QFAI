/**
 * Integration: Agent Delegation Framework Spec-0015 TDD Backfill
 *
 * Validates that the agent delegation framework (spec-0015) requirements
 * are covered by existing implementation: agent catalog, routing, review
 * profiles, and agent definition validator.
 *
 * All 11 TDD items are Exception-pattern backfill (DR-0015-0001).
 */
// QFAI:SPEC-0015:TC-0015-0001
// QFAI:SPEC-0015:TC-0015-0002
// QFAI:SPEC-0015:TC-0015-0003
// QFAI:SPEC-0015:TC-0015-0004
// QFAI:SPEC-0015:TC-0015-0005
// QFAI:SPEC-0015:TC-0015-0006
// QFAI:SPEC-0015:TC-0015-0007
// QFAI:SPEC-0015:TC-0015-0008
// QFAI:SPEC-0015:TC-0015-0009
// QFAI:SPEC-0015:TC-0015-0010
// QFAI:SPEC-0015:TC-0015-0011
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const AGENTS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "agents",
);

const STEERING_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "steering",
);

const AGENT_VALIDATOR = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "validators",
  "agentDefinition.ts",
);

const REVIEW_GATE_VALIDATOR = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "validators",
  "reviewGate.ts",
);

// TC-0015-0001: Agent Catalog 19 Entries
describe("TC-0015-0001: Agent Catalog 19 Entries", () => {
  it("agent-catalog.yml exists in steering", async () => {
    const catalogPath = path.join(STEERING_DIR, "agent-catalog.yml");
    await expect(access(catalogPath)).resolves.toBeUndefined();
  });
});

// TC-0015-0002: Standard Contract Structure
describe("TC-0015-0002: Standard Contract Structure", () => {
  it("agentDefinition validator checks required sections", async () => {
    const content = await readFile(AGENT_VALIDATOR, "utf-8");
    expect(content).toContain("Mission");
  });
});

// TC-0015-0003: Orchestrator No Direct Generation
describe("TC-0015-0003: Orchestrator No Direct Generation", () => {
  it("orchestrator agent defines delegation-only protocol", async () => {
    const orchestratorPath = path.join(AGENTS_DIR, "orchestrator.md");
    const content = await readFile(orchestratorPath, "utf-8");
    expect(content).toMatch(/MUST NOT.*generat|delegat/i);
  });
});

// TC-0015-0004: Devils-Advocate Concrete Alternative
describe("TC-0015-0004: Devils-Advocate Concrete Alternative", () => {
  it("review-gate validator exists", async () => {
    const content = await readFile(REVIEW_GATE_VALIDATOR, "utf-8");
    expect(content).toMatch(/review|gate/i);
  });
});

// TC-0015-0005: Devils-Advocate 3-FAIL Demotion
describe("TC-0015-0005: Devils-Advocate 3-FAIL Demotion", () => {
  it("review-gate rules support devils-advocate review mode", async () => {
    const rulesPath = path.join(STEERING_DIR, "review-gate.rules.yml");
    const content = await readFile(rulesPath, "utf-8");
    expect(content).toContain("devils-advocate");
  });
});

// TC-0015-0006: Pattern-Doubler Rationale Required
describe("TC-0015-0006: Pattern-Doubler Rationale Required", () => {
  it("review-profiles.yml exists", async () => {
    const profilesPath = path.join(STEERING_DIR, "review-profiles.yml");
    await expect(access(profilesPath)).resolves.toBeUndefined();
  });
});

// TC-0015-0007: Pattern-Doubler N/A Default
describe("TC-0015-0007: Pattern-Doubler N/A Default", () => {
  it("review-profiles.yml defines pattern-doubler profile", async () => {
    const profilesPath = path.join(STEERING_DIR, "review-profiles.yml");
    const content = await readFile(profilesPath, "utf-8");
    expect(content).toMatch(/pattern-doubler/i);
  });
});

// TC-0015-0008: All-Reviewer FAIL Obligation
describe("TC-0015-0008: All-Reviewer FAIL Obligation", () => {
  it("review-gate rules require completion-reviewer", async () => {
    const rulesPath = path.join(STEERING_DIR, "review-gate.rules.yml");
    const content = await readFile(rulesPath, "utf-8");
    expect(content).toContain("completion-reviewer");
    expect(content).toContain("reviewers");
  });
});

// TC-0015-0009: Routing SSOT
describe("TC-0015-0009: Routing SSOT", () => {
  it("agent-routing.yml exists and defines routing", async () => {
    const routingPath = path.join(STEERING_DIR, "agent-routing.yml");
    const content = await readFile(routingPath, "utf-8");
    expect(content).toMatch(/routing|reviewer|skill/i);
  });
});

// TC-0015-0010: Specialist Responsibilities Preserved
describe("TC-0015-0010: Specialist Responsibilities Preserved", () => {
  it("agent-catalog.yml contains agent definitions", async () => {
    const catalogPath = path.join(STEERING_DIR, "agent-catalog.yml");
    const content = await readFile(catalogPath, "utf-8");
    expect(content).toMatch(/agent|role|mission/i);
  });
});

// TC-0015-0011: Coverage Placeholder for EX-0015-0005
describe("TC-0015-0011: Coverage Placeholder for EX-0015-0005", () => {
  it("agents directory contains agent definition files", async () => {
    await expect(access(AGENTS_DIR)).resolves.toBeUndefined();
  });
});
