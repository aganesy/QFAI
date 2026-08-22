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

import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AGENT_INTEGRATION_CONFIGS, SKILL_INTEGRATION_DIRS } from "../../src/cli/commands/init.js";
import {
  INTEGRATION_SURFACE_DIRS,
  inspectIntegrationSurface,
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

/**
 * Every wrapper `qfai init` would create, as a real symlink.
 *
 * A fixture that wired only `.claude/skills` is a project whose other five
 * integration surfaces were deleted — true of it, and not the subject of any of
 * these tests. Each one breaks a single entry after calling this.
 */
async function wireAll(root: string, skills: string[], agents: string[]): Promise<void> {
  for (const dir of SKILL_INTEGRATION_DIRS) {
    const dirAbsolute = path.join(root, ...dir.split("/"));
    await mkdir(dirAbsolute, { recursive: true });
    for (const id of skills) {
      await symlink(skillTarget(dir, id), path.join(dirAbsolute, id), "dir");
    }
  }
  for (const { dir, suffix } of AGENT_INTEGRATION_CONFIGS) {
    const dirAbsolute = path.join(root, ...dir.split("/"));
    await mkdir(dirAbsolute, { recursive: true });
    for (const name of agents) {
      await symlink(
        path.relative(dirAbsolute, path.join(root, ".qfai", "assistant", "agents", `${name}.md`)),
        path.join(dirAbsolute, `${name}${suffix}`),
        "file",
      );
    }
  }
}

/** The link `init` writes for a skill wrapper, as a relative target. */
/** A README with the signature `qfai init` writes, so it counts as a marker. */
const INIT_README_BODY = [
  "# QFAI Agents skills",
  "",
  "This directory provides Agents/Codex-compatible skill symlinks for QFAI.",
  "",
  "## Canonical entrypoint",
  "",
  "Skill symlinks point to QFAI's canonical skill documents under:",
  "",
  "- .qfai/assistant/skills/",
  "",
].join("\n");

const skillTarget = (dir: string, id: string): string =>
  path.join(...dir.split("/").map(() => ".."), ".qfai", "assistant", "skills", id);

/** The link `init` writes for an agent wrapper, as a relative target. */
const agentTarget = (dir: string, name: string): string =>
  path.join(...dir.split("/").map(() => ".."), ".qfai", "assistant", "agents", `${name}.md`);

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
      await wireAll(root, ["qfai-atdd"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await rm(path.join(claudeSkills, "qfai-atdd"), { force: true });
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
      await wireAll(root, ["web-research"], []);
      await rm(path.join(root, ".claude", "skills", "web-research"), { force: true });
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
      await wireAll(root, ["qfai-atdd", "qfai-sdd"], []);
      await rm(path.join(root, ".claude", "skills", "qfai-sdd"), { force: true });
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
      await wireAll(root, ["qfai-atdd"], []);

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
      // No `README.md` here: that is one of the markers proving `qfai init`
      // ran, and this fixture is a project that has not run it — otherwise the
      // absent `qa-gatekeeper` wrapper is a finding of its own.

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
      const skills = ["qfai-atdd", "qfai-sdd"];
      await seedCanonical(root, skills, ["qa-gatekeeper"]);
      for (const dir of SKILL_INTEGRATION_DIRS) {
        const absolute = path.join(root, ...dir.split("/"));
        await mkdir(absolute, { recursive: true });
        for (const id of skills) {
          // The flattened form git actually leaves: the file content IS the
          // link target. Arbitrary content at a wrapper path is a file the
          // project owns, and this rule no longer claims those.
          await writeFile(path.join(absolute, id), skillTarget(dir, id), "utf-8");
        }
      }
      for (const { dir, suffix } of AGENT_INTEGRATION_CONFIGS) {
        const absolute = path.join(root, ...dir.split("/"));
        await mkdir(absolute, { recursive: true });
        await writeFile(
          path.join(absolute, `qa-gatekeeper${suffix}`),
          agentTarget(dir, "qa-gatekeeper"),
          "utf-8",
        );
      }

      // Four skill directories x two skills, plus two agent directories.
      const total =
        SKILL_INTEGRATION_DIRS.length * skills.length + AGENT_INTEGRATION_CONFIGS.length;
      const found = await finding(root);
      expect(found?.refs).toHaveLength(total);
      expect(found?.relatedFiles).toHaveLength(total - 1);
      expect(found?.message).toContain(`${String(total)} 件`);
      // The remediation must not send the operator to `--force`: `qfai init`
      // repairs a flattened link on its own, and preserves anything else.
      // Scoped to the opening line, which is the remedy for the damage this
      // case reports — a later line covers the retired wrapper, where
      // `--force` is what prunes it, and that is a different remedy.
      const opening = found?.suggested_action?.split("\n")[0];
      expect(opening).toContain("`qfai init` を再実行");
      expect(opening).not.toContain("qfai init --force");
      expect(found?.suggested_action).toContain("git config --global core.symlinks true");
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

describe("a wrapper deleted from a populated surface is reported", () => {
  it("reports the one that is gone while its siblings remain", async () => {
    // Nothing else caught this: the canonical tree is untouched, so
    // `skills.integrity` sees a healthy spec — and it only runs under `full`.
    // The assistant simply cannot load that skill.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-sdd"], []);
      await wireAll(root, ["qfai-atdd", "qfai-sdd"], []);
      // `qfai-sdd` is the one somebody removed.
      await rm(path.join(root, ".claude", "skills", "qfai-sdd"), { force: true });

      const found = await finding(root);
      expect(found?.refs).toEqual([".claude/skills/qfai-sdd"]);
      expect(found?.message).toContain("missing");
    });
  });

  it("says nothing about a surface init has not populated", async () => {
    // A project that never ran `qfai init`, or has not taken a newly shipped
    // skill, is not missing anything — and must not be told it is.
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);
      await mkdir(path.join(root, ".claude", "skills"), { recursive: true });

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });
});

describe("a skill wrapper is only good if it can be loaded", () => {
  it("reports a wrapper whose directory has lost its SKILL.md", async () => {
    // The link resolves — `references/` and `templates/` are still there — so
    // this rule saw nothing, and `skills.integrity`, which would, runs under
    // `full` alone. A narrow profile passed a skill the assistant cannot load.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      // The skill keeps its other files; only the entry point goes.
      await mkdir(path.join(root, ".qfai", "assistant", "skills", "qfai-atdd", "references"), {
        recursive: true,
      });
      await rm(path.join(root, ".qfai", "assistant", "skills", "qfai-atdd", "SKILL.md"), {
        force: true,
      });

      // One canonical deletion breaks the wrapper in every skill directory,
      // which is what it does — each of them now points at a directory the
      // assistant cannot load.
      const found = await finding(root);
      expect(found?.refs).toEqual(SKILL_INTEGRATION_DIRS.map((dir) => `${dir}/qfai-atdd`));
      expect(found?.message).toContain("no SKILL.md");
    });
  });
});

describe("a whole integration surface can go missing", () => {
  it("reports the directory once, not every wrapper it held", async () => {
    // `populated` was per directory, so a directory deleted whole had every one
    // of its entries read as "not created yet" and every profile passed while
    // the assistant could load nothing from it. Reported once: one `rm -r` is
    // one act, and one ref per shipped skill buries that.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-sdd"], []);
      await wireAll(root, ["qfai-atdd", "qfai-sdd"], []);
      await rm(path.join(root, ".claude", "skills"), { recursive: true, force: true });

      const found = await finding(root);
      expect(found?.refs).toEqual([".claude/skills"]);
      expect(found?.message).toContain("integration surface missing");
    });
  });

  it("says nothing when init has never run", async () => {
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });
});

