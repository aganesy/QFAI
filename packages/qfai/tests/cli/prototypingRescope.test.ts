/**
 * `prototyping rescope` — the in-loop route out of a retired surface (#1099).
 *
 * The issue's cost was that every available action was wrong: editing
 * `frozenSurfaceUnion` was exit-2 lock drift, editing `review.json` was
 * fabricating what a reviewer saw, and `iterate --cycle 0 --force` discarded
 * every cycle of review already paid for. So the rows here are as much about
 * what the operation REFUSES as about what it does — an operation that removed
 * whatever it was asked to would be the hole the drift rule exists to close,
 * and a suite that only checked the happy path could not tell the two apart.
 *
 * The load-bearing refusal is "the surface still resolves". `rescope` removes
 * only from the set `QFAI-PROT-011` reports, both reading one
 * `readFrozenScopeState`, so a decision that has not been applied upstream
 * cannot be applied here instead.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  refuseUnremovable,
  runPrototypingRescope,
} from "../../src/cli/commands/prototypingRescope.js";

const dirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function project(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-rescope-"));
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

/** A spec whose `01_Spec.md` marks it UI-bearing, i.e. still resolvable. */
async function seedUiBearingSpec(root: string, id: string): Promise<void> {
  const dir = path.join(root, ".qfai", "specs", `spec-${id}`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "01_Spec.md"),
    `---\nsurface_type: ui-bearing\n---\n\n# spec-${id}\n`,
    "utf-8",
  );
}

const evidenceDir = (root: string): string => path.join(root, ".qfai", "evidence", "prototyping");

async function seedLoop(
  root: string,
  frozen: readonly string[],
  stopReason: string | null,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const dir = evidenceDir(root);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "prototyping.json"),
    `${JSON.stringify(
      { runId: "run-1", cycle: 3, frozenSurfaceUnion: [...frozen], stopReason, ...extra },
      null,
      2,
    )}\n`,
    "utf-8",
  );
}

