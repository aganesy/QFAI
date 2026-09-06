/**
 * Stage 0 must not stop on a `prototyping.yaml` `/qfai-discussion` may legally omit (#599).
 *
 * The producer emits the file only when the pack is UI-bearing *and* an explicit
 * prototyping recommendation is useful, and the UI-bearing completion matrix does
 * not list it — so a complete UI-bearing pack can lack it. Stage 0 nevertheless
 * stopped on "missing valid `prototyping.yaml`", deadlocking the hand-off: no code
 * arbitrates the file (`src/**` never reads it), so the only way past the gate was
 * for the agent to fabricate a recommendation the discussion decided against.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const PLAYBOOK = "assistant/skills/qfai-sdd/references/sdd-execution-playbook.md";
const DISCUSSION_SKILL = "assistant/skills/qfai-discussion/SKILL.md";
const DISCUSSION_RULES = "assistant/skills/qfai-discussion/references/discussion-artifact-rules.md";
const COMPLETION_MATRIX =
  "assistant/skills/qfai-discussion/references/discussion-completion-matrix.md";

/** How the playbook must cite the schema: a path an initialized project can resolve. */
const RULES_CITATION = `\`.qfai/${DISCUSSION_RULES}#prototypingyaml\``;

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** The project root a `.qfai/...` citation resolves against, for each shipped tree. */
const projectRootOf = (tree: string): string => path.join(repoRoot, tree, "..");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("Stage 0 treats prototyping.yaml as optional for UI-bearing packs", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Stage 0 no longer stops on a missing prototyping.yaml`, async () => {
      const playbook = flat(await read(tree, PLAYBOOK));

      expect(playbook).not.toContain(
        "Stop if the latest UI-bearing pack is missing valid `prototyping.yaml`",
      );
      expect(playbook).toContain("Absence is legal and must not stop Stage 0");
    });

    // The validity half of the old check keeps its value as a REPORT. As a stop
    // it contradicted the runtime this skill fronts: `runSddPreflight` answers
    // `ready` with zero blockers for a malformed `prototyping.yaml`, and the
    // acceptance criterion behind it says side-artifact state alone does not
    // block SDD. Left as a stop, whether `/qfai-sdd` could proceed depended on
    // which entry point you used, and a project carrying an old-format file
    // could not run it at all.
    it(`${tree}: a present-but-invalid prototyping.yaml is reported, not a blocker`, async () => {
      const playbook = flat(await read(tree, PLAYBOOK));

      expect(playbook).not.toContain(
        "Stop if `prototyping.yaml` is present in the latest UI-bearing pack and does not parse against the schema in",
      );
      expect(playbook).toContain(
        "**Report — do not stop —** when `prototyping.yaml` is present in the latest UI-bearing pack and does not parse against the schema in",
      );
      expect(playbook).toContain("A malformed optional artifact is **not** a Stage 0 blocker");
      expect(playbook).toContain(RULES_CITATION);
      // The runtime half of this claim is pinned beside the preflight itself,
      // in `tests/core/sddPreflight.test.ts`, where the same test that asserts
      // `status: "ready"` also asserts this prose — the two have to move
      // together or the entry points disagree again.
    });

    it(`${tree}: the cited schema path resolves in an initialized project`, async () => {
      const playbook = flat(await read(tree, PLAYBOOK));

      // The citation is only useful if an agent standing in the project root can
      // open it; a tree-relative `skills/...` form dangles everywhere.
      expect(playbook).toContain(RULES_CITATION);
      await expect(
        readFile(path.join(projectRootOf(tree), ".qfai", DISCUSSION_RULES), "utf-8"),
      ).resolves.toContain("## `prototyping.yaml`");
    });

    it(`${tree}: Stage 0 forbids fabricating the file to clear the gate`, async () => {
      const playbook = flat(await read(tree, PLAYBOOK));

      expect(playbook).toContain("Never author one to clear this gate");
    });

    it(`${tree}: the schema anchor Stage 0 cites exists in the producer's rules`, async () => {
      const rules = await read(tree, DISCUSSION_RULES);

      // `#prototypingyaml` is the GitHub slug of this heading; if the heading is
      // renamed, Stage 0's citation dangles.
      expect(rules).toContain("## `prototyping.yaml`");
      expect(flat(rules)).toContain("When `prototyping.yaml` is present, use the single-thread");
    });

    it(`${tree}: the producer still keeps emission conditional`, async () => {
      const skill = flat(await read(tree, DISCUSSION_SKILL));
      const matrix = await read(tree, COMPLETION_MATRIX);

      // Option A keeps the producer as the owner of the decision; if a later
      // change makes emission unconditional, Stage 0's wording must move too.
      expect(skill).toContain(
        "Generate `prototyping.yaml` only when the latest discussion pack targets a prototyping " +
          "execution surface (`web`, `mobile`, `desktop`, `mixed`) and an explicit prototyping " +
          "recommendation is useful.",
      );
      expect(skill).toContain(
        "UI-bearing discussion packs may include `prototyping.yaml` as an optional recommendation artifact",
      );
      // The UI-bearing completion gate must keep omitting it. The slice ends at
      // the next `## ` heading rather than at `## Non-UI Packs`, because the
      // sections between them describe packs rather than gate them: `## CLI
      // Packs` names `prototyping.yaml` only to say a cli-only pack has none.
      const uiBearingStart = matrix.indexOf("## UI-bearing Packs");
      const uiBearing = matrix.slice(uiBearingStart, matrix.indexOf("\n## ", uiBearingStart + 1));
      expect(uiBearing.length).toBeGreaterThan(0);
      expect(uiBearing).not.toContain("prototyping.yaml");
    });
  }
});
