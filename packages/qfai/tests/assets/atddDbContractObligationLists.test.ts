/**
 * `CON-DB` coverage is a blocking obligation (`QFAI-ATDD-115`, `error`), and it
 * cannot be spec-scoped away, yet `/qfai-atdd` stated it only once — in Success
 * Criteria. Every other enumeration of the obligation set stopped at `CON-API`:
 * the reviewer gate, the mandatory-obligation bullets, Mandatory Output 3, the
 * Volume Signals line, the not-done test, Completion Criteria step 1, the rerun
 * action and `project_memory`.
 *
 * So the three checklists a human or agent consults to *avoid* an uncovered DB
 * contract were the three that omitted it: a `completion-reviewer` following
 * the reviewer gate literally returns `PASS` on a spec the very next command —
 * `qfai validate --profile atdd --fail-on error --spec <id>` — exits 1 on.
 *
 * These tests pin `CON-DB` into every one of those lists, in both the shipped
 * asset tree and its generated root mirror.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const ATDD = "assistant/skills/qfai-atdd/SKILL.md";

const read = async (tree: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, ATDD), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

describe.each(TREES)("%s — /qfai-atdd enumerates CON-DB wherever it enumerates CON-API", (tree) => {
  it("the reviewer gate asks about Integration/CON-DB coverage", async () => {
    // A `completion-reviewer` works from this bullet and nothing else.
    const atdd = flat(await read(tree));
    expect(atdd).toContain(
      "coverage obligations met: E2E covers `US`, API covers `CON-API`, Integration covers `CON-DB`,",
    );
  });

  it("the mandatory-obligation bullets name the directory CON-DB is discharged from", async () => {
    // This is the only list that states a directory per obligation, and the
    // annotation obligations already assign `QFAI:CON-DB-XXXX` to
    // `tests/integration/**`. It shares the `CON-API` bullet because the file
    // sits on the 500-line ceiling `assets.test.ts` enforces.
    const atdd = flat(await read(tree));
    expect(atdd).toContain(
      "`tests/api/**` must cover all required `CON-API-*`, and `tests/integration/**` all required `CON-DB-*` (`QFAI-ATDD-115`)",
    );
    // The deferral form travels with the obligation: a reader who only meets
    // the rule here must still learn it has an out-of-slice escape.
    expect(atdd).toContain("`-- x-qfai-status: planned`, never left uncovered.");
  });

  it("Mandatory Output 3, the not-done test and Completion Criteria step 1 all list it", async () => {
    const atdd = flat(await read(tree));
    expect(atdd).toContain("Coverage obligations checklist (`US` / `TC` / `CON-API` / `CON-DB`)");
    expect(atdd).toContain("Any required `US` / `TC` / `CON-API` / `CON-DB` remains uncovered.");
    expect(atdd).toContain(
      "Confirm required `US` / `TC` / `CON-API` / `CON-DB` coverage is complete.",
    );
    expect(atdd).toContain(
      "close uncovered `US` / `TC` / `CON-API` / `CON-DB` obligations and rerun validation",
    );
  });

  it("the volume estimate sizes Integration with its DB contracts", async () => {
    // The Integration row was defined as `#TC`, so the layer that owes the
    // `CON-DB` work was estimated without counting any of it.
    const atdd = flat(await read(tree));
    expect(atdd).toContain("Integration = required `TC-*` plus declared `CON-DB-*`.");
    expect(atdd).toContain("| Integration | #TC + #CON-DB |");
    expect(atdd).toContain("`CON-DB` in Integration.");
  });

  it("project_memory restates it for an agent that never opens the body", async () => {
    const atdd = flat(await read(tree));
    expect(atdd).toContain("Coverage obligations stay layer-pinned for US, CON-API and CON-DB");
    expect(atdd).toContain("all required CON-DB (QFAI-ATDD-115");
  });

  it("no obligation enumeration stops at CON-API any more", async () => {
    // The regression this file exists to stop: a list that ends at `CON-API`
    // is a list a reader treats as complete.
    const atdd = flat(await read(tree));
    for (const stale of [
      "API covers `CON-API`, and every `TC`",
      "checklist (`US` / `TC` / `CON-API`),",
      "Any required `US` / `TC` / `CON-API` remains uncovered.",
      "Confirm required `US` / `TC` / `CON-API` coverage is complete.",
      "close uncovered `US` / `TC` / `CON-API` obligations",
      "Integration = required `TC-*`. When a signal",
      "`tests/api/**` must cover all required `CON-API-*`. -",
      "layer-pinned for US and CON-API",
    ]) {
      expect(atdd).not.toContain(stale);
    }
  });
});