describe("a wrapper has to resolve to the right kind of thing", () => {
  it("reports an agent wrapper whose canonical document became a directory", async () => {
    // The link string is still correct, so `lstat`, `readlink` and `stat` all
    // succeed. The agent surface has no other check outside `prototyping` /
    // `full`, so the narrow profiles passed an agent tree with no markdown in
    // it at all.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, [], ["qa-gatekeeper"]);
      const canonical = path.join(root, ".qfai", "assistant", "agents", "qa-gatekeeper.md");
      await rm(canonical, { force: true });
      await mkdir(canonical, { recursive: true });
      // Wired after the swap, and as a directory link, so the link resolves on
      // Windows too — the point is what it resolves *to*, not the link type.
      for (const { dir, suffix } of AGENT_INTEGRATION_CONFIGS) {
        const dirAbsolute = path.join(root, ...dir.split("/"));
        await mkdir(dirAbsolute, { recursive: true });
        await symlink(
          path.relative(dirAbsolute, canonical),
          path.join(dirAbsolute, `qa-gatekeeper${suffix}`),
          "dir",
        );
      }
      for (const dir of SKILL_INTEGRATION_DIRS) {
        await mkdir(path.join(root, ...dir.split("/")), { recursive: true });
      }

      const found = await finding(root);
      expect(found?.message).toContain("resolves to a directory");
    });
  });
});

describe("an initialised project is recognised without any wrapper left", () => {
  it("reports the surfaces when every symlink has been deleted", async () => {
    // `initialised` was "some wrapper survives", so deleting all of them said
    // the project was never initialised and nothing was checked — the state
    // where the assistant can load nothing passed every profile most
    // confidently. `qfai init` writes READMEs it never removes.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      await writeFile(path.join(root, ".agents", "README.md"), INIT_README_BODY, "utf-8");
      for (const dir of INTEGRATION_SURFACE_DIRS) {
        await rm(path.join(root, ...dir.split("/")), { recursive: true, force: true });
      }
      // The marker `qfai init` left behind is all that remains.
      await mkdir(path.join(root, ".agents"), { recursive: true });
      await writeFile(path.join(root, ".agents", "README.md"), INIT_README_BODY, "utf-8");

      const found = await finding(root);
      expect(found?.message).toContain("integration surface missing");
    });
  });

  it("reads past a marker path that is not a regular file", async () => {
    // These paths are create-only, so whatever the project had at one of them
    // survives. A directory made `readFile` throw `EISDIR`, which rejected the
    // whole `Promise.all` and lost the finding the valid marker beside it
    // would have produced.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      for (const dir of INTEGRATION_SURFACE_DIRS) {
        await rm(path.join(root, ...dir.split("/")), { recursive: true, force: true });
      }
      // One marker path is the project's own directory; another is init's.
      await mkdir(path.join(root, ".agents", "README.md"), { recursive: true });
      await mkdir(path.join(root, ".codex"), { recursive: true });
      await writeFile(path.join(root, ".codex", "README.md"), INIT_README_BODY, "utf-8");

      const found = await finding(root);
      expect(found?.message).toContain("integration surface missing");
    });
  });

  it("still says nothing when init has left no marker either", async () => {
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });
});

describe("a canonical SKILL.md has to be a file", () => {
  it("reports one replaced by a directory of the same name", async () => {
    // `access` succeeds on a directory too, and the assistant can load that no
    // better than a missing file — while the profiles that would notice are
    // `prototyping` and `full` alone.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const doc = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd", "SKILL.md");
      await rm(doc, { force: true });
      await mkdir(doc, { recursive: true });

      const found = await finding(root);
      expect(found?.message).toContain("its SKILL.md is a directory");
    });
  });
});

describe("the init marker has to be QFAI's own", () => {
  it("ignores a project's own README at one of those paths", async () => {
    // `.agents/` and `.github/agents/` are conventional directories, and a
    // README in one is not evidence init ran. Taking mere existence as the
    // marker failed every profile of a project that never installed QFAI.
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);
      await mkdir(path.join(root, ".agents"), { recursive: true });
      await writeFile(path.join(root, ".agents", "README.md"), "# our agents\n", "utf-8");

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });
});

describe("a project's own entry is not proof init ran", () => {
  it("says nothing about a directory a project made for itself", async () => {
    // These directories are conventional and a shipped skill id can be a name
    // a project chose. Counting "an entry exists at a wrapper path" made a
    // project that never ran `qfai init` read as initialised, and every other
    // integration directory was then reported missing.
    await withProject(async (root) => {
      await seedCanonical(root, ["web-research"], []);
      // Their own skill, at a path a shipped wrapper would occupy, and their
      // own README beside it — with none of init's signature in either.
      const own = path.join(root, ".agents", "skills", "web-research");
      await mkdir(own, { recursive: true });
      await writeFile(path.join(own, "notes.md"), "# ours\n", "utf-8");
      await writeFile(path.join(root, ".agents", "README.md"), "# our agents\n", "utf-8");

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });

  it("does not accept a redundant spelling of the target as init's own", async () => {
    // `path.normalize` accepted `../../.qfai/assistant/./skills/<id>` — not
    // what git writes, but what a project's own note at that path might say —
    // so a checkout that never ran init read as initialised.
    await withProject(async (root) => {
      await seedCanonical(root, ["web-research"], []);
      const dir = path.join(root, ".agents", "skills");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "web-research"),
        "../../.qfai/assistant/./skills/web-research",
        "utf-8",
      );

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });

  it("does not accept a lone mention of the canonical tree as a marker", async () => {
    // A project documenting where it keeps its own QFAI tree writes that
    // sentence, and `includes(".qfai/assistant/")` alone made one of those a
    // marker — so a checkout that never ran init was told all six surfaces
    // were missing. The title and the section are part of the signature.
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);
      await mkdir(path.join(root, ".agents"), { recursive: true });
      await writeFile(
        path.join(root, ".agents", "README.md"),
        [
          "# Our agent notes",
          "",
          "Our QFAI lives under .qfai/assistant/ — do not edit by hand.",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });

  it("does not accept a symlinked README as a marker init wrote", async () => {
    // `stat` followed the link, so a project's own `.agents/README.md` pointing
    // at another file that happens to mention `.qfai/assistant/` read as
    // init's — and a checkout that never ran init was told all six surfaces
    // were missing. Init writes these as plain files.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await mkdir(path.join(root, "docs"), { recursive: true });
      await writeFile(path.join(root, "docs", "agents.md"), INIT_README_BODY, "utf-8");
      await mkdir(path.join(root, ".agents"), { recursive: true });
      await symlink(
        path.join("..", "docs", "agents.md"),
        path.join(root, ".agents", "README.md"),
        "file",
      );

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });
});

describe("a type collision is reported wherever it sits on the path", () => {
  it("reports an integration directory replaced by a regular file", async () => {
    // `lstat` on every wrapper under it raises `ENOTDIR`, and propagating that
    // ended the run for every profile with no finding and no remedy.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      await rm(path.join(root, ".claude", "skills"), { recursive: true, force: true });
      await writeFile(path.join(root, ".claude", "skills"), "not a directory\n", "utf-8");

      const found = await finding(root);
      expect(found?.message).toContain("the integration directory is a file");
      expect(found?.suggested_action).toContain("integration directory 自体が壊れている場合");
    });
  });

  it("reports a canonical ancestor replaced by a regular file", async () => {
    // The wrapper's target string is right, so the failure surfaces on `stat`.
    // The errno differs by platform — POSIX raises `ENOTDIR`, Windows folds it
    // into `ENOENT` — and only `ENOENT` and `ELOOP` were findings, so on POSIX
    // this ended the run. Both report now, and with the same words: the
    // ancestor is found by walking the components, so what is said no longer
    // depends on which errno the platform chose.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const skillsDir = path.join(root, ".qfai", "assistant", "skills");
      await rm(skillsDir, { recursive: true, force: true });
      await writeFile(skillsDir, "not a directory\n", "utf-8");

      const found = await finding(root);
      expect(found?.refs).toContain(".claude/skills/qfai-atdd");
      expect(found?.message).toContain("a canonical ancestor is a file, not a directory");
      // And it names which one, rather than leaving the operator to find it.
      expect(found?.message).toContain(".qfai/assistant/skills");
    });
  });

  it("names the canonical collision when the wrapper is gone too", async () => {
    // With no wrapper there is no resolved target to reach the kind check, so
    // a canonical skill directory replaced by a file read as a plain missing
    // wrapper — and `qfai init` cannot recreate the wrapper while the
    // collision stands.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-verify"], []);
      await wireAll(root, ["qfai-atdd", "qfai-verify"], []);
      // `qfai-verify` keeps its wrappers, so init is still proven.
      for (const dir of SKILL_INTEGRATION_DIRS) {
        await rm(path.join(root, ...dir.split("/"), "qfai-atdd"), { recursive: true, force: true });
      }
      const canonical = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      await rm(canonical, { recursive: true, force: true });
      await writeFile(canonical, "# not a directory\n", "utf-8");

      const found = await finding(root);
      expect(found?.message).toContain("canonical skill is a file, not a directory");
      expect(found?.message).not.toContain("and so does the document it wraps");
    });
  });
});

