import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const assistant = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant");

async function read(relative: string): Promise<string> {
  return await readFile(path.join(assistant, relative), "utf8");
}

describe("story-tree acceptance and implementation assets", () => {
  it("uses the BF, AC and EX layer split and records non-gating volume signals", async () => {
    const atdd = await read("skill/qfai-atdd/SKILL.md");
    const volume = await read("skill/qfai-atdd/references/volume-signals.md");
    expect(atdd).toContain("QFAI:BF-NNNN");
    expect(atdd).toContain("QFAI:AC-NNNN-NNNN-NN");
    expect(atdd).toContain("QFAI:EX-NNNN-NNNN-NN");
    expect(volume).toContain("Do not count a shared AC in both layers");
    expect(volume).toContain("EX tests belong");
    expect(volume).toContain("Signals are planning observations, not quality gates");
  });

  it("selects affected suites through imports and reruns shared consumers", async () => {
    const suite = await read("skill/qfai-implement/references/relevant-test-suite.md");
    expect(suite).toContain("current QFAI:EX annotation");
    expect(suite).toContain("Follow imports and test data consumers");
    expect(suite).toContain("Re-run dependent flows after an integrated shared-module change");
    expect(suite).toContain("Standard commands");
  });

  it("permits parallel EX work only on declared independent seams", async () => {
    const policy = await read("skill/qfai-implement/references/parallelization-policy.md");
    expect(policy).toContain("explicit user approval and a delivery-planner PASS");
    expect(policy).toContain("compare read and write sets");
    expect(policy).toContain("If any dependency is uncertain, use serial execution");
    expect(policy).toContain("A worker's isolated PASS is not an integrated PASS");
  });

  it("traces cross-flow consumers before editing and revalidates each affected BF", async () => {
    const ownership = await read("skill/qfai-implement/references/cross-spec-ownership.md");
    expect(ownership).toContain("Before changing a shared production module");
    expect(ownership).toContain(
      "Follow imports, contract references, test fixtures, and call sites",
    );
    expect(ownership).toContain("Run the scoped validation gate for each affected BF ID");
    expect(ownership).toContain("does not authorize a downstream stage to rewrite the story tree");
  });

  it("proves each runnable entrypoint through an observed smoke response", async () => {
    const skeleton = await read("skill/qfai-implement/references/walking-skeleton.md");
    expect(skeleton).toContain("Key packages / entrypoints");
    expect(skeleton).toContain("Skeleton command");
    expect(skeleton).toContain("one observable response");
    expect(skeleton).toContain("A process that merely starts is not a passing skeleton");
    expect(skeleton).toContain("before the first example that depends on that entrypoint");
  });

  it("routes UI effects from contracts and changed paths to captured product review", async () => {
    const ui = await read("skill/qfai-implement/references/ui-affecting.md");
    const gatekeeper = await read("agent/qa-gatekeeper.md");
    expect(ui).toContain("UI surface paths");
    expect(ui).toContain("UI contracts");
    expect(ui).toContain("rendered surface");
    expect(ui).toContain("product-surface-reviewer");
    expect(ui).toContain("If the implementation or capture changes after the verdict");
    expect(gatekeeper).toContain("For UI work, inspect the rendered surface");
  });

  it("requires observed acceptance RED or controlled falsifiability", async () => {
    const red = await read("skill/qfai-atdd/references/red-provenance.md");
    const gatekeeper = await read("agent/qa-gatekeeper.md");
    expect(red).toContain("selected-test output");
    expect(red).toContain("test plus fixtures or snapshots");
    expect(red).toContain("A module-load error, missing dependency, broken fixture");
    expect(red).toContain("restore the mutation");
    expect(gatekeeper).toContain("A syntax error, deleted export");
  });

  it("rejects a load error and proves RED came from the selected assertion", async () => {
    const admissibility = await read("skill/qfai-implement/references/red-admissibility.md");
    expect(admissibility).toContain("one example and one test selector");
    expect(admissibility).toContain("A collection error, import error, syntax error");
    expect(admissibility).toContain("same command must pass");
    expect(admissibility).toContain("restore the assertion");
  });

  it("addresses each observation and seals review packs without rewriting history", async () => {
    const evidence = await read("skill/qfai-implement/references/evidence-revision.md");
    expect(evidence).toContain("working-tree+<content hash>");
    expect(evidence).toContain("RED, the temporary falsifiability mutation, GREEN");
    expect(evidence).toContain("Review pack seal");
    expect(evidence).toContain("A later result does not retitle an earlier observation");
    const implement = await read("skill/qfai-implement/SKILL.md");
    expect(implement).toContain("implementation-reviewer checks code and tests");
    expect(implement).toContain("Each required reviewer must pass the same final revision");
  });

  it("nests every EX round under its own section and refreshes changed proof", async () => {
    const rounds = await read("skill/qfai-implement/references/round-evidence.md");
    expect(rounds).toContain("### EX-NNNN-NNNN-NN");
    expect(rounds).toContain("#### Round N");
    expect(rounds).toContain("A blocking REVISE opens the next round");
    expect(rounds).toContain("Every reviewer verdict names its reviewed revision");
    expect(rounds).toContain("repeat observations whose inputs moved");
  });

  it("reads current work-log entries and writes triggered handoffs", async () => {
    const implement = await read("skill/qfai-implement/SKILL.md");
    const schema = await read("rule/worklog-entry.schema.md");
    expect(implement).toContain("Read open work-log entries with global or current-flow scope");
    expect(implement).toContain("Apply the write triggers and");
    expect(schema).toContain("kind: handoff");
    expect(schema).toContain("unscoped-discovery");
  });

  it("keeps the assistant file budget and review boundaries explicit", async () => {
    const baseline = await read("rule/shared-skill-operating-baseline.md");
    const implement = await read("skill/qfai-implement/SKILL.md");
    const gatekeeper = await read("agent/qa-gatekeeper.md");
    expect(baseline).toContain("800 lines per assistant asset file");
    expect(implement).toContain("The author does not certify their own result");
    expect(implement).toContain("qfai validate --profile tdd --fail-on error --flow BF-NNNN");
    expect(gatekeeper).toContain("An ordinary RED must show");
    expect(gatekeeper).toContain("GREEN needs the same selected test");
    expect(gatekeeper).toContain("A missing dependency");
  });
});
