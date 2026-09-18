/**
 * The Drift Protocol spelled the Change Request filename out in full and left
 * the Decision Record's `<id>` abstract, on adjacent lines of the same bullet.
 *
 * A reader with only that bullet in front of them completes the abstract half
 * from the concrete one, and mints `DR-YYYYMMDD-NNNN-<slug>.md`. But the ledger
 * cell that cites a DR is validated by `DR_ID_FORMAT`
 * (`/^DR-\d{4}(?:-\d{4})?$/`, `core/decisionRecords.ts`), so an id copied off
 * such a filename is claimed by `DR_ID_SHAPED` and then rejected — the
 * `TDDLIST_EXCEPTION_INVALID_DR` path. In one consuming project 6 of 6 anomaly
 * Decision Records had taken the date form.
 *
 * The prose was never wrong: it deferred to a scheme that is correctly defined
 * in the spec's `07_Decisions.md`. It was the shape of the sentence that
 * misled. So the protocol must render the DR grammar as concretely as the CR's,
 * and the second pointer to that scheme — in the execution ledger — must name
 * the file that declares it rather than saying "those files", which had two
 * candidate referents in its own sentence.
 *
 * Two consequences the first pass left open, and this file also holds:
 * `qfai-implement/SKILL.md` step 5 is the instruction closest to the act of
 * creating the record, so it has to be as concrete as the whitelist; and the
 * two shapes do not share a declaration home — `DR-NNNN-MMMM` is declared in
 * the spec's `07_Decisions.md`, `DR-NNNN` in `_policies/08_Decisions.md`, per
 * the distributed templates themselves.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const DRIFT = "assistant/constitution/drift-protocol.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";
// The instruction closest to the act of creating the file: a reader following
// Phase Red's numbered steps never opens the reference above.
const SKILL = "assistant/skills/qfai-implement/SKILL.md";

/** The shapes `DR_ID_FORMAT` accepts, written the way an operator reads them. */
const SPEC_SCOPED = "DR-NNNN-MMMM";
const POLICY_LEVEL = "DR-NNNN";

const flat = (s: string): string => s.replace(/\s+/g, " ");

async function read(tree: string, rel: string): Promise<string> {
  return flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));
}

describe.each(QFAI_TREES)("%s", (tree) => {
  it("spells the DR filename out as concretely as the CR's beside it", async () => {
    const drift = await read(tree, DRIFT);
    // Bounds are resolved and asserted BEFORE slicing: an `indexOf` miss
    // returns -1, and `slice(-1, …)` would quietly search a different region.
    const start = drift.indexOf("## Allowed exceptions");
    const end = drift.indexOf("## When drift is detected");
    expect(start, "the whitelist heading moved").toBeGreaterThanOrEqual(0);
    expect(end, "the section after the whitelist moved").toBeGreaterThan(start);
    const whitelist = drift.slice(start, end);

    // The CR pattern is the one that set the reader's expectation; both halves
    // of the bullet have to be legible without opening another file.
    expect(whitelist).toContain("`CR-YYYYMMDD-NNNN-<slug>.md`");
    expect(whitelist).toContain(`\`${SPEC_SCOPED}-<slug>.md\``);
    expect(whitelist).toContain(`\`${POLICY_LEVEL}-<slug>.md\``);
  });

  it("says the DR is deliberately not on the CR's date form", async () => {
    // Without this, the two grammars sitting in one directory read as an
    // inconsistency to be tidied up rather than a deliberate distinction.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain("not** the CR's date form");
  });

  it("never renders a DR filename on the CR's date form", async () => {
    // The failure mode is imitation, so no shipped text may model the shape
    // being warned against.
    for (const rel of [DRIFT, LEDGER, SKILL]) {
      const text = await read(tree, rel);
      expect(text, `${rel} shows a date-form DR id`).not.toMatch(/DR-(?:YYYYMMDD|\d{8})-/);
    }
  });

  it("never leaves the DR filename's id abstract", async () => {
    // `DR-<id>-<slug>.md` is the shape that invited the date form in the first
    // place. Every pointer at the filename has to be concrete, including the
    // one inside Phase Red's numbered steps, which is the instruction closest
    // to the act of creating the record.
    for (const rel of [DRIFT, LEDGER, SKILL]) {
      const text = await read(tree, rel);
      expect(text, `${rel} still defers the DR id to another file`).not.toContain("DR-<id>-<slug>");
    }
    // The two that name the destination path spell the whole path out; the
    // whitelist bullet carries `.qfai/decisions/` in its own lead-in and is
    // covered by the first case above.
    for (const rel of [LEDGER, SKILL]) {
      const text = await read(tree, rel);
      expect(text).toContain(`\`.qfai/decisions/${SPEC_SCOPED}-<slug>.md\``);
      expect(text).toContain(`\`.qfai/decisions/${POLICY_LEVEL}-<slug>.md\``);
    }
  });

  it("names the file that declares the scheme instead of 'those files'", async () => {
    const ledger = await read(tree, LEDGER);
    // "those files" had two candidate referents in its own sentence — the
    // Change Requests it sits beside, and the 07_Decisions.md / 09_delta.md
    // named next. Only 07_Decisions.md declares anything, and only the
    // spec-scoped half of the scheme.
    expect(ledger).not.toContain("ID scheme those files declare");
    expect(ledger).toContain(`\`${SPEC_SCOPED}\``);
    expect(ledger).toContain(`\`${POLICY_LEVEL}\``);
  });

  it("gives each DR shape its own declaration home", async () => {
    // The distribution templates split the two: `templates/specs/spec/
    // 07_Decisions.md` declares `DR-NNNN-MMMM` and sends the policy-level
    // `DR-NNNN` to `_policies/08_Decisions.md`. Text that routes both to
    // 07_Decisions.md points a policy-level anomaly at the wrong owner, so its
    // `TDDLIST_EXCEPTION_UNRESOLVED_DR` has no reachable fix. All three files
    // therefore carry the same two clauses verbatim.
    for (const rel of [DRIFT, LEDGER, SKILL]) {
      const text = await read(tree, rel);
      expect(text, `${rel} does not send ${SPEC_SCOPED} to 07_Decisions.md`).toContain(
        "declared in that spec's `07_Decisions.md`",
      );
      expect(text, `${rel} does not send ${POLICY_LEVEL} to _policies/08_Decisions.md`).toContain(
        "declared in `_policies/08_Decisions.md`",
      );
    }
  });

  it("does not claim the validator catches a misplaced declaration", async () => {
    // `collectDeclaredDrIds` reads both files into one set and never compares
    // an id's shape with the file it came from, so a policy-level `DR-NNNN`
    // left in a spec's 07_Decisions.md resolves clean. Advertising the split
    // as enforced would make an unchecked convention read as a gate.
    const ledger = await read(tree, LEDGER);
    expect(ledger).not.toContain("Resolving against the wrong one is what");
    expect(ledger).toContain("**That split is a convention, not a gate.**");
    expect(ledger).toContain("reports an id declared in **neither** file");
    expect(ledger).toContain("resolves against their union");
  });
});