describe("an integration directory that is a symlink is not a directory", () => {
  it("reports an empty external surface instead of passing it", async () => {
    // The wrappers under it carry relative targets, so they resolve against
    // wherever it physically is. Empty, there are no wrappers to reach the
    // realpath check — it read as healthy while `qfai init` filled the
    // external location and the link resolved outside the project.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const outside = path.join(root, "elsewhere");
      await mkdir(outside, { recursive: true });
      const claudeSkills = path.join(root, ".claude", "skills");
      await rm(claudeSkills, { recursive: true, force: true });
      await symlink(outside, claudeSkills, "dir");

      const found = await finding(root);
      expect(found?.message).toContain("the integration directory is a symlink");
    });
  });
});

describe("an ancestor of the surface can be the symlink", () => {
  it("names the ancestor instead of reporting the wrappers it breaks", async () => {
    // `.claude` pointing at an external tree leaves `.claude/skills` a plain
    // directory, so the probe on the directory itself says nothing while every
    // relative wrapper under it resolves against the external location.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const outside = path.join(root, "elsewhere");
      await mkdir(path.join(outside, ".claude", "skills"), { recursive: true });
      await rm(path.join(root, ".claude"), { recursive: true, force: true });
      await symlink(path.join(outside, ".claude"), path.join(root, ".claude"), "dir");

      const found = await finding(root);
      expect(found?.message).toContain("an ancestor is a symlink");
      expect(found?.suggested_action).toContain("integration directory の祖先が symlink");
    });
  });
});

describe("a wrapper replaced by something other than a file", () => {
  it("names the kind it found and gives a remedy that applies", async () => {
    // A FIFO, socket or device is neither a directory nor a regular file, and
    // calling one "regular file" sent the operator to advice about inspecting
    // content first — which does not apply, and on a FIFO blocks.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const wrapper = path.join(root, ".claude", "skills", "qfai-atdd");
      await rm(wrapper, { recursive: true, force: true });
      await mkdir(wrapper, { recursive: true });

      const found = await finding(root);
      expect(found?.message).toContain("directory, not a symlink");
      expect(found?.suggested_action).toContain("wrapper が symlink 以外");
      expect(found?.suggested_action).toContain("--force");
    });
  });
});

describe("an integration directory can be a cycle rather than a directory", () => {
  it("reports it once instead of ending the run with ELOOP", async () => {
    // `lstat` on every wrapper under it raises `ELOOP` — the final component is
    // not followed, but the path to it is — and propagating that ended
    // `qfai validate` with a stack trace instead of a finding.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await rm(claudeSkills, { recursive: true, force: true });
      // `.claude/skills` -> `.claude/loop` -> `.claude/skills`.
      await symlink(path.join(root, ".claude", "loop"), claudeSkills, "dir");
      await symlink(claudeSkills, path.join(root, ".claude", "loop"), "dir");

      const found = await finding(root);
      expect(found?.message).toContain("the integration directory is a symlink cycle");
      // Once for the directory, not once per wrapper under it.
      expect(found?.message.match(/the integration directory is a symlink cycle/g)).toHaveLength(1);
    });
  });
});

describe("a canonical document can be broken rather than absent", () => {
  it("reports a canonical replaced by a dangling symlink", async () => {
    // `access` follows the link, so this answered "absent" and the skill left
    // the check altogether — no wrapper reported for it in any profile, while
    // nothing else reads the canonical tree outside `full`.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      // Init ran (the wrappers prove it), then this skill's wrappers went and
      // its canonical was replaced by a link to nothing.
      for (const dir of SKILL_INTEGRATION_DIRS) {
        await rm(path.join(root, ...dir.split("/"), "qfai-atdd"), { recursive: true, force: true });
      }
      const canonical = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      await rm(canonical, { recursive: true, force: true });
      await symlink(path.join(root, ".qfai", "assistant", "skills", "gone"), canonical, "dir");
      // One wrapper of another shipped skill survives, so init is still proven.
      await seedCanonical(root, ["qfai-verify"], []);
      await wireAll(root, ["qfai-verify"], []);

      const found = await finding(root);
      expect(found?.message).toContain("canonical document is a dangling symlink");
      // Once for the document, not once for each of the four wrappers.
      expect(found?.message.match(/canonical document is a dangling symlink/g)).toHaveLength(1);
    });
  });
});

