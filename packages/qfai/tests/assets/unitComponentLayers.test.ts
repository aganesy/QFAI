import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LAYER_TAGS } from "../../src/core/testStrategyTags.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const CATALOG = "assistant/catalog/test-layers.md";

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

/** Returns the `## Layer definitions` body. */
function layerDefinitions(content: string): string {
  const start = content.indexOf("## Layer definitions");
  const rest = content.slice(start + 1);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}

describe("the layer SSOT defines every layer the rest of qfai names", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: L1 Unit and L2 Component have the same shape as L3-L5`, async () => {
      const section = layerDefinitions(await read(tree, CATALOG));
      for (const heading of ["### L1 Unit", "### L2 Component"]) {
        expect(section).toContain(heading);
      }
      // Each layer block carries Scope / Goal / where its tests live.
      const blocks = section.split(/### L\d /).slice(1);
      expect(blocks).toHaveLength(5);
      for (const block of blocks) {
        expect(block).toContain("- Scope:");
        expect(block).toContain("- Goal:");
      }
      // L1/L2 say "Convention" and L3-L5 say "Location rule", and the
      // difference is load-bearing: only the pinned three are scanned, and
      // calling `tests/unit/**` a rule is what made a project believe its
      // correctly-placed L1 annotation was owed to `tests/integration/**`.
      const [l1, l2, ...pinned] = blocks;
      for (const block of [l1, l2]) {
        expect(block).toContain("- Convention:");
        expect(block).not.toContain("- Location rule:");
      }
      for (const block of pinned) {
        expect(block).toContain("- Location rule:");
      }
    });

    it(`${tree}: every LAYER_TAGS entry has a definition`, async () => {
      const section = layerDefinitions(await read(tree, CATALOG)).toLowerCase();
      for (const tag of LAYER_TAGS) {
        expect(section).toContain(tag.replace("layer-", "").replace("e2e", "e2e"));
      }
    });

    it(`${tree}: the kind list carries the three AtddTestKind members only`, async () => {
      // This list used to be headed "TestKind resolution (single source)" and
      // gave `tests/unit/**` and `tests/component/**` their own rows, so a
      // reader scanning for a "single source" heading found a five-member set
      // that contradicts the `(normative)` crosswalk and that
      // `resolveTestKind` cannot produce. It now derives from the crosswalk.
      const catalog = await read(tree, CATALOG);
      expect(catalog).not.toContain("TestKind resolution (single source)");
      expect(catalog).toContain(
        "## Directory → AtddTestKind (code-side, derived from the crosswalk)",
      );
      for (const kind of ["Integration", "API", "E2E"]) {
        expect(catalog).toContain(`\`<testsDir>/${kind.toLowerCase()}/**\` -> ${kind}`);
      }
      expect(catalog).not.toContain("-> Unit");
      expect(catalog).not.toContain("-> Component");
      expect(catalog).toContain("L1 Unit and L2 Component resolve to no kind.");
    });

    it(`${tree}: Unit and Component are stated to owe no ATDD annotation`, async () => {
      const catalog = await read(tree, CATALOG);
      // The previous text told the reader to "keep discharging every TC-* in
      // tests/integration/**" until per-level routing went live. That made
      // QFAI-ATDD-112 — an `error`, and unwaivable under QFAI-WAIVER-002 —
      // demand an annotation in a directory this same file says L1/L2 do not
      // have. The resolution is that ATDD does not own them at all.
      expect(catalog).toContain("**Unit and Component owe no ATDD annotation.**");
      expect(catalog).toContain("QFAI-ATDD-117");
      expect(catalog).not.toContain("keep discharging every `TC-*` in `tests/integration/**`");
      expect(catalog).not.toContain("target state — **not enforced, do not follow yet**");
    });

    it(`${tree}: the exclusion names the gate that still covers L1/L2`, async () => {
      // Removing an obligation without naming its replacement would read as
      // "unit tests are ungated", which is not what happened.
      const catalog = await read(tree, CATALOG);
      expect(catalog).toContain("TDDLIST_TC_NOT_COVERED");
      expect(catalog).toContain("`/qfai-implement`");
    });

    it(`${tree}: a misplaced TC annotation is rejected relative to its own Level`, async () => {
      // The bullet used to ban `TC-*` from `tests/api/**` and `tests/e2e/**`
      // outright and tell the reader to discharge an L4 obligation as
      // `CON-API-*`. The validator allows — and requires — a `TC-*`
      // annotation in the directory its declared `Level` names, so a reader
      // following the ban left an L4/L5 TC uncovered.
      const catalog = flat(await read(tree, CATALOG));
      expect(catalog).toContain("`QFAI-ATDD-121` / `QFAI-ATDD-122` / `QFAI-ATDD-123`");
      expect(catalog).toContain("The rule is `Level`-relative, not a blanket ban");
      expect(catalog).not.toContain("never as a `TC-*` one");
      // The re-filing advice stays: a `TC-*` should not be at L4/L5 at all.
      expect(catalog).toContain("re-file that obligation as `CON-API-*` or `US-*`");
    });

    it(`${tree}: the coverage metric is separated from the file location`, async () => {
      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(flat(rules)).toContain("it says nothing about where the test file lives");
      // The SDD reference used to say every TC — unit/component included — is
      // discharged in `tests/integration/**`. That is the instruction
      // `QFAI-ATDD-112` no longer implements, and leaving it here would have
      // `/qfai-sdd` and `/qfai-atdd` hand an author opposite procedures.
      expect(flat(rules)).not.toContain("still discharged in `tests/integration/**`");
      expect(flat(rules)).toContain("**`L1`/`L2` owe no ATDD annotation at all**");
      expect(rules).toContain("TDDLIST_TC_NOT_COVERED");
    });
  }
});

describe.each(["packages/qfai/assets/init/.qfai", ".qfai"])(
  "%s — the routing section matches the validator",
  (tree) => {
    const read = async (rel: string): Promise<string> =>
      (await readFile(path.join(repoRoot, tree, rel), "utf-8")).replace(/\s+/g, " ");

    it("routes a TC by its Level, not by its ID type", async () => {
      // The section above the L1/L2 rule still said "Level does not move the
      // annotation" and "every `TC-*` is answered from tests/integration/**,
      // and api/e2e reject it outright". A reader following it duplicates
      // L1/L2 into integration and misplaces L4/L5 — against the validator and
      // against the rule two paragraphs below.
      const catalog = await read("assistant/catalog/test-layers.md");
      expect(catalog).toContain(
        "A `TC-*` is answered from the directory **its own declared `Level`** names",
      );
      expect(catalog).toContain("| `L1`/`Unit` | no ATDD obligation |");
      expect(catalog).toContain("| `L2`/`Component` | no ATDD obligation |");
      expect(catalog).toContain("| `L3`/`Integration` | `<testsDir>/integration/**` |");
      expect(catalog).toContain("| none declared | `<testsDir>/integration/**` |");
      expect(catalog).not.toContain("It does **not** move the traceability annotation.");
      expect(catalog).not.toContain(
        "a `TC-*` reference inside `tests/api/**` or `tests/e2e/**` is rejected outright",
      );
    });

    it("keeps the misplacement rule symmetric", async () => {
      const catalog = await read("assistant/catalog/test-layers.md");
      expect(catalog).toContain("`QFAI-ATDD-121` / `QFAI-ATDD-122` / `QFAI-ATDD-123`");
      expect(catalog).toContain("the rejection is symmetric");
    });
  },
);

describe("the npm README states the routing the package ships", () => {
  // `packages/qfai/README.md` is in `package.json#files`, so it is the npm
  // landing page. It kept the pre-`Level`-routing rules: every `TC` in
  // `tests/integration/**` and a blanket ban on `TC` in `tests/api/**` /
  // `tests/e2e/**`. A reader arriving from npm duplicated L1/L2 into
  // integration — the collapse this release exists to stop — and could not put
  // an L4/L5 annotation in the home the validator demands.
  const readReadme = async (): Promise<string> =>
    (await readFile(path.join(repoRoot, "packages/qfai/README.md"), "utf-8")).replace(/\s+/g, " ");

  it("routes a TC by its declared Level", async () => {
    const readme = await readReadme();
    expect(readme).toContain("| `L1`/`Unit`, `L2`/`Component` | no ATDD annotation |");
    expect(readme).toContain("| `L3`/`Integration` | `tests/integration/**` |");
    expect(readme).toContain("| `L4`/`API` | `tests/api/**` |");
    expect(readme).toContain("| `L5`/`E2E` | `tests/e2e/**` |");
    expect(readme).toContain("| none declared, or unreadable | `tests/integration/**` |");
  });

  it("no longer sends every test case to tests/integration or bans TC outright", async () => {
    const readme = await readReadme();
    expect(readme).not.toContain(
      "`tests/integration/**`: annotate all covered test cases with concrete IDs",
    );
    expect(readme).not.toContain(
      "`tests/api/**` and `tests/e2e/**` must not use `TC` annotations.",
    );
    expect(readme).toContain("The rule is `Level`-relative, not a blanket ban");
  });

  it("names the gate that owns Unit and Component instead", async () => {
    // Dropping an obligation without naming its replacement reads as "unit
    // tests are ungated", which is not what happened.
    //
    // The ledger is named as the per-spec `test-list.md`, not as a bare
    // `tdd/test-list.md`: the README alignment gate copies this sentence into
    // the repository root README, where the markdown path-reference guardrail
    // (`assets.test.ts` > "checks relative path references in markdown")
    // resolves `tdd/test-list.md` against the repo root and finds nothing.
    const readme = await readReadme();
    expect(readme).toContain("carry **no** ATDD annotation obligation");
    expect(readme).toContain("per-spec `test-list.md` ledger");
  });

  it("says the directories follow the configured testsDir", async () => {
    const readme = await readReadme();
    expect(readme).toContain("follow `paths.testsDir`");
  });
});

describe("every mandatory checklist carries the L1/L2 exclusion", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Reviewer Gate, DoD and project_memory all state it`, async () => {
      // The body defines L1/L2 as outside the ATDD obligation, but a
      // `completion-reviewer` works from the Reviewer Gate and an agent that
      // never opens the body works from `project_memory`. Both still demanded
      // "every TC", so an L1/L2-only spec the validator passes read as
      // not-done — and the repair a reader reaches for is the duplicated
      // integration annotation `QFAI-ATDD-123` rejects.
      //
      // The qualifier is now phrased by DESTINATION rather than by spelling.
      // The claim this case makes is unchanged — the gate must not demand
      // "every TC" — but `system` and `acceptance` are in the layer vocabulary
      // and route to `tests/integration/**`, so a gate enumerating
      // `L3`/`L4`/`L5`/blank left the rows Phase 2b seeds for them uncounted.
      const atdd = flat(await read(tree, "assistant/skills/qfai-atdd/SKILL.md"));
      expect(atdd).toContain("every `TC` **whose `Level` routes to an ATDD home**");
      expect(atdd).toContain("or `system` / `acceptance` — is covered");
      expect(atdd).toContain("**`L1`/`Unit` and `L2`/`Component` are outside this obligation**");
      expect(atdd).toContain("L1/Unit and L2/Component owe no ATDD annotation");
    });
  }
});
