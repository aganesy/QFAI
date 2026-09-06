/**
 * The `Evidence` column asked for a payload its container cannot hold.
 *
 * `qfai-implement` defined the cell as "RED/GREEN command+result pairs proving
 * the TDD cycle", made it a `done` precondition, and required verbatim failure
 * output. The container is one cell of one row of a GFM table: qfai's own
 * parser builds every row from exactly one physical line and ends a cell at any
 * unescaped `|`. Following the column description therefore either corrupted
 * the evidence or destroyed the ledger — and the escape rule that could have
 * mitigated it was a private function with one unrelated caller, mentioned
 * nowhere in the shipped `.qfai/assistant/` tree.
 *
 * These tests pin both halves: the cell is now a pointer, and the encoder is
 * published and shared.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { RULE_PROMOTIONS } from "../../src/core/sunset.js";
import { escapeTableCell, splitMarkdownRow } from "../../src/core/specPackParsers.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const TRACE = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(TREES)("%s", (tree) => {
  it("no longer tells the author to put command output in the cell", async () => {
    const ledger = await read(tree, LEDGER);
    expect(ledger).not.toContain(
      "| Evidence | RED/GREEN command+result pairs proving the TDD cycle",
    );
    expect(ledger).toContain("The `Evidence` cell is a **pointer**, not the payload.");
  });

  it("names the home for the payload, per producing stage", async () => {
    // It was "the single home" while `/qfai-implement` produced every pair.
    // `/qfai-atdd` now produces the E2E/API ones and writes them to
    // `atdd-<spec-id>.md`, which `qa-gatekeeper` reads on an ATDD review cycle —
    // so the claim had to name both rather than a file the evidence is not in.
    const ledger = await read(tree, LEDGER);
    expect(ledger).toContain("`.qfai/evidence/implement-<spec-id>.md` is the home");
    expect(ledger).toContain("The evidence file follows the stage that produced it.");
    expect(ledger).not.toContain("is the single home for the per-item");
  });

  it("publishes the cell encoding the parser actually implements", async () => {
    // The gap was not only the wrong container: nothing shipped said how to put
    // a `|` or a newline into a cell at all.
    const ledger = await read(tree, LEDGER);
    expect(ledger).toContain("Evidence cell encoding");
    expect(ledger).toContain("specPackParsers.ts#escapeTableCell");
    expect(ledger).toContain("CR / LF / CRLF | a single space");
    // The direction must be value -> cell, not cell -> value: an inverted table
    // teaches the reader to add a backslash that the parser then strips.
    expect(ledger).toContain("the character **in the value you want the cell to hold**");
    expect(ledger).toContain("| a pipe (&#124;) | &#92;&#124; |");
  });

  it("restates the completion gate against the anchor, not the cell", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("Evidence cell's anchor resolves to a fresh per-item entry");
    expect(skill).not.toContain(
      "10. `test-list.md` Status and Evidence columns are updated with fresh evidence",
    );
  });

  it("gives the evidence file a per-item section to claim the payload", async () => {
    // Before, the eleven-field contract sat under `## Evidence (MANDATORY)`
    // while that file's own Required sections had no per-item slot — so the
    // only *named* destination was the table cell.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("**Per item, one `### TDD-NNNN` section**");
  });

  // The table stated a flat severity for both anchor findings — `warning` for
  // 007 and `error` for 008 — while both are emitted through `newRuleSeverity`
  // against a `RULE_PROMOTIONS` window, so both are `warning` today and become
  // `error` at the promotion release. A reader setting `--fail-on` off the
  // table would have mis-planned the upgrade in both directions.
  it.each([
    ["QFAI-TDDLIST-007", "tddListEvidenceAnchorMissing"],
    ["QFAI-TDDLIST-008", "tddListEvidenceAnchorUnresolved"],
  ] as const)(
    "states %s's severity as the window it is actually emitted under",
    async (code, promotion) => {
      // The window is the reason the wording has to be the two-stage one; read it
      // rather than assumed, so removing the window reddens this too.
      expect(RULE_PROMOTIONS[promotion]?.promoteAt).toBeDefined();

      const ledger = await read(tree, LEDGER);
      const row = new RegExp(`\\| \`${code}\` \\|[^|]*\\|([^|]*)\\|`).exec(ledger);
      expect(row, `${code} must have a row in the findings table`).not.toBeNull();
      expect(flat(row?.[1] ?? "").trim()).toBe("warning, then error");
    },
  );

  it("mirrors the pointer rule in the sdd schema reference", async () => {
    const trace = await read(tree, TRACE);
    expect(trace).toContain("`Evidence` is a **pointer**");
  });
});

describe("escapeTableCell is exported and inverts the parser", () => {
  // It used to be private to `sddTriage.ts` with one caller, so a skill could
  // not point an author at it.
  it("round-trips a pipe through split", () => {
    const cell = escapeTableCell("grep foo | wc -l");
    expect(splitMarkdownRow(`| ${cell} | next |`)).toEqual(["grep foo | wc -l", "next"]);
  });

  it("flattens every newline form to one space, keeping the row intact", () => {
    for (const newline of ["\n", "\r", "\r\n"]) {
      const cell = escapeTableCell(`first${newline}second`);
      expect(cell).toBe("first second");
      expect(splitMarkdownRow(`| ${cell} | next |`)).toEqual(["first second", "next"]);
    }
  });

  it("leaves a literal backslash alone", () => {
    // Doubling it would corrupt Windows paths and regex literals while keeping
    // the column count valid — the one corruption no validator can see.
    const cell = escapeTableCell("C:\\Users\\foo matches \\d+");
    expect(splitMarkdownRow(`| ${cell} |`)).toEqual(["C:\\Users\\foo matches \\d+"]);
  });
});
