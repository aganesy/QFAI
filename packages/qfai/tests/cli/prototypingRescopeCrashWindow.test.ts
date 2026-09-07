/**
 * `rescope`'s write order is what makes a crashed run recoverable (#1137).
 *
 * The derived artifacts (`iterate-plan.json`, `review.json`) are written BEFORE
 * the authoritative `prototyping.json`, which is the opposite of the intuitive
 * order — and the opposite is the one that works, because `rescope` refuses a
 * surface that has left `frozenSurfaceUnion`:
 *
 * - **shipped order**, crash before the last write: the surface is still
 *   frozen, so a re-run is ACCEPTED. The annotations are already present and
 *   skipped, the plan pruning is a no-op, and `prototyping.json` is written.
 *   The run converges.
 * - **reversed order**, crash before the derived writes: the surface is gone
 *   from the frozen union, so a re-run is REFUSED — and the stale plan and
 *   un-annotated review can never be fixed by this command.
 *
 * Neither order is crash-safe without a journal. This one is recoverable, and
 * nothing in the suite entered the crash window, so swapping the two lines
 * passed every row. That is the shape this repository keeps finding: a property
 * that holds, matters, and has nothing defending it.
 *
 * Its own file because the crash needs `node:fs/promises` mocked, and the 23
 * rows beside it need the real one.
 */
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The module is imported dynamically below so the mock applies, but its TYPE
// comes from a static namespace import — `consistent-type-imports` forbids the
// inline form, and a namespace is not itself a type, so `typeof` turns it into
// one.
import type * as FsPromisesModule from "node:fs/promises";

type FsPromises = typeof FsPromisesModule;

const { writeFileSpy } = vi.hoisted(() => ({ writeFileSpy: vi.fn() }));

// Passes through by default; a row arms it to fail one path. Scoped to this
// file, so the fixtures below still write through the real implementation.
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<FsPromises>();
  return { ...actual, writeFile: (...args: unknown[]) => writeFileSpy(actual, ...args) };
});

const { mkdir, mkdtemp, readFile, rm, writeFile } = await import("node:fs/promises");
const { runPrototypingRescope } = await import("../../src/cli/commands/prototypingRescope.js");

/** Default behaviour: do the write. */
const passThrough = (actual: FsPromises, ...args: unknown[]): Promise<void> =>
  (actual.writeFile as unknown as (...a: unknown[]) => Promise<void>)(...args);

const dirs: string[] = [];

// Re-armed per row, AFTER `restoreAllMocks`. Arming it in `afterEach` before
// that call looked equivalent and was not: `restoreAllMocks` clears a plain
// `vi.fn()`'s implementation too, so the next row's fixtures wrote nothing and
// failed on a file they had just "created".
beforeEach(() => {
  writeFileSpy.mockImplementation(passThrough);
});

afterEach(async () => {
  vi.restoreAllMocks();
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

const evidenceDir = (root: string): string => path.join(root, ".qfai", "evidence", "prototyping");

/** `0011` retired upstream, `0001` still live, one recorded iteration. */
async function loopWithRetiredSurface(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-rescope-crash-"));
  dirs.push(root);
  await writeFile(
    path.join(root, "qfai.config.yaml"),
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
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n",
    "utf-8",
  );

  const iter = path.join(evidenceDir(root), "iter-00");
  await mkdir(iter, { recursive: true });
  await writeFile(
    path.join(evidenceDir(root), "prototyping.json"),
    `${JSON.stringify(
      { runId: "r", cycle: 3, frozenSurfaceUnion: ["0001", "0011"], stopReason: null },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  await writeFile(
    path.join(iter, "review.json"),
    `${JSON.stringify({ reviewerId: "r1", proseCritique: "twelve screens" }, null, 2)}\n`,
    "utf-8",
  );
  await writeFile(
    path.join(iter, "iterate-plan.json"),
    `${JSON.stringify({ cycle: 0, screens: [{ specId: "0001" }, { specId: "0011" }] }, null, 2)}\n`,
    "utf-8",
  );
  return root;
}

const run = (root: string): Promise<number> =>
  runPrototypingRescope({ root, remove: ["0011"], reason: "DELTA-022", dryRun: false });

const readJson = async (abs: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(abs, "utf-8")) as Record<string, unknown>;

describe("a rescope that dies before its last write", () => {
  it("can be re-run to completion, and converges", async () => {
    const root = await loopWithRetiredSurface();
    const protoAbs = path.join(evidenceDir(root), "prototyping.json");
    const reviewAbs = path.join(evidenceDir(root), "iter-00", "review.json");
    const planAbs = path.join(evidenceDir(root), "iter-00", "iterate-plan.json");

    // The crash: everything writes except the authoritative record.
    writeFileSpy.mockImplementation((actual: FsPromises, ...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].endsWith("prototyping.json")) {
        return Promise.reject(new Error("simulated crash before the authoritative write"));
      }
      return passThrough(actual, ...args);
    });
    await expect(run(root)).rejects.toThrow(/simulated crash/);

    // Mid-crash state: derived artifacts done, frozen union untouched. That is
    // what makes the re-run possible — the surface is still frozen, so the
    // refusal does not fire.
    expect((await readJson(protoAbs)).frozenSurfaceUnion).toEqual(["0001", "0011"]);
    expect((await readJson(reviewAbs)).retiredSurfaces).toHaveLength(1);

    writeFileSpy.mockImplementation(passThrough);
    expect(await run(root)).toBe(0);

    // Converged, and nothing was applied twice.
    expect((await readJson(protoAbs)).frozenSurfaceUnion).toEqual(["0001"]);
    expect((await readJson(protoAbs)).rescopeLog).toHaveLength(1);
    expect((await readJson(reviewAbs)).retiredSurfaces).toHaveLength(1);
    expect((await readJson(reviewAbs)).proseCritique).toBe("twelve screens");
    const plan = (await readJson(planAbs)).screens as { specId: string }[];
    expect(plan.map((screen) => screen.specId)).toEqual(["0001"]);
  });

  it("would be unrecoverable if the authoritative write came first", async () => {
    // The other order, reconstructed. Nothing here mutates the source — the
    // point is that `rescope` REFUSES this state, so a run that had written
    // `prototyping.json` first and then died would leave the derived artifacts
    // stale with no command able to finish them.
    const root = await loopWithRetiredSurface();
    const protoAbs = path.join(evidenceDir(root), "prototyping.json");
    await writeFile(
      protoAbs,
      `${JSON.stringify(
        { runId: "r", cycle: 3, frozenSurfaceUnion: ["0001"], stopReason: null },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    expect(await run(root)).toBe(2);
    // And the derived artifacts stay as the crash left them: still naming the
    // retired surface, with no route back.
    const plan = (await readJson(path.join(evidenceDir(root), "iter-00", "iterate-plan.json")))
      .screens as { specId: string }[];
    expect(plan.map((screen) => screen.specId)).toEqual(["0001", "0011"]);
  });
});
