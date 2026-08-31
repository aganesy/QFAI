/**
 * The `UI-affecting` gate trigger has to be defined once (#701).
 *
 * Item 9 of `qfai-implement`'s completion gate blocks `done` on "UI-affecting
 * items have prototype parity PASS", but the shipped tree never defined the
 * term. Where the skill stated the qualifying condition instead of reusing the
 * bare word, it stated it four different ways ("touches UI or critique-driven
 * behavior", "changes surface behavior", "affects UI behavior or rendered
 * output", "before closing any UI-affecting item"), and `agent-routing.yml`
 * listed `product-surface-reviewer` under `conditional_agents` with no
 * condition anywhere in the file. The actor deciding whether item 9 applies is
 * the actor the gate exists to check, and skipping it left no artifact behind.
 *
 * These tests pin the single mechanical definition, its use at every site, and
 * the `n/a` record that makes a skipped item 9 auditable.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const IMPLEMENT = "assistant/skills/qfai-implement";
const SKILL = `${IMPLEMENT}/SKILL.md`;
const DEFINITION = `${IMPLEMENT}/references/ui-affecting.md`;
const POLICY = `${IMPLEMENT}/references/parallelization-policy.md`;
const VOLUME = `${IMPLEMENT}/references/volume-policy.md`;
const STRUCTURE = "assistant/catalog/structure.md";
const ROUTING = "assistant/manifest/agent-routing.yml";
const REVIEWER = "assistant/agents/product-surface-reviewer.md";

/** How every site names the definition. One string, checked everywhere. */
const REFERENCE = "references/ui-affecting.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Prose lines using the term — headings and table rows excluded. */
const usageLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .filter((line) => line.includes("UI-affecting"))
    .filter((line) => !line.startsWith("#"));

