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
 * Refusing matters because prose beside the line, derived by nothing, goes
 * stale at every re-pin and a reader has to find it each time. A reader that
 * accepted half a line would put the same gap back: the total would
 * be checked and the split would not.
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

// A `file:` URL rather than the path: an absolute Windows path starts with a
// drive letter, which an import specifier reads as a scheme.
const mod = await import(
  pathToFileURL(path.join(repoRoot, "scripts", "derive-e2e-callsites.mjs")).href
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

  it("refuses a split that states one root twice", () => {
    // Two counts for one root is not a measurement of it. Taking the second
    // over the first accepts a line nobody can read as one answer, and the
    // per-root comparison then runs against a number the record does not state.
    expect(
      parseRecordLine("e2e callsites at this tree: 42 (tests/assets 30, tests/assets 12)"),
    ).toBeNull();
  });

  it("reads a root named after an Object.prototype member as a root", () => {
    // A plain object would report `constructor` as already present and refuse
    // a line that states it once.
    const parsed = parseRecordLine("e2e callsites at this tree: 3 (constructor 1, __proto__ 2)");

    // Compared as entries: `__proto__:` in an object literal sets the
    // prototype rather than a key, so the expected value could not be written
    // as one.
    expect(Object.entries(parsed?.perRoot ?? {})).toEqual([
      ["constructor", 1],
      ["__proto__", 2],
    ]);
  });

  it("refuses a line that has been broken across two", () => {
    // The split is one line. A record whose line got wrapped is not a
    // measurement of anything, and reading it as one would pin half a walk.
    expect(
      parseRecordLine("e2e callsites at this tree: 42 (tests/assets 30,\ntests/e2e 12)"),
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
