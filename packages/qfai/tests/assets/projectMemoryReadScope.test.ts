/**
 * Article III mandated an unscoped read of two whole directory trees before any
 * deliverable, and a third of that read was a generated mirror.
 *
 * Items 3 and 4 of the article carry conditions (`(if present)`,
 * `(if relevant)`); items 1 and 2 did not. Item 2's `.qfai/assistant/manifest/*`
 * glob pulled in `manifest/agent-catalog.yml`, which is the one file the
 * framework exempts from `SKILL_MD_MAX_LINES` precisely because it is
 * "generated, not authored" — a per-entry mirror of `assistant/agents/<id>.md`
 * that `tests/codex/agents.test.ts` asserts stays identical to those sources.
 * By construction it carries no fact the agent definitions do not.
 *
 * The article also fired at the same instant as `workflow.md`'s Stage 0
 * steering-refresh contract, overlapped it on `catalog/`, and neither cited the
 * other — so a stage had two mandatory bootstrap contracts and no statement of
 * how they compose.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const CONSTITUTION = "assistant/constitution/constitution.md";
const WORKFLOW = "assistant/constitution/workflow.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

async function read(tree: string, rel: string): Promise<string> {
  return flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));
}

/**
 * Slice the Article III body out of the flattened constitution. Bounds are
 * asserted before use: an `indexOf` miss returns -1 and `slice` would quietly
 * hand back a different region than the one under test.
 */
function articleIII(constitution: string): string {
  const start = constitution.indexOf("## Article III");
  const end = constitution.indexOf("## Article IV");
  expect(start, "the Article III heading moved").toBeGreaterThanOrEqual(0);
  expect(end, "the article after Article III moved").toBeGreaterThan(start);
  return constitution.slice(start, end);
}

describe.each(QFAI_TREES)("%s", (tree) => {
  it("keeps the generated agent mirror off the unconditional project-memory read", async () => {
    const article = articleIII(await read(tree, CONSTITUTION));
    // The whole-directory glob is what dragged the 1,622-line mirror in.
    expect(article).not.toContain("`.qfai/assistant/manifest/*`");
    expect(article).toContain("`.qfai/assistant/manifest/agent-routing.yml`");
    expect(article).toContain("`.qfai/assistant/manifest/review-profiles.yml`");
  });

  it("keeps the mirror reachable, as an on-demand lookup with its reason stated", async () => {
    const article = articleIII(await read(tree, CONSTITUTION));
    // Dropping the file entirely would lose the routed-role lookup; the article
    // has to say when to read it and why it is not in the prefix.
    expect(article).toContain("`.qfai/assistant/manifest/agent-catalog.yml` on demand");
    expect(article).toContain("`.qfai/assistant/agents/<id>.md`");
    expect(article).toContain("generated mirror");
  });

  it("still mandates the authored project memory it always did", async () => {
    // The scoping must not become a licence to skip the authored assets: only
    // the machine-derived duplicate leaves the unconditional path.
    const article = articleIII(await read(tree, CONSTITUTION));
    expect(article).toContain("`.qfai/assistant/constitution/*`");
    expect(article).toContain("`.qfai/assistant/catalog/*`");
    expect(article).toContain("`.qfai/discussion/` (if present)");
    expect(article).toContain("`.qfai/specs/spec-*/` (if relevant)");
  });

  it("composes the article with the Stage 0 steering refresh instead of racing it", async () => {
    const article = articleIII(await read(tree, CONSTITUTION));
    expect(article).toContain("Stage 0 — Steering refresh contract");
    expect(article).toContain("constitution/workflow.md");
  });

  it("points back from Stage 0, so neither statement can drift alone", async () => {
    const workflow = await read(tree, WORKFLOW);
    const start = workflow.indexOf("### Stage 0 — Steering refresh contract");
    const end = workflow.indexOf("## Delegation pattern");
    expect(start, "the Stage 0 heading moved").toBeGreaterThanOrEqual(0);
    expect(end, "the section after Stage 0 moved").toBeGreaterThan(start);
    const stage0 = workflow.slice(start, end);
    expect(stage0).toContain("Article III");
    expect(stage0).toContain("constitution/constitution.md");
  });
});
