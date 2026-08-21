import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
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

    it(`${tree}: "low or high" names the band it is judged against`, async () => {
      const signals = await read(tree, SIGNALS);
      expectPhrase(signals, "A signal is **low or high** when it falls outside its band");
      for (const row of ["| `E2E_s` | 5–25 |", "| `API_s` | 10–40 |", "| `INT_s` | 40–80 |"]) {
        expect(flat(signals)).toContain(row);
      }
      expectPhrase(signals, "write the options and a recommendation in that\nrow's `Notes`");
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

      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      expect(catalog).toContain("## Volume policy");
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
});
