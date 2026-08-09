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
  "Skill symlinks point to QFAI's canonical skill documents under:",
  "",
  "- .qfai/assistant/skills/",
  "",
].join("\n");

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
          await writeFile(path.join(absolute, id), "target", "utf-8");
        }
      }
      for (const { dir, suffix } of AGENT_INTEGRATION_CONFIGS) {
        const absolute = path.join(root, ...dir.split("/"));
        await mkdir(absolute, { recursive: true });
        await writeFile(path.join(absolute, `qa-gatekeeper${suffix}`), "target", "utf-8");
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
      expect(found?.message).toContain("its SKILL.md is not a file");
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

describe("a target can resolve and still be unusable", () => {
  it("reports a canonical document that cannot be read", async () => {
    // `stat` reads metadata, which a mode can allow while the body stays shut —
    // and the assistant loads the body.
    if (process.platform === "win32") return; // chmod does not gate reads here.
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
