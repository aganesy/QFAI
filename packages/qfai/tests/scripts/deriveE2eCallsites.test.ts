/**
 * The record line that carries the `e2e` callsite count, written and read back.
 *
 * The count and its per-root split live on one line, and two tools have to
 * agree on that line's shape: `pin-stage-evidence-counts.mjs` writes it and
 * `tests/assets/stageEvidenceCounts.test.ts` reads it back. Both go through
 * `formatRecordLine` and `parseRecordLine`, so the shape is stated once. These
 * cases hold the pair to a round trip, and hold the reader to refusing a line
 * it cannot fully parse.
 *
 * Refusing matters because the split used to be prose beside the line, derived
 * by nothing. It went stale at every re-pin and a reader found it each time. A
 * reader that accepted half a line would put the same gap back: the total would
 * be checked and the split would not.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const mod = await import(
  path.join(repoRoot, "scripts", "derive-e2e-callsites.mjs").replace(/\\/g, "/")
);
const { deriveE2eCallsites, formatRecordLine, parseRecordLine } = mod;

const MEASUREMENT = {
  total: 42,
  perRoot: { "packages/qfai/tests/assets": 30, "packages/qfai/tests/e2e": 12 },
};

describe("the e2e callsite record line", () => {
  it("writes the total and every root on one line", () => {
    expect(formatRecordLine(MEASUREMENT)).toBe(
      "e2e callsites at this tree: 42 (packages/qfai/tests/assets 30, packages/qfai/tests/e2e 12)",
    );
  });

  it("reads back what it wrote", () => {
    expect(parseRecordLine(formatRecordLine(MEASUREMENT))).toEqual(MEASUREMENT);
  });

  it("finds the line inside the surrounding prose", () => {
    const record = ["# Record", "", formatRecordLine(MEASUREMENT), "", "More prose."].join("\n");

    expect(parseRecordLine(record)).toEqual(MEASUREMENT);
  });

  it("refuses a line that states a total and no split", () => {
    // The shape this replaced. A record still carrying it has a total nothing
    // checks the split against, which is the state being left behind.
    expect(parseRecordLine("e2e callsites at this tree: 42")).toBeNull();
  });

  it("refuses a split entry that is not a root and a count", () => {
    expect(
      parseRecordLine("e2e callsites at this tree: 42 (tests/assets 30, tests/e2e)"),
    ).toBeNull();
  });

  it("refuses a root whose name would be read wrong", () => {
    // A space inside a root name splits it into two tokens. Reading the first
    // as the whole name would record a measurement of a directory that is not
    // there, so the line is refused instead.
    expect(parseRecordLine("e2e callsites at this tree: 42 (my tests 42)")).toBeNull();
  });

  it("measures a split that sums to the total it reports", async () => {
    const measured = await deriveE2eCallsites();
    const summed = Object.values(measured.perRoot).reduce(
      (sum: number, count) => sum + Number(count),
      0,
    );

    expect(summed).toBe(measured.total);
  });
});
