/**
 * Every test check asked whether a test exists and what it is attached to.
 * None asked whether the test would catch anything.
 *
 * Three of the four dimensions a regression-power reviewer reads already have
 * a home: the Coverage Depth Matrix and the Oracle Strength Check. The fourth,
 * whether a test survives a behaviour-preserving refactor, had none. The
 * gatekeeper now reads it, as an advisory finding that names the change the
 * test would fail on, with no score.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const GATEKEEPER = "assistant/agents/qa-gatekeeper.md";
const CATALOG = "assistant/manifest/agent-catalog.yml";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(TREES)("%s", (tree) => {
  it("gives the gatekeeper a regression power check", async () => {
    const card = await read(tree, GATEKEEPER);
    expect(card).toContain("## Regression Power Check (advisory)");
    expect(card).toContain("Would it survive a refactor that keeps the behaviour?");
  });

  it("sends the three owned dimensions to the checks that own them", async () => {
    // A second statement of the depth or oracle rules would drift from the
    // first, so the table points instead of restating.
    const card = await read(tree, GATEKEEPER);
    expect(card).toContain("The Oracle Strength Check and the matrix's `Oracle strength` cell");
    expect(card).toContain("under the checklist's kept-failure scope");
  });

  it("admits a finding only with a named change, and scores nothing", async () => {
    // An unread score is a number authors learn to optimize, and a finding
    // with no concrete change cannot be acted on.
    const card = await read(tree, GATEKEEPER);
    expect(card).toContain("A finding with no named change is not admitted.");
    expect(card).toContain("This check does not REVISE on its own and carries no score.");
  });

  it("reaches the catalog copy of the card", async () => {
    const catalog = await read(tree, CATALOG);
    expect(catalog).toContain("Regression Power Check (advisory)");
  });
});
