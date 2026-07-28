import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";

const CANONICAL_REL = ".qfai/report/validate.json";

type Finding = { code: string; severity: string; message: string };

async function findings(root: string): Promise<Finding[]> {
  const body = JSON.parse(await readFile(path.join(root, CANONICAL_REL), "utf-8")) as {
    issues: Finding[];
  };
  return body.issues;
}

/** A spec with a US and a TC, and no test tree at all. */
async function seedSpec(root: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
  await writeFile(
    path.join(specDir, "02_User-stories.md"),
    ["# 02 User stories", "", "## US-0001: title", "- Parent: CAP-0001", ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "06_Test-Cases.md"),
    ["# 06 Test cases", "", "## TC-0001: title", "- Parent: EX-0001", ""].join("\n"),
    "utf-8",
  );
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-profile-"));
  try {
    await seedSpec(root);
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("--profile tdd can observe the ATDD routing gates", () => {
  it("raises QFAI-ATDD-111/112 under the tdd profile", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false, profile: "tdd" });
      const codes = (await findings(root)).map((entry) => entry.code);
      expect(codes).toContain("QFAI-ATDD-111");
      expect(codes).toContain("QFAI-ATDD-112");
    });
  });

  it("does not double-report the ATDD gates under the full profile", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false });
      const atdd111 = (await findings(root)).filter((entry) => entry.code === "QFAI-ATDD-111");
      expect(atdd111).toHaveLength(1);
    });
  });

  it("names the hard gates a partial profile did not evaluate", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false, profile: "tdd" });
      const notice = (await findings(root)).find((entry) => entry.code === "QFAI-PROFILE-001");
      expect(notice?.severity).toBe("info");
      expect(notice?.message).toContain('profile="tdd" is a partial profile');
      expect(notice?.message).toContain("QFAI-COV-*");
      expect(notice?.message).toContain("not full-scan coverage");
      // The gates this PR added must not be listed as unevaluated.
      expect(notice?.message).not.toContain("QFAI-ATDD-*");
    });
  });

  it("emits no partial-profile notice for the full profile", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false });
      const codes = (await findings(root)).map((entry) => entry.code);
      expect(codes).not.toContain("QFAI-PROFILE-001");
    });
  });
});
