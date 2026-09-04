/**
 * A surface retired mid-loop is now reported (#1099).
 *
 * Cycle 0 freezes the screen set into `prototyping.json#frozenSurfaceUnion`, and
 * `iterate` hard-stops on drift — but only when EVERY UI-bearing spec has
 * disappeared (`prototypingIterate.ts:529-573`). A product decision that
 * retires ONE screen leaves the frozen union naming a spec that no longer
 * exists, the precheck's "zero UI-bearing specs resolved" condition false, and
 * `validate` reporting `error=0` over a loop describing a screen that is gone.
 * The operator found out at the next `iterate` — the point of no return, where
 * the only route is a cycle-0 reset that moves `iter-00` aside.
 *
 * The rows are the states the detector has to separate: a reduction is
 * reported; a frozen scope that still resolves is not; a closed loop is history
 * and not a live claim; and the all-markers-removed case is left to the
 * hard-stop that already names it, so one state does not produce two findings
 * with two different remedies.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { validateFrozenSurfaceReachability } from "../../src/core/validators/index.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function project(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-frozen-surface-"));
  dirs.push(dir);
  await writeFile(
    path.join(dir, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/output",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "",
    ].join("\n"),
    "utf-8",
  );
  return dir;
}

/** A spec whose `01_Spec.md` marks it UI-bearing. */
async function seedUiBearingSpec(root: string, id: string): Promise<void> {
  const dir = path.join(root, ".qfai", "specs", `spec-${id}`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "01_Spec.md"),
    `---\nsurface_type: ui-bearing\n---\n\n# spec-${id}\n`,
    "utf-8",
  );
}

async function seedLoop(
  root: string,
  frozen: readonly string[],
  stopReason: string | null,
): Promise<void> {
  const dir = path.join(root, ".qfai", "evidence", "prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "prototyping.json"),
    JSON.stringify({
      runId: "run-1",
      frozenSurfaceUnion: [...frozen],
      stopReason,
      iterations: [{ index: 0 }],
    }),
    "utf-8",
  );
}

async function run(root: string): Promise<Awaited<ReturnType<typeof validateFrozenSurfaceReachability>>> {
  const config = await loadConfig(root);
  return validateFrozenSurfaceReachability(root, config.config);
}

describe("the frozen surface still resolves", () => {
  it("reports a spec that was retired while the loop stayed open", async () => {
    // The live case: two screens frozen at cycle 0, one retired by a product
    // decision, the loop still iterating.
    const root = await project();
    await seedUiBearingSpec(root, "0001");
    await seedLoop(root, ["0001", "0002"], null);

    const issues = await run(root);

    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-PROT-011"]);
    expect(issues[0]?.refs).toEqual(["0002"]);
    expect(issues[0]?.file).toBe(".qfai/evidence/prototyping/prototyping.json");
    // The message has to say what survives, because that is what separates a
    // reduction from the all-markers-removed drift and decides the remedy.
    expect(issues[0]?.message).toContain("0002");
    expect(issues[0]?.message).toContain("stopReason=null");
    expect(issues[0]?.suggested_action).toContain("--cycle 0");
  });

  it("stays silent when every frozen spec still resolves", async () => {
    const root = await project();
    await seedUiBearingSpec(root, "0001");
    await seedUiBearingSpec(root, "0002");
    await seedLoop(root, ["0001", "0002"], null);

    expect(await run(root)).toEqual([]);
  });

  it("stays silent once the loop is closed", async () => {
    // A closed loop is a historical record, not a claim about what exists now.
    // Reporting here would put a finding on every finished project whose specs
    // moved on afterwards.
    const root = await project();
    await seedUiBearingSpec(root, "0001");
    await seedLoop(root, ["0001", "0002"], "converged");

    expect(await run(root)).toEqual([]);
  });

  it("leaves the all-markers-removed case to iterate's hard-stop", async () => {
    // `iterate` already refuses this with a diagnostic naming the frozen union
    // and a different remedy. Two findings on one state would send automated
    // remediation down two paths.
    const root = await project();
    await seedLoop(root, ["0001", "0002"], null);

    expect(await run(root)).toEqual([]);
  });

  it("stays silent when there is no loop at all", async () => {
    const root = await project();
    await seedUiBearingSpec(root, "0001");

    expect(await run(root)).toEqual([]);
  });

  it("stays silent on a prototyping.json that is not readable as JSON", async () => {
    // `prototyping certify` refuses an unreadable loop record on its own terms.
    // Guessing here would report a scope reduction from a file this validator
    // could not read.
    const root = await project();
    await seedUiBearingSpec(root, "0001");
    const dir = path.join(root, ".qfai", "evidence", "prototyping");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "prototyping.json"), "{ not json", "utf-8");

    expect(await run(root)).toEqual([]);
  });
});