async function readProto(root: string): Promise<Record<string, unknown>> {
  const raw = await readFile(path.join(evidenceDir(root), "prototyping.json"), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/** The state the issue describes: `0011` retired upstream, `0001` still live. */
async function reducedScope(): Promise<string> {
  const root = await project();
  await seedUiBearingSpec(root, "0001");
  await seedLoop(root, ["0001", "0011"], null);
  return root;
}

const run = (
  root: string,
  over: Partial<Parameters<typeof runPrototypingRescope>[0]> = {},
): Promise<number> =>
  runPrototypingRescope({
    root,
    remove: ["0011"],
    reason: "DELTA-022",
    dryRun: false,
    ...over,
  });

describe("prototyping rescope refuses", () => {
  it("without --remove", async () => {
    const root = await reducedScope();
    expect(await run(root, { remove: [] })).toBe(2);
    expect((await readProto(root)).frozenSurfaceUnion).toEqual(["0001", "0011"]);
  });

  it("without --reason", async () => {
    // The reason is what separates an applied decision from silent widening,
    // and it is what the audit entry preserves — so a blank one is refused
    // rather than recorded as blank.
    const root = await reducedScope();
    expect(await run(root, { reason: "   " })).toBe(2);
    expect((await readProto(root)).frozenSurfaceUnion).toEqual(["0001", "0011"]);
  });

  it("when there is no frozen scope to reduce", async () => {
    const root = await project();
    await seedUiBearingSpec(root, "0001");
    await seedLoop(root, [], null);
    expect(await run(root)).toBe(2);
  });

  it("when the loop is sealed", async () => {
    // A closed loop's scope is history: reducing it would rewrite what the
    // completed loop covered.
    const root = await project();
    await seedUiBearingSpec(root, "0001");
    await seedLoop(root, ["0001", "0011"], "converged");
    expect(await run(root)).toBe(2);
    expect((await readProto(root)).frozenSurfaceUnion).toEqual(["0001", "0011"]);
  });

  it("an id the frozen union does not contain", async () => {
    const root = await reducedScope();
    expect(await run(root, { remove: ["0099"] })).toBe(2);
  });

  it("a surface that STILL RESOLVES — the refusal that keeps this from being drift", async () => {
    // `0001` has a UI-bearing marker, so nothing has retired it. Removing it
    // here would be the silent narrowing the frozen union exists to detect;
    // the operator's real situation is that the decision was never applied
    // upstream.
    const root = await reducedScope();
    expect(await run(root, { remove: ["0001"] })).toBe(2);
    expect((await readProto(root)).frozenSurfaceUnion).toEqual(["0001", "0011"]);
  });

  it("the whole batch when one member still resolves", async () => {
    // All-or-nothing: a partially applied reduction would leave the loop in a
    // state neither the operator nor the finding described.
    const root = await reducedScope();
    expect(await run(root, { remove: ["0011", "0001"] })).toBe(2);
    expect((await readProto(root)).frozenSurfaceUnion).toEqual(["0001", "0011"]);
  });
});

describe("the two refusals say different things", () => {
  // Both exit 2, so the exit code cannot tell them apart — and the advice is
  // not interchangeable. A typo told to "remove the surface upstream first"
  // sends the operator to edit specs over a mistyped digit.
  const frozen = ["0001", "0011"] as const;
  const missing = ["0011"] as const;

  it("says `check the id` for an id outside the frozen union", () => {
    const message = refuseUnremovable(["0099"], frozen, missing);
    expect(message).not.toBeNull();
    expect(message).toContain("not in frozenSurfaceUnion");
    expect(message).toContain("check the id");
    expect(message).not.toContain("upstream first");
  });

  it("says `remove it upstream first` for a surface that still resolves", () => {
    const message = refuseUnremovable(["0001"], frozen, missing);
    expect(message).not.toBeNull();
    expect(message).toContain("still resolves");
    expect(message).toContain("upstream first");
    expect(message).not.toContain("check the id");
  });

  it("returns null for a surface that is frozen and unreachable", () => {
    // The direction that must stay open, or the operation refuses everything.
    expect(refuseUnremovable(["0011"], frozen, missing)).toBeNull();
  });
});

describe("prototyping rescope applies", () => {
  it("removes the retired surface and records why", async () => {
    const root = await reducedScope();
    expect(await run(root)).toBe(0);

    const proto = await readProto(root);
    expect(proto.frozenSurfaceUnion).toEqual(["0001"]);
    const log = proto.rescopeLog as { surface: string; reason: string; cycle: number }[];
    expect(log).toHaveLength(1);
    expect(log[0]?.surface).toBe("0011");
    expect(log[0]?.reason).toBe("DELTA-022");
    expect(log[0]?.cycle).toBe(3);
  });

  it("leaves the loop where it was", async () => {
    // This changes what the loop is ABOUT, not where it is. `--force` was the
    // only route before and it discarded the cycles; a reduction that reset
    // the cycle would be the same loss by another name.
    const root = await reducedScope();
    await run(root);

    const proto = await readProto(root);
    expect(proto.cycle).toBe(3);
    expect(proto.stopReason).toBeNull();
    expect(proto.runId).toBe("run-1");
  });

  it("appends to an existing log rather than replacing it", async () => {
    const root = await project();
    await seedUiBearingSpec(root, "0001");
    await seedLoop(root, ["0001", "0011"], null, {
      rescopeLog: [{ surface: "0007", reason: "DELTA-010", cycle: 1, at: "2026-01-01T00:00:00Z" }],
    });

    expect(await run(root)).toBe(0);
    const log = (await readProto(root)).rescopeLog as { surface: string }[];
    expect(log.map((entry) => entry.surface)).toEqual(["0007", "0011"]);
  });

  it("refuses a second time, because the id is no longer frozen", async () => {
    const root = await reducedScope();
    expect(await run(root)).toBe(0);
    expect(await run(root)).toBe(2);
    const log = (await readProto(root)).rescopeLog as unknown[];
    expect(log).toHaveLength(1);
  });

  it("removes several surfaces under one reason", async () => {
    const root = await project();
    await seedUiBearingSpec(root, "0001");
    await seedLoop(root, ["0001", "0011", "0012"], null);

    expect(await run(root, { remove: ["0011", "0012"] })).toBe(0);
    const proto = await readProto(root);
    expect(proto.frozenSurfaceUnion).toEqual(["0001"]);
    expect((proto.rescopeLog as unknown[]).length).toBe(2);
  });
});

describe("a --reason that does not read as an id", () => {
  // Warned, never refused. Resolving the id would need every place a delta or
  // decision can live, and a resolver that misses one refuses a LEGITIMATE
  // reduction — worse than a weak field, because it blocks the operation this
  // exists to provide. So both rows assert exit 0 and differ only in whether
  // the operator was told.
  // `lib/logger.ts` sends `warn` to STDOUT, not stderr — the CLI keeps one
  // stream so a piped run sees the whole narrative in order. Spying on stderr
  // captured nothing, which is how this row found out.
  const captureWarnings = (): string[] => {
    const lines: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      lines.push(String(chunk));
      return true;
    });
    return lines;
  };

  it("warns, and still applies", async () => {
    const root = await reducedScope();
    const lines = captureWarnings();

    expect(await run(root, { reason: "because the customer said so" })).toBe(0);

    expect(lines.join("")).toContain("does not read as a recorded");
    expect((await readProto(root)).frozenSurfaceUnion).toEqual(["0001"]);
  });

  it("writes the reason to the log exactly as given", async () => {
    // The audit entry is the real control, so a thin reason is preserved
    // verbatim rather than normalised into something that looks better than it
    // is.
    const root = await reducedScope();
    captureWarnings();
    await run(root, { reason: "because the customer said so" });

    const log = (await readProto(root)).rescopeLog as { reason: string }[];
    expect(log[0]?.reason).toBe("because the customer said so");
  });

  it("stays quiet for an id", async () => {
    const root = await reducedScope();
    const lines = captureWarnings();

    expect(await run(root, { reason: "DELTA-022" })).toBe(0);
    expect(lines.join("")).not.toContain("does not read as a recorded");
  });

  it("stays quiet for the other id shapes this repository uses", async () => {
    for (const reason of ["CR-20260904-0001", "DR-0012-0028", "CHG-003"]) {
      const root = await reducedScope();
      const lines = captureWarnings();
      expect(await run(root, { reason })).toBe(0);
      expect(lines.join("")).not.toContain("does not read as a recorded");
      vi.restoreAllMocks();
    }
  });
});

