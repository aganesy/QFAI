/**
 * `iterate --cycle N` out-of-range deterministic error.
 *
 * Asserts that `runPrototypingIterate` exits 2 with a stderr error that
 * names the supported range (0..9 = 10 cycles total). The exact literal
 * boundary phrase is pinned so future reworders update the symmetric
 * peek-mode hint test as well.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CYCLE_OUT_OF_RANGE_PEEK_HINT,
  runPrototypingIterate,
} from "../../../../src/cli/commands/prototypingIterate.js";

const BOUNDARY_LITERAL =
  "--cycle accepts 0..9 (=10 cycles total). --cycle 10 would be the 11th cycle and is not supported.";

const stderrLines: string[] = [];

afterEach(() => {
  stderrLines.length = 0;
  vi.restoreAllMocks();
});

function captureStderr(): void {
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown): boolean => {
    stderrLines.push(String(chunk));
    return true;
  });
}

describe("iterate --cycle out-of-range", () => {
  it("exits 2 and names the supported range when --cycle 10", async () => {
    captureStderr();
    const exit = await runPrototypingIterate({ root: ".", cycle: 10 });
    expect(exit).toBe(2);
    const joined = stderrLines.join("");
    expect(joined).toContain(BOUNDARY_LITERAL);
    // The deterministic error must emit on the same invocation, before
    // any other side effect. We do NOT inspect file-system state here —
    // out-of-range short-circuits before any I/O.
  });

  it("exits 2 when --cycle is negative", async () => {
    captureStderr();
    const exit = await runPrototypingIterate({ root: ".", cycle: -1 });
    expect(exit).toBe(2);
    expect(stderrLines.join("")).toContain(BOUNDARY_LITERAL);
  });

  it("exits 2 when --cycle is a non-integer", async () => {
    captureStderr();
    const exit = await runPrototypingIterate({ root: ".", cycle: 3.5 });
    expect(exit).toBe(2);
    expect(stderrLines.join("")).toContain(BOUNDARY_LITERAL);
  });

  it("exports the peek-mode hint as a named constant", () => {
    // Sanity check so the hint stays importable from tests without
    // hard-coding the string in three places. The hint snapshot test
    // (cycleOutOfRange.peekMode.test.ts) pins the literal value.
    expect(typeof CYCLE_OUT_OF_RANGE_PEEK_HINT).toBe("string");
    expect(CYCLE_OUT_OF_RANGE_PEEK_HINT.length).toBeGreaterThan(0);
  });
});
