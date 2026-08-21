import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";
import { QFAI_GITIGNORE_BLOCK } from "../../../../src/core/gitignore.js";

const CANONICAL_REL = ".qfai/report/validate.json";

type Finding = { code: string; severity: string; message: string };

async function findings(root: string): Promise<Finding[]> {
  const body = JSON.parse(await readFile(path.join(root, CANONICAL_REL), "utf-8")) as {
    issues: Finding[];
  };
  return body.issues;
}

/**
 * A review pack in exactly the state `QFAI-REVIEW-003/004/005` exist to catch:
 * a directory whose name the validator recognizes, holding none of the three
 * files the RCP footer mandates.
 */
async function seedEmptyReviewPack(root: string): Promise<void> {
  await writeFile(path.join(root, ".gitignore"), QFAI_GITIGNORE_BLOCK, "utf-8");
  const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "notes.md"), "# notes\n", "utf-8");
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-profile-"));
  try {
    await seedEmptyReviewPack(root);
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * Runs `task` with CI detection forced off.
 *
 * `discussion` is not in `CI_ALLOWED_PROFILES`, so under a real CI environment
 * the run also carries `QFAI-VALIDATE-017`; assertions about the partial-profile
 * notice are clearer without it.
 */
async function withoutCiEnv(task: () => Promise<void>): Promise<void> {
  const previousCi = process.env.CI;
  const previousGha = process.env.GITHUB_ACTIONS;
  const restore = (key: "CI" | "GITHUB_ACTIONS", value: string | undefined): void => {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- literal union key
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };
  restore("CI", undefined);
  restore("GITHUB_ACTIONS", undefined);
  try {
    await task();
  } finally {
    restore("CI", previousCi);
    restore("GITHUB_ACTIONS", previousGha);
  }
}

const MANDATED_REVIEW_RULES = ["QFAI-REVIEW-003", "QFAI-REVIEW-004", "QFAI-REVIEW-005"] as const;

describe("the profiles whose RCP footer mandates a review pack can see it", () => {
  it("raises QFAI-REVIEW-003/004/005 under --profile sdd", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false, profile: "sdd" });
      const codes = (await findings(root)).map((entry) => entry.code);
      for (const rule of MANDATED_REVIEW_RULES) {
        expect(codes).toContain(rule);
      }
    });
  });

  it("raises QFAI-REVIEW-003/004/005 under --profile discussion", async () => {
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        await runValidate({ root, strict: false, profile: "discussion" });
        const codes = (await findings(root)).map((entry) => entry.code);
        for (const rule of MANDATED_REVIEW_RULES) {
          expect(codes).toContain(rule);
        }
      });
    });
  });

  it("does not double-report them under the full profile", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false });
      const all = await findings(root);
      for (const rule of MANDATED_REVIEW_RULES) {
        expect(all.filter((entry) => entry.code === rule)).toHaveLength(1);
      }
    });
  });

  it("stops listing QFAI-REVIEW-* as a family sdd and discussion did not evaluate", async () => {
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        for (const profile of ["sdd", "discussion"] as const) {
          await runValidate({ root, strict: false, profile });
          const notice = (await findings(root)).find((entry) => entry.code === "QFAI-PROFILE-001");
          expect(notice?.message).toContain(`profile="${profile}" is a partial profile`);
          expect(notice?.message).not.toContain("QFAI-REVIEW-*");
        }
      });
    });
  });
});
