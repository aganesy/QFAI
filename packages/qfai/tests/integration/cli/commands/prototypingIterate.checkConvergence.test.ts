/**
 * --check-convergence CLI flag wiring (spec-0012 Phase 3 follow-up /
 * REQ-0012-0078). Pins the read-only peek path so an operator who
 * follows the `--cycle` out-of-range peek-mode hint can run
 * `qfai prototyping iterate --cycle 9 --check-convergence` against a
 * converged loop and observe `stopReason` + `acceptedIterationIndex`
 * without re-running the iterate loop.
 *
 * Exit codes:
 *   0  converged (stopReason === "axes-exceptional" AND
 *      acceptedIterationIndex is a non-null number)
 *   2  not converged (any other state, including missing prototyping.json)
 *
 * Read-only invariant: this flag MUST NOT mutate prototyping.json or any
 * other on-disk file, and MUST NOT invoke the iterate loop, capture,
 * serve, license-verify, or validate paths.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";
import { parseArgs } from "../../../../src/cli/lib/args.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-checkconv-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

function captureStdout(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown): boolean => {
    lines.push(String(chunk));
    return true;
  });
  return {
    lines,
    restore: () => spy.mockRestore(),
  };
}

async function seedPrototypingJson(root: string, body: Record<string, unknown>): Promise<string> {
  const protoDir = path.join(root, ".qfai/evidence/prototyping");
  await mkdir(protoDir, { recursive: true });
  const protoPath = path.join(protoDir, "prototyping.json");
  await writeFile(protoPath, `${JSON.stringify(body, null, 2)}\n`, "utf-8");
  return protoPath;
}

describe("--check-convergence CLI flag wiring (REQ-0012-0078)", () => {
  it("Test 1: cycle 9 + converged loop (axes-exceptional + accepted) -> exit 0 + report", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      stopReason: "axes-exceptional",
      acceptedIterationIndex: 3,
      iterations: [{ index: 0 }, { index: 1 }, { index: 2 }, { index: 3 }],
    });
    const captured = captureStdout();
    try {
      const exit = await runPrototypingIterate({
        root,
        cycle: 9,
        checkConvergence: true,
      });
      expect(exit).toBe(0);
      const out = captured.lines.join("");
      expect(out).toMatch(/stopReason:\s*axes-exceptional/);
      expect(out).toMatch(/acceptedIterationIndex:\s*3/);
    } finally {
      captured.restore();
    }
  });

  it("Test 2: max-iterations + acceptedIterationIndex null -> exit 2 + Not converged", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      stopReason: "max-iterations",
      acceptedIterationIndex: null,
      iterations: [{ index: 9 }],
    });
    const captured = captureStdout();
    try {
      const exit = await runPrototypingIterate({
        root,
        cycle: 9,
        checkConvergence: true,
      });
      expect(exit).toBe(2);
      const out = captured.lines.join("");
      expect(out).toMatch(/Not converged/);
      expect(out).toMatch(/max-iterations/);
    } finally {
      captured.restore();
    }
  });

  it("Test 3: license-verify-fail -> exit 2 + Not converged + reason", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      stopReason: "license-verify-fail",
      acceptedIterationIndex: null,
      iterations: [{ index: 2 }],
    });
    const captured = captureStdout();
    try {
      const exit = await runPrototypingIterate({
        root,
        cycle: 9,
        checkConvergence: true,
      });
      expect(exit).toBe(2);
      const out = captured.lines.join("");
      expect(out).toMatch(/Not converged/);
      expect(out).toMatch(/license-verify-fail/);
    } finally {
      captured.restore();
    }
  });

  it("Test 4: prototyping.json missing -> exit 2 + diagnostic", async () => {
    const root = await newTempDir();
    // Do NOT seed prototyping.json.
    const captured = captureStdout();
    try {
      const exit = await runPrototypingIterate({
        root,
        cycle: 9,
        checkConvergence: true,
      });
      expect(exit).toBe(2);
      const out = captured.lines.join("");
      expect(out).toMatch(/Not converged/);
      expect(out).toMatch(/prototyping\.json/i);
    } finally {
      captured.restore();
    }
  });

  it("Test 5: --cycle 5 --check-convergence reports the requested cycle (not 9)", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      stopReason: "axes-exceptional",
      acceptedIterationIndex: 5,
      iterations: [
        { index: 0 },
        { index: 1 },
        { index: 2 },
        { index: 3 },
        { index: 4 },
        { index: 5 },
      ],
    });
    const captured = captureStdout();
    try {
      const exit = await runPrototypingIterate({
        root,
        cycle: 5,
        checkConvergence: true,
      });
      expect(exit).toBe(0);
      const out = captured.lines.join("");
      // The header should mention the cycle the operator asked about.
      expect(out).toMatch(/cycle\s*5/);
    } finally {
      captured.restore();
    }
  });

  it("Test 6: --check-convergence WITHOUT --cycle parses and defaults cycle to 9 via the CLI parser", async () => {
    // a) argparse must recognise --check-convergence as a known boolean
    //    flag (not an unknown-flag error).
    const parsed = parseArgs(["prototyping", "iterate", "--check-convergence"], "/tmp/fake");
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.prototypingCheckConvergence).toBe(true);
    expect(parsed.options.prototypingAction).toBe("iterate");

    // b) When invoked WITHOUT --cycle but WITH --check-convergence, the
    //    peek path must default to cycle 9 (the hint's recommendation)
    //    and must NOT trip the cycle-required guard. We exercise the
    //    runPrototypingIterate entry directly with cycle omitted.
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      stopReason: "axes-exceptional",
      acceptedIterationIndex: 7,
      iterations: [{ index: 7 }],
    });
    const captured = captureStdout();
    try {
      // Cast through unknown so we can omit `cycle` from the options
      // bag at the type level — the read-only branch must not require it.
      const exit = await runPrototypingIterate({
        root,
        checkConvergence: true,
      } as unknown as Parameters<typeof runPrototypingIterate>[0]);
      expect(exit).toBe(0);
      const out = captured.lines.join("");
      expect(out).toMatch(/cycle\s*9/);
      expect(out).toMatch(/stopReason:\s*axes-exceptional/);
    } finally {
      captured.restore();
    }
  });

  it("Test 7: --check-convergence does NOT invoke iterate (no iter-NN/iterate-plan.json written)", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      stopReason: "axes-exceptional",
      acceptedIterationIndex: 4,
      iterations: [{ index: 4 }],
    });
    const protoPath = path.join(root, ".qfai/evidence/prototyping/prototyping.json");
    const beforeBytes = await readFile(protoPath, "utf-8");
    const captured = captureStdout();
    try {
      const exit = await runPrototypingIterate({
        root,
        cycle: 9,
        checkConvergence: true,
      });
      expect(exit).toBe(0);
    } finally {
      captured.restore();
    }
    // a) prototyping.json byte-equal (read-only invariant).
    const afterBytes = await readFile(protoPath, "utf-8");
    expect(afterBytes).toBe(beforeBytes);
    // b) No iter-NN dir for the peeked cycle.
    const iterDir = path.join(root, ".qfai/evidence/prototyping/iter-09");
    let iterExists = false;
    try {
      const s = await stat(iterDir);
      iterExists = s.isDirectory();
    } catch {
      iterExists = false;
    }
    expect(iterExists).toBe(false);
    // c) No iter-04/iterate-plan.json or any iter-NN/iterate-plan.json.
    for (let i = 0; i <= 9; i += 1) {
      const planPath = path.join(
        root,
        `.qfai/evidence/prototyping/iter-${String(i).padStart(2, "0")}/iterate-plan.json`,
      );
      let planExists = false;
      try {
        await stat(planPath);
        planExists = true;
      } catch {
        planExists = false;
      }
      expect(planExists, `iter-${i}/iterate-plan.json must not exist`).toBe(false);
    }
  });
});
