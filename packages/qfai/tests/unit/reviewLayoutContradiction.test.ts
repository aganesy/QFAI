/**
 * The two review-artifact layouts contradict each other. This is the guard that
 * fires when that contradiction becomes REACHABLE — #1078, recorded as
 * `OQ-0012-0013` under `CR-20260904-0002`.
 *
 * `validate`'s reviewer-deliverable gate reads the flat
 * `.qfai/evidence/prototyping/iter-NN/review.json`. `qfai prototyping certify`
 * requires the per-spec `iter-NN/spec-NNNN/<screen>.review.json` and exits 64
 * for a multi-spec frozen set without it. A project that satisfies one fails
 * the other, and `certify` will not seal unless `validate` reports zero errors,
 * so a multi-spec project is uncertifiable either way.
 *
 * Which artifact is canonical is **deferred**, not decided. Both ends of the
 * contradiction already have behaviour coverage — `certify`'s exit 64 on
 * `frozenSpecsCovered: ["0012", "0007"]`, and the flat gate's
 * `prototypingEvidence.review.missing` — and `TC-0012-0388` pins the
 * single-spec freeze by seeding a second UI-bearing spec and asserting the
 * frozen set stays one entry. Those rows are not duplicated here.
 *
 * What nothing covered is the moment the deferral stops being safe. Today the
 * contradiction is held apart by a comment and a deliberate freeze; a wire-in
 * that made the per-spec layout real would make it live, and no test would say
 * so. These two rows say so.
 *
 * Neither row claims the contradiction is acceptable. They assert it stays
 * unreachable, and each failure message names the decision that now has to be
 * made rather than telling the reader to revert.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(import.meta.dirname, "../../src");

/**
 * The per-spec entry points. A production CALL to either means the per-spec
 * layout is being written for real, which is when the two gates begin
 * contradicting each other on a live project.
 *
 * `.qfai/specs/spec-0012/08_Open-questions.md` tracks both wire-ins:
 * `OQ-0012-0006` for the layout and `OQ-0012-0007` for the dispatch.
 */
const PER_SPEC_ENTRY_POINTS: ReadonlySet<string> = new Set([
  "iterationReviewPathPerSpec",
  "dispatchReviewerToPair",
]);

/** Every `.ts` under `src/` — the whole production surface. */
async function productionModules(dir: string = SRC_ROOT): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await productionModules(full)));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

/**
 * Names invoked as `name(…)` in `source`, per the parser.
 *
 * The parser rather than a reduced-source regex, for two measured reasons.
 * A declaration is not a `CallExpression`, so `export function
 * iterationReviewPathPerSpec(` is not a hit and the declaring modules need no
 * exemption — and an exemption would have hidden a caller added *inside* one of
 * them, which is a plausible way for a wire-in to start. And comments never
 * enter the AST, so a doc comment spelling the signature cannot be read as a
 * call. #1061 and #1089 are the same lesson: do not hand-roll what the parser
 * already knows.
 */
function calledNames(source: string, fileName: string): ReadonlySet<string> {
  const parsed = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      names.add(node.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);
  return names;
}

const relative = (file: string): string => path.relative(SRC_ROOT, file).replace(/\\/g, "/");

describe("the per-spec review layout stays unreachable while its canonical status is undecided", () => {
  it("has no production caller of the per-spec review entry points", async () => {
    const modules = await productionModules();
    // A walk that found almost nothing would pass this row silently.
    expect(modules.length).toBeGreaterThan(200);

    const callers: string[] = [];
    for (const file of modules) {
      const source = await readFile(file, "utf-8");
      for (const name of calledNames(source, file)) {
        if (PER_SPEC_ENTRY_POINTS.has(name)) callers.push(`${relative(file)} calls ${name}`);
      }
    }

    expect(
      callers.sort(),
      "a production caller of the per-spec review layout has appeared, so `validate` (which reads " +
        "the flat iter-NN/review.json) and `certify` (which requires " +
        "iter-NN/spec-NNNN/<screen>.review.json for a multi-spec frozen set) now contradict each " +
        "other on a live project: satisfying one fails the other, and certify will not seal while " +
        "validate reports errors. This is NOT a regression to revert — it is the trigger " +
        "OQ-0012-0013 names. Decide which artifact is canonical, record it against " +
        "CR-20260904-0002, and then move or delete this guard as that decision requires.",
    ).toEqual([]);
  });

  it("still has the reviewer-deliverable gate reading the flat layout", async () => {
    // The other direction. If the gate is switched to the per-spec layout, the
    // canonical-artifact decision has been made implicitly and OQ-0012-0013
    // starts describing a tree that changed under it.
    const gate = await readFile(
      path.join(SRC_ROOT, "core/validators/prototypingEvidence.ts"),
      "utf-8",
    );
    const calls = calledNames(gate, "prototypingEvidence.ts");

    expect(
      calls.has("iterationReviewPath"),
      "the reviewer-deliverable gate no longer calls `iterationReviewPath`, so it may have stopped " +
        "reading the flat layout that OQ-0012-0013 records it as reading. If the gate moved, that " +
        "IS the canonical-artifact decision: record it against CR-20260904-0002 rather than leaving " +
        "the open question describing a tree that changed.",
    ).toBe(true);

    expect(
      calls.has("iterationReviewPathPerSpec"),
      "the reviewer-deliverable gate now calls the per-spec path helper, which is exactly the " +
        "decision OQ-0012-0013 defers. Record it against CR-20260904-0002.",
    ).toBe(false);
  });
});
