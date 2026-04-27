/**
 * Tests for `qfai prototyping round-*` commands (spec-0017 REQ-0007).
 *
 * QFAI:SPEC-0017:TC-0017-0020 — round-start writes review bundle + plan
 * QFAI:SPEC-0017:TC-0017-0021 — round-start exits 0 on success
 * QFAI:SPEC-0017:TC-0017-0022 — round-start does not capture screenshots
 */

import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingCommand } from "../../src/cli/commands/prototyping.js";
import { parseArgs } from "../../src/cli/lib/args.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-prot-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedFixture(root: string): Promise<void> {
  // minimal qfai.config.yaml + a UI contract with two screens.
  // v1.8.4 Phase 6: also seed a primary prototyping spec so
  // resolvePrimaryPrototypingSpec returns something (review-bundle.spec
  // is parameterised at runtime; without a resolved spec, runRoundStart
  // refuses to write a bundle).
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "prototyping:",
      '  primarySpecId: "0001"',
      "  execution:",
      "    targetUrl: null",
      "    browserTool: playwright-cli",
      "",
    ].join("\n"),
    "utf-8",
  );

  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "---\nsurface_type: ui-bearing\n---\n\n# spec-0001 (test fixture)\n",
    "utf-8",
  );
  await writeFile(path.join(specDir, "02_User-stories.md"), "# stories\n", "utf-8");

  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(
    path.join(uiDir, "ui-0001-order.yaml"),
    [
      "# QFAI-CONTRACT-ID: CON-UI-0001",
      "screens:",
      "  - id: order_list",
      "    title: Order List",
      "    route: /orders",
      "    primary_tasks:",
      "      - Filter orders by status",
      "  - id: order_create",
      "    title: Order Create",
      "    route: /orders/new",
      "    primary_tasks:",
      "      - Submit a new order",
      "",
    ].join("\n"),
    "utf-8",
  );
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe("parseArgs — qfai prototyping round-start", () => {
  it("parses subcommand + required flags (REQ-0007)", () => {
    const parsed = parseArgs(
      [
        "prototyping",
        "round-start",
        "--target-url",
        "http://localhost:5173",
        "--mode",
        "standard",
        "--round",
        "r5",
        "--candidates",
        "c1,c2,c3,c4,c5",
      ],
      process.cwd(),
    );

    expect(parsed.command).toBe("prototyping");
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.prototypingAction).toBe("round-start");
    expect(parsed.options.prototypingTargetUrl).toBe("http://localhost:5173");
    expect(parsed.options.prototypingMode).toBe("standard");
    expect(parsed.options.prototypingRound).toBe("r5");
    expect(parsed.options.prototypingCandidates).toEqual(["c1", "c2", "c3", "c4", "c5"]);
  });

  it("rejects unknown subcommand", () => {
    const parsed = parseArgs(
      ["prototyping", "notasubcommand", "--target-url", "http://x"],
      process.cwd(),
    );
    expect(parsed.invalid).toBe(true);
  });

  it("requires a subcommand", () => {
    const parsed = parseArgs(["prototyping"], process.cwd());
    expect(parsed.invalid).toBe(true);
  });

  it("rejects invalid --mode values", () => {
    const parsed = parseArgs(
      ["prototyping", "round-start", "--target-url", "http://x", "--mode", "turbo"],
      process.cwd(),
    );
    expect(parsed.invalid).toBe(true);
  });

  it("rejects invalid --round values", () => {
    const parsed = parseArgs(
      ["prototyping", "round-start", "--target-url", "http://x", "--round", "r4"],
      process.cwd(),
    );
    expect(parsed.invalid).toBe(true);
  });
});

