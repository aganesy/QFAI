/**
 * `qfai init` builds the whole assistant surface out of symlinks, and nothing
 * ever re-checked that they survived a checkout.
 *
 * The links are committed as mode `120000`, but `configureGitSymlinks` pins
 * `core.symlinks true` into **repo-local** git config and `.git/config` is not
 * cloned. On a machine whose system or global config says `core.symlinks =
 * false` — the Windows default — a fresh clone materialises every link as a
 * small regular file whose content is the link target. The repository stays
 * correct; only the working tree does not.
 *
 * `qfai validate` never read these directories, and `qfai doctor`'s
 * `skills.integrity` / `agents.frontmatter` both read the canonical
 * `.qfai/assistant/**` tree, which is unaffected. So the assistant silently
 * loaded no skill and routed no agent, and every gate they define stopped
 * existing while work continued at full speed.
 */

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AGENT_INTEGRATION_CONFIGS, SKILL_INTEGRATION_DIRS } from "../../src/cli/commands/init.js";
import {
  INTEGRATION_SURFACE_DIRS,
  validateIntegrationSurface,
} from "../../src/core/validators/integrationSurface.js";

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-link-surface-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** The canonical tree the links point at. */
async function seedCanonical(root: string): Promise<string> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, "SKILL.md"), "# skill\n", "utf-8");
  return skillDir;
}

/**
 * Real symlinks need Developer Mode or elevation on Windows. A machine without
 * either cannot exercise the healthy case at all, and failing there would say
 * nothing about this validator — so the probe skips it explicitly rather than
 * leaving a silent hole.
 */
async function canCreateSymlink(root: string): Promise<boolean> {
  const probe = path.join(root, "probe-link");
  try {
    await symlink(".qfai", probe, "dir");
    await rm(probe, { force: true });
    return true;
  } catch {
    return false;
  }
}

describe("the integration surface is checked for links that did not survive checkout", () => {
  it("reports a flattened link — a regular file holding the link target", async () => {
    await withProject(async (root) => {
      await seedCanonical(root);
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(claudeSkills, { recursive: true });
      // Exactly what git writes when core.symlinks is false: the target path,
      // as file content.
      const flattened = "../../.qfai/assistant/skills/qfai-atdd";
      await writeFile(path.join(claudeSkills, "qfai-atdd"), flattened, "utf-8");

      const issues = await validateIntegrationSurface(root);
      const finding = issues.find((entry) => entry.code === "QFAI-LINK-001");

      expect(finding?.severity).toBe("error");
      expect(finding?.message).toContain(".claude/skills/qfai-atdd");
      expect(finding?.message).toContain(`regular file (${String(flattened.length)} bytes)`);
      expect(finding?.refs).toEqual([".claude/skills/qfai-atdd"]);
    });
  });

  it("reports a dangling symlink", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(claudeSkills, { recursive: true });
      // Canonical tree deliberately absent: the link resolves to nothing.
      await symlink(
        path.join("..", "..", ".qfai", "assistant", "skills", "qfai-atdd"),
        path.join(claudeSkills, "qfai-atdd"),
        "dir",
      );

      const issues = await validateIntegrationSurface(root);
      const finding = issues.find((entry) => entry.code === "QFAI-LINK-001");

      expect(finding?.severity).toBe("error");
      expect(finding?.message).toContain(".claude/skills/qfai-atdd");
      expect(finding?.message).toContain("->");
    });
  });

  it("says nothing about a healthy link", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root);
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(claudeSkills, { recursive: true });
      await symlink(
        path.join("..", "..", ".qfai", "assistant", "skills", "qfai-atdd"),
        path.join(claudeSkills, "qfai-atdd"),
        "dir",
      );

      expect(await validateIntegrationSurface(root)).toEqual([]);
    });
  });

  it("says nothing when the project integrates with none of the six directories", async () => {
    // Absence is a choice, not a fault.
    await withProject(async (root) => {
      await seedCanonical(root);
      expect(await validateIntegrationSurface(root)).toEqual([]);
    });
  });

  it("ignores entries qfai does not own", async () => {
    await withProject(async (root) => {
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(path.join(claudeSkills, "my-own-skill"), { recursive: true });
      await writeFile(path.join(claudeSkills, "README.md"), "# readme\n", "utf-8");

      expect(await validateIntegrationSurface(root)).toEqual([]);
    });
  });

  it("reports every broken entry, across directories, with the rest as relatedFiles", async () => {
    await withProject(async (root) => {
      for (const dir of [".claude/skills", ".agents/skills"]) {
        const absolute = path.join(root, ...dir.split("/"));
        await mkdir(absolute, { recursive: true });
        await writeFile(path.join(absolute, "qfai-atdd"), "target", "utf-8");
        await writeFile(path.join(absolute, "qfai-sdd"), "target", "utf-8");
      }
      const agents = path.join(root, ".claude", "agents");
      await mkdir(agents, { recursive: true });
      await writeFile(path.join(agents, "qa-gatekeeper.md"), "target", "utf-8");

      const finding = (await validateIntegrationSurface(root)).find(
        (entry) => entry.code === "QFAI-LINK-001",
      );

      expect(finding?.refs).toHaveLength(5);
      expect(finding?.relatedFiles).toHaveLength(4);
      expect(finding?.message).toContain("5 件");
      // The remediation must not send the operator to `--force`: `qfai init`
      // repairs a qfai-owned path on its own now.
      expect(finding?.suggested_action).toContain("`qfai init` を再実行");
      expect(finding?.suggested_action).toContain("git config --global core.symlinks true");
      expect(finding?.suggested_action).not.toContain("qfai init --force");
    });
  });
});

describe("this repository's own surface", () => {
  it("passes the check it ships", async () => {
    // Dogfooding, and the only place the rule meets a real six-directory
    // surface with non-qfai neighbours in it (`.agents/skills/pr-fix` is a real
    // directory; `.claude/agents/README.md` is a real file). A failure here on
    // a contributor's machine is not a false positive — it is the flattened
    // checkout this rule exists to name.
    const repoRoot = path.resolve(
      path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
      "..",
      "..",
      "..",
      "..",
    );
    expect(await validateIntegrationSurface(repoRoot)).toEqual([]);
  });
});

describe("the probed list stays in step with what init builds", () => {
  it("covers every directory init writes links into", () => {
    const built = [...SKILL_INTEGRATION_DIRS, ...AGENT_INTEGRATION_CONFIGS.map((c) => c.dir)];
    // A new integration target that this validator does not probe would ship
    // with exactly the blind spot the rule exists to close.
    expect([...INTEGRATION_SURFACE_DIRS].sort()).toEqual([...built].sort());
  });
});