describe("a wrapper can spell the right target and land somewhere else", () => {
  it("reports a link that resolves outside the project canonical", async () => {
    // The target is relative, so it resolves against the wrapper directory's
    // physical location — and that directory can itself be a symlink. An
    // outside tree with a canonical-shaped path at the same relative offset
    // passes the string comparison, the `stat`, the kind check and the
    // readability check, and the assistant loads instructions that are not
    // this project's.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);

      // A complete decoy: `<outside>/.qfai/assistant/skills/qfai-atdd/SKILL.md`
      // sits at exactly the offset `../../.qfai/assistant/skills/qfai-atdd`
      // names, counted from `<outside>/.claude/skills`.
      const outside = path.join(root, "..", `${path.basename(root)}-outside`);
      const decoy = path.join(outside, ".qfai", "assistant", "skills", "qfai-atdd");
      await mkdir(decoy, { recursive: true });
      await writeFile(path.join(decoy, "SKILL.md"), "# not ours\n", "utf-8");
      const claudeSkills = path.join(outside, ".claude", "skills");
      await mkdir(claudeSkills, { recursive: true });
      await symlink(
        skillTarget(".claude/skills", "qfai-atdd"),
        path.join(claudeSkills, "qfai-atdd"),
        "dir",
      );

      try {
        // Swap the *parent* for a link to the decoy tree: `.claude/skills`
        // stays a real directory, so the surface probe has nothing to say and
        // only the resolved-path comparison can catch this.
        await rm(path.join(root, ".claude"), { recursive: true, force: true });
        await symlink(path.join(outside, ".claude"), path.join(root, ".claude"), "dir");

        // The surface probe reaches it first now, and names the component at
        // fault rather than the consequence — which is the more useful of the
        // two. The resolved-path comparison stays as the backstop for a
        // wrapper that lands elsewhere with every component looking sound.
        const found = await finding(root);
        expect(found?.message).toContain("an ancestor is a symlink");
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });
  });
});

describe("every finding this rule reports has a remedy that changes something", () => {
  it("tells the operator how to clear an unreadable document", async () => {
    // `qfai init` skips both the wrapper (its target string is right) and the
    // canonical asset (create-only), so following the generic remedy changes
    // nothing and this new check would stop every profile with no way out.
    // Asserted from any finding: `suggested_action` is one text for the rule,
    // and chmod does not gate reads on Windows so the case itself cannot run
    // there.
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await rm(path.join(claudeSkills, "qfai-atdd"), { recursive: true, force: true });
      await writeFile(
        path.join(claudeSkills, "qfai-atdd"),
        skillTarget(".claude/skills", "qfai-atdd"),
        "utf-8",
      );

      const found = await finding(root);
      expect(found?.suggested_action).toContain("`unreadable` は権限の問題");
      expect(found?.suggested_action).toContain("chmod u+r");
      expect(found?.suggested_action).toContain("icacls");
    });
  });
});

describe("the canonical itself has to be in the project", () => {
  it("reports a canonical that is a symlink to an outside document", async () => {
    // Both sides of the resolved-path comparison follow it to the same
    // external path, so they agree — while the assistant loads instructions
    // this project does not own. `skills.integrity` would say so, but it runs
    // under `full` alone.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, [], ["qa-gatekeeper"]);
      await wireAll(root, [], ["qa-gatekeeper"]);
      const outside = path.join(root, "..", `${path.basename(root)}-theirs`);
      await mkdir(outside, { recursive: true });
      await writeFile(path.join(outside, "qa-gatekeeper.md"), "# theirs\n", "utf-8");
      const canonical = path.join(root, ".qfai", "assistant", "agents", "qa-gatekeeper.md");
      try {
        await rm(canonical, { force: true });
        await symlink(path.join(outside, "qa-gatekeeper.md"), canonical, "file");

        const found = await finding(root);
        // The symlink rule reaches it first and says both things: init writes
        // the canonical as a real file, and this one leaves the project.
        expect(found?.message).toContain("canonical document is a symlink out of the project");
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });
  });
});

describe("an ancestor that is not a directory is named directly", () => {
  it("reports .claude itself when it is a regular file", async () => {
    // `symlinkAncestor` only answered for links, so a regular file there was
    // reported through the unreachable child — and the remedy named a path
    // `ENOTDIR` keeps the operator out of.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      await writeFile(path.join(root, ".agents", "README.md"), INIT_README_BODY, "utf-8");
      await rm(path.join(root, ".claude"), { recursive: true, force: true });
      await writeFile(path.join(root, ".claude"), "not a directory", "utf-8");

      const found = await finding(root);
      expect(found?.message).toContain("an ancestor is a file, not a directory: .claude");
    });
  });
});