describe("runPrototypingCommand", () => {
  // TC-0017-0020 — writes review bundle + plan
  // TC-0017-0021 — exits 0 on success
  it("writes review-bundle.json and command-plans.json and exits 0", async () => {
    const root = await newTempDir();
    await seedFixture(root);

    const exitCode = await runPrototypingCommand({
      root,
      action: "round-start",
      targetUrl: "http://localhost:5173",
      mode: "standard",
      round: "r5",
      candidates: ["c1", "c2", "c3", "c4", "c5"],
    });

    expect(exitCode).toBe(0);

    const bundlePath = path.join(root, ".qfai/evidence/prototyping/rounds/r5/review-bundle.json");
    const planPath = path.join(root, ".qfai/evidence/prototyping/rounds/r5/command-plans.json");
    expect(await exists(bundlePath)).toBe(true);
    expect(await exists(planPath)).toBe(true);

    const bundle = JSON.parse(await readFile(bundlePath, "utf-8"));
    // v1.8.4 Phase 6: spec is now the resolved primary spec ID, not the
    // hardcoded "0017" literal. The fixture seeds primarySpecId: "0001".
    expect(bundle.spec).toBe("0001");
    expect(bundle.mode).toBe("standard");
    expect(bundle.round).toBe("r5");
    expect(bundle.maxCycles).toBe(3);
    expect(bundle.candidates).toHaveLength(5);
    expect(bundle.commandPlanRef).toBe(".qfai/evidence/prototyping/rounds/r5/command-plans.json");

    const plans = JSON.parse(await readFile(planPath, "utf-8"));
    expect(Array.isArray(plans)).toBe(true);
    expect(plans).toHaveLength(10);
  });

  // TC-0017-0022 — prepare does not capture screenshots
  it("does not produce screenshots, HTML, or snapshots (evaluator's responsibility)", async () => {
    const root = await newTempDir();
    await seedFixture(root);

    await runPrototypingCommand({
      root,
      action: "round-start",
      targetUrl: "http://localhost:5173",
      mode: "low-cost",
      round: "r5",
      candidates: ["c1", "c2", "c3", "c4", "c5"],
    });

    const candidateDir = path.join(root, ".qfai/evidence/prototyping/rounds/r5/candidates/c1");

    // No capture artifacts created — only bundle + plan
    for (const unexpected of [
      "order_list.png",
      "order_list.html",
      "order_list.snapshot.txt",
      "order_create.png",
    ]) {
      expect(
        await exists(path.join(candidateDir, unexpected)),
        `round-start must not create ${unexpected}`,
      ).toBe(false);
    }
  });

  it("exits non-zero when no screens are declared", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  contractsDir: .qfai/contracts\n",
      "utf-8",
    );
    await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });

    const exitCode = await runPrototypingCommand({
      root,
      action: "round-start",
      targetUrl: "http://localhost:5173",
      mode: "standard",
      round: "r5",
      candidates: ["c1", "c2", "c3", "c4", "c5"],
    });

    expect(exitCode).not.toBe(0);
  });

  it("writes harvest, narrow decision, absorption plan, and verifies reimplementation", async () => {
    const root = await newTempDir();
    await seedFixture(root);

    await runPrototypingCommand({
      root,
      action: "round-start",
      targetUrl: "http://localhost:5173",
      mode: "full-harness",
      round: "r5",
      candidates: ["c1", "c2", "c3", "c4", "c5"],
    });

    const evaluatorDir = path.join(root, ".qfai/evidence/prototyping/rounds/r5/evaluator-reviews");
    await mkdir(evaluatorDir, { recursive: true });
    for (const candidateId of ["c1", "c2", "c3", "c4", "c5"]) {
      await writeFile(
        path.join(evaluatorDir, `${candidateId}.json`),
        `${JSON.stringify({ candidateId, round: "r5" }, null, 2)}\n`,
        "utf-8",
      );
    }

    expect(
      await runPrototypingCommand({
        root,
        action: "round-harvest",
        mode: "standard",
        round: "r5",
      }),
    ).toBe(0);

    const harvestPath = path.join(root, ".qfai/evidence/prototyping/rounds/r5/harvest.json");
    expect(await exists(harvestPath)).toBe(true);

    expect(
      await runPrototypingCommand({
        root,
        action: "round-narrow",
        mode: "standard",
        round: "r5",
        survivors: ["c1", "c3", "c5"],
      }),
    ).toBe(0);

    const narrowDecision = JSON.parse(
      await readFile(
        path.join(root, ".qfai/evidence/prototyping/rounds/r5/narrow-decision.json"),
        "utf-8",
      ),
    );
    expect(narrowDecision.toRound).toBe("r3");
    expect(narrowDecision.survivorCandidateIds).toEqual(["c1", "c3", "c5"]);

    expect(
      await runPrototypingCommand({
        root,
        action: "round-absorb",
        mode: "standard",
        round: "r3",
        survivors: ["c1", "c3", "c5"],
      }),
    ).toBe(0);

    const absorptionPlan = JSON.parse(
      await readFile(
        path.join(root, ".qfai/evidence/prototyping/rounds/r3/absorption-plan.json"),
        "utf-8",
      ),
    );
    expect(absorptionPlan.round).toBe("r3");
    expect(absorptionPlan.absorptions).toHaveLength(3);

    await mkdir(path.join(root, ".qfai/evidence/prototyping/rounds/r3"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/rounds/r3/reimplementation.json"),
      `${JSON.stringify(
        {
          schemaVersion: "2.0",
          round: "r3",
          absorptionPlanRef: ".qfai/evidence/prototyping/rounds/r3/absorption-plan.json",
          candidateChanges: [
            {
              candidateId: "c1",
              changedScreens: ["order_list"],
              diffSummary: "Applied harvested table layout refinements.",
              codeChangeEvidenceRef:
                ".qfai/evidence/prototyping/rounds/r3/reimplementation.diff.txt",
            },
          ],
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    expect(
      await runPrototypingCommand({
        root,
        action: "round-reimplement-verify",
        mode: "standard",
        round: "r3",
      }),
    ).toBe(0);
  });
});
