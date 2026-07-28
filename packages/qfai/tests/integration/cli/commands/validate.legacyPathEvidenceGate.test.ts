import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";

const LEGACY_REL = ".qfai/output/validate.json";
const CANONICAL_REL = ".qfai/report/validate.json";

async function pathExists(target: string): Promise<boolean> {
  try {
    await readFile(target, "utf-8");
    return true;
  } catch {
    return false;
  }
}

async function seedProject(root: string): Promise<void> {
  await mkdir(path.join(root, ".qfai", "specs"), { recursive: true });
}

type Finding = { code: string; severity: string; message: string };

async function readFindings(root: string): Promise<Finding[]> {
  const body = JSON.parse(await readFile(path.join(root, CANONICAL_REL), "utf-8")) as {
    issues: Finding[];
  };
  return body.issues;
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-legacy-gate-"));
  try {
    await seedProject(root);
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("D-DEPRECATED-PATH requires evidence the legacy path is in use", () => {
  it("pre-sunset, a project that never used .qfai/output/ gets no finding and no side-write", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false, toolVersionOverride: "1.9.2" });

      const findings = await readFindings(root);
      expect(findings.some((entry) => entry.code === "D-DEPRECATED-PATH")).toBe(false);
      // The run must not manufacture its own evidence for the next run.
      expect(await pathExists(path.join(root, LEGACY_REL))).toBe(false);
    });
  });

  it("pre-sunset, the deprecation notice adds nothing to the --strict warning count", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: true, toolVersionOverride: "1.9.2" });
      const findings = await readFindings(root);
      // Whatever a project's own findings are, the deprecation notice is no
      // longer a permanent floor underneath them.
      expect(findings.some((entry) => entry.code === "D-DEPRECATED-PATH")).toBe(false);
    });
  });

  it("pre-sunset, a project with the legacy file on disk still gets the warning and a refresh", async () => {
    await withProject(async (root) => {
      await mkdir(path.join(root, ".qfai", "output"), { recursive: true });
      await writeFile(path.join(root, LEGACY_REL), "{}", "utf-8");

      await runValidate({ root, strict: false, toolVersionOverride: "1.9.2" });

      const finding = (await readFindings(root)).find(
        (entry) => entry.code === "D-DEPRECATED-PATH",
      );
      expect(finding?.severity).toBe("warning");
      expect(finding?.message).toContain("exists on disk");

      // Existing consumers keep working: the file is still refreshed.
      const legacyBody = JSON.parse(await readFile(path.join(root, LEGACY_REL), "utf-8")) as {
        issues?: unknown;
      };
      expect(legacyBody.issues).toBeDefined();
    });
  });
});
