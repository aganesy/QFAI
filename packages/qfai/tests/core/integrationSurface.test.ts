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
 *
 * Ownership is derived from the project's canonical tree, exactly as `init`
 * derives it. A name-prefix test skipped the shipped `web-research` skill, and
 * an `endsWith('.md')` test claimed a project's own agent file.
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

/** The canonical tree the wrappers point at. */
async function seedCanonical(root: string, skills: string[], agents: string[]): Promise<void> {
  for (const id of skills) {
    const dir = path.join(root, ".qfai", "assistant", "skills", id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "SKILL.md"), "# skill\n", "utf-8");
  }
  const agentsDir = path.join(root, ".qfai", "assistant", "agents");
  await mkdir(agentsDir, { recursive: true });
  await writeFile(path.join(agentsDir, "README.md"), "# readme\n", "utf-8");
  for (const name of agents) {
    await writeFile(path.join(agentsDir, `${name}.md`), "# agent\n", "utf-8");
  }
}

/** The link `init` writes for a skill wrapper, as a relative target. */
const skillTarget = (dir: string, id: string): string =>
  path.join(...dir.split("/").map(() => ".."), ".qfai", "assistant", "skills", id);

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

const finding = async (root: string) =>
  (await validateIntegrationSurface(root)).find((entry) => entry.code === "QFAI-LINK-001");

describe("the integration surface is checked for links that did not survive checkout", () => {
  it("reports a flattened link — a regular file holding the link target", async () => {
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(claudeSkills, { recursive: true });
      // Exactly what git writes when core.symlinks is false.
      const flattened = "../../.qfai/assistant/skills/qfai-atdd";
      await writeFile(path.join(claudeSkills, "qfai-atdd"), flattened, "utf-8");

      const found = await finding(root);
      expect(found?.severity).toBe("error");
      expect(found?.message).toContain(".claude/skills/qfai-atdd");
      expect(found?.message).toContain(`regular file (${String(flattened.length)} bytes)`);
      expect(found?.refs).toEqual([".claude/skills/qfai-atdd"]);
    });
  });

  it("covers a shipped skill whose name has no qfai- prefix", async () => {
    // `web-research` is canonical and `init` wraps it like any other. A prefix
    // heuristic let it break silently.
    await withProject(async (root) => {
      await seedCanonical(root, ["web-research"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(claudeSkills, { recursive: true });
      await writeFile(
        path.join(claudeSkills, "web-research"),
        "../../.qfai/assistant/skills/web-research",
        "utf-8",
      );

      expect((await finding(root))?.refs).toEqual([".claude/skills/web-research"]);
    });
  });

  it("reports a symlink that resolves to the wrong canonical document", async () => {
    // Worse than dangling: the assistant loads real instructions, just not
    // these, and the surface looks clean.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-sdd"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(claudeSkills, { recursive: true });
      await symlink(
        skillTarget(".claude/skills", "qfai-atdd"),
        path.join(claudeSkills, "qfai-sdd"),
        "dir",
      );

      const found = await finding(root);
      expect(found?.refs).toEqual([".claude/skills/qfai-sdd"]);
      expect(found?.message).toContain("expected");
    });
  });

  it("does not claim a wrapper whose canonical entry was removed", async () => {
    // Deleting a canonical skill takes it out of the roster, so its leftover
    // wrapper is stale rather than broken — `pruneStaleQfaiWrappers` removes it
    // under `--force`. Reporting it here would make every retired skill an
    // `error` in every profile until someone re-ran init with a flag.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(claudeSkills, { recursive: true });
      await symlink(
        skillTarget(".claude/skills", "qfai-retired"),
        path.join(claudeSkills, "qfai-retired"),
        "dir",
      );

      expect(await validateIntegrationSurface(root)).toEqual([]);
    });
  });

  it("says nothing about a healthy link", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(claudeSkills, { recursive: true });
      await symlink(
        skillTarget(".claude/skills", "qfai-atdd"),
        path.join(claudeSkills, "qfai-atdd"),
        "dir",
      );

      expect(await validateIntegrationSurface(root)).toEqual([]);
    });
  });

  it("leaves a project's own agent definition alone", async () => {
    // `endsWith('.md')` turned a normal file into an error in every profile.
    await withProject(async (root) => {
      await seedCanonical(root, [], ["qa-gatekeeper"]);
      const agents = path.join(root, ".claude", "agents");
      await mkdir(agents, { recursive: true });
      await writeFile(path.join(agents, "our-own-reviewer.md"), "# ours\n", "utf-8");
      await writeFile(path.join(agents, "README.md"), "# readme\n", "utf-8");

      expect(await validateIntegrationSurface(root)).toEqual([]);
    });
  });

  it("leaves a project's own skill directory alone", async () => {
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(path.join(claudeSkills, "my-own-skill"), { recursive: true });

      expect(await validateIntegrationSurface(root)).toEqual([]);
    });
  });

  it("says nothing when a wrapper was never created", async () => {
    // An older project predates a newly shipped skill. `qfai init` creates the
    // wrapper; absence is not a link that failed to survive.
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd", "web-research"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await mkdir(claudeSkills, { recursive: true });

      expect(await validateIntegrationSurface(root)).toEqual([]);
    });
  });

  it("says nothing when the project has no canonical tree", async () => {
    await withProject(async (root) => {
      expect(await validateIntegrationSurface(root)).toEqual([]);
    });
  });

  it("reports every broken wrapper, with the rest as relatedFiles", async () => {
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd", "qfai-sdd"], ["qa-gatekeeper"]);
      for (const dir of [".claude/skills", ".agents/skills"]) {
        const absolute = path.join(root, ...dir.split("/"));
        await mkdir(absolute, { recursive: true });
        await writeFile(path.join(absolute, "qfai-atdd"), "target", "utf-8");
        await writeFile(path.join(absolute, "qfai-sdd"), "target", "utf-8");
      }
      const agents = path.join(root, ".claude", "agents");
      await mkdir(agents, { recursive: true });
      await writeFile(path.join(agents, "qa-gatekeeper.md"), "target", "utf-8");

      const found = await finding(root);
      expect(found?.refs).toHaveLength(5);
      expect(found?.relatedFiles).toHaveLength(4);
      expect(found?.message).toContain("5 件");
      // The remediation must not send the operator to `--force`: `qfai init`
      // repairs a flattened link on its own, and preserves anything else.
      expect(found?.suggested_action).toContain("`qfai init` を再実行");
      expect(found?.suggested_action).toContain("git config --global core.symlinks true");
      expect(found?.suggested_action).not.toContain("qfai init --force");
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
  it("covers every directory init writes wrappers into", () => {
    const built = [...SKILL_INTEGRATION_DIRS, ...AGENT_INTEGRATION_CONFIGS.map((c) => c.dir)];
    expect([...INTEGRATION_SURFACE_DIRS].sort()).toEqual([...built].sort());
  });

  it("uses the same agent filename suffix per directory as init", () => {
    // `.github/agents` uses `.agent.md`; probing `<name>.md` there would miss
    // every wrapper it owns.
    expect(AGENT_INTEGRATION_CONFIGS).toEqual([
      { dir: ".claude/agents", suffix: ".md" },
      { dir: ".github/agents", suffix: ".agent.md" },
    ]);
  });
});