describe("what init wrote is still checked after the roster moves on", () => {
  it("reports a wrapper for a skill this version no longer ships", async () => {
    // Wrappers are enumerated from the current roster, so one left by a skill
    // since removed or renamed is enumerated by nobody — it still resolves, and
    // the assistant goes on loading retired instructions while every profile
    // reports a clean surface. `pruneStaleQfaiWrappers` matches a `qfai-`
    // prefix, and `web-research` shows a shipped name need not have one.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const retiredCanonical = path.join(root, ".qfai", "assistant", "skills", "legacy-research");
      await mkdir(retiredCanonical, { recursive: true });
      await writeFile(path.join(retiredCanonical, "SKILL.md"), "# retired\n", "utf-8");
      const claudeSkills = path.join(root, ".claude", "skills");
      await symlink(
        skillTarget(".claude/skills", "legacy-research"),
        path.join(claudeSkills, "legacy-research"),
        "dir",
      );

      const found = await finding(root);
      expect(found?.refs).toContain(".claude/skills/legacy-research");
      expect(found?.message).toContain("which this version does not ship");
      // The remedy names the command that repairs it, and says where the
      // repair stops — twice over: `--force` prunes the wrapper and never the
      // canonical document behind it, and on the skill side it reaches only
      // the `qfai-` prefixed names. `legacy-research` is this very case, so a
      // remedy that promised `--force` would clear it would be wrong here.
      expect(found?.suggested_action).toContain("`qfai init --force`");
      expect(found?.suggested_action).toContain("canonical 側");
      expect(found?.suggested_action).toContain("`qfai-` で始まる skill wrapper");
      expect(found?.suggested_action).toContain("prune 対象外なので、報告されたパスを手で削除");
      // The agent half of that promise stops at a direct child of
      // `.qfai/assistant/agents/`: this rule reports anything landing under
      // `.qfai/assistant/`, so a nested or cross-kind agent target is reported
      // and never pruned, and the remedy must not send the operator to
      // `--force` for one.
      expect(found?.suggested_action).toContain(
        "解決先が `.qfai/assistant/agents/` の直下にある agent wrapper",
      );
      expect(found?.suggested_action).toContain("`.qfai/assistant/agents/<sub>/…`");
    });
  });

  // POSIX only, and not as root: `chmod` is what makes the directory
  // searchable but not listable, and root ignores it.
  it.skipIf(process.platform === "win32" || process.geteuid?.() === 0)(
    "propagates a listing error instead of passing with nothing examined",
    async () => {
      // An execute-only directory answers every `lstat` on a known wrapper and
      // refuses the listing, so swallowing the error passed validation with no
      // retired wrapper examined at all — while the assistant went on loading
      // them.
      await withProject(async (root) => {
        if (!(await canCreateSymlink(root))) return;
        await seedCanonical(root, ["qfai-atdd"], []);
        await wireAll(root, ["qfai-atdd"], []);
        const claudeSkills = path.join(root, ".claude", "skills");
        await chmod(claudeSkills, 0o111);
        try {
          await expect(validateIntegrationSurface(root)).rejects.toThrow();
        } finally {
          await chmod(claudeSkills, 0o755);
        }
      });
    },
  );

  // POSIX only, and not as root: an entry-level ACL is what makes the listing
  // succeed and this one read fail.
  it.skipIf(process.platform === "win32" || process.geteuid?.() === 0)(
    "propagates a per-entry read error rather than calling it not-a-wrapper",
    async () => {
      // Answering `null` on a transient `EIO`, or an ACL on this one entry,
      // left a retired wrapper the assistant still loads unexamined — the same
      // hole the listing error had one level up.
      await withProject(async (root) => {
        if (!(await canCreateSymlink(root))) return;
        await seedCanonical(root, ["qfai-atdd"], []);
        await wireAll(root, ["qfai-atdd"], []);
        const unreadable = path.join(root, ".claude", "skills", "legacy-research");
        await writeFile(unreadable, "../../.qfai/assistant/skills/legacy-research", "utf-8");
        await chmod(unreadable, 0o000);
        try {
          await expect(validateIntegrationSurface(root)).rejects.toThrow();
        } finally {
          await chmod(unreadable, 0o644);
        }
      });
    },
  );

  it("declines a retired-wrapper candidate that runs past the ceiling", async () => {
    // A canonical-shaped target followed by content of its own is not a
    // wrapper. The read is bounded to `maxBytes + 1` and confirms EOF, so the
    // answer does not depend on the size measured a moment earlier — an append
    // through an fd held from before the `fstat` would otherwise have left a
    // matching prefix, and the finding tells the operator to delete the file.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      await writeFile(
        path.join(root, ".claude", "skills", "legacy-research"),
        `../../.qfai/assistant/skills/legacy-research${"x".repeat(8192)}`,
        "utf-8",
      );

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });

  it("says nothing about a one-line file that is not byte-exactly a target", async () => {
    // Git writes the target for mode `120000` with no trailing newline, so
    // trimming one off made a project's own note indistinguishable from a
    // wrapper — and the finding told the operator to delete it.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      await writeFile(
        path.join(root, ".claude", "skills", "note.txt"),
        "../../.qfai/assistant/skills/legacy-research\n",
        "utf-8",
      );

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });

  it("does not enumerate an integration directory already reported as damaged", async () => {
    // A resolvable redirect makes `readdir` list somebody else s tree, and the
    // remedy printed for a retired wrapper is "delete the path" — which through
    // that redirect deletes a file outside the project.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const outside = path.join(root, "outside");
      await mkdir(outside, { recursive: true });
      await writeFile(
        path.join(outside, "legacy-research"),
        "../../.qfai/assistant/skills/legacy-research",
        "utf-8",
      );
      const claudeSkills = path.join(root, ".claude", "skills");
      await rm(claudeSkills, { recursive: true, force: true });
      await symlink(outside, claudeSkills, "dir");

      const found = await finding(root);
      // The directory itself is reported; what is inside the redirect is not.
      expect(found?.message).toContain(".claude/skills");
      expect(found?.message).not.toContain("legacy-research");
    });
  });

  it("says nothing about a repair sidecar, which is not a wrapper", async () => {
    // It holds the flattened target, so it reads as one — and it exists because
    // a repair could not finish, which sometimes makes it the only surviving
    // copy of the original. The remedy printed for a retired wrapper is "delete
    // the path", so reporting it told the operator to destroy it.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      await writeFile(
        path.join(root, ".claude", "skills", "qfai-atdd.qfai-repair-4321"),
        "../../.qfai/assistant/skills/qfai-atdd",
        "utf-8",
      );

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });

  it("says nothing about an entry that points outside the canonical tree", async () => {
    // These directories are conventional, and a project's own link in one of
    // them is not qfai's to report.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const mine = path.join(root, "my-own-skill");
      await mkdir(mine, { recursive: true });
      await symlink(
        path.relative(path.join(root, ".claude", "skills"), mine),
        path.join(root, ".claude", "skills", "my-own-skill"),
        "dir",
      );

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });

  it("recognises init by the marker inside the tree it owns", async () => {
    // The four conventional READMEs are written only when the path is free, so
    // a project that already had its own at all four ran init and got no
    // marker — and deleting every wrapper then read as never initialised:
    // nothing checked, every profile passing, the assistant loading nothing.
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);
      await writeFile(
        path.join(root, ".qfai", "assistant", "README.md"),
        INIT_README_BODY,
        "utf-8",
      );
      for (const dir of INTEGRATION_SURFACE_DIRS) {
        await mkdir(path.join(root, ...dir.split("/")), { recursive: true });
      }

      const found = await finding(root);
      expect(found?.message).toContain("missing");
    });
  });
});

describe("a link that does not resolve still says why", () => {
  it("names the ancestor symlink when the canonical is not there yet", async () => {
    // Point `.qfai/assistant/skills` at an existing empty directory and every
    // wrapper under it is `ENOENT` — reported as plain `dangling` and skipped
    // before anything looked at the ancestor. The remedy printed for a dangling
    // link is "re-run `qfai init`", which writes the canonical *inside* the
    // redirect and leaves the correct wrapper target alone: the finding clears
    // and the redirect stays.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const skillsDir = path.join(root, ".qfai", "assistant", "skills");
      const elsewhere = path.join(root, "elsewhere");
      await mkdir(elsewhere, { recursive: true });
      await rm(skillsDir, { recursive: true, force: true });
      await symlink(elsewhere, skillsDir, "dir");

      const entry = await finding(root);
      expect(entry?.message).toContain("a canonical ancestor is a symlink");
      expect(entry?.message).not.toContain("dangling ->");
    });
  });
});

