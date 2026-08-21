/**
 * `qfai-atdd` states its coverage obligations with the qualifier `required`,
 * and the word means something different for each ID kind:
 *
 * - `US-*` is narrowed by surface type, and that narrowing is a **project-wide,
 *   all-or-nothing opt-in** (`resolveUiBearingScope` returns `null` — obligation
 *   stays project-wide — until some spec declares a user-facing surface);
 * - `TC-*` is narrowed by its declared `Level`;
 * - `CON-API-*` is narrowed by active-vs-deferred (`x-qfai-status: planned`).
 *
 * The US rule used to live only in the validator source and in a Japanese fix
 * hint emitted after the gate had already failed, so the stage that owes the
 * coverage could not read its own obligation — and the volume estimate was
 * filled in from a reading of `required` the gate does not share.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-atdd/SKILL.md";

const read = (tree: string): Promise<string> => readFile(path.join(repoRoot, tree, SKILL), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

/**
 * The `- Coverage obligations are mandatory:` bullet and everything nested
 * under it, i.e. up to the next list item that starts at column 0.
 */
function coverageObligations(content: string): string {
  const start = content.indexOf("- Coverage obligations are mandatory");
  expect(start, "the Coverage obligations bullet must exist").toBeGreaterThanOrEqual(0);
  const rest = content.slice(start + 1);
  const next = rest.search(/\n(?:- |#{1,6} )/);
  return next === -1 ? rest : rest.slice(0, next);
}

/** The body of a `## <heading>` section. */
function section(content: string, heading: string): string {
  const start = content.indexOf(`## ${heading}`);
  expect(start, `the "${heading}" section must exist`).toBeGreaterThanOrEqual(0);
  const rest = content.slice(start + 1);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}

describe("qfai-atdd defines what `required` narrows to, per ID kind", () => {
  for (const tree of TREES) {
    it(`${tree}: Coverage obligations name one narrowing per ID kind`, async () => {
      const block = flat(coverageObligations(await read(tree)));
      // Naming all three together is the point: stating the US rule alone
      // invites carrying it over to `TC-*` / `CON-API-*`, which narrow on
      // unrelated mechanisms.
      expect(block).toContain("`US-*` by surface type");
      expect(block).toContain("`TC-*` by its declared `Level`");
      expect(block).toContain("`CON-API-*` by active-vs-deferred");
    });

    it(`${tree}: the US narrowing states the signals and the project-wide opt-in`, async () => {
      const block = flat(coverageObligations(await read(tree)));
      // The surface union `/qfai-prototyping` resolves — any one signal is
      // enough, so quoting only the frontmatter key would understate it.
      expect(block).toContain("surface_type: ui-bearing");
      expect(block).toContain(".qfai/contracts/ui/");
      expect(block).toContain("prototyping.primarySpecId");
      // The flip is not local to the spec being worked on.
      expect(block).toMatch(/project-wide/);
      expect(block).toMatch(/opt-in/);
      expect(block).toMatch(/any one spec/);
      // Both sides of the flip: a non-UI spec owes nothing after the opt-in,
      // and owes every declared `US-*` before it.
      expect(block).toMatch(/owes no E2E reference/);
      expect(block).toMatch(/before that|until then|before the project/);
    });

    it(`${tree}: the CON-API narrowing names the deferral marker`, async () => {
      const block = flat(coverageObligations(await read(tree)));
      expect(block).toContain("x-qfai-status: planned");
    });

    it(`${tree}: DoD and not-done read \`required\` from the one definition`, async () => {
      const content = await read(tree);
      const dod = flat(section(content, "Success Criteria (Definition of Done)"));
      const notDone = flat(section(content, "Not-done criteria"));
      for (const body of [dod, notDone]) {
        expect(body).toMatch(/Coverage obligations/);
      }
    });

    it(`${tree}: the volume estimator points at the same definition`, async () => {
      const signals = flat(section(await read(tree), "Volume Signals (mandatory, not gates)"));
      // `E2E = required US-*` is where the wrong reading first costs a row
      // count, before any test is written.
      expect(signals).toMatch(/Coverage obligations/);
    });
  }
});