describe("a shipped skill stays in scope when its canonical document is gone", () => {
  it("reports a dangling wrapper whose SKILL.md was deleted", async () => {
    // Intersecting the shipped roster with what the project has dropped the
    // skill out of scope exactly when its canonical document went missing —
    // the state this rule exists to report. The shipped roster already keeps a
    // retired skill out (it is not shipped), and a skill the project has not
    // taken yet is skipped by its wrapper being absent.
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);
      const wrapper = path.join(root, ".claude", "skills", "qfai-atdd");
      await mkdir(path.dirname(wrapper), { recursive: true });
      await symlink(skillTarget(".claude/skills", "qfai-atdd"), wrapper, "dir");
      // The canonical document is removed; the wrapper stays.
      await rm(path.join(root, ".qfai", "assistant", "skills", "qfai-atdd"), {
        recursive: true,
        force: true,
      });

      const issues = await validateIntegrationSurface(root);
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-001"]);
      expect(issues[0]?.message).toContain("dangling");
    });
  });
});

describe("ownership is the roster init ships, not the canonical tree", () => {
  it("ignores a project-owned skill published by hand", async () => {
    // `.qfai/assistant/skills/<own>/SKILL.md` is an allowed project-owned
    // location — `skillDocReferences` permits it — and `qfai init` enumerates
    // what to wrap from the package assets, never from the project. Treating
    // every canonical directory as qfai-owned turned a hand-published
    // `.claude/skills/my-skill` directory into a QFAI-LINK-001 in every
    // profile.
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd", "my-skill"], []);
      const mine = path.join(root, ".claude", "skills", "my-skill");
      await mkdir(mine, { recursive: true });
      await writeFile(path.join(mine, "SKILL.md"), "# mine\n", "utf-8");

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });

  it("ignores a project-owned agent published by hand", async () => {
    await withProject(async (root) => {
      await seedCanonical(root, [], ["qa-gatekeeper", "our-reviewer"]);
      const agents = path.join(root, ".claude", "agents");
      await mkdir(agents, { recursive: true });
      await writeFile(path.join(agents, "our-reviewer.md"), "# ours\n", "utf-8");

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });

  it("still reports a shipped skill whose wrapper was flattened", async () => {
    // The narrowing must not cost the rule its reason for existing.
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd", "my-skill"], []);
      const flattened = path.join(root, ".claude", "skills", "qfai-atdd");
      await mkdir(path.dirname(flattened), { recursive: true });
      await writeFile(flattened, skillTarget(".claude/skills", "qfai-atdd"), "utf-8");

      const issues = await validateIntegrationSurface(root);
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-001"]);
    });
  });
});
