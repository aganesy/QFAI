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

    it(`${tree}: the US narrowing lists the UI-contract names the resolver accepts`, async () => {
      const block = flat(coverageObligations(await read(tree)));
      // A pseudo-glob (`<spec-id>*.yaml`) claims both too much and too
      // little against `hasMatchingUiContract`: it reads as admitting
      // `0002-orders.yaml` (rejected) while hiding `ui-0002-screen.yaml`
      // and the `spec-0002/` subdirectory (both accepted).
      for (const shape of [
        "`<spec-id>.yaml`",
        "`spec-<spec-id>.yaml`",
        "`ui-<spec-id>.yaml`",
        "`ui-<spec-id>-<slug>.yaml`",
        "`spec-<spec-id>/` subdirectory",
      ]) {
        expect(block).toContain(shape);
      }
      expect(block).not.toContain("<spec-id>*.yaml");
    });

    it(`${tree}: the CON-API narrowing names the deferral marker`, async () => {
      const block = flat(coverageObligations(await read(tree)));
      expect(block).toContain("x-qfai-status: planned");
      // `isPlannedApiContract` honours the marker only at the document
      // root, and it defers every `CON-API-*` in that file. Describing it
      // per "contract operation" invites authoring it under an OpenAPI
      // operation, where it is ignored and `QFAI-ATDD-113` still fires.
      expect(block).toMatch(/top-level key/);
      expect(block).toMatch(/defers the whole file/);
      expect(block).toMatch(/QFAI-ATDD-113/);
      // `isPlannedApiContract` falls back to `PLANNED_CONTRACT_RE`, which also
      // accepts the marker as an unindented comment, whenever the parsed
      // document carries no top-level key (or does not parse at all). Claiming
      // "top-level key only" makes the skill over-count API volume for a
      // contract deferred in that compatible form.
      expect(block).toMatch(/column-0 comment/);
      expect(block).toContain("# x-qfai-status: planned");
      // The obligation is counted per declared `QFAI-CONTRACT-ID` — one per
      // file (`QFAI-CONTRACT-011` rejects a second) — and one annotation
      // satisfies it however many operations the document describes. Counting
      // per OpenAPI operation overstates the estimate and the DoD alike.
      expect(block).toContain("QFAI-CONTRACT-ID");
      expect(block).toMatch(/never the OpenAPI operation/);
    });

    it(`${tree}: the read set carries the project-wide opt-in inputs`, async () => {
      const content = await read(tree);
      // The opt-in is decided outside the target spec, so a read set listing
      // only that spec cannot resolve it until the closing validate run.
      for (const heading of ["Inputs Priority (Preflight)", "Read Set Contract (Mandatory)"]) {
        const body = flat(section(content, heading));
        expect(body).toContain("qfai.config.yaml");
        expect(body).toContain(".qfai/contracts/ui/**");
        expect(body).toContain("01_Spec.md` frontmatter");
        // `resolveSurfaceUnion` walks `paths.specsDir` / `paths.contractsDir`,
        // so a read set naming only the defaults misses a sibling surface in a
        // project that overrides either one.
        expect(body).toContain("paths.specsDir");
        expect(body).toContain("paths.contractsDir");
        // `resolveTitleMarkerSpecs` scans the whole `01_Spec.md`, so a
        // frontmatter-only read set misses a heading-only opt-in.
        expect(body).toMatch(/prototyping …` heading/);
        // `hasMatchingUiContract` matches the per-spec subdirectory layout on
        // the `spec-<spec-id>/` ancestor, not on the file name, so a read set
        // that keeps only basenames cannot see `spec-0002/screens/home.yaml`.
        expect(body).toMatch(/relative to `<contractsDir>\/ui\/`/);
        expect(body).toMatch(/not (?:its |just the )basename/);
      }
    });

    it(`${tree}: DoD and not-done read \`required\` from the one definition`, async () => {
      const content = await read(tree);
      const dod = flat(section(content, "Success Criteria (Definition of Done)"));
      const notDone = flat(section(content, "Not-done criteria"));
      for (const body of [dod, notDone]) {
        expect(body).toMatch(/Coverage obligations/);
      }
    });

    // The DoD's parenthetical restated the unit as "active contract
    // operations", which contradicts the Coverage obligations rule it points
    // at: the gate counts `QFAI-CONTRACT-ID`s, one per file, so a document
    // describing GET and POST is one obligation and not two. Left as it was, a
    // multi-operation contract had the DoD demanding tests the gate never asks
    // for.
    it(`${tree}: the DoD counts CON-API by id, not by OpenAPI operation`, async () => {
      const dod = flat(section(await read(tree), "Success Criteria (Definition of Done)"));
      expect(dod).toContain("active contract **ids**, one per contract file");
      expect(dod).toContain("never per OpenAPI operation");
      expect(dod).not.toContain("active contract operations");
    });

    it(`${tree}: the volume estimator points at the same definition`, async () => {
      const signals = flat(section(await read(tree), "Volume Signals (mandatory, not gates)"));
      // `E2E = required US-*` is where the wrong reading first costs a row
      // count, before any test is written.
      expect(signals).toMatch(/Coverage obligations/);
      // The API row is `required`, not `declared`: counting deferred
      // contracts here overstates the Raw count the estimator publishes.
      expect(signals).toContain("API = required `CON-API-*`");
      expect(signals).not.toContain("API = declared");
    });
  }
});
