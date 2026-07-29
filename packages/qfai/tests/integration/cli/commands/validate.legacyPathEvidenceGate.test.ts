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
  it("pre-sunset, the warning accompanies the compatibility side-write", async () => {
    // BR-0004-0026 / AC-0004-0032: a downstream reader of `.qfai/output/` is
    // invisible from the writer side, so every run that still deposits the
    // legacy file must also carry the sunset notice — otherwise a real legacy
    // reader reaches the 1.10.0 hard error having never been warned.
    await withProject(async (root) => {
      await runValidate({ root, strict: false, toolVersionOverride: "1.9.2" });

      const finding = (await readFindings(root)).find(
        (entry) => entry.code === "D-DEPRECATED-PATH",
      );
      expect(finding?.severity).toBe("warning");
      expect(finding?.message).toContain("sunset: 1.10.0");
    });
  });

  it("pre-sunset, the compatibility write is not gated on the finding's evidence", async () => {
    // BR-0004-0026: the write continues for the whole deprecation window, so a
    // consumer reading `.qfai/output/` from a clean checkout keeps working.
    await withProject(async (root) => {
      await runValidate({ root, strict: false, toolVersionOverride: "1.9.2" });

      expect(await pathExists(path.join(root, LEGACY_REL))).toBe(true);
      const legacyBody = JSON.parse(await readFile(path.join(root, LEGACY_REL), "utf-8")) as {
        issues?: unknown;
      };
      expect(legacyBody.issues).toBeDefined();
    });
  });

  it("pre-sunset, a config still aiming at the legacy path gets the warning", async () => {
    await withProject(async (root) => {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["output:", `  validateJsonPath: ${LEGACY_REL}`, ""].join("\n"),
        "utf-8",
      );

      await runValidate({ root, strict: false, toolVersionOverride: "1.9.2" });

      const body = JSON.parse(await readFile(path.join(root, LEGACY_REL), "utf-8")) as {
        issues: Finding[];
      };
      const finding = body.issues.find((entry) => entry.code === "D-DEPRECATED-PATH");
      expect(finding?.severity).toBe("warning");
      expect(finding?.message).toContain("output.validateJsonPath still points at the legacy");
      // BR-0004-0026: the sunset version stays a literal in the warning body.
      expect(finding?.message).toContain("sunset: 1.10.0");
    });
  });

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
