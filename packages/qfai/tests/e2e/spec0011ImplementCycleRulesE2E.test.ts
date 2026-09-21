/**
 * E2E: the rules the shipped `qfai-implement` skill states (spec-0011).
 *
 * Each block reads the skill an adopter receives and holds the rule its story
 * states. The skill document is the deliverable for these stories: there is no
 * runtime to drive, so what ships is what can be observed.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const skillDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
);

async function skill(): Promise<string> {
  return readFile(path.join(skillDir, "SKILL.md"), "utf-8");
}

async function reference(name: string): Promise<string> {
  return readFile(path.join(skillDir, "references", name), "utf-8");
}

// QFAI:SPEC-0011:US-0011-0001
describe("E2E: the TDD micro-cycle runs one test at a time from the ledger (US-0011-0001)", () => {
  it("names the four phases in order", async () => {
    const content = await skill();
    expect(content).toMatch(/`todo` -> `red` -> `green` -> `refactor` -> `done`/);
  });

  it("holds at most one row in red or green at a time, and names the ledger it reads", async () => {
    const content = await skill();
    expect(content).toContain("one test at a time");
    expect(content).toContain("at most one row is in `red` or `green` at any moment");
    expect(content).toContain("test-list.md");
  });
});

// QFAI:SPEC-0011:US-0011-0002
describe("E2E: the status lifecycle is forward-only (US-0011-0002)", () => {
  it("prohibits a backward transition and names the one that is not allowed", async () => {
    const content = await skill();
    expect(content).toContain("Backward transitions are prohibited");
    expect(content).toContain("`green` -> `red` is not allowed");
  });

  it("points at one complete edge list rather than letting the summary be read as one", async () => {
    // The summary lists five edges and the reference lists more, so a reader
    // who treats the summary as complete refuses a legal transition.
    const content = await skill();
    expect(content).toContain("references/execution-ledger.md#allowed-transitions");
    expect(content).toMatch(/complete (and only )?list/);
  });
});

// QFAI:SPEC-0011:US-0011-0003
describe("E2E: RED and GREEN are confirmed by the qa-gatekeeper alone (US-0011-0003)", () => {
  it("routes both observations to the gatekeeper and gives it the verdict", async () => {
    const content = await skill();
    expect(content).toContain("submits the RED run to `qa-gatekeeper`");
    expect(content).toContain("`qa-gatekeeper` confirms or rejects each observation");
  });

  it("refuses the implementer's own account of the run", async () => {
    const content = await skill();
    expect(content).toContain("never the author's own account");
    expect(content).toContain("self-attestation this gate exists to prevent");
  });
});

// QFAI:SPEC-0011:US-0011-0004
describe("E2E: an exception row carries a DR-ID (US-0011-0004)", () => {
  it("requires the identifier in the skill and in the ledger reference", async () => {
    const content = await skill();
    expect(content).toContain("an `exception` requires a DR-ID");

    const ledger = await reference("execution-ledger.md");
    expect(ledger).toMatch(/exception[\s\S]{0,400}DR-/);
  });
});

// QFAI:SPEC-0011:US-0011-0005
describe("E2E: parallel dispatch is bounded to independent slices (US-0011-0005)", () => {
  it("defaults to serial and states the conditions as write conflicts", async () => {
    const content = await skill();
    expect(content).toContain("**Default**: Serial execution");
    expect(content).toContain("concurrent write conflicts");
  });

  it("separates workers by worktree and verifies the merged result", async () => {
    const content = await skill();
    expect(content).toContain("Post-parallel integration verify");
    expect(content).toContain("Under worktree separation");
    expect(content).toContain("run integration verify on the merged result");
  });
});
