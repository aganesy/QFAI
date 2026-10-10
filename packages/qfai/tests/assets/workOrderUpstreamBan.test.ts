/**
 * The work order states the ban at full strength.
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

const DELEGATION = "assistant/rule/shared-skill-delegation-baseline.md";
const WORK_ORDER = "assistant/rule/references/worker-edit-boundary.md";
const DRIFT = "assistant/rule/drift-protocol.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/** The fenced `text` block under `## Work order template`. */
async function workOrderBlock(tree: string): Promise<string> {
  const baseline = await read(tree, DELEGATION);
  const pointer = baseline.split("\n## Work order template\n")[1]?.split("\n## ")[0];
  expect(pointer).toBeDefined();
  expect(flat(pointer ?? "")).toContain("When preparing a delegation");
  expect(pointer).toContain(
    ".qfai/assistant/rule/references/worker-edit-boundary.md#work-order-template",
  );
  const source = await read(tree, WORK_ORDER);
  const body = source.split("\n## Work order template\n")[1]?.split("\n## ")[0];
  expect(body).toBeDefined();
  const block = /```text\n([\s\S]*?)```/.exec(body ?? "");
  expect(block).not.toBeNull();
  return block?.[1] ?? "";
}

describe("the work order template bans upstream patching unconditionally", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the qualifier is gone`, async () => {
      const block = await workOrderBlock(tree);

      // The exact clause that made the ban conditional.
      expect(block).not.toContain("when owner rerun is required");
      expect(flat(block)).toContain("must_not: patch upstream artifacts directly;");
    });

    it(`${tree}: the work order names the remedy path`, async () => {
      const block = flat(await workOrderBlock(tree));

      expect(block).toContain(
        "every upstream change requires STOP + Change Request + owner rerun per .qfai/assistant/rule/drift-protocol.md",
      );
    });

    it(`${tree}: the protected set is an input the sub-agent receives`, async () => {
      // A delegated agent should not have to recall the protected set from
      // memory; the work order hands it the list.
      const block = await workOrderBlock(tree);

      expect(block).toContain(".qfai/assistant/rule/drift-protocol.md#core-rule");
    });

    it(`${tree}: the drift protocol defines the protected set and owner path`, async () => {
      const drift = flat(await read(tree, DRIFT));
      expect(drift).toContain("A downstream skill does not edit an approved specification");
      expect(drift).toContain(
        "Protected project artifacts include the policy and business-flow trees",
      );
      expect(drift).toContain("Obtain the user's explicit answer");
      expect(drift).toContain("Rerun the owner skill against the affected artifact");
    });

    it(`${tree}: the two files still reject downstream self-authorization`, async () => {
      const drift = await read(tree, DRIFT);
      expect(drift).toContain("Downstream stages do not patch protected upstream artifacts");
    });
  }
});
