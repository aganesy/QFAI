// QFAI:EX-0001-0039-01
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { validateProject } from "../../src/core/validate.js";
import type { Issue, ValidationProfile } from "../../src/core/types.js";
import { captureStdout } from "../helpers/stdout.js";

const PROFILES: ValidationProfile[] = ["sdd", "atdd", "discussion", "full"];

async function put(root: string, rel: string, text: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  await writeFile(path.join(root, rel), text, "utf-8");
}

async function withInitProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-no-stage-evidence-"));
  try {
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function issuesOf(root: string): Promise<Issue[][]> {
  return Promise.all(
    PROFILES.map(async (profile) => (await validateProject(root, undefined, { profile })).issues),
  );
}

const identities = (runs: Issue[][]): string[][] =>
  runs.map((issues) =>
    issues
      .map((item) => [item.code, item.severity, item.file ?? "", ...(item.refs ?? [])].join("|"))
      .sort(),
  );

describe("validate reads no stage evidence", () => {
  it("gives the same findings with and without a local spec-stage record", async () => {
    await withInitProject(async (root) => {
      await put(
        root,
        ".qfai/spec/03_contract/db/CON-DB-0001.sql",
        "-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE notify (id int);\n",
      );
      const without = await issuesOf(root);
      await put(root, ".qfai/evidence/sdd-BF-0001.md", "# SDD BF-0001\n\nNo grilling record.\n");
      const withRecord = await issuesOf(root);

      expect(identities(withRecord)).toEqual(identities(without));
      expect(without.flat().map((item) => item.code)).not.toContain("QFAI-CONTRACT-031");
    });
  }, 120_000);

  it("reports nothing for a missing prototyping.json from readiness or the Reviewer Gate", async () => {
    await withInitProject(async (root) => {
      await put(
        root,
        ".qfai/spec/03_contract/ui/main.yaml",
        '# QFAI-CONTRACT-ID: CON-UI-0001\nscreens:\n  - id: SCR-001\n    route: "/"\n',
      );
      const aboutTheMissingFile = (await issuesOf(root))
        .flat()
        .filter(
          (item) =>
            (item.code.startsWith("QFAI-DCON-") || item.code.startsWith("R-")) &&
            /prototyping\.json|prototyping evidence/.test(item.message),
        );

      expect(aboutTheMissingFile).toEqual([]);
    });
  }, 120_000);
});
