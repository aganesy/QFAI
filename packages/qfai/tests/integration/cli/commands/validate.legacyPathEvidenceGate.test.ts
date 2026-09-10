import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";

const LEGACY_REL = ".qfai/output/validate.json";
const CANONICAL_REL = ".qfai/report/validate.json";

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
  it("post-sunset, a stale legacy file on disk is evidence and the write has stopped", async () => {
    await withProject(async (root) => {
      await mkdir(path.join(root, ".qfai", "output"), { recursive: true });
      const stale = '{"stale":true}';
      await writeFile(path.join(root, LEGACY_REL), stale, "utf-8");

      await runValidate({ root, strict: false, toolVersionOverride: "1.10.0" });

      const finding = (await readFindings(root)).find(
        (entry) => entry.code === "D-DEPRECATED-PATH",
      );
      expect(finding?.severity).toBe("error");
      expect(finding?.message).toContain("no longer written but");
      // The stale file is left untouched, not refreshed and not deleted.
      expect(await readFile(path.join(root, LEGACY_REL), "utf-8")).toBe(stale);
    });
  });
});
