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
        .find((line) => line.startsWith("9. UI-affecting items have prototype parity PASS"));

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
        .find((line) => line.startsWith("9. UI-affecting items have prototype parity PASS"));
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
  }
});