describe("a resolving link is a finding, not a reason to stop", () => {
  it("does not report structural damage for a canonical that resolves", async () => {
    // A `readdir` over it succeeds, so short-circuiting the profile hid every
    // unrelated spec, contract and test defect until the link was repaired.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-verify"], []);
      await wireAll(root, ["qfai-atdd", "qfai-verify"], []);
      const canonical = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      await rm(canonical, { recursive: true, force: true });
      await symlink(
        path.join(root, ".qfai", "assistant", "skills", "qfai-verify"),
        canonical,
        "dir",
      );

      const report = await inspectIntegrationSurface(root);
      expect(report.issues.map((entry) => entry.code)).toContain("QFAI-LINK-001");
      expect(report.unwalkable).toEqual([]);
    });
  });

  it("reports the canonical when the wrapper points somewhere else", async () => {
    // `qfai init` re-points the wrapper and leaves the canonical as it found
    // it, so reporting only the mismatch had the operator clear this finding
    // and need a second run to learn the rest.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-verify"], []);
      await wireAll(root, ["qfai-atdd", "qfai-verify"], []);
      for (const dir of SKILL_INTEGRATION_DIRS) {
        const wrapper = path.join(root, ...dir.split("/"), "qfai-atdd");
        await rm(wrapper, { recursive: true, force: true });
        await symlink(skillTarget(dir, "qfai-verify"), wrapper, "dir");
      }
      const canonical = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      await rm(canonical, { recursive: true, force: true });
      await writeFile(canonical, "# not a directory\n", "utf-8");

      const found = await finding(root);
      expect(found?.refs).toContain(".qfai/assistant/skills/qfai-atdd");
      expect(found?.message).toContain("canonical skill is a file, not a directory");
    });
  });

  // POSIX only: this is the `ENOTDIR` shape, which Windows folds into `ENOENT`.
  it.skipIf(process.platform === "win32")(
    "carries the short-circuit out of the flattened-wrapper branch",
    async () => {
      // The branch detected the non-directory ancestor and reported it, but did
      // not record it as unwalkable — so `sdd` / `full` walked on into the same
      // `ENOTDIR` and rejected the run along with the finding.
      await withProject(async (root) => {
        if (!(await canCreateSymlink(root))) return;
        await seedCanonical(root, ["qfai-atdd"], []);
        await wireAll(root, ["qfai-atdd"], []);
        for (const dir of SKILL_INTEGRATION_DIRS) {
          const wrapper = path.join(root, ...dir.split("/"), "qfai-atdd");
          await rm(wrapper, { recursive: true, force: true });
          await writeFile(wrapper, skillTarget(dir, "qfai-atdd"), "utf-8");
        }
        const skillsDir = path.join(root, ".qfai", "assistant", "skills");
        await rm(skillsDir, { recursive: true, force: true });
        await writeFile(skillsDir, "not a directory\n", "utf-8");

        const report = await inspectIntegrationSurface(root);
        expect(report.unwalkable).toContain(".qfai/assistant/skills");
      });
    },
  );

  it("reports a canonical type collision when every wrapper was flattened", async () => {
    // A link is only one of the two ways a canonical goes wrong. A skill
    // directory replaced by a regular file is a type collision that the link
    // check says nothing about — and the create-only copy `qfai init` performs
    // fails on it, so the operator was sent to re-run a command that cannot
    // succeed, with the path at fault never named.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      for (const dir of SKILL_INTEGRATION_DIRS) {
        const wrapper = path.join(root, ...dir.split("/"), "qfai-atdd");
        await rm(wrapper, { recursive: true, force: true });
        await writeFile(wrapper, skillTarget(dir, "qfai-atdd"), "utf-8");
      }
      const canonical = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      await rm(canonical, { recursive: true, force: true });
      await writeFile(canonical, "# not a directory\n", "utf-8");

      const found = await finding(root);
      expect(found?.refs).toContain(".qfai/assistant/skills/qfai-atdd");
      expect(found?.message).toContain("canonical skill is a file, not a directory");
    });
  });

  // POSIX only: this is the `ENOTDIR` shape, which Windows folds into `ENOENT`.
  it.skipIf(process.platform === "win32")(
    "names the non-directory ancestor, not each unreachable leaf",
    async () => {
      // `not-a-directory` on the leaf means a component above it is a regular
      // file: the leaf is unreachable, not damaged. Naming it recorded one
      // finding per skill and per agent, each pointing at a path the operator
      // cannot even move aside — `ENOTDIR` again — while the one path at fault
      // went unnamed.
      await withProject(async (root) => {
        if (!(await canCreateSymlink(root))) return;
        await seedCanonical(root, ["qfai-atdd"], []);
        const assistant = path.join(root, ".qfai", "assistant");
        await rm(assistant, { recursive: true, force: true });
        await writeFile(assistant, "not a directory\n", "utf-8");
        for (const dir of INTEGRATION_SURFACE_DIRS) {
          await mkdir(path.join(root, ...dir.split("/")), { recursive: true });
        }
        await writeFile(path.join(root, ".agents", "README.md"), INIT_README_BODY, "utf-8");

        const report = await inspectIntegrationSurface(root);
        expect(report.unwalkable).toEqual([".qfai/assistant"]);
        expect(report.issues[0]?.refs).toEqual([".qfai/assistant"]);
      });
    },
  );

  it("reports a resolving canonical ancestor with every wrapper gone", async () => {
    // The leaves are absent, so the broken-ancestor probe finds nothing — and
    // the integration directories exist, so no missing-directory finding either.
    // A surface where no skill can load passed clean.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      const elsewhere = path.join(root, "elsewhere");
      await mkdir(elsewhere, { recursive: true });
      const skillsDir = path.join(root, ".qfai", "assistant", "skills");
      await rm(skillsDir, { recursive: true, force: true });
      await symlink(elsewhere, skillsDir, "dir");
      for (const dir of INTEGRATION_SURFACE_DIRS) {
        await mkdir(path.join(root, ...dir.split("/")), { recursive: true });
      }
      await writeFile(path.join(root, ".agents", "README.md"), INIT_README_BODY, "utf-8");

      const found = await finding(root);
      expect(found?.message).toContain("a canonical ancestor is a symlink");
    });
  });

  // POSIX only, and not as root: an ACL is what makes the document unreadable.
  it.skipIf(process.platform === "win32" || process.geteuid?.() === 0)(
    "stops the profile for an unreadable canonical with every wrapper gone",
    async () => {
      // The absent-wrapper branch checked link and type only, so `sdd` / `full`
      // went on to read the same document and ended the run on its own error.
      await withProject(async (root) => {
        if (!(await canCreateSymlink(root))) return;
        await seedCanonical(root, ["qfai-atdd"], []);
        for (const dir of INTEGRATION_SURFACE_DIRS) {
          await mkdir(path.join(root, ...dir.split("/")), { recursive: true });
        }
        await writeFile(path.join(root, ".agents", "README.md"), INIT_README_BODY, "utf-8");
        const doc = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd", "SKILL.md");
        await chmod(doc, 0o000);
        try {
          const report = await inspectIntegrationSurface(root);
          expect(report.unwalkable).toContain(".qfai/assistant/skills/qfai-atdd");
        } finally {
          await chmod(doc, 0o644);
        }
      });
    },
  );

  it("stops the profile for a SKILL.md that is not a regular file", async () => {
    // `validateSkillDocReferences` and `validateAutopilotPolicy` read this
    // pathname directly: a directory gives them `EISDIR`, taking the finding
    // down with the run.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const doc = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd", "SKILL.md");
      await rm(doc, { force: true });
      await mkdir(doc, { recursive: true });

      const report = await inspectIntegrationSurface(root);
      expect(report.unwalkable).toContain(".qfai/assistant/skills/qfai-atdd");
    });
  });

  it("does not stop the profile for a directory that merely has no SKILL.md", async () => {
    // Absence every validator handles; stopping on it would hide the rest.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      await rm(path.join(root, ".qfai", "assistant", "skills", "qfai-atdd", "SKILL.md"), {
        force: true,
      });

      const report = await inspectIntegrationSurface(root);
      expect(report.issues.map((entry) => entry.code)).toContain("QFAI-LINK-001");
      expect(report.unwalkable).toEqual([]);
    });
  });

  it("stops the profile for a SKILL.md symlink cycle behind a broken wrapper", async () => {
    // The parent directory is healthy, so the short-circuit computed from its
    // state was undefined — while the later readers open the same `SKILL.md`
    // and get `ELOOP`.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      for (const dir of SKILL_INTEGRATION_DIRS) {
        const wrapper = path.join(root, ...dir.split("/"), "qfai-atdd");
        await rm(wrapper, { recursive: true, force: true });
        await writeFile(wrapper, skillTarget(dir, "qfai-atdd"), "utf-8");
      }
      const canonicalDir = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      const doc = path.join(canonicalDir, "SKILL.md");
      const loop = path.join(canonicalDir, "loop.md");
      await rm(doc, { force: true });
      await symlink(loop, doc, "file");
      await symlink(doc, loop, "file");

      const report = await inspectIntegrationSurface(root);
      expect(report.unwalkable).toContain(".qfai/assistant/skills/qfai-atdd");
    });
  });

  // POSIX only, and not as root: an ACL is what closes the document.
  it.skipIf(process.platform === "win32" || process.geteuid?.() === 0)(
    "stops the profile for an unreadable canonical agent",
    async () => {
      // `validateAgentDefinition` confirms the file exists and then reads the
      // same pathname, so the run ends under every profile that routes agents.
      await withProject(async (root) => {
        if (!(await canCreateSymlink(root))) return;
        await seedCanonical(root, [], ["completion-reviewer"]);
        await wireAll(root, [], ["completion-reviewer"]);
        const doc = path.join(root, ".qfai", "assistant", "agents", "completion-reviewer.md");
        await chmod(doc, 0o000);
        try {
          const report = await inspectIntegrationSurface(root);
          expect(report.unwalkable).toContain(".qfai/assistant/agents/completion-reviewer.md");
        } finally {
          await chmod(doc, 0o644);
        }
      });
    },
  );

  it("does not stop the profile for a cycle on a canonical leaf", async () => {
    // The walks over this tree list a directory with `withFileTypes` and
    // descend only into `isDirectory()` entries, so a symlink leaf — cycle or
    // not — is listed and skipped and no `ELOOP` ever comes out. Treating it as
    // unwalkable hid every unrelated finding behind a link to repair first.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const canonical = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      const loop = path.join(root, ".qfai", "assistant", "skills", "loop");
      await rm(canonical, { recursive: true, force: true });
      await symlink(loop, canonical, "dir");
      await symlink(canonical, loop, "dir");

      const report = await inspectIntegrationSurface(root);
      expect(report.issues.map((entry) => entry.code)).toContain("QFAI-LINK-001");
      expect(report.unwalkable).toEqual([]);
    });
  });

  // POSIX only: this is the `ENOTDIR` shape, and Windows folds that errno into
  // `ENOENT`, which reads as absence. CI runs the ubuntu lane.
  it.skipIf(process.platform === "win32")(
    "stops the profile for a regular file where a canonical directory belongs",
    async () => {
      // That is the one shape `readdir` cannot survive: it gets as far as the
      // call and raises `ENOTDIR`.
      await withProject(async (root) => {
        if (!(await canCreateSymlink(root))) return;
        await seedCanonical(root, ["qfai-atdd"], []);
        await wireAll(root, ["qfai-atdd"], []);
        const skillsDir = path.join(root, ".qfai", "assistant", "skills");
        await rm(skillsDir, { recursive: true, force: true });
        await writeFile(skillsDir, "not a directory\n", "utf-8");

        const report = await inspectIntegrationSurface(root);
        // Named at the component that is not a directory, not at the leaf below
        // it: the leaf is not the path a walk fails on.
        expect(report.unwalkable).toContain(".qfai/assistant/skills");
      });
    },
  );

  it("reports the canonical too when the wrapper was flattened", async () => {
    // `qfai init` repairs a flattened wrapper on its own and leaves the
    // canonical as it found it, so reporting only the wrapper had the operator
    // clear the finding and end with a healthy symlink loading the wrong
    // instructions.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-verify"], []);
      await wireAll(root, ["qfai-atdd", "qfai-verify"], []);
      // Every wrapper for this skill, not one: a checkout flattens them all,
      // and leaving one real symlink meant its branch reported the canonical
      // and the gap never showed.
      for (const dir of SKILL_INTEGRATION_DIRS) {
        const wrapper = path.join(root, ...dir.split("/"), "qfai-atdd");
        await rm(wrapper, { recursive: true, force: true });
        await writeFile(wrapper, skillTarget(dir, "qfai-atdd"), "utf-8");
      }
      const canonical = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      await rm(canonical, { recursive: true, force: true });
      await symlink(
        path.join(root, ".qfai", "assistant", "skills", "qfai-verify"),
        canonical,
        "dir",
      );

      const found = await finding(root);
      expect(found?.refs).toContain(".claude/skills/qfai-atdd");
      expect(found?.refs).toContain(".qfai/assistant/skills/qfai-atdd");
      expect(found?.message).toContain("canonical document is a symlink");
    });
  });

  it("does not stop the profile for a cycle on an integration directory", async () => {
    // `.claude/skills` is read here and by nothing downstream, so a cycle on it
    // stops no later walk. Short-circuiting on it hid the spec, contract and
    // test defects sitting alongside it until the link had been repaired.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const claudeSkills = path.join(root, ".claude", "skills");
      await rm(claudeSkills, { recursive: true, force: true });
      await symlink(path.join(root, ".claude", "loop"), claudeSkills, "dir");
      await symlink(claudeSkills, path.join(root, ".claude", "loop"), "dir");

      const report = await inspectIntegrationSurface(root);
      expect(report.issues.map((entry) => entry.code)).toContain("QFAI-LINK-001");
      expect(report.unwalkable).toEqual([]);
    });
  });
});

