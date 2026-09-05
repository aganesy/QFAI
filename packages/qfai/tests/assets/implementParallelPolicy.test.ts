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
      const section = await policy(tree);
      expect(section).toContain("## Coordinated parallel mode (ledger ownership)");
      expect(section).toContain("owns every `test-list.md` write");
      expect(section).toContain("Item 10 of the 11-point gate is satisfied by the orchestrator");
    });

    it(`${tree}: agent-routing.yml documents what parallel_groups means`, async () => {
      const routing = await read(tree, "assistant/manifest/agent-routing.yml");
      expect(routing).toContain("describes ROLE FAN-OUT within a phase, not item");
    });

    it(`${tree}: no document quotes a parallel_groups value as fact`, async () => {
      // `build` ships a non-empty group, so quoting the empty literal asserts
      // something false about the very skill doing the quoting.
      for (const rel of ["assistant/skills/qfai-implement/SKILL.md", REFERENCE]) {
        expect(await read(tree, rel)).not.toContain("`parallel_groups: []`");
      }
    });

    it(`${tree}: the shipped build fan-out is described, not disclaimed away`, async () => {
      const section = unwrap(await policy(tree));
      expect(section).toContain("## Role fan-out inside one row (build phase)");
      expect(section).toContain("exactly one non-empty `parallel_groups`");
      expect(section).toContain("**One row, one `Owning module`, split between the roles.**");
      expect(section).toContain("**One evidence block per row.**");
      expect(section).toContain(
        "**One GREEN, judged over both outputs — taken on the merged tree by one role.**",
      );
      expect(section).toContain("**Seam reconciliation stays per row, and adds a per-role pass.**");
      // The summary bullet must carry the same answers, so a reader who never
      // opens the reference is not left with the disclaimer alone.
      const skill = unwrap(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      expect(skill).toContain(
        "may fan out `frontend-engineer` and `backend-engineer` over **one**",
      );
      expect(skill).toContain("the row keeps one `Owning module`");
      expect(skill).toContain("one GREEN observation covering both roles' output");
    });

    it(`${tree}: the fan-out starts only the roles the row actually needs`, async () => {
      // Both engineers are `conditional_agents` in `build`; a group is a
      // permission to run them together, not an instruction to always do so.
      const section = unwrap(await policy(tree));
      expect(section).toContain("Both are `conditional_agents` in that phase");
      expect(section).toContain(
        "the two run concurrently only **when both roles apply to the row and the planner selects both**",
      );
      const skill = unwrap(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      expect(skill).toContain(
        "only when both roles apply to that row and the planner selects both",
      );
    });

    it(`${tree}: the fan-out is not exempt from concurrent-write separation`, async () => {
      // Two roles writing one module at once are two delegated agents writing
      // concurrently, which the constitution binds whether or not a second
      // ledger item was dispatched.
      const section = unwrap(await policy(tree));
      expect(section).toContain("**No disjoint split, no fan-out.**");
      expect(section).toContain("runs its roles **one at a time**");
      expect(section).toContain("constitution/workflow.md#concurrency-stage-independent-mandatory");
      expect(section).toContain("each is given a disjoint set of paths within it before either");
      const skill = unwrap(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      expect(skill).toContain("a row that cannot be split that way runs its roles one at a time");
    });

    it(`${tree}: the fan-out exemption covers the item-dispatch gates only`, async () => {
      // Two roles running suites and dev servers at once contend for ports,
      // temp paths, test DBs and caches exactly as two items do, and a worktree
      // isolates none of them — so that allow condition is not exempted.
      const section = unwrap(await policy(tree));
      expect(section).toContain("**Those two are the whole exemption.**");
      expect(section).toContain("**External runtime resources are checked for the roles too.**");
      expect(section).toContain(
        "evaluate the allow list's **external runtime resource** condition over the two roles",
      );
      expect(section).toContain("the roles run one at a time");
      // The blanket phrasing the finding objected to must be gone.
      expect(section).not.toContain("the item-level gates below never apply to it");
      const skill = unwrap(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      expect(skill).toContain(
        "clears the external-runtime-resource condition over the two roles as it would over two items",
      );
    });

    it(`${tree}: reconciliation compares each role's head, not just the merged row`, async () => {
      // Merged output can satisfy the row's `Owning module` while both roles
      // wrote the same file, so the merged diff cannot verify the split.
      const section = unwrap(await policy(tree));
      expect(section).toContain("diff **each role's own head** as well");
      expect(section).toContain("against the path set that role was assigned");
      expect(section).toContain("or touched by both, as a deny-condition breach");
      expect(section).toContain("asserted at dispatch and never verified");
      const skill = unwrap(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      expect(skill).toContain(
        "has each role's head diffed against its assigned range at seam reconciliation",
      );
    });

    it(`${tree}: the per-role diff is taken over committed work only`, async () => {
      // `git diff <a>..<b>` is the two-commit usage: a role that returns with
      // its edits still in the index, the working tree or untracked files
      // enumerates as nothing and passes the overlap check however it wrote.
      const section = unwrap(await policy(tree));
      expect(section).toContain("**two-commit range**");
      expect(section).toContain("**reconcile no uncommitted role.**");
      expect(section).toContain("Each role commits in its own worktree before it returns");
      expect(section).toContain("`git status --porcelain` in that worktree must come back empty");
      expect(section).toContain("A non-empty status is itself a deny-condition breach");
      expect(section).toContain("untracked `??` entries included");
      expect(section).toContain("**before anything merges**");
      const skill = unwrap(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      expect(skill).toContain(
        "over a scoped commit whose worktree `git status --porcelain` comes back empty",
      );
      expect(skill).toContain("a two-commit range diff cannot see uncommitted or untracked");
    });

    it(`${tree}: the post-merge GREEN names the agent that produces it`, async () => {
      // Neither worktree holds the whole full-stack behaviour, and Handoff
      // Contracts 2-3 let neither the orchestrator nor the gatekeeper supply
      // an observation nobody submitted — so the merged tree goes back to a
      // role.
      const section = unwrap(await policy(tree));
      expect(section).toContain("**Nobody else may supply it either**");
      expect(section).toContain("the orchestrator cannot synthesize a pass it never observed");
      expect(section).toContain(
        "**re-delegates the merged tree to one of the two roles: the one that owns the row's `Selector`**",
      );
      expect(section).toContain("runs Phase Green steps 2 and 2a against the merged tree");
      expect(section).toContain("returns both in the per-item evidence contract's form");
      expect(section).toContain("has no admissible GREEN and does not leave it");
      const skill = unwrap(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      expect(skill).toContain(
        "**taken after the merge by the role that owns the row's `Selector`**",
      );
      expect(skill).toContain("neither the orchestrator nor `qa-gatekeeper` may supply");
    });

    it(`${tree}: out-of-module work needs an upstream row, never an invented one`, async () => {
      // Rows are upstream (`SKILL.md` Non-goals): `delivery-planner` selects
      // them, `/qfai-sdd` produces them.
      const section = unwrap(await policy(tree));
      expect(section).toContain("belongs to a **different ledger row**");
      expect(section).toContain("`delivery-planner` may only _select_ such a row");
      expect(section).toContain("**If no such row exists, do not fan out and do not invent one**");
      expect(section).toContain("raise a Change Request and hand the redesign to `/qfai-sdd`");
      expect(section).toContain("references/selector-granularity.md");
      const skill = unwrap(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      expect(skill).toContain(
        "work that does not fit the module needs an existing second row or a Change Request to `/qfai-sdd`",
      );
    });

    it(`${tree}: the fan-out anchor cited from SKILL.md resolves to a heading`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      const anchor = "role-fan-out-inside-one-row-build-phase";
      expect(skill).toContain(`references/parallelization-policy.md#${anchor}`);
      const headings = (await policy(tree))
        .split("\n")
        .filter((line) => line.startsWith("## "))
        .map((line) =>
          line
            .slice(3)
            .trim()
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-"),
        );
      expect(headings).toContain(anchor);
    });

    it(`${tree}: the build phase actually carries the fan-out the docs describe`, async () => {
      // If the group is ever emptied, the prose above becomes false the other
      // way round — this pins doc and manifest to the same reality.
      const routing = await read(tree, "assistant/manifest/agent-routing.yml");
      expect(routing).toContain(
        "parallel_groups:\n          - [frontend-engineer, backend-engineer]",
      );
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

    it(`${tree}: worker evidence blocks carry the whole per-item contract`, async () => {
      const section = unwrap(await policy(tree));
      for (const field of [
        "`TDD-ID`",
        "`TC-ref`",
        "RED command and result",
        "GREEN command and result",
        "Refactor verify command and result",
        "`Spec review`",
        "`Code quality review`",
        "`Prototype parity`",
        "`DR-ID`",
      ]) {
        expect(section).toContain(field);
      }
      expect(section).toContain("A block missing any contract field does not satisfy item 10");
    });
  }
});
