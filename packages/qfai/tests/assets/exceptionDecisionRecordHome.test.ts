/**
 * The `exception` escape hatch was gated behind the approval loop it exists to
 * escape.
 *
 * `qfai-implement` Phase Red orders an anomalous row to `exception` as an
 * ordinary inline step, and that status is invalid without a `DR-*` in `DR-ID`
 * (`TDDLIST_EXCEPTION_MISSING_DR`, error). Every documented home for a Decision
 * Record — `07_Decisions.md`, `09_delta.md` — is on the Drift Protocol's
 * upstream-SSOT list, and the two-entry allowed-exception whitelist covered
 * neither: minting a Decision Record is not an `.qfai/evidence/**` write and
 * not a progress status update.
 *
 * So the only compliant route to executing an inline Phase Red step was
 * STOP -> Change Request -> user approval -> owner-skill rerun, and the first
 * anomaly in any project either halted the stage or produced a rule-violating
 * ledger row — with nothing telling the agent which it was choosing.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { QFAI_GITIGNORE_GOVERNANCE_NEGATIONS } from "../../src/core/gitignore.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const DRIFT = "assistant/constitution/drift-protocol.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

async function read(tree: string, rel: string): Promise<string> {
  return flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));
}

describe.each(TREES)("%s", (tree) => {
  it("whitelists creating the Decision Record the exception transition needs", async () => {
    const drift = await read(tree, DRIFT);
    const whitelist = drift.slice(
      drift.indexOf("## Allowed exceptions"),
      drift.indexOf("## When drift is detected"),
    );
    // Slice bounds are asserted, not assumed: an indexOf miss returns -1 and
    // would silently search the whole document.
    expect(drift.indexOf("## Allowed exceptions")).toBeGreaterThanOrEqual(0);
    expect(drift.indexOf("## When drift is detected")).toBeGreaterThan(
      drift.indexOf("## Allowed exceptions"),
    );
    expect(whitelist).toContain("`.qfai/decisions/`");
    expect(whitelist).toContain("DR-YYYYMMDD-NNNN-<slug>.md");
  });

  it("keeps the carve-out to creation, not to patching upstream", async () => {
    const drift = await read(tree, DRIFT);
    // The reference into 07_Decisions.md / 09_delta.md must stay an owner-skill
    // write, or the carve-out becomes a licence to patch upstream SSOT.
    expect(drift).toContain("the record only, never the reference");
    expect(drift).toContain("**create only.**");
  });

  it("still lists 07_Decisions.md and 09_delta.md as upstream", async () => {
    // The fix must not resolve the contradiction by quietly demoting the
    // upstream artifacts — that would be a much larger change than the one the
    // exception transition needs.
    const drift = await read(tree, DRIFT);
    const core = drift.slice(drift.indexOf("## Core rule"), drift.indexOf("## Allowed exceptions"));
    expect(core).toContain("`07_Decisions.md`");
    expect(core).toContain("`09_delta.md`");
  });

  it("tells the ledger writer where the DR goes and where it does not", async () => {
    const ledger = await read(tree, LEDGER);
    expect(ledger).toContain("`.qfai/decisions/DR-YYYYMMDD-NNNN-<slug>.md`");
    expect(ledger).toContain("Do **not** write `07_Decisions.md` or `09_delta.md`");
  });

  it("says it in Phase Red too, where the transition is ordered", async () => {
    // A reader who follows the numbered steps never opens the reference file.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("records the anomaly as `.qfai/decisions/DR-*.md`");
  });
});

describe("the permitted home is actually kept in version control", () => {
  it("negates .qfai/decisions/ in the managed gitignore block", () => {
    // A governance record that `qfai init` ignores is not a record. This is the
    // property that makes `.qfai/decisions/` a legitimate destination rather
    // than a write into a hole.
    expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain("!.qfai/decisions/");
    expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain("!.qfai/decisions/**");
  });
});
