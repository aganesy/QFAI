/**
 * Nothing authorised `/qfai-implement` to write its own execution ledger.
 *
 * `tdd/test-list.md` lives inside `.qfai/specs/**`, which the Drift Protocol
 * declares upstream SSOT via an explicitly open-ended list that sweeps in
 * "outputs of discussion/sdd/review stages" — and the ledger's schema is
 * documented in an SDD-stage reference. The one whitelist entry that could
 * have covered the write was conditioned on "when the project workflow
 * explicitly allows downstream updates", a phrase whose only occurrence in the
 * entire shipped tree was that line itself.
 *
 * So an agent obeying the protocol could not satisfy the skill's own gate item
 * 10, and an agent satisfying item 10 was in drift. These tests pin the
 * carve-out, its narrowness, and the removal of the dangling condition.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const DRIFT = "assistant/constitution/drift-protocol.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const TRACE = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(TREES)("%s", (tree) => {
  it("names the ledger and its three writable cells in the whitelist", async () => {
    const drift = await read(tree, DRIFT);
    const start = drift.indexOf("## Allowed exceptions");
    const end = drift.indexOf("## When drift is detected");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const whitelist = drift.slice(start, end);
    expect(whitelist).toContain("`.qfai/specs/<spec-id>/tdd/test-list.md`");
    // `Blocked-By` joined the three in #597: `todo -> blocked` is an edge the
    // skill owns and `TDDLIST_BLOCKED_MISSING_REF` errors without the cell, so
    // the three-cell form made an owned transition unwritable.
    expect(whitelist).toContain("`Status`, `DR-ID`, `Evidence` and `Blocked-By` cells only");
  });

  it("keeps the rows upstream, so the carve-out is not a licence over the file", async () => {
    // Which obligations exist is an upstream decision; only their execution
    // state is downstream. Without this the entry would hand `/qfai-implement`
    // the power to invent or delete obligations.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain(
      "adding, removing or re-scoping a row is an upstream change and takes the",
    );
  });

  it("drops the condition that could never be satisfied", async () => {
    const drift = await read(tree, DRIFT);
    // Present only as quoted history in the rationale, never as a live rule.
    const rule = drift.slice(
      drift.indexOf("## Allowed exceptions"),
      drift.indexOf("### Why the execution ledger is named here"),
    );
    expect(rule).not.toContain("only when the project workflow explicitly allows");
  });

  it("covers Evidence, not only progress status", async () => {
    // Gate item 10 requires the Evidence column and the hard rules forbid the
    // status-only substitute, so a status-scoped permission is unusable.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain("`Evidence` and `Blocked-By` cells only");
  });

  it("stops the skill contradicting itself in Non-goals", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).not.toContain("- Writing spec artifacts (use `/qfai-sdd`).");
    expect(skill).toContain(
      "Writing spec artifacts other than this skill's own `tdd/test-list.md` ledger",
    );
  });

  it("matches the write instructions to what the gate actually reads", async () => {
    const skill = await read(tree, SKILL);
    // The emphasis is `ledgerWriteOwnership.test.ts`'s, which asserts the same
    // sentence bolded. What matters here is that the instruction names both
    // columns and fires per phase, so the assertion tracks the shipped spelling.
    expect(skill).toContain(
      "update `test-list.md` **Status and Evidence** after each phase completes",
    );
    expect(skill).toContain("final Status, DR-ID and Evidence values");
  });

  it("records the ownership split where the schema is defined", async () => {
    expect(await read(tree, TRACE)).toContain("**Ownership split.**");
  });
});

describe("the dangling condition is gone from the shipped tree", () => {
  it("no live rule still depends on an undefined 'project workflow' permission", async () => {
    // The original defect was a condition with no referent anywhere. If a
    // future edit reintroduces the phrase as a rule, this fails.
    const files = await fg("**/*.md", {
      cwd: path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai", "assistant"),
      absolute: true,
    });
    const offenders: string[] = [];
    for (const file of files) {
      // Flattened: the phrase is prose and wraps, so a raw scan misses it.
      const text = flat(await readFile(file, "utf-8"));
      if (/only when the project workflow explicitly allows/.test(text)) {
        offenders.push(path.relative(repoRoot, file).replace(/\\/g, "/"));
      }
    }
    // The rationale in drift-protocol.md quotes it inside a "used to sit here"
    // sentence; that is history, not a rule, and it reads as such.
    expect(offenders).toEqual([
      "packages/qfai/assets/init/.qfai/assistant/constitution/drift-protocol.md",
    ]);
  });
});
