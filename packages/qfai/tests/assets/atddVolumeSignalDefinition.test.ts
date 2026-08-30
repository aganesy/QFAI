import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { isPlannedApiContract, isPlannedDbContract } from "../../src/core/atddTraceability.js";

// Anchored to this file, not to `process.cwd()`: the reads below must resolve
// the same way whether the suite is launched from the repo root, from
// `packages/qfai`, or by an IDE runner with its own CWD.
// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Collapses every whitespace run to one space, so a reflow is not a regression. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

/** Wrap-tolerant `toContain`: both sides are flattened before comparison. */
function expectPhrase(content: string, phrase: string): void {
  expect(flat(content)).toContain(flat(phrase));
}

const SKILL = "assistant/skills/qfai-atdd/SKILL.md";
const SIGNALS = "assistant/skills/qfai-atdd/references/volume-signals.md";

describe("the ATDD estimator table's Signal column has a definition", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the symbols the table asks for carry a formula`, async () => {
      // Without this the three `Signal` placeholders appear only in the table
      // rows, so a run has to invent the value; the observed invention was
      // copying `Raw count` verbatim, which makes the column carry nothing.
      const signals = await read(tree, SIGNALS);
      expectPhrase(signals, "that layer's share of the obligation total, in whole percent");
      expectPhrase(signals, "total = #US + #CON + #TC");
      for (const line of [
        "E2E_s = round(100 * #US  / total)",
        "API_s = round(100 * #CON / total)",
        "INT_s = round(100 * #TC  / total)",
      ]) {
        expectPhrase(signals, line);
      }
      // The degenerate input needs a stated cell value, not a division by zero.
      expectPhrase(signals, "When `total` is 0");
      expectPhrase(signals, "write `-` in all three `Signal` cells");
      // `Signal` must not restate `Raw count`.
      expectPhrase(signals, "**A `Signal` cell that repeats its own `Raw count` is\nwrong**");
    });

    it(`${tree}: every term of the total is counted in the same scope`, async () => {
      // `#US` / `#TC` are per-spec but `.qfai/contracts/**` has no spec owner,
      // so an unscoped `#CON` would let a sibling spec's contract move this
      // spec's signal and break the spec-to-spec comparison the column is for.
      const signals = await read(tree, SIGNALS);
      expectPhrase(signals, "counted in **one scope: the spec this run was invoked on**");
      expectPhrase(signals, "the `CON-API-*` **this spec references**");
      // The reference SSOT has to be one the shipped `/qfai-sdd` template
      // actually emits. It seeds `Contract-Refs` in `04_Business-Rules.md` and
      // no `QFAI-CONTRACT-REF` line, so naming only `01_Spec.md` would read
      // `#CON` 0 for every spec authored from the template.
      expectPhrase(signals, "the `Contract-Refs` column of `04_Business-Rules.md`");
      expectPhrase(signals, "the shipped `/qfai-sdd` spec template emits");
      expectPhrase(
        signals,
        "the\n`01_Spec.md` `QFAI-CONTRACT-REF:` line for a spec that declares one",
      );
      // `Contract-Refs` is per-`BR`, so the same contract can appear repeatedly.
      expectPhrase(signals, "Count\neach ID once across both");
      // The ledger is not the source: `/qfai-sdd` seeds no `Layer = API` row,
      // so a first run would read `#CON` 0 for a spec that does have contracts.
      expectPhrase(signals, "Do **not** take this count from\n`tdd/test-list.md`");
      expectPhrase(signals, "the repository-wide declared set is **not** this number");
      // The Integration numerator is the layer this skill owns, not every TC:
      // L1/L2 owe nothing here and L4/L5 route to another row.
      expectPhrase(
        signals,
        "required `TC-*` of this spec that route to `tests/integration/**`: declared `Level` `L3`/`Integration`, or no declared `Level`",
      );
      expectPhrase(signals, "excluded from `#TC` and from `total`");
      expectPhrase(signals, "never in `#TC`");

      const skill = await read(tree, SKILL);
      expectPhrase(skill, "the `CON-API-*` this spec references");
      expectPhrase(skill, "Integration = required `TC-*` routing to `tests/integration/**`");
      expectPhrase(
        skill,
        "`Contract-Refs` in `04_Business-Rules.md`, plus a `QFAI-CONTRACT-REF` line in `01_Spec.md` when there is one — never the ledger",
      );
    });

    it(`${tree}: a DB contract obligation lands in the Integration numerator`, async () => {
      // `QFAI-ATDD-115` makes every declared `CON-DB-*` an integration
      // obligation, so a `#TC` counting only `TC-*` reports the inverse of the
      // layer's share for a slice whose integration work is contract-driven.
      const signals = await read(tree, SIGNALS);
      expectPhrase(signals, "**plus** the active `CON-DB-*` this spec references");
      expectPhrase(signals, "a `CON-DB-*` is an integration obligation and belongs to `#TC`");
      expectPhrase(signals, "would read `E2E_s` 100 / `INT_s` 0");

      const skill = await read(tree, SKILL);
      expectPhrase(skill, "plus the `CON-DB-*` this spec references");
      expect(flat(skill)).toContain("| `L3`/no-`Level` TCs + active `CON-DB-*` |");
    });

    it(`${tree}: a deferred contract is excluded from every numerator`, async () => {
      // `catalog/test-layers.md` defers a `x-qfai-status: planned` contract out
      // of `QFAI-ATDD-113` / `QFAI-ATDD-115`, so counting it inflates the row
      // against obligations no test owes yet.
      const signals = await read(tree, SIGNALS);
      expectPhrase(signals, "Only **active** obligations count");
      expectPhrase(signals, "leave it\nout of its row and name the deferred IDs in `Notes`");

      // The two kinds are deferred by two different markers, and the procedure
      // has to state each one. A single document-root condition covering both
      // reads a DB contract whose marker sits below a statement as active,
      // while `QFAI-ATDD-115` has already excluded it.
      expectPhrase(signals, "**The two kinds carry that marker in different places.**");
      expectPhrase(
        signals,
        "`CON-API-*` (YAML/JSON) — the marker counts only as a\n**document-root key**",
      );
      expectPhrase(
        signals,
        "`CON-DB-*` (SQL) — the marker is a **standalone `-- x-qfai-status: planned`\ncomment line, at any position in the file**",
      );
      expectPhrase(
        signals,
        "It does not have to come before\nthe contract ID or before any statement",
      );
      // Over-correction pin: the DB rule must not be generalised to the API
      // contract, where a marker nested under one operation defers nothing.
      expectPhrase(
        signals,
        "The same key nested under one operation defers nothing: one path must not be\n  able to drop the API-test obligation",
      );

      const skill = await read(tree, SKILL);
      expectPhrase(
        skill,
        "a contract deferred with `x-qfai-status: planned` owes no test, so exclude it from the count and name it in `Notes`",
      );
    });

    it(`${tree}: "low or high" names the band it is judged against`, async () => {
      const signals = await read(tree, SIGNALS);
      expectPhrase(signals, "A signal is **low or high** when it falls outside its band");
      for (const row of ["| `E2E_s` | 5–25 |", "| `API_s` | 10–40 |", "| `INT_s` | 40–80 |"]) {
        expect(flat(signals)).toContain(row);
      }
      expectPhrase(
        signals,
        "record the observed value and the reason the spec\nis shaped that way in that row's `Notes`",
      );
      // The worked example must satisfy the formula printed two sections up
      // (`round(100 * 6 / 9)` = 67), or a run has two answers for one input.
      expectPhrase(
        signals,
        "`E2E_s`\n67 / `INT_s` 22: six of this spec's nine obligations are `US-*`",
      );
      // `catalog/test-layers.md` forbids re-shaping a distribution to make it
      // read better, so the out-of-band advice must not recommend re-filing.
      expectPhrase(signals, "**Never re-file an obligation to move the number.**");
      expect(signals).not.toMatch(/re-file .* as `TC-\*`/);
    });

    it(`${tree}: the band is declared non-gating and cites the catalog`, async () => {
      // `catalog/test-layers.md` states qfai ships no floor, ratio or threshold
      // for volume. The band is an authoring heuristic and has to say so, or it
      // reads as a guardrail some validator enforces.
      const signals = await read(tree, SIGNALS);
      expectPhrase(signals, "they are not a configured guardrail");
      expect(signals).toContain("`.qfai/assistant/catalog/test-layers.md#volume-policy`");
      expectPhrase(signals, "**never fail on a signal value alone.**");
      // The one measurable neighbour must not be read as this table's Signal.
      expect(signals).toContain("maxE2eScenarioRatio");
      expectPhrase(signals, "not over these obligation counts");

      // The band and the volume SSOT must agree: the catalog says qfai ships no
      // default threshold, so it has to carry the band itself as non-gating
      // rather than leave a required reference publishing one it denies.
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      expect(catalog).toContain("## Volume policy");
      expectPhrase(catalog, "**A non-gating reference band.**");
      expectPhrase(catalog, "skills/qfai-atdd/references/volume-signals.md");
      expectPhrase(catalog, "no validator reads it, no value of it fails a run");
      expectPhrase(
        catalog,
        "It is not a configured threshold and does not become one\n  by being observed.",
      );
    });

    it(`${tree}: the skill keeps the table and routes to the definition`, async () => {
      const skill = await read(tree, SKILL);
      expect(skill).toContain("### Estimator output table (required)");
      for (const cell of ["| E2E_s |", "| API_s |", "| INT_s |"]) {
        expect(flat(skill)).toContain(cell);
      }
      expectPhrase(
        skill,
        "`E2E_s` / `API_s` / `INT_s`, their bands, and what a low or high one obliges: **`references/volume-signals.md`**.",
      );
      expectPhrase(skill, "A `Signal` cell is never a copy of its `Raw count`");
    });
  }

  it("the two documented marker forms are the ones the validators honour", () => {
    // The prose above is only right while it matches the deferral the
    // traceability collectors apply. Pinning both predicates here means a later
    // change to either rule fails with the document that describes it.
    const dbLate =
      "-- QFAI:CON-DB-0001\nCREATE TABLE t (id integer);\n\n-- x-qfai-status: planned\n";
    expect(isPlannedDbContract(dbLate)).toBe(true);
    // ...but only as a whole comment line, which is why the text says so.
    expect(
      isPlannedDbContract("CREATE TABLE t ( -- x-qfai-status: planned\n  id integer);\n"),
    ).toBe(false);
    // The API rule is the narrower one: root key yes, nested key no.
    expect(isPlannedApiContract("openapi: 3.0.0\nx-qfai-status: planned\npaths: {}\n")).toBe(true);
    expect(
      isPlannedApiContract(
        "openapi: 3.0.0\npaths:\n  /a:\n    get:\n      x-qfai-status: planned\n",
      ),
    ).toBe(false);
  });
});
