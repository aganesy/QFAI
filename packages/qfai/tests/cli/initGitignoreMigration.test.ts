/**
 * Two ways a governance negation reached the `.gitignore` and still did nothing.
 *
 * 1. `ensureRootGitignoreEntries` stripped the managed block and wrote the
 *    canonical one back whenever the freshness check failed. Shipping a NEW
 *    governance negation is exactly what makes it fail — so a project that had
 *    deliberately removed `.qfai/evidence/*` to track its own audit trail got
 *    that line resurrected by the very release meant to widen tracking, and
 *    every evidence file went back to being ignored.
 * 2. An earlier `qfai init` wrote a per-directory `.qfai/evidence/.gitignore`
 *    whose first line is `*`. Git applies the deepest matching file, so that
 *    `*` beats every root negation and the governance records stayed ignored
 *    however correct the managed block was.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_MARKER,
} from "../../src/core/gitignore.js";

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-migration-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const readGitignore = (root: string): Promise<string> =>
  readFile(path.join(root, ".gitignore"), "utf-8");

describe("re-init preserves what the project chose to track", () => {
  it("does not resurrect an ignore line the project removed from the block", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The project tracks its own audit trail: drop the evidence ignore, and
      // drop one governance negation so the freshness check fails on re-init.
      const pruned = (await readGitignore(root))
        .split("\n")
        .filter((line) => line !== ".qfai/evidence/*" && line !== "!.qfai/decisions/**")
        .join("\n");
      await writeFile(path.join(root, ".gitignore"), pruned, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await readGitignore(root);
      expect(after.split("\n")).not.toContain(".qfai/evidence/*");
      // …while the missing governance negation is restored.
      expect(after).toContain("!.qfai/decisions/**");
      expect(after.split(QFAI_GITIGNORE_MARKER).length - 1).toBe(1);
    });
  });

  it("strips retired lines from an old block without re-adding what it dropped", async () => {
    // A legacy-shaped block can ALSO carry a deliberate removal, so the earlier
    // "migrate it wholesale" rule resurrected the ignore for exactly those
    // projects. Age and intent are indistinguishable from the file, so the
    // conservative reading wins in both cases.
    await withProject(async (root) => {
      await writeFile(
        path.join(root, ".gitignore"),
        [
          QFAI_GITIGNORE_MARKER,
          ".qfai/report/*",
          "!.qfai/report/README.md",
          ".qfai/discussion/discussion-*/",
          "",
        ].join("\n"),
        "utf-8",
      );

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = (await readGitignore(root)).split("\n");
      // Retired lines go.
      expect(after).not.toContain("!.qfai/report/README.md");
      expect(after).not.toContain(".qfai/discussion/discussion-*/");
      // A renamed line keeps its successor — dropping it alone would remove an
      // ignore the project never gave up.
      expect(after).toContain(".qfai/discussion/*");
      // But an ignore this block simply never had is NOT added.
      expect(after).not.toContain(".qfai/evidence/*");
      expect(after).toContain("!.qfai/decisions/**");
    });
  });

  it("keeps every governance negation after the ignores it undoes", async () => {
    // Git applies the last matching pattern; a negation above its ignore is
    // inert, which is the failure `governanceNegationsEffective` exists for.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const lines = (await readGitignore(root)).split("\n");
      const evidenceIgnore = lines.indexOf(".qfai/evidence/*");
      for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
        expect(lines.indexOf(negation)).toBeGreaterThan(evidenceIgnore);
      }
    });
  });
});

describe("a legacy per-directory evidence ignore is migrated, not ignored", () => {
  it("re-includes the governance records inside the legacy file", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const legacy = path.join(root, ".qfai", "evidence", ".gitignore");
      await mkdir(path.dirname(legacy), { recursive: true });
      await writeFile(legacy, "*\n!.gitignore\n!README.md\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = (await readFile(legacy, "utf-8")).split("\n");
      for (const negation of [
        "!change-request-*.md",
        "!decision-*.md",
        "!coverage-depth-*.md",
        "!decisions/",
        "!decisions/**",
      ]) {
        expect(after).toContain(negation);
      }
      // The rest of the file is the project's; the `*` stays.
      expect(after).toContain("*");
      expect(after).toContain("!README.md");
    });
  });

  it("is idempotent and leaves a project without the legacy file alone", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const legacy = path.join(root, ".qfai", "evidence", ".gitignore");
      await mkdir(path.dirname(legacy), { recursive: true });
      await writeFile(legacy, "*\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const once = await readFile(legacy, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      expect(await readFile(legacy, "utf-8")).toBe(once);
    });
  });
});

describe("--force regenerates the standard asset trees", () => {
  it("restores an edited agent definition and manifest, not project content", async () => {
    // Without this, a correction to an agent body or to `agent-catalog.yml`
    // reached new projects only: `.qfai/**` is copied create-only and `--force`
    // covered `assistant/skills` alone.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const agent = path.join(root, ".qfai", "assistant", "agents", "qa-gatekeeper.md");
      const manifest = path.join(root, ".qfai", "assistant", "manifest", "agent-catalog.yml");
      const steering = path.join(root, ".qfai", "steering", "README.md");
      await writeFile(agent, "# stale\n", "utf-8");
      await writeFile(manifest, "stale: true\n", "utf-8");
      const projectContent = await readFile(steering, "utf-8").catch(() => null);

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(agent, "utf-8")).not.toBe("# stale\n");
      expect(await readFile(manifest, "utf-8")).not.toBe("stale: true\n");
      if (projectContent !== null) {
        expect(await readFile(steering, "utf-8")).toBe(projectContent);
      }
    });
  });

  it("leaves them alone without --force", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const agent = path.join(root, ".qfai", "assistant", "agents", "qa-gatekeeper.md");
      await writeFile(agent, "# ours\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readFile(agent, "utf-8")).toBe("# ours\n");
    });
  });
});