describe("a canonical is checked even with its surface gone", () => {
  it("reports a canonical symlink after every skill directory was deleted", async () => {
    // Gating the branch on the directory existing skipped every canonical
    // check with it — and `qfai init` then recreates the wrappers around a
    // canonical it leaves as it found it.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-verify"], []);
      await wireAll(root, ["qfai-atdd", "qfai-verify"], []);
      await writeFile(path.join(root, ".agents", "README.md"), INIT_README_BODY, "utf-8");
      for (const dir of SKILL_INTEGRATION_DIRS) {
        await rm(path.join(root, ...dir.split("/")), { recursive: true, force: true });
      }
      const canonical = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      await rm(canonical, { recursive: true, force: true });
      await symlink(
        path.join(root, ".qfai", "assistant", "skills", "qfai-verify"),
        canonical,
        "dir",
      );

      const found = await finding(root);
      expect(found?.message).toContain("canonical document is a symlink");
    });
  });
});

describe("a broken link on the way to a surface is not an absent surface", () => {
  it("names a dangling ancestor instead of reporting the directory missing", async () => {
    // `canonicalState` on `.claude/skills` answers absent through a dangling
    // `.claude`, and the remedy — re-run `qfai init` — cannot create a
    // directory through a broken link.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      await rm(path.join(root, ".claude"), { recursive: true, force: true });
      await symlink(path.join(root, "nowhere"), path.join(root, ".claude"), "dir");

      const found = await finding(root);
      expect(found?.message).toContain("an ancestor is a symlink");
    });
  });

  it("names a dangling canonical directory instead of skipping the surface", async () => {
    // `lstat` on each document answers ENOENT through the broken parent, so
    // "not taken yet" swallowed a whole surface the assistant cannot load.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], ["qa-gatekeeper"]);
      await wireAll(root, ["qfai-atdd"], ["qa-gatekeeper"]);
      // The agent wrappers go, and the canonical directory they named becomes
      // a link to nothing. The skill wrappers stay, so init is still proven.
      for (const { dir, suffix } of AGENT_INTEGRATION_CONFIGS) {
        await rm(path.join(root, ...dir.split("/"), "qa-gatekeeper" + suffix), { force: true });
      }
      const agentsDir = path.join(root, ".qfai", "assistant", "agents");
      await rm(agentsDir, { recursive: true, force: true });
      await symlink(path.join(root, ".qfai", "assistant", "gone"), agentsDir, "dir");

      const found = await finding(root);
      expect(found?.message).toContain("the canonical directory is a dangling symlink");
    });
  });

  it("declines an oversized file at a marker path without reading it", async () => {
    // A project's own document at one of these paths can be any size, and
    // reading it whole to look for three substrings cost every profile in
    // proportion to somebody else's file.
    await withProject(async (root) => {
      await seedCanonical(root, ["qfai-atdd"], []);
      await mkdir(path.join(root, ".agents"), { recursive: true });
      await writeFile(
        path.join(root, ".agents", "README.md"),
        INIT_README_BODY + "x".repeat(64 * 1024),
        "utf-8",
      );

      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });
});

