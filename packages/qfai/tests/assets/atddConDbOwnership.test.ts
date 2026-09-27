/**
 * `QFAI-ATDD-115` fails the ATDD gate on an uncovered `CON-DB`, and it is
 * attributed to `.qfai/contracts/**`, so `--spec` cannot drop a sibling's.
 * The rule had no reader: `.qfai/contracts/db/**` appeared once in the skill's
 * Inputs Priority, was absent from the Mandatory Read Set Contract, and no
 * Stage Minimum Role's `Inputs you must read` carried it — the implementer of
 * `tests/integration/**` was told Integration means `TC` coverage only.
 *
 * `CON-API` never had this gap: `acceptance-test-engineer.md` already carried
 * `.qfai/contracts/api/**`. These tests pin the reader, the layer ownership
 * line and the reviewer check so the obligation keeps an owner.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const ATDD = "assistant/skills/qfai-atdd/SKILL.md";
const ENGINEER = "assistant/agents/acceptance-test-engineer.md";

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

describe.each(TREES)("%s", (tree) => {
  it("gives the integration implementer the directory CON-DB is declared in", async () => {
    // Without this line the role that writes `tests/integration/**` never
    // opens the contracts it is graded on, and cannot reach the
    // `-- x-qfai-status: planned` deferral either — that edit lives in the
    // same files its read set never authorised opening.
    const engineer = await read(tree, ENGINEER);
    const inputs = engineer.slice(engineer.indexOf("## Inputs you must read"));
    expect(inputs).toContain("- .qfai/contracts/api/\\*\\*");
    expect(inputs).toContain("- .qfai/contracts/db/\\*\\*");
    expect(flat(engineer)).toContain("`CON-DB-*` contracts");
  });

  it("names CON-DB in the Integration layer's work order", async () => {
    // `TC` in Integration alone told the implementer that DB contracts belong
    // to some other layer, while `QFAI-ATDD-115` graded it on them.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain(
      "required `US` coverage in E2E, `CON-API` in API, `TC` and `CON-DB` in Integration",
    );
  });

  it("makes CON-DB coverage a completion-reviewer check", async () => {
    // Success Criteria already required it; the reviewer gate did not verify
    // it, so the only place it surfaced was the failing validator run.
    const atdd = flat(await read(tree, ATDD));
    const checks = atdd.slice(atdd.indexOf("ATDD-specific reviewer checks:"));
    expect(checks).toContain("Integration covers every declared `CON-DB` (`QFAI-ATDD-115`)");
    expect(checks).toContain("`-- x-qfai-status: planned`");
  });

  it("keeps the reviewer gate's planned deferral inside the spec that owns the contract", async () => {
    // `QFAI-ATDD-115` is filed against `.qfai/contracts/**`, so a *sibling*
    // spec's uncovered `CON-DB` reaches a `--spec` run's gate. A reviewer check
    // that accepted `-- x-qfai-status: planned` for "a contract outside the
    // slice" pointed that escape at contracts this stage does not own, which
    // the CRITICAL CONSTRAINTS cross-spec rule forbids: the deferral would
    // defer the owning spec's DB test and hide a genuinely uncovered contract.
    const atdd = flat(await read(tree, ATDD));
    const checks = atdd.slice(
      atdd.indexOf("ATDD-specific reviewer checks:"),
      atdd.indexOf("Coverage Depth Matrix is reviewed"),
    );
    expect(checks).toContain("a contract **this spec owns** but outside the current slice");
    expect(checks).toContain("A **sibling spec's** uncovered `CON-DB` is not that case");
    expect(checks).toContain(
      "record it as a cross-spec obligation and leave the contract file alone",
    );
    // Over-correction pin: the deferral itself stays available for a contract
    // this spec does own. Success Criteria still offers it, and the gate must
    // not have been rewritten into a blanket ban on `planned`.
    expect(checks).toContain("`-- x-qfai-status: planned`");
    expect(atdd).toContain(
      "a contract outside the current slice is deferred with `-- x-qfai-status: planned`, not left uncovered",
    );
  });

  it("stops the Read Set Contract from contradicting Inputs Priority P4", async () => {
    // Two Mandatory lists in one file disagreed about the contracts
    // directories. Default Mode now carries both and says it is a floor.
    const atdd = await read(tree, ATDD);
    const start = atdd.indexOf("## Read Set Contract (Mandatory)");
    const readSet = flat(atdd.slice(start, atdd.indexOf("## Sub-agent Delegation", start)));
    expect(readSet).toContain("`.qfai/contracts/api/**` (`CON-API`)");
    expect(readSet).toContain("`.qfai/contracts/db/**` (`CON-DB`)");
    expect(readSet).toContain("Default Mode is a floor, not a closed set");
  });
});
