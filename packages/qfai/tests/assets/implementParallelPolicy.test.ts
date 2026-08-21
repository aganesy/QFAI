import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`. A runner launched from the
// repo root resolves `../..` to the directory ABOVE the repo, and every read
// below then fails on a path unrelated to what is being asserted.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const REFERENCE = "assistant/skills/qfai-implement/references/parallelization-policy.md";

/** The full rules live in a reference file; the skill keeps the summary. */
const policy = (tree: string): Promise<string> => read(tree, REFERENCE);

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which prettier happened to break the line.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("qfai-implement states one parallelization policy", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: separates cross-spec (barred) from item-level (governed)`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain("Parallel execution across multiple **specs** simultaneously");
      expect(skill).toContain("Cross-spec parallelism is barred");
      expect(skill).toContain("it is not approvable");
      expect(skill).toContain("Item-level parallelism inside one spec");
      expect(skill).toContain("references/parallelization-policy.md");
    });

    it(`${tree}: states precedence between the technical and consent gates`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain("**both must hold**");
      expect(skill).toContain("User approval cannot");
      expect(skill).toContain("override a technical DENY.");
      expect(skill).toContain("sole authority");
    });

    it(`${tree}: conditions are write conflicts, not existence of shared things`, async () => {
      const section = await policy(tree);
      expect(section).toContain("concurrent write conflicts");
      expect(section).toContain("per-worker schema isolation");
      // A DI container's mere existence must no longer be a blanket deny.
      expect(section).not.toContain(
        "No shared state (no shared database, global variable, singleton, or DI container)",
      );
      expect(section).not.toContain(
        "Shared fixture, shared mock, shared DI container, shared global setup",
      );
    });

    it(`${tree}: defines coordinated parallel ledger ownership`, async () => {
      // One `## Ledger ownership` section, with the dispatch-specific rules as
      // a subsection under it, so the `#ledger-ownership` anchor reaches both.
      const section = await policy(tree);
      expect(section).not.toContain("## Coordinated parallel mode (ledger ownership)");
      expect(section).toContain("### Coordinated parallel mode");
      expect(section).toContain("has exactly one writer: the\n**orchestrator**, in the **trunk**");
      expect(section).toContain("Item 10 of the 12-point gate is satisfied by the orchestrator");
    });

    it(`${tree}: agent-routing.yml documents what parallel_groups means`, async () => {
      const routing = await read(tree, "assistant/manifest/agent-routing.yml");
      expect(routing).toContain("describes ROLE FAN-OUT within a phase, not item");
    });

    it(`${tree}: worktree separation is required, with no degraded-mode escape`, async () => {
      const section = unwrap(await policy(tree));
      expect(section).toContain("## Isolation requirement (worktree separation)");
      expect(section).toContain('Adjudicated separately from the "all must be true" list');
      // `constitution/workflow.md` and spec-0011 REQ-0010 both require it, so
      // the only outcomes are "separate worktrees" and DENY.
      expect(section).toContain("**not waivable**");
      expect(section).toContain("two outcomes, not three");
      expect(section).toContain("**Anything else -> DENY.**");
      // A branch shares the working tree and the index: not a substitute.
      expect(section).toContain("A branch is **not** a substitute");
      expect(section).not.toContain("**declared degraded mode**");
      // The allow-condition list must no longer carry the unevaluable bullet.
      expect(section).not.toContain("**Recommendation, not a hard allow-condition**");
      expect(section).not.toContain("`constitution/workflow.md` Concurrency rules");
    });

    it(`${tree}: a write/read overlap between items is a conflict`, async () => {
      const section = unwrap(await policy(tree));
      expect(section).toContain(
        "No item **writes** a module that another concurrently dispatched item's test or implementation **reads**",
      );
      expect(section).toContain("become timing-dependent");
      expect(section).toContain("resolves the importers reachable from the other items");
    });

    it(`${tree}: external runtime resources are gated too`, async () => {
      // A worktree separates the checkout and the index only, so two items can
      // satisfy every module/fixture/DB condition and still collide at run time
      // on a fixed port, an out-of-worktree temp path or an external cache.
      const section = unwrap(await policy(tree));
      expect(section).toContain("contend for the same **external runtime resource**");
      expect(section).toContain("Worktree separation isolates the checkout and the index");
      for (const resource of ["ports", "os.tmpdir()", "caches, queues, brokers", "environment"]) {
        expect(section).toContain(resource);
      }
      expect(section).toContain("**disjoint write set**");
      expect(section).toContain("**per-worker isolation**");
      // Cited by anchor, not by stage name: the rule lives in the
      // stage-independent Concurrency subsection, so an anchor is both checkable
      // and correct about where it applies.
      expect(section).toContain(
        "`constitution/workflow.md#concurrency-stage-independent-mandatory` requires no",
      );
      expect(section).toContain("Worktree separation is also **not sufficient on its own**");
      // And the deny list must name the same collisions.
      expect(section).toContain("bind the same fixed port, write the same out-of-worktree path");
    });

    it(`${tree}: a read-only shared fixture is not a deny`, async () => {
      const section = unwrap(await policy(tree));
      expect(section).toContain(
        "A shared fixture module that neither item writes and each consumes read-only is not a deny",
      );
    });

    it(`${tree}: worker evidence blocks cite the per-item contract, not a copy of it`, async () => {
      // The inline copy named 11 of the contract's 23 fields while claiming to
      // carry **every** one. The ledger cells (`TDD-ID`, `Status`, `DR-ID`) are
      // named here because they are not contract fields; the fields themselves
      // must be reached by pointer so a second list cannot drift again.
      const section = unwrap(await policy(tree));
      for (const cell of ["`TDD-ID`", "final `Status`", "`DR-ID`"]) {
        expect(section).toContain(cell);
      }
      expect(section).toContain("`SKILL.md#per-item-evidence-contract-fresh-evidence-required`");
      expect(section).not.toContain("RED command and result");
      expect(section).not.toContain("Refactor verify command and result");
      expect(section).toContain("A block missing any contract field does not satisfy item 10");
    });

    it(`${tree}: the cited contract anchor resolves in SKILL.md`, async () => {
      // A pointer is only better than a copy while it lands somewhere.
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain("### Per-item evidence contract (fresh evidence required)");
    });
  }
});