describe("the canonical integrity check does not depend on a wrapper", () => {
  it("reports a resolving canonical symlink when the wrappers are gone", async () => {
    // With no wrapper to resolve through, a canonical redirected at another
    // shipped skill read as a plain missing wrapper — and `qfai init` then
    // creates a wrapper pointing at it, since create-only leaves the canonical
    // as it found it.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-verify"], []);
      await wireAll(root, ["qfai-atdd", "qfai-verify"], []);
      for (const dir of SKILL_INTEGRATION_DIRS) {
        await rm(path.join(root, ...dir.split("/"), "qfai-atdd"), { recursive: true, force: true });
      }
      const canonical = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      await rm(canonical, { recursive: true, force: true });
      await symlink(
        path.join(root, ".qfai", "assistant", "skills", "qfai-verify"),
        canonical,
        "dir",
      );

      const found = await finding(root);
      expect(found?.message).toContain("canonical document is a symlink");
      expect(found?.message).not.toContain("and so does the document it wraps");
    });
  });
});

describe("a broken canonical grandparent is found too", () => {
  it("names the outermost broken component, not the leaf", async () => {
    // A dangling `.qfai/assistant` makes every path under it answer ENOENT,
    // so checking only the immediate parent found nothing and the surface
    // stayed silent with a valid marker still in place.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      await writeFile(path.join(root, ".agents", "README.md"), INIT_README_BODY, "utf-8");
      for (const dir of SKILL_INTEGRATION_DIRS) {
        await rm(path.join(root, ...dir.split("/"), "qfai-atdd"), { recursive: true, force: true });
      }
      const assistant = path.join(root, ".qfai", "assistant");
      await rm(assistant, { recursive: true, force: true });
      await symlink(path.join(root, ".qfai", "gone"), assistant, "dir");

      const found = await finding(root);
      expect(found?.message).toContain("the canonical directory is a dangling symlink");
      expect(found?.refs).toContain(".qfai/assistant");
    });
  });
});

describe("a canonical is a real document, not a link to one", () => {
  it("reports a canonical ancestor redirected inside the project", async () => {
    // Following the ancestor lands on a real leaf, so the leaf check passes,
    // and both resolved paths land in the same place inside the project — so
    // neither comparison has anything to say.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const skillsDir = path.join(root, ".qfai", "assistant", "skills");
      const elsewhere = path.join(root, ".qfai", "assistant", "skills-real");
      await mkdir(path.join(elsewhere, "qfai-atdd"), { recursive: true });
      await writeFile(path.join(elsewhere, "qfai-atdd", "SKILL.md"), "# moved", "utf-8");
      await rm(skillsDir, { recursive: true, force: true });
      await symlink(elsewhere, skillsDir, "dir");

      const found = await finding(root);
      expect(found?.message).toContain("a canonical ancestor is a symlink");
    });
  });

  it("reports a SKILL.md redirected at another document in the project", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-verify"], []);
      await wireAll(root, ["qfai-atdd", "qfai-verify"], []);
      const doc = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd", "SKILL.md");
      await rm(doc, { force: true });
      await symlink(
        path.join(root, ".qfai", "assistant", "skills", "qfai-verify", "SKILL.md"),
        doc,
        "file",
      );

      const found = await finding(root);
      expect(found?.message).toContain("its SKILL.md is a symlink");
    });
  });
});

describe("proof that init ran outweighs a probe that could not read", () => {
  it("does not end the run when one evidence candidate is unreadable", async () => {
    // A wrapper path holding an unreadable regular file, or an ACL on a
    // create-only README, stopped every profile on a project the wrapper next
    // to it already proves initialised.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-verify"], []);
      await wireAll(root, ["qfai-atdd", "qfai-verify"], []);
      // `qfai-verify`'s wrapper in one directory is replaced by a directory,
      // which `isInitEvidence` reads by trying to read a file: EISDIR, not
      // ENOENT. The other wrappers still prove init ran.
      const wrapper = path.join(root, ".claude", "skills", "qfai-verify");
      await rm(wrapper, { recursive: true, force: true });
      await mkdir(wrapper, { recursive: true });

      const found = await finding(root);
      expect(found?.message).toContain("directory, not a symlink");
    });
  });
});

describe("a canonical redirected outside the project", () => {
  it("reports a canonical redirected at another skill in the project", async () => {
    // Both realpaths converge on the other skill, so the resolved-path
    // comparison agrees and `isInside` is satisfied — while the assistant
    // loads the wrong instructions in every profile but `full`.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd", "qfai-verify"], []);
      await wireAll(root, ["qfai-atdd", "qfai-verify"], []);
      const canonical = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
      await rm(canonical, { recursive: true, force: true });
      await symlink(
        path.join(root, ".qfai", "assistant", "skills", "qfai-verify"),
        canonical,
        "dir",
      );

      const found = await finding(root);
      expect(found?.message).toContain("canonical document is a symlink");
      expect(found?.message).not.toContain("out of the project");
    });
  });
});

describe("a nested SKILL.md is in the project too", () => {
  it("reports a SKILL.md that is a symlink to an outside document", async () => {
    // The directory is the project fixed, the document is not: `stat` and
    // `access` both succeed, and `skills.integrity` runs under `full` alone.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      const outside = path.join(root, "..", path.basename(root) + "-doc");
      await mkdir(outside, { recursive: true });
      await writeFile(path.join(outside, "SKILL.md"), "# theirs", "utf-8");
      const doc = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd", "SKILL.md");
      try {
        await rm(doc, { force: true });
        await symlink(path.join(outside, "SKILL.md"), doc, "file");

        const found = await finding(root);
        // The symlink rule reaches it first: init writes this as a real file,
        // so a link is damage before the question of where it lands.
        expect(found?.message).toContain("its SKILL.md is a symlink");
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });
  });
});

describe("a marker whose ancestor is not a directory does not end the run", () => {
  it("keeps reporting the surfaces when a marker path raises ENOTDIR", async () => {
    // `.agents` as a regular file makes every path under it raise
    // `ENOTDIR`, and re-throwing that from the marker probe lost the finding
    // the other markers and wrappers still had.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, ["qfai-atdd"], []);
      await wireAll(root, ["qfai-atdd"], []);
      await rm(path.join(root, ".agents"), { recursive: true, force: true });
      await writeFile(path.join(root, ".agents"), "not a directory", "utf-8");

      const found = await finding(root);
      expect(found?.message).toContain(".agents/skills");
    });
  });
});

describe("a target can resolve and still be unusable", () => {
  it("reports a canonical document that cannot be read", async () => {
    // `stat` reads metadata, which a mode can allow while the body stays shut —
    // and the assistant loads the body.
    if (process.platform === "win32") return; // chmod does not gate reads here.
    // Nor does it gate root: `access(R_OK)` answers yes on a mode `000` file
    // for UID 0, so this would fail in a container CI or a dev image that runs
    // as root — a red test about the environment, not about the rule.
    if (process.geteuid?.() === 0) return;
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await seedCanonical(root, [], ["qa-gatekeeper"]);
      await wireAll(root, [], ["qa-gatekeeper"]);
      await chmod(path.join(root, ".qfai", "assistant", "agents", "qa-gatekeeper.md"), 0o000);

      const found = await finding(root);
      expect(found?.message).toContain("unreadable");
    });
  });
});
