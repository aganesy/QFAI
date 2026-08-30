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

describe("a --spec slice gate does not import a sibling worker's in-flight pack", () => {
  it("drops QFAI-REVIEW-* for packs the scoped spec does not own", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-scope-"));
    try {
      await seedEmptyReviewPack(root);
      await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });

      await runValidate({ root, strict: false, profile: "sdd", specIds: ["0001"] });
      const body = JSON.parse(
        await readFile(path.join(root, ".qfai", "report", "validate.spec-0001.json"), "utf-8"),
      ) as { issues: Finding[] };
      const codes = body.issues.map((entry) => entry.code);
      for (const rule of MANDATED_REVIEW_RULES) {
        expect(codes).not.toContain(rule);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still reports the scoped spec's own pack when its summary.json is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-scope-own-"));
    try {
      await writeFile(path.join(root, ".gitignore"), QFAI_GITIGNORE_BLOCK, "utf-8");
      await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
      const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "review_request.md"),
        "# Review Request\n\n- target: `.qfai/specs/spec-0001`\n",
        "utf-8",
      );

      await runValidate({ root, strict: false, profile: "sdd", specIds: ["0001"] });
      const body = JSON.parse(
        await readFile(path.join(root, ".qfai", "report", "validate.spec-0001.json"), "utf-8"),
      ) as { issues: Finding[] };
      const codes = body.issues.map((entry) => entry.code);
      expect(codes).toContain("QFAI-REVIEW-004");
      expect(codes).toContain("QFAI-REVIEW-005");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("each stage profile gates only the review packs it owns", () => {
  async function seedPack(root: string, summary: Record<string, unknown>): Promise<void> {
    await writeFile(path.join(root, ".gitignore"), QFAI_GITIGNORE_BLOCK, "utf-8");
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "review_request.md"), "# Review Request\n", "utf-8");
    await writeFile(path.join(packDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  }

  const packOf = (targetKind: string, producer?: string): Record<string, unknown> =>
    producer === undefined
      ? { version: "2.0", target: { kind: targetKind, path: "x" } }
      : { version: "2.0", producer, target: { kind: targetKind, path: "x" } };

  it("keeps an incomplete spec pack out of the discussion gate and in the sdd one", async () => {
    await withoutCiEnv(async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-kind-"));
      try {
        await seedPack(root, packOf("spec"));

        await runValidate({ root, strict: false, profile: "discussion" });
        expect((await findings(root)).map((entry) => entry.code)).not.toContain("QFAI-REVIEW-005");

        await runValidate({ root, strict: false, profile: "sdd" });
        expect((await findings(root)).map((entry) => entry.code)).toContain("QFAI-REVIEW-005");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  });

  it("keeps an incomplete discussion pack out of the sdd gate and in the discussion one", async () => {
    await withoutCiEnv(async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-kind-"));
      try {
        await seedPack(root, packOf("discussion"));

        await runValidate({ root, strict: false, profile: "sdd" });
        expect((await findings(root)).map((entry) => entry.code)).not.toContain("QFAI-REVIEW-005");

        await runValidate({ root, strict: false, profile: "discussion" });
        expect((await findings(root)).map((entry) => entry.code)).toContain("QFAI-REVIEW-005");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  });

  // `qfai-implement` writes `target.kind: "spec"` for its own packs, so kind
  // alone put a downstream worker's in-flight pack in the SDD cycle's gate.
  it("keeps an implementation pack out of both stage gates and in the full scan", async () => {
    await withoutCiEnv(async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-producer-"));
      try {
        await seedPack(root, packOf("spec", "implement"));

        for (const profile of ["sdd", "discussion"] as const) {
          await runValidate({ root, strict: false, profile });
          expect((await findings(root)).map((entry) => entry.code)).not.toContain(
            "QFAI-REVIEW-005",
          );
        }

        await runValidate({ root, strict: false });
        expect((await findings(root)).map((entry) => entry.code)).toContain("QFAI-REVIEW-005");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  });

  it("the full scan still judges both", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-kind-full-"));
    try {
      await seedPack(root, packOf("spec"));
      await runValidate({ root, strict: false });
      const all = await findings(root);
      expect(all.filter((entry) => entry.code === "QFAI-REVIEW-005")).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not let a foreign target.kind dodge the spec slice's gate", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-contradiction-"));
    try {
      await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
      // `kind` says discussion, `path` says spec-0001: the pack's own path puts
      // it in this gate, so the kind must not buy it out.
      await seedPack(root, {
        version: "2.0",
        target: { kind: "discussion", path: ".qfai/specs/spec-0001" },
      });

      await runValidate({ root, strict: false, profile: "sdd", specIds: ["0001"] });
      const body = JSON.parse(
        await readFile(path.join(root, ".qfai", "report", "validate.spec-0001.json"), "utf-8"),
      ) as { issues: Finding[] };
      const codes = body.issues.map((entry) => entry.code);
      expect(codes).toContain("QFAI-REVIEW-005");
      expect(codes).toContain("QFAI-REVIEW-007");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("a scoped full run keeps the packs no spec owns", () => {
  it("still reports a discussion pack under --spec", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-scoped-full-"));
    try {
      await writeFile(path.join(root, ".gitignore"), QFAI_GITIGNORE_BLOCK, "utf-8");
      await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
      const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "review_request.md"),
        "# Review Request\n\n- Producer: `discussion`\n- target: `.qfai/discussion/discussion-20260401000000000`\n",
        "utf-8",
      );

      await runValidate({ root, strict: false, specIds: ["0001"] });
      const body = JSON.parse(
        await readFile(path.join(root, ".qfai", "report", "validate.spec-0001.json"), "utf-8"),
      ) as { issues: Finding[] };
      const codes = body.issues.map((entry) => entry.code);
      // A discussion pack belongs to no spec, so narrowing by spec number alone
      // dropped it — and its hard errors — from every scoped full scan.
      expect(codes).toContain("QFAI-REVIEW-004");
      expect(codes).toContain("QFAI-REVIEW-005");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
