/**
 * `16_Traceability-ledger.md` was listed under `qfai-sdd`'s `## Mandatory
 * Outputs` while the same bullet called it an optional artifact, conditioned it
 * on a linkage that exists only inside the file itself, and cited a
 * `QFAI-TRACE-002` warning that the skill's own `--profile sdd` stop condition
 * never raises (`QFAI-TRACE-*` belongs to the `tdd` gate group).
 *
 * The list is what an agent and the completion reviewer check a run against, so
 * an entry with three defensible readings decides nothing. These tests pin the
 * ledger to an `## Optional Outputs` section, keep it out of the mandatory
 * list, and keep the wording aligned with the two sibling files that already
 * describe the artifact as optional.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-sdd/SKILL.md";
const RULES = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";
const TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/16_Traceability-ledger.md";

const LEDGER = "16_Traceability-ledger.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Body of a `## <heading>` section, up to the next `##` heading. */
const section = (text: string, heading: string): string => {
  const start = text.indexOf(`## ${heading}\n`);
  expect(start, `missing section: ## ${heading}`).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start + heading.length + 4);
  const end = rest.indexOf("\n## ");
  return flat(end === -1 ? rest : rest.slice(0, end));
};

describe.each(TREES)("%s", (tree) => {
  it("keeps the optional ledger out of the mandatory list", async () => {
    const mandatory = section(await read(tree, SKILL), "Mandatory Outputs");
    expect(mandatory).not.toContain(LEDGER);
  });

  it("leaves every remaining mandatory entry unconditional", async () => {
    // The defect was one conditional bullet in a list of unconditional ones.
    // `when` / `optional` in this list is what reintroduces it.
    const mandatory = section(await read(tree, SKILL), "Mandatory Outputs");
    expect(mandatory).not.toMatch(/\boptional\b/i);
  });

  it("declares the ledger as a per-spec opt-in under Optional Outputs", async () => {
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    expect(optional).toContain(`\`spec-*/${LEDGER}\``);
    expect(optional).toContain("opt in per spec");
    expect(optional).toContain("A spec without one is valid");
  });

  it("qualifies the QFAI-TRACE consequence by the gate the skill stops on", async () => {
    // `--profile sdd` runs the `sdd` gate group only, and `QFAI-TRACE-*` sits
    // in the `tdd` group, so a `/qfai-sdd` run never sees QFAI-TRACE-002.
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    expect(optional).toContain("--profile sdd");
    expect(optional).toMatch(/QFAI-TRACE-002[^.]*warning/);
  });

  it("states that QFAI-TRACE-001 is checked per spec, not per changed BR/AC row", async () => {
    // `validateTraceabilityIntegrity` keys off the spec directory: a diff in
    // `03_Acceptance-Criteria.md` / `04_Business-Rules.md` makes it walk *every*
    // ledger row, so a reader who updates only the implementation behind the
    // BR/AC they edited still gets errors for the untouched rows.
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    expect(optional).toContain("per spec, not per row");
    expect(optional).toContain("`03_Acceptance-Criteria.md` or `04_Business-Rules.md` changed");
    expect(optional).toContain("every ledger row whose linked implementation file is unchanged");
  });

  it("keeps the refresh obligation for a ledger the spec already opted in to", async () => {
    // Rows absent from the ledger are never checked, so an added / renumbered
    // BR/AC silently leaves QFAI-TRACE-001's reach unless the ledger moves with
    // it. The reference states the same obligation ("Authored and refreshed").
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    expect(optional).toContain("refresh an existing one");
    expect(optional).toContain("in the same change as the BR/AC it links");
    expect(flat(await read(tree, RULES))).toContain("Authored and refreshed by `/qfai-sdd`");
  });

  it("points at the shipped template and the reference that owns the rule", async () => {
    const optional = section(await read(tree, SKILL), "Optional Outputs");
    expect(optional).toContain(`templates/specs/spec/${LEDGER}`);
    expect(optional).toContain(
      "references/spec-traceability-rules.md#traceability-ledger-16_traceability-ledgermd",
    );
  });

  it("agrees with the two sibling files that already call the ledger optional", async () => {
    // No third statement of the rule: the reference and the template stay the
    // owners, and both must keep saying `optional`.
    expect(flat(await read(tree, RULES))).toContain("It is **optional**.");
    expect(flat(await read(tree, TEMPLATE))).toContain("This file is **optional**.");
  });
});
