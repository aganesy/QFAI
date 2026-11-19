// QFAI:AC-0003-0009-04
//
// Integration: without `--yes`, `qfai doctor --autoremediate` names the
// packages and runs `npm install` only after an affirmative answer, and a
// session that cannot answer installs nothing. The prompt and the install
// runner are both stubbed, so the test reads no stdin and touches no network.

import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAutoremediate } from "../../../../src/core/doctor/autoremediate.js";
import { pathExists } from "../../../helpers/pathExists.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

/** A project whose prototyping manifest declares `playwright`, which is not installed. */
async function seedProject(label: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-confirm-${label}-`));
  tempDirs.push(root);
  const manifestDir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping");
  await mkdir(manifestDir, { recursive: true });
  await writeFile(
    path.join(manifestDir, "manifest.json"),
    JSON.stringify({ runtimeDependencies: ["playwright"] }, null, 2),
    "utf-8",
  );
  return root;
}

function recordingRunner(root: string): {
  readonly calls: string[];
  readonly run: (name: string) => Promise<void>;
} {
  const calls: string[] = [];
  return {
    calls,
    run: async (name) => {
      calls.push(name);
      await mkdir(path.join(root, "node_modules", name), { recursive: true });
    },
  };
}

describe("doctor --autoremediate confirms before installing", () => {
  // QFAI:EX-0003-0009-11
  it("shows the packages and installs after an affirmative answer", async () => {
    const root = await seedProject("accept");
    const runner = recordingRunner(root);
    const asked: (readonly string[])[] = [];

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: false,
      isCi: false,
      skill: "qfai-prototyping",
      interactive: true,
      confirmInstall: (packages) => {
        asked.push(packages);
        // The runner must not have run before the operator answered.
        expect(runner.calls).toEqual([]);
        return Promise.resolve(true);
      },
      installRunner: runner.run,
    });

    expect(asked).toEqual([["playwright"]]);
    expect(runner.calls).toEqual(["playwright"]);
    expect(summary.installed).toEqual(["playwright"]);
  });

  // QFAI:EX-0003-0009-11
  it("installs nothing when the operator declines", async () => {
    const root = await seedProject("decline");
    const runner = recordingRunner(root);

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: false,
      isCi: false,
      skill: "qfai-prototyping",
      interactive: true,
      confirmInstall: () => Promise.resolve(false),
      installRunner: runner.run,
    });

    expect(runner.calls).toEqual([]);
    expect(summary.installed).toEqual([]);
    expect(summary.lines).toContain(
      "autoremediate: install declined; nothing installed (playwright)",
    );
  });

  // QFAI:EX-0003-0009-12
  it("installs nothing in a non-interactive session without --yes, and still prunes run logs", async () => {
    const root = await seedProject("non-interactive");
    await writeFile(path.join(root, "qfai.config.yaml"), "report:\n  keepLatestRuns: 1\n", "utf-8");
    const staleRun = path.join(root, ".qfai", "report", "run-20260401120000001");
    await mkdir(staleRun, { recursive: true });
    await mkdir(path.join(root, ".qfai", "report", "run-20260811120000002"), { recursive: true });
    const aged = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(staleRun, aged, aged);
    const runner = recordingRunner(root);
    let prompted = false;

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: false,
      isCi: false,
      skill: "qfai-prototyping",
      interactive: false,
      confirmInstall: () => {
        prompted = true;
        return Promise.resolve(true);
      },
      installRunner: runner.run,
    });

    expect(prompted).toBe(false);
    expect(runner.calls).toEqual([]);
    expect(summary.installed).toEqual([]);
    expect(summary.lines).toContain(
      "autoremediate: install skipped — confirmation needed and this session is not interactive; rerun with --yes to install playwright",
    );
    expect(summary.prunedRunLogs).toEqual(["run-20260401120000001"]);
    expect(await pathExists(staleRun)).toBe(false);
  });

  // QFAI:EX-0003-0009-01
  it("installs without asking when --yes is passed, even in a non-interactive session", async () => {
    const root = await seedProject("yes");
    const runner = recordingRunner(root);
    let prompted = false;

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skill: "qfai-prototyping",
      interactive: false,
      confirmInstall: () => {
        prompted = true;
        return Promise.resolve(false);
      },
      installRunner: runner.run,
    });

    expect(prompted).toBe(false);
    expect(runner.calls).toEqual(["playwright"]);
    expect(summary.installed).toEqual(["playwright"]);
  });
});