describe("the spelled-out shapes are the ones the validator accepts", () => {
  it("matches DR_ID_FORMAT once the placeholders are filled in", async () => {
    // Guards the doc/validator pairing: if `DR_ID_FORMAT` is ever widened or
    // narrowed, the shapes the protocol advertises must move with it.
    const source = await readFile(
      path.join(repoRoot, "packages/qfai/src/core/decisionRecords.ts"),
      "utf-8",
    );
    const declaration = /const DR_ID_FORMAT = \/(.+?)\/;/.exec(source);
    expect(declaration, "DR_ID_FORMAT declaration moved or was renamed").not.toBeNull();
    // Narrowed rather than defaulted: `new RegExp("")` matches everything, so a
    // missing capture would make the three assertions below pass vacuously.
    const pattern = declaration?.[1];
    expect(pattern, "DR_ID_FORMAT declaration captured no pattern").toBeDefined();
    if (pattern === undefined) return;
    const format = new RegExp(pattern);

    expect(format.test(SPEC_SCOPED.replace("NNNN", "0004").replace("MMMM", "0011"))).toBe(true);
    expect(format.test(POLICY_LEVEL.replace("NNNN", "0004"))).toBe(true);
    // The date form the abstract placeholder invited is exactly what fails.
    expect(format.test("DR-20260808-0002")).toBe(false);
  });
});

/**
 * The ids a decisions file declares twice, each with the lines that declare it.
 *
 * A heading declares one id, or a range written `DR-NNNN..NNNN` (spec-scoped
 * `DR-NNNN-MMMM..MMMM`) that declares every id in it. An id followed by more of
 * a name — `DR-0106-A` — is not one of those ids.
 */
function duplicateDecisionIds(text: string): string[] {
  const seen = new Map<string, number[]>();
  text.split(/\r?\n/).forEach((line, index) => {
    const heading = /^###\s+DR-(\d{4})(?:-(\d{4}))?(?:\.\.(\d{4}))?(?![-\w])/.exec(line);
    if (heading === null) return;
    const [, scope = "", own, last] = heading;
    const first = Number(own ?? scope);
    const ids: string[] = [];
    for (let n = first; n <= Number(last ?? first); n += 1) {
      const number = String(n).padStart(4, "0");
      ids.push(own === undefined ? `DR-${number}` : `DR-${scope}-${number}`);
    }
    for (const id of ids) seen.set(id, [...(seen.get(id) ?? []), index + 1]);
  });
  return [...seen]
    .filter(([, lines]) => lines.length > 1)
    .map(([id, lines]) => `${id} at lines ${lines.join(", ")}`);
}

describe("a Decision Record id names one decision", () => {
  it("is declared once in the policy register and in each spec's decisions", async () => {
    // A reference to an id declared twice resolves to whichever heading a reader
    // finds first, so a Change Request superseding it has to name the heading.
    const files = [
      ".qfai/specs/_policies/08_Decisions.md",
      ...(await fg(".qfai/specs/spec-*/07_Decisions.md", { cwd: repoRoot })).sort(),
    ];
    const duplicates: string[] = [];
    for (const file of files) {
      const text = await readFile(path.join(repoRoot, file), "utf-8");
      duplicates.push(...duplicateDecisionIds(text).map((entry) => `${file}: ${entry}`));
    }
    expect(duplicates, "give the later declaration an id of its own").toEqual([]);
  });

  it("counts an id declared under two headings, or inside a range, as declared twice", () => {
    const text = [
      "### DR-0001: first",
      "### DR-0002..0004: a range",
      "### DR-0003: inside the range",
      "### DR-0001: again",
      "### DR-0005-0001..0002: spec-scoped",
      "### DR-0005-0002: inside it",
      "### DR-0001-A: another name",
    ].join("\n");
    expect(duplicateDecisionIds(text)).toEqual([
      "DR-0001 at lines 1, 4",
      "DR-0003 at lines 2, 3",
      "DR-0005-0002 at lines 5, 6",
    ]);
  });
});
