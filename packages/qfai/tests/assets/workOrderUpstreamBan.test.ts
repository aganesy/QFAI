/**
 * The work order states the ban at full strength (#382).
 *
 * Two constitution files stated the same prohibition with different force.
 * `drift-protocol.md` stated it unconditionally; the work order template —
 * the text pasted into every delegated sub-agent's prompt, and therefore the
 * version an implementing agent actually reads — stated it conditionally:
 * `patch upstream artifacts directly **when owner rerun is required**`. Whether
 * an owner rerun is required is exactly the judgement a downstream agent is not
 * entitled to make, and nothing in the shipped tree defined the trigger. The
 * prohibition was therefore enforced at the weaker strength, because the weaker
 * text is the one that reaches the agent doing the work.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const DELEGATION = "assistant/constitution/shared-skill-delegation-baseline.md";
const DRIFT = "assistant/constitution/drift-protocol.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/** The fenced `text` block under `## Work order template`. */
function workOrderBlock(source: string): string {
  const heading = source.indexOf("## Work order template");
  expect(heading).toBeGreaterThan(-1);
  const open = source.indexOf("```text", heading);
  const close = source.indexOf("```", open + 7);
  return source.slice(open, close);
}

describe("the work order template bans upstream patching unconditionally", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the qualifier is gone`, async () => {
      const block = workOrderBlock(await read(tree, DELEGATION));

      // The exact clause that made the ban conditional.
      expect(block).not.toContain("when owner rerun is required");
      expect(flat(block)).toContain("must_not: patch upstream artifacts directly;");
    });

    it(`${tree}: the work order names the remedy path`, async () => {
      const block = flat(workOrderBlock(await read(tree, DELEGATION)));

      expect(block).toContain(
        "every upstream change requires STOP + Change Request + owner rerun per constitution/drift-protocol.md",
      );
    });

    it(`${tree}: the protected set is an input the sub-agent receives`, async () => {
      // A delegated agent should not have to recall the protected set from
      // memory; the work order hands it the list.
      const block = workOrderBlock(await read(tree, DELEGATION));

      expect(block).toContain("constitution/drift-protocol.md#core-rule");
    });

    it(`${tree}: the drift protocol removes the judgement the qualifier implied`, async () => {
      const drift = flat(await read(tree, DRIFT));

      // The blanket form now carries exactly one exception, and it is a
      // different kind of thing from the qualifier this file was written
      // against. `when owner rerun is required` asked the downstream agent to
      // decide, per edit, whether the ban applied — the judgement it cannot
      // make. This names one entry of the list, the code/test artifacts
      // bullet, and points at the route that bullet already spells out; the
      // agent looks the answer up instead of weighing it. Reading the blanket
      // rule over that entry demanded an owner rerun for every shared-file
      // edit, which the cross-spec procedure does not perform.
      //
      // Pinned in full, exception included, so widening it back into a
      // judgement — or dropping the pointer to the bullet that carries the
      // route — fails here.
      expect(drift).toContain(
        "**Every artifact in this list requires an owner rerun by definition — except " +
          "the code and test artifacts of the last bullet, which carry their own route in " +
          "that bullet.**",
      );
      // The qualifier inverted the dependency: the rerun follows from the
      // artifact being upstream SSOT, it is not a precondition for the ban.
      expect(drift).toContain(
        "the rerun is a _consequence_ of the artifact being upstream SSOT, never a precondition for the prohibition",
      );
      // And the exception stays narrow: every OTHER entry keeps the property
      // that there is nothing downstream to test, which is what made the ban
      // unconditional for them in the first place.
      expect(drift).toContain(
        'For every other entry there is no downstream test for "is an owner rerun required here?"',
      );
    });

    it(`${tree}: the two files still agree on the unconditional form`, async () => {
      const drift = await read(tree, DRIFT);

      expect(drift).toContain("Downstream skills must not patch upstream SSOT directly.");
    });
  }
});
