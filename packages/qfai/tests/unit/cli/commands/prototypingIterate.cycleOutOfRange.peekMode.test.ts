/**
 * Peek-mode hint snapshot for the `iterate --cycle N` out-of-range
 * error. Pins the exact hint text (single string, exact value) so that
 * the boundary error and the operator-facing recovery path stay
 * symmetric across any future rewording.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CYCLE_OUT_OF_RANGE_PEEK_HINT,
  runPrototypingIterate,
} from "../../../../src/cli/commands/prototypingIterate.js";

const EXPECTED_HINT =
  "Hint: use --cycle 9 --check-convergence to peek the final cycle without re-running the loop.";

const stderrLines: string[] = [];

afterEach(() => {
  stderrLines.length = 0;
  vi.restoreAllMocks();
});

describe("iterate --cycle out-of-range — peek-mode hint snapshot", () => {
  it("exposes the exact peek-mode hint constant", () => {
    expect(CYCLE_OUT_OF_RANGE_PEEK_HINT).toBe(EXPECTED_HINT);
  });

  it("emits the peek-mode hint on stderr when --cycle 10 is passed", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown): boolean => {
      stderrLines.push(String(chunk));
      return true;
    });
    const exit = await runPrototypingIterate({ root: ".", cycle: 10 });
    expect(exit).toBe(2);
    expect(stderrLines.join("")).toContain(EXPECTED_HINT);
  });
});
