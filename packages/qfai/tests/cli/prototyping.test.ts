/**
 * Tests for `qfai prototyping prepare` (spec-0017 REQ-0007).
 *
 * QFAI:SPEC-0017:TC-0017-0020 — prepare writes review bundle + plan
 * QFAI:SPEC-0017:TC-0017-0021 — prepare exits 0 on success
 * QFAI:SPEC-0017:TC-0017-0022 — prepare does not capture screenshots
 */

import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingPrepare } from "../../src/cli/commands/prototyping.js";
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
  // minimal qfai.config.yaml + a UI contract with two screens
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "prototyping:",
      "  execution:",
      "    targetUrl: null",
      "    browserTool: playwright-cli",
      "",
    ].join("\n"),
    "utf-8",
  );

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

describe("parseArgs — qfai prototyping prepare", () => {
  it("parses subcommand + required flags (REQ-0007)", () => {
    const parsed = parseArgs(
      [
        "prototyping",
        "prepare",
        "--target-url",
        "http://localhost:5173",
        "--mode",
        "standard",
        "--cycle",
        "2",
      ],
      process.cwd(),
    );

    expect(parsed.command).toBe("prototyping");
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.prototypingAction).toBe("prepare");
    expect(parsed.options.prototypingTargetUrl).toBe("http://localhost:5173");
    expect(parsed.options.prototypingMode).toBe("standard");
    expect(parsed.options.prototypingCycle).toBe(2);
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
      ["prototyping", "prepare", "--target-url", "http://x", "--mode", "turbo"],
      process.cwd(),
    );
    expect(parsed.invalid).toBe(true);
  });

  it("rejects non-positive --cycle values", () => {
    const parsed = parseArgs(
      ["prototyping", "prepare", "--target-url", "http://x", "--cycle", "0"],
      process.cwd(),
    );
    expect(parsed.invalid).toBe(true);
  });
});

describe("runPrototypingPrepare", () => {
  // TC-0017-0020 — writes review bundle + plan
  // TC-0017-0021 — exits 0 on success
  it("writes review-bundle.json and playwright-commands.json and exits 0", async () => {
    const root = await newTempDir();
    await seedFixture(root);

    const exitCode = await runPrototypingPrepare({
      root,
      targetUrl: "http://localhost:5173",
      mode: "standard",
      cycle: 1,
    });

    expect(exitCode).toBe(0);

    const bundlePath = path.join(
      root,
      ".qfai/evidence/prototyping/iterations/1/review-bundle.json",
    );
    const planPath = path.join(
      root,
      ".qfai/evidence/prototyping/iterations/1/playwright-commands.json",
    );
    expect(await exists(bundlePath)).toBe(true);
    expect(await exists(planPath)).toBe(true);

    const bundle = JSON.parse(await readFile(bundlePath, "utf-8"));
    expect(bundle.spec).toBe("0017");
    expect(bundle.mode).toBe("standard");
    expect(bundle.cycle).toBe(1);
    expect(bundle.maxCycles).toBe(3);
    expect(bundle.screens).toHaveLength(2);
    expect(bundle.commandPlanRef).toBe(
      ".qfai/evidence/prototyping/iterations/1/playwright-commands.json",
    );

    const plans = JSON.parse(await readFile(planPath, "utf-8"));
    expect(Array.isArray(plans)).toBe(true);
    expect(plans).toHaveLength(2);
  });

  // TC-0017-0022 — prepare does not capture screenshots
  it("does not produce screenshots, HTML, or snapshots (evaluator's responsibility)", async () => {
    const root = await newTempDir();
    await seedFixture(root);

    await runPrototypingPrepare({
      root,
      targetUrl: "http://localhost:5173",
      mode: "low-cost",
      cycle: 1,
    });

    const iterationDir = path.join(root, ".qfai/evidence/prototyping/iterations/1");

    // No capture artifacts created — only bundle + plan
    for (const unexpected of [
      "order_list.png",
      "order_list.html",
      "order_list.snapshot.txt",
      "order_create.png",
    ]) {
      expect(
        await exists(path.join(iterationDir, unexpected)),
        `prepare must not create ${unexpected}`,
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

    const exitCode = await runPrototypingPrepare({
      root,
      targetUrl: "http://localhost:5173",
      mode: "standard",
      cycle: 1,
    });

    expect(exitCode).not.toBe(0);
  });

  it("honors --cycle when provided (paths reflect cycle number)", async () => {
    const root = await newTempDir();
    await seedFixture(root);

    await runPrototypingPrepare({
      root,
      targetUrl: "http://localhost:5173",
      mode: "full-harness",
      cycle: 7,
    });

    const bundlePath = path.join(
      root,
      ".qfai/evidence/prototyping/iterations/7/review-bundle.json",
    );
    expect(await exists(bundlePath)).toBe(true);

    const bundle = JSON.parse(await readFile(bundlePath, "utf-8"));
    expect(bundle.cycle).toBe(7);
    expect(bundle.maxCycles).toBe(20);
    expect(bundle.screens[0].expectedEvidence.screenshotPath).toMatch(
      /\.qfai\/evidence\/prototyping\/iterations\/7\//,
    );
  });
});