describe("UI-affecting is defined once and referenced everywhere", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the definition is a shipped reference file`, async () => {
      // It cannot live inline in SKILL.md: that file sits one line under the
      // asset line ceiling, and the ceiling's design rule is that detail goes
      // to references/ (tests/helpers/skillBudget.ts).
      const definition = await read(tree, DEFINITION);

      expect(definition).toContain("# UI-affecting items (definition)");
      expect(definition).toContain("the **only** definition");
    });

    it(`${tree}: the definition is mechanical, not a judgement call`, async () => {
      const definition = await read(tree, DEFINITION);

      // Every clause is keyed to a ledger column or a declared path, and the
      // `Owning module` clause is guarded because that column is optional.
      expect(definition).toContain("`Owning module`");
      expect(definition).toContain("`Test file`");
      expect(definition).toContain("catalog/structure.md#ui-surface-paths-ssot");
      expect(definition).toContain("only when the ledger declares one");

      // No clause is waivable, which is the property the four rival phrasings
      // did not have.
      expect(definition).toContain("waivable");
      expect(definition).toContain("Nothing outside those three clauses");
    });

    it(`${tree}: Component alone is not the trigger`, async () => {
      const definition = await read(tree, DEFINITION);

      // L2 is "collaboration with a port through a fake / in-memory adapter"
      // (catalog/test-layers.md#l2-component) — on a backend-only project every
      // Component row would have demanded rendered evidence for screens that do
      // not exist.
      expect(definition).toContain("**`Layer` is `Component` is not a clause.**");
      expect(definition).toContain("catalog/test-layers.md#l2-component");
    });

    it(`${tree}: the obligation clause covers API rows and is written-down only`, async () => {
      const definition = await read(tree, DEFINITION);

      // An `API` row carries `-` in TC-Refs by contract and stores its
      // obligation in CON-API-Refs, so a response body a screen renders is
      // reachable through no other clause.
      expect(definition).toContain("`CON-API-Refs`");

      // "resolves to" was unevaluable: the shipped UI contract schema has no
      // obligation field, so two agents could answer the same row differently.
      // The link has to be a literal occurrence in one of two named places.
      expect(definition).toContain("The link must be **written down**");
      expect(definition).toContain("occurs verbatim inside a declared UI");
      expect(definition).toContain("verbatim in the obligation's own source entry");
    });

    it(`${tree}: UI contracts are discovered the way the tooling discovers them`, async () => {
      const definition = await read(tree, DEFINITION);

      // `readUiContractScreenContracts` / `validateScreenIdCasing` walk
      // `<paths.contractsDir>/ui/**\/*.{yaml,yml}`. A fixed
      // `.qfai/contracts/ui/*.yaml` would drop `.yml` contracts, the per-spec
      // subdirectory layout and every repointed contractsDir.
      expect(definition).toContain("`*.yaml` **and** `*.yml`");
      expect(definition).toContain("`<contractsDir>/ui/**` **recursively**");
      expect(definition).toContain("`paths.contractsDir`");
      // The fixed path survives only as the named anti-pattern.
      expect(definition).toContain("Reading only `.qfai/contracts/ui/*.yaml` would silently drop");
    });

    it(`${tree}: structure.md declares UI paths in a machine-checkable form`, async () => {
      const structure = await read(tree, STRUCTURE);

      // Clauses 1 and 2 match against a declaration; before this section the
      // template had no place to write one, so "matches a UI path" had no
      // referent at all.
      expect(structure).toContain("## UI surface paths (SSOT)");
      expect(structure).toContain("ui_paths:");
      expect(structure).toContain("one repo-root-relative POSIX glob per");
      expect(structure).toContain("references/ui-affecting.md");
    });

    it(`${tree}: a row that skips item 9 still leaves an artifact`, async () => {
      const definition = await read(tree, DEFINITION);
      const skill = await read(tree, SKILL);

      // Without this, "not UI-affecting" is indistinguishable afterwards from
      // "had a UI surface and declined to say so".
      expect(definition).toContain("`n/a (not UI-affecting)`");

      // And the skill's evidence contract has to accept that value.
      const evidenceLine = skill
        .split(/\r?\n/)
        .find((line) => line.startsWith("- `Prototype parity`"));
      expect(evidenceLine).toBeDefined();
      expect(evidenceLine).toContain("n/a (not UI-affecting)");
      expect(evidenceLine).toContain(REFERENCE);
      expect(evidenceLine).toContain("Never blank");

      // Item 9 asks for the deciding clause, so the evidence field has to have
      // somewhere to put it.
      expect(definition).toContain("`PASS (clause N)`");
      expect(evidenceLine).toContain("PASS (clause N)");
    });

    it(`${tree}: rows finished before the field existed are not retro-blocked`, async () => {
      const definition = await read(tree, DEFINITION);
      const skill = await read(tree, SKILL);

      // `done` rows are skipped on re-execution, so a blank cell on one of them
      // has no repair path — "Never blank" has to scope to rows this run
      // advances.
      expect(definition).toContain("### Rows completed before this field existed");
      expect(definition).toContain("retroactively blocked");

      const evidenceLine = skill
        .split(/\r?\n/)
        .find((line) => line.startsWith("- `Prototype parity`"));
      expect(evidenceLine).toContain("this run takes through the gate");
      expect(evidenceLine).toContain("#rows-completed-before-this-field-existed");
    });

    it(`${tree}: the volume policy's T3 tier routes on the same predicate`, async () => {
      const volume = await read(tree, VOLUME);

      // "Changes UI behavior or rendered output" was a second, wider test: a row
      // could owe product-surface-reviewer there and record
      // `n/a (not UI-affecting)` at item 9, making both running and skipping the
      // review a rule violation.
      expect(volume).not.toContain("Changes UI behavior or rendered output");
      expect(volume).toContain(`UI-affecting (\`${REFERENCE}\`)`);
      expect(volume).toContain("T3 and gate item 9 route on the **same** predicate");
    });

    it(`${tree}: gate item 9 names the definition it depends on`, async () => {
      const skill = await read(tree, SKILL);
      const item9 = skill
        .split(/\r?\n/)
        .find((line) => line.startsWith("9. UI-affecting items have "));

      expect(item9).toBeDefined();
      expect(item9).toContain(REFERENCE);
      expect(item9).toContain("not the implementer's judgement call");
    });

    it(`${tree}: every use of the term in the skill points at the definition`, async () => {
      const skill = await read(tree, SKILL);
      const uses = usageLines(skill);

      expect(uses.length).toBeGreaterThan(3);
      expect(uses.filter((line) => !line.includes(REFERENCE))).toEqual([]);
    });

    it(`${tree}: the four rival phrasings are gone`, async () => {
      const skill = await read(tree, SKILL);

      expect(skill).not.toContain("critique-driven");
      expect(skill).not.toContain("when the item changes surface behavior");
      expect(skill).not.toContain("affects UI behavior or rendered output");
      expect(skill).not.toContain("touches UI or");
    });

    it(`${tree}: "critique-driven behavior" is retired tree-wide`, async () => {
      // It occurred exactly once in the whole assistant tree, in a read-order
      // bullet, while carrying gate-trigger weight.
      for (const rel of [SKILL, POLICY, DEFINITION]) {
        expect(await read(tree, rel)).not.toContain("critique-driven");
      }
    });

    it(`${tree}: the parallelization policy reads the same predicate`, async () => {
      const policy = await read(tree, POLICY);
      const uses = usageLines(policy);

      expect(uses.length).toBeGreaterThan(0);
      expect(uses.filter((line) => !line.includes("ui-affecting.md"))).toEqual([]);
    });

    it(`${tree}: agent-routing.yml names the condition it routes on`, async () => {
      const routing = await read(tree, ROUTING);
      const implement = routing.slice(
        routing.indexOf("- skill: qfai-implement"),
        routing.indexOf("- skill: qfai-atdd"),
      );

      // `conditional_agents: [product-surface-reviewer]` said "conditional" and
      // stopped — no `condition` key existed anywhere in the file. The
      // predicate lives in the skill; the manifest must say where.
      expect(implement).toContain("conditional_agents: [product-surface-reviewer]");
      expect(implement).toContain(`skills/qfai-implement/${REFERENCE}`);
    });

    it(`${tree}: the routed review reads the contract set the clause fired on`, async () => {
      const skill = await read(tree, SKILL);
      const reviewer = await read(tree, REVIEWER);

      // The trigger resolves `paths.contractsDir`, recursion and `.yml`; the
      // review inputs used to be pinned to `.qfai/contracts/ui/*.yaml`. A row
      // routed by clause 3 on a `.yml` contract, a per-spec subdirectory or a
      // repointed contractsDir could then PASS without the reviewer ever
      // reading the contract that routed it.
      const readOrder = skill
        .split(/\r?\n/)
        .find((line) => line.startsWith("- Read spec + contract inputs first"));
      expect(readOrder).toBeDefined();
      expect(readOrder).toContain("#the-two-inputs");
      expect(readOrder).toContain("`<contractsDir>/ui/**`");
      expect(readOrder).toContain("`paths.contractsDir`");
      expect(readOrder).not.toContain("`.qfai/contracts/ui/*.yaml`");

      // Same resolver on the agent that performs the review.
      expect(reviewer).not.toContain("UI contract files under `.qfai/contracts/ui/`");
      expect(reviewer).toContain("`<contractsDir>/ui/**`");
      expect(reviewer).toContain("`paths.contractsDir`");
      expect(reviewer).toContain("walked recursively");
      expect(reviewer).toContain(REFERENCE);
    });

    it(`${tree}: a dotted Owning module is normalised before the glob match`, async () => {
      const definition = await read(tree, DEFINITION);
      const structure = await read(tree, STRUCTURE);

      // `execution-ledger.md` allows `Owning module` to be a dotted module
      // path, but declared UI paths are POSIX globs: untranslated,
      // `src.components.Button` misses `src/components/**` and the row answers
      // `n/a` on a technicality.
      expect(definition).toContain("### Normalising `Owning module`");
      expect(definition).toContain("`src.components.Button` → `src/components/Button`");
      expect(definition).toContain("every `.` replaced by `/`");

      // The rule must not classify the cell first: no rule short of an
      // extension list tells the root-level path `App.tsx` from the dotted
      // module `src.components.Button`, and dot-to-slash would mangle it to
      // `App/tsx`. Both readings are matched instead, verbatim first.
      expect(definition).toContain("not classify the cell");
      expect(definition).toContain("**two candidate strings**");
      expect(definition).toContain("the cell **verbatim**");
      expect(definition).toContain("`App.tsx`");
      expect(definition).toContain("Skipped when the cell contains `/`");

      // And the declaration side points at that rule, since its own matching
      // rule only covers path cells.
      expect(structure).toContain("#normalising-owning-module");
    });

    it(`${tree}: an undeclared Owning module falls back to the row's own change`, async () => {
      const definition = await read(tree, DEFINITION);
      const skill = await read(tree, SKILL);

      // `Owning module` is optional, so `-` plus a unit test outside every
      // declared UI path plus an obligation naming no contract id defeated all
      // three clauses while the production code landed under `src/components/`.
      // The column the row was never required to fill cannot be what decides.
      expect(definition).toContain("### When `Owning module` is not declared");
      expect(definition).toContain("the clause is **not skipped**");
      expect(definition).toContain("git diff --name-only");
      expect(definition).toContain("required to fill is empty");

      // And the answer is taken at the gate, where the diff exists — an early
      // reading is a working assumption, not the recorded value.
      const item9 = skill
        .split(/\r?\n/)
        .find((line) => line.startsWith("9. UI-affecting items have "));
      expect(item9).toContain("#when-owning-module-is-not-declared");
      expect(item9).toContain("against the tree the row landed at");
    });

    it(`${tree}: a structured primary task id is a link target`, async () => {
      const definition = await read(tree, DEFINITION);

      // `screens[].primary_tasks[]` is a closed `{id, label, acceptance}` shape
      // whose `id` is the stable handle ATDD scaffolds cite, so an obligation
      // that references a screen's task references it by that id and nothing
      // else. Collecting only screen / element / action ids missed the link.
      expect(definition).toContain("`screens[].primary_tasks[].id`");
      expect(definition).toContain("ui-contract-guide.md#screensprimary_tasks-shape");
    });

    it(`${tree}: the parity verdict is dated and hashed like items 7-8`, async () => {
      const definition = await read(tree, DEFINITION);
      const skill = await read(tree, SKILL);

      // `PASS (clause N)` alone dates from nothing, so a PASS taken against one
      // surface could be carried onto a row whose UI, contract or rendered
      // evidence moved afterwards.
      expect(definition).toContain(
        "### Staleness: `Reviewed revision` and `Audited evidence hash`",
      );

      const evidenceLine = skill
        .split(/\r?\n/)
        .find((line) => line.startsWith("- `Prototype parity`"));
      expect(evidenceLine).toContain("Reviewed revision");
      expect(evidenceLine).toContain("Audited evidence hash");
      expect(evidenceLine).toContain("#staleness-reviewed-revision-and-audited-evidence-hash");

      // Gate item 10's revision-agreement rule covered items 3/5/7/8 and
      // excluded item 9, which is what let a stale PASS through it.
      const item10 = skill.split(/\r?\n/).find((line) => line.startsWith("10. `test-list.md`"));
      expect(item10).toBeDefined();
      expect(item10).toContain("items 5, 7, 8 and 9 share `Revision`");
      expect(item10).toContain("Item 9's hash is recomputed");
    });

    it(`${tree}: the design contracts resolve from contractsDir too`, async () => {
      const skill = await read(tree, SKILL);
      const readOrder = skill
        .split(/\r?\n/)
        .find((line) => line.startsWith("- Read spec + contract inputs first"));

      // `designContractReadiness` resolves the three design files from
      // `config.paths.contractsDir`, so pinning them to `.qfai/contracts/design/`
      // in the same read order that resolves UI contracts dynamically made a
      // repointed project read a stale mirror or stop on a default it never had.
      expect(readOrder).toContain("`<contractsDir>/design/DESIGN.md.lock.yaml`");
      expect(readOrder).toContain("`<contractsDir>/design/design-system.yaml`");
      expect(readOrder).toContain("`<contractsDir>/design/prototype-handoff.yaml`");
      expect(readOrder).not.toContain("`.qfai/contracts/design/");
    });

    it(`${tree}: the orchestrator re-derives the answer under parallel mode`, async () => {
      const definition = await read(tree, DEFINITION);
      const policy = await read(tree, POLICY);

      // A worker returning `n/a` is the implementer self-reporting on the gate
      // that exists to check it — a complete evidence block is not enough.
      expect(policy).toContain("the one field the orchestrator recomputes rather than");
      expect(policy).toContain("`ui-affecting.md#the-test`");
      expect(policy).toContain("Its own result decides");
      expect(policy).toContain("**reported discrepancy**");
      expect(definition).toContain("does **not** take the worker's value");
    });

    it(`${tree}: an installed project has a path off the stale manifest`, async () => {
      const definition = await read(tree, DEFINITION);

      // `init --force` regenerates skills/ and agents/ but never manifest/, so
      // an existing project keeps a catalog pinned to `.qfai/contracts/ui/`
      // and a routing entry with no predicate. Same shape, same remedy as
      // qfai-atdd/references/stale-manifest.md.
      expect(definition).toContain("## A project whose manifest predates this definition");
      expect(definition).toContain(
        "node_modules/qfai/assets/init/.qfai/assistant/manifest/agent-catalog.yml",
      );
      expect(definition).toContain("../qfai-atdd/references/stale-manifest.md");
    });

    it(`${tree}: the routed review resolves the design contract from contractsDir too`, async () => {
      // The UI contract set already followed `paths.contractsDir`; the design
      // contract the same reviewer compares against stayed pinned to
      // `.qfai/contracts/design/`. On a project that repointed the directory the
      // reviewer read nothing and either passed without the handoff or stopped
      // on a default path that is not there.
      const reviewer = await read(tree, REVIEWER);
      expect(reviewer).toContain("`<contractsDir>/design/prototype-handoff.yaml`");
      expect(reviewer).not.toContain("`.qfai/contracts/design/prototype-handoff.yaml`");
      expect(reviewer).toContain("the same `<contractsDir>` as the line above");
    });

    it(`${tree}: the UI glob matcher is specified, not left to the tool`, async () => {
      // `**` differs across Bash, minimatch and fast-glob on recursion, zero
      // segments and dotfiles, so the same row answered differently depending
      // on which matcher an agent reached for.
      const structure = await read(tree, STRUCTURE);
      expect(structure).toContain("`**` matches **zero or more** path segments");
      expect(structure).toContain("it never crosses\n  a `/`");
      expect(structure).toContain("A leading dot is **not** special");
      expect(structure).toContain("Matching is case-sensitive");
      expect(structure).toContain("No other metacharacter is recognised");
    });

    it(`${tree}: the dotted candidate cannot invent a match for a root-level file`, async () => {
      // Over-correction pin for the test below. `app.config.ts` -> `app/config/ts`
      // matches a declared `app/**`, so a non-UI config file was routed for
      // rendered evidence and a parity review. Widening candidate 2 to catch
      // short module tails must not bring that back: both root-level files
      // still translate to names no directory has, and stay path-only.
      const definition = await read(tree, DEFINITION);
      expect(definition).toContain("Candidate 2 adds matches; it must not invent one");
      expect(definition).toContain("| `app.config.ts`       | `app/config/ts`       | no");
      expect(definition).toContain("| `App.tsx`             | `App/tsx`             | no");
    });

    it(`${tree}: a short dotted module tail still produces a path candidate`, async () => {
      // The guard on candidate 2 was a length heuristic: a tail of 1-5 letters
      // or digits counted as a file extension. That is also the shape of a
      // component name, so `src.components.Card` — and its `Form`, `Page`,
      // `View`, `Modal` siblings — lost the `src/components/Card` candidate,
      // missed the declared `src/components/**` glob, and recorded
      // `n/a (not UI-affecting)` on precisely the rows this definition exists
      // to catch. `src.components.api` was lost the same way.
      const definition = await read(tree, DEFINITION);

      expect(definition).not.toContain("1–5");
      expect(definition).not.toContain("final dot-separated segment is not a file extension");
      expect(definition).toContain(
        "**Guessing the form from the string is not the way to stop that.**",
      );
      expect(definition).toContain("its `Form`, `Page`, `View` and `Modal` siblings");

      // The replacement classifies nothing. It forms the candidate whenever the
      // cell has no `/` and keeps it only when the tree actually has that path,
      // so the decision comes from the repository rather than from the shape of
      // a name. The delimiter stops a prefix borrowing a longer entry.
      expect(definition).toContain("`git ls-files --cached --others --exclude-standard`");
      expect(definition).toContain(
        "**Keep candidate 2** when a listed path is the candidate itself",
      );
      expect(definition).toContain("| `src.components.Card` | `src/components/Card` |");
      expect(definition).toContain("| `src.components.api`  | `src/components/api`  |");
      expect(definition).toContain(
        "`src.components.Car` cannot borrow the entry `src/components/Card.tsx`",
      );
    });

    it(`${tree}: the CON-API source entry has a resolver of its own`, async () => {
      // "the API contract entry that declares a CON-API-*" is not a location:
      // the canonical tooling walks `<contractsDir>/api/**` and accepts JSON too,
      // so searching the default directory for YAML alone missed the link and
      // recorded `n/a` on an API change the UI renders.
      const definition = await read(tree, DEFINITION);
      expect(definition).toContain("**Where the API contract entry is**");
      expect(definition).toContain("`<contractsDir>/api/**`");
      expect(definition).toContain("**and** `.json`");
      expect(definition).toContain("the miss is\none-directional");
    });

    it(`${tree}: the fallback diff sees a file git does not track yet`, async () => {
      // Over-correction pin for the test below. A TDD row is evaluated on an
      // uncommitted tree, where a brand-new `src/components/Button.tsx` is
      // untracked and `git diff` lists nothing for it. Scoping the list to the
      // row must not drop the untracked half again.
      const definition = await read(tree, DEFINITION);
      expect(definition).toContain("**the files git does not track yet**");
      expect(definition).toContain("`src/components/Button.tsx` is untracked");
      expect(definition).toContain("while still honouring `.gitignore`");
    });

    it(`${tree}: the fallback diff is scoped to the row's own window`, async () => {
      // The list was "everything that differs from the revision the row started
      // from" concatenated with "every untracked file in the repo". Neither
      // half is attributable to the row: the first carries whatever was already
      // dirty when the row started, the second has no revision anchor at all.
      // One pre-existing edit under a declared UI path, or one stray untracked
      // file, then fired clause 1 on an unrelated `Owning module = -` row and
      // demanded rendered evidence for a screen it never touched.
      const definition = await read(tree, DEFINITION);

      expect(definition).not.toContain("comparing two commits omits everything not yet committed");
      expect(definition).toContain("is repo-wide with no revision anchor");

      // Replaced by two whole-tree snapshots of the row's own window, taken
      // through a scratch index and diffed against each other. Content, not
      // path membership: a file dirty before the row AND edited by it must stay
      // in the list, which subtracting path sets loses.
      expect(definition).toContain("**two snapshots of the row's own window**");
      expect(definition).toContain(
        "GIT_INDEX_FILE=$(mktemp -u) sh -c 'git add -A && git write-tree'",
      );
      expect(definition).toContain("git diff --name-only <start-tree> <gate-tree>");
      expect(definition).toContain("already modified **and then edited again by the row**");
      expect(definition).toContain("Subtracting path lists gets that second case wrong");
    });

    it(`${tree}: item 9 shares the revision whether or not a clause fired`, async () => {
      // `n/a` is a claim about the tree too — no declared UI path was touched —
      // and a checkpoint re-fix that adds one makes it false exactly as it makes
      // a stale PASS false. Exempting it accepted an `n/a` taken before the
      // change existed while the final diff matched a UI path.
      const revision = await read(tree, `${IMPLEMENT}/references/evidence-revision.md`);
      expect(revision).toContain("gate items 3, 5, 7, 8 and 9) MUST all name the **same**");
      expect(revision).toContain("**Item 9 is in that set whatever it answered.**");
      expect(revision).toContain("`n/a` is a claim about the tree");
      expect(revision).not.toContain("and 9 on a row a UI-affecting");
    });

    it(`${tree}: the recomputation binds the ledger writer in every mode`, async () => {
      // Placed under coordinated parallel mode alone, it was skipped by default:
      // the ordinary serial run copied the implementer's `Prototype parity`
      // straight into the ledger, so the self-report went unchecked in the mode
      // most rows take.
      const policy = await read(tree, POLICY);
      expect(policy).toContain("**This is a rule of the ledger writer, not of parallel mode.**");
      expect(policy).toContain(
        "**whoever writes the row recomputes `Prototype parity` before writing it**",
      );
      expect(policy).toContain("It is the one evidence field the writer does not copy");
    });
  }
});
