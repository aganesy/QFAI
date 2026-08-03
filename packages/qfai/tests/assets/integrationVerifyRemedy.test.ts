/**
 * A failed post-parallel integration verify had one answer: roll back.
 *
 * The rule was a single unconditional destructive branch — "flag all slices for
 * re-examination and roll back the merge" — with no step attributing the failure
 * to anything. Twenty lines later the same file imports the Gate Failure
 * Autorepair Protocol, which classifies exactly this class as a local,
 * non-destructive code/test defect to fix and re-run, and reserves stopping for
 * *destructive* changes. The verify is mandatory, so the contradiction sat on a
 * blocking path.
 *
 * Rollback also contradicts the forward-only lifecycle the same file declares,
 * and the skill never said what happened to the rolled-back rows' statuses.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const POLICY = "assistant/skills/qfai-implement/references/parallelization-policy.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("no longer answers a failed verify with unconditional rollback", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).not.toContain(
      "If integration verify fails, flag all slices for re-examination and roll back the merge",
    );
    expect(skill).toContain("**classify before acting**");
  });

  it("defers to the protocol the same file already imports", async () => {
    // The contradiction was internal: the skill imported the autorepair
    // protocol and then contradicted it twenty lines earlier.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("shared-skill-operating-baseline.md#gate-failure-autorepair-protocol");
    expect(skill).toContain("Unconditional rollback is not one of them");
  });

  it("fixes a defect outside every slice in place, and names its owner", async () => {
    // A fix landing outside every slice's declared write boundary has no
    // worker to return to; leaving that unstated is how it became a rollback.
    const policy = await read(tree, POLICY);
    expect(policy).toContain("Fix locally and re-run integration verify. Do not roll back.");
    expect(policy).toContain("it is the **orchestrator's** to make");
  });

  it("scopes a single-slice defect to that slice", async () => {
    const policy = await read(tree, POLICY);
    expect(policy).toContain("Return **that slice's items only**");
    expect(policy).toContain("re-examining them would discard work the verify did not fault");
  });

  it("keeps rollback for the case that actually needs it", async () => {
    const policy = await read(tree, POLICY);
    expect(policy).toContain("individually correct and jointly wrong");
    expect(policy).toContain("the **one sanctioned backward move**");
  });

  it("says what happens to the rolled-back rows, which was never stated", async () => {
    // This is what made rollback contradict the forward-only lifecycle: with no
    // status rule, the only reading was a backward transition the same file
    // prohibits.
    const policy = await read(tree, POLICY);
    expect(policy).toContain("a _merge_ rollback, not a status rollback");
    expect(policy).toContain("the rows return to `review-fix`, not to `todo`");
  });

  it("bounds the retry loop", async () => {
    const policy = await read(tree, POLICY);
    expect(policy).toContain('"Roll back and retry" is not a loop');
  });
});