describe("prototyping rescope and the recorded review", () => {
  async function seedReview(root: string, prose: string): Promise<string> {
    const dir = path.join(evidenceDir(root), "iter-00");
    await mkdir(dir, { recursive: true });
    const abs = path.join(dir, "review.json");
    await writeFile(
      abs,
      `${JSON.stringify({ reviewerId: "r1", proseCritique: prose, scores: {} }, null, 2)}\n`,
      "utf-8",
    );
    return abs;
  }

  const PROSE = "All twelve declared screens render, including the 禁止リスト sidebar.";

  it("annotates the review WITHOUT touching the critique", async () => {
    // The issue's second point. What a reviewer saw at cycle N is a historical
    // fact; editing the prose to match a scope it never described would be
    // fabricating the critique. The annotation is what lets a reader tell a
    // stale claim from a wrong one.
    const root = await reducedScope();
    const abs = await seedReview(root, PROSE);

    expect(await run(root)).toBe(0);

    const review = JSON.parse(await readFile(abs, "utf-8")) as Record<string, unknown>;
    expect(review.proseCritique).toBe(PROSE);
    const retired = review.retiredSurfaces as { surface: string; reason: string }[];
    expect(retired).toHaveLength(1);
    expect(retired[0]?.surface).toBe("0011");
    expect(retired[0]?.reason).toBe("DELTA-022");
  });

  it("does not annotate the same surface twice", async () => {
    const root = await project();
    await seedUiBearingSpec(root, "0001");
    await seedLoop(root, ["0001", "0011", "0012"], null);
    const abs = await seedReview(root, PROSE);
    await run(root, { remove: ["0011"] });
    await run(root, { remove: ["0012"] });

    const review = JSON.parse(await readFile(abs, "utf-8")) as Record<string, unknown>;
    const retired = review.retiredSurfaces as { surface: string }[];
    expect(retired.map((entry) => entry.surface)).toEqual(["0011", "0012"]);
  });

  it("prunes the retired surface out of a captured plan", async () => {
    const root = await reducedScope();
    const dir = path.join(evidenceDir(root), "iter-00");
    await mkdir(dir, { recursive: true });
    const abs = path.join(dir, "iterate-plan.json");
    await writeFile(
      abs,
      `${JSON.stringify(
        {
          cycle: 0,
          screens: [
            { specId: "0001", screenId: "home" },
            { specId: "0011", screenId: "blocklist" },
          ],
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    expect(await run(root)).toBe(0);
    const plan = JSON.parse(await readFile(abs, "utf-8")) as {
      cycle: number;
      screens: { specId: string }[];
    };
    expect(plan.screens.map((screen) => screen.specId)).toEqual(["0001"]);
    expect(plan.cycle).toBe(0);
  });
});

describe("prototyping rescope --dry-run", () => {
  it("writes nothing at all", async () => {
    const root = await reducedScope();
    const dir = path.join(evidenceDir(root), "iter-00");
    await mkdir(dir, { recursive: true });
    const planAbs = path.join(dir, "iterate-plan.json");
    await writeFile(
      planAbs,
      `${JSON.stringify({ cycle: 0, screens: [{ specId: "0011" }] }, null, 2)}\n`,
      "utf-8",
    );
    const before = await readFile(planAbs, "utf-8");

    expect(await run(root, { dryRun: true })).toBe(0);

    expect((await readProto(root)).frozenSurfaceUnion).toEqual(["0001", "0011"]);
    expect((await readProto(root)).rescopeLog).toBeUndefined();
    expect(await readFile(planAbs, "utf-8")).toBe(before);
  });
});
