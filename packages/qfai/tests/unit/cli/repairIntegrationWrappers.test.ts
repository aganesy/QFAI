// `qfai init --force` clears `QFAI-LINK-001`, and it also regenerates the
// skills tree, the agents and the shipped plain files. An unattended pass
// cannot reach for a command that wide, so the repair here writes symlinks and
// nothing else — and reports, rather than passes over, every path a link
// rewrite is not the repair for.

import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AGENT_INTEGRATION_CONFIGS,
  SKILL_INTEGRATION_DIRS,
  repairIntegrationWrappers,
} from "../../../src/cli/commands/init.js";
import type * as InitAssets from "../../../src/cli/lib/assets.js";
import type * as FsPromises from "node:fs/promises";

import type { Issue } from "../../../src/core/types.js";
import type * as IntegrationSurface from "../../../src/core/validators/integrationSurface.js";

/**
 * Findings to answer with instead of walking the tree.
 *
 * The repair acts on the paths the gate names, so a case about which paths
 * reach it is stated by naming them. The states a POSIX filesystem cannot hold
 * — a link the OS refuses to follow while its document reads — have no other
 * way in at all.
 */
let injectedFindings: Issue[] | null = null;

/** Makes the walk fail the way an unreadable directory or link does. */
let inspectionThrows = false;

/**
 * Makes `symlink` fail the way Windows does without Developer Mode.
 *
 * The refusal is the platform's, so there is no on-disk state that provokes it
 * here — and `node:fs/promises` exports cannot be spied on, so the module is
 * replaced with one that delegates except while this is set.
 */
let symlinkDenied = false;
let initAssetsOverride: string | null = null;

vi.mock("../../../src/cli/lib/assets.js", async (importOriginal) => {
  const actual = await importOriginal<typeof InitAssets>();
  return {
    ...actual,
    getInitAssetsDir: (): string => initAssetsOverride ?? actual.getInitAssetsDir(),
  };
});

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    default: actual,
    symlink: async (...args: Parameters<typeof actual.symlink>): Promise<void> => {
      if (symlinkDenied) {
        throw Object.assign(new Error("EPERM: operation not permitted, symlink"), {
          code: "EPERM",
        });
      }
      return await actual.symlink(...args);
    },
  };
});

const linkFinding = (relative: string): Issue => ({
  code: "QFAI-LINK-001",
  severity: "error",
  category: "canonical",
  message: `${relative} cannot be followed`,
  file: relative,
  refs: [relative],
  suggested_action: "re-run qfai init",
});

vi.mock("../../../src/core/validators/integrationSurface.js", async (importOriginal) => {
  const actual = await importOriginal<typeof IntegrationSurface>();
  return {
    ...actual,
    validateIntegrationSurface: async (root: string): Promise<Issue[]> => {
      if (inspectionThrows) {
        throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
      }
      return injectedFindings ?? (await actual.validateIntegrationSurface(root));
    },
  };
});

afterEach(() => {
  injectedFindings = null;
  inspectionThrows = false;
  symlinkDenied = false;
  initAssetsOverride = null;
});

/** A skill the shipped roster carries, so its wrapper is one init would write. */
const SHIPPED_SKILL = "qfai-atdd";
const WRAPPER = `.claude/skills/${SHIPPED_SKILL}`;
/** What the wrapper named before the migration, and what it names after. */
const PLURAL_TARGET = path.join("..", "..", ".qfai", "assistant", "skills", SHIPPED_SKILL);
const SINGULAR_TARGET = path.join("..", "..", ".qfai", "assistant", "skill", SHIPPED_SKILL);

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-link-repair-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Whether this machine can create a symlink at all (Windows may not). */
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

/** The canonical tree the wrappers point at, plus every wrapper init writes. */
async function wireProject(root: string): Promise<void> {
  const canonical = path.join(root, ".qfai", "assistant", "skill", SHIPPED_SKILL);
  await mkdir(canonical, { recursive: true });
  await writeFile(path.join(canonical, "SKILL.md"), "# skill\n", "utf-8");
  await mkdir(path.join(root, ".qfai", "assistant", "agent"), { recursive: true });

  for (const dir of SKILL_INTEGRATION_DIRS) {
    const absolute = path.join(root, ...dir.split("/"));
    await mkdir(absolute, { recursive: true });
    const target = path.join(
      ...dir.split("/").map(() => ".."),
      ".qfai",
      "assistant",
      "skill",
      SHIPPED_SKILL,
    );
    await symlink(target, path.join(absolute, SHIPPED_SKILL), "dir");
  }
  for (const { dir } of AGENT_INTEGRATION_CONFIGS) {
    await mkdir(path.join(root, ...dir.split("/")), { recursive: true });
  }
}

/** Runs the repair and hands back the lines it reported. */
async function repair(
  root: string,
  dryRun = false,
  options: { includeMissing?: boolean; onlyRelative?: ReadonlySet<string> } = {},
): Promise<string[]> {
  const lines: string[] = [];
  await repairIntegrationWrappers(root, dryRun, (line) => lines.push(line), options);
  return lines;
}

const wrapperPath = (root: string): string => path.join(root, ".claude", "skills", SHIPPED_SKILL);

describe("repairIntegrationWrappers", () => {
  it("repoints an agent wrapper through this repository's shipped assistant link", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      const assets = path.join(root, "packages", "qfai", "assets", "init");
      const shippedAgentDir = path.join(assets, ".qfai", "assistant", "agent");
      await mkdir(shippedAgentDir, { recursive: true });
      await writeFile(path.join(shippedAgentDir, "orchestrator.md"), "# shipped agent\n");
      initAssetsOverride = assets;

      const canonicalAgentDir = path.join(root, ".qfai", "assistant", "agent");
      await mkdir(path.dirname(canonicalAgentDir), { recursive: true });
      await symlink(
        path.relative(path.dirname(canonicalAgentDir), shippedAgentDir),
        canonicalAgentDir,
        "dir",
      );
      const relative = ".github/agents/orchestrator.agent.md";
      const wrapper = path.join(root, ...relative.split("/"));
      await mkdir(path.dirname(wrapper), { recursive: true });
      const oldTarget = path.relative(
        path.dirname(wrapper),
        path.join(root, ".qfai", "assistant", "agents", "orchestrator.md"),
      );
      await symlink(oldTarget, wrapper, "file");
      injectedFindings = [linkFinding(relative)];
      const options = { includeMissing: true, onlyRelative: new Set([relative]) };

      const preview = await repair(root, true, options);
      expect(preview.join("\n")).toContain(`would relink ${relative}`);
      expect(await readlink(wrapper)).toBe(oldTarget);

      const lines = await repair(root, false, options);
      expect(lines.join("\n")).toContain(`relinked ${relative}`);
      expect(await readFile(wrapper, "utf-8")).toBe("# shipped agent\n");
    });
  });

  it("declines an agent wrapper whose canonical parent links outside shipped assets", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      const assets = path.join(root, "packages", "qfai", "assets", "init");
      const shippedAgentDir = path.join(assets, ".qfai", "assistant", "agent");
      await mkdir(shippedAgentDir, { recursive: true });
      await writeFile(path.join(shippedAgentDir, "orchestrator.md"), "# shipped agent\n");
      initAssetsOverride = assets;

      const foreignAgentDir = path.join(root, "foreign-agents");
      await mkdir(foreignAgentDir);
      await writeFile(path.join(foreignAgentDir, "orchestrator.md"), "# foreign agent\n");
      const canonicalAgentDir = path.join(root, ".qfai", "assistant", "agent");
      await mkdir(path.dirname(canonicalAgentDir), { recursive: true });
      await symlink(foreignAgentDir, canonicalAgentDir, "dir");
      const relative = ".github/agents/orchestrator.agent.md";
      const wrapper = path.join(root, ...relative.split("/"));
      await mkdir(path.dirname(wrapper), { recursive: true });
      const oldTarget = "../../missing-agent.md";
      await symlink(oldTarget, wrapper, "file");
      injectedFindings = [linkFinding(relative)];

      const lines = await repair(root, false, { onlyRelative: new Set([relative]) });
      expect(lines.join("\n")).toContain("canonical source has a linked parent");
      expect(await readlink(wrapper)).toBe(oldTarget);
    });
  });

  it("limits a live repair to journaled relative paths", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      const other = `${SKILL_INTEGRATION_DIRS[1]}/${SHIPPED_SKILL}`;
      const wrongTarget = path.join("..", "..", "nowhere");
      for (const relative of [WRAPPER, other]) {
        const absolute = path.join(root, ...relative.split("/"));
        await rm(absolute);
        await symlink(wrongTarget, absolute, "dir");
      }
      injectedFindings = [linkFinding(WRAPPER), linkFinding(other)];

      const lines = await repair(root, false, { onlyRelative: new Set([WRAPPER]) });

      expect(lines.join("\n")).toContain(`relinked ${WRAPPER}`);
      expect(lines.join("\n")).not.toContain(other);
      expect(await readlink(path.join(root, ...other.split("/")))).toBe(wrongTarget);
    });
  });

  it("leaves every absent roster path absent when no repoint of its own emptied it", async () => {
    // An absent wrapper is one the project may have removed on purpose, and
    // the gate treats it as benign. A migration that filled it in would change
    // more than the links it repoints.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      injectedFindings = [];
      const agentDirs = AGENT_INTEGRATION_CONFIGS.map(({ dir }) => path.join(root, dir));

      expect((await repair(root, true, { includeMissing: true })).join("\n")).toContain(
        "nothing to repair",
      );
      expect((await repair(root, false, { includeMissing: true })).join("\n")).toContain(
        "nothing to repair",
      );
      await expect(stat(wrapperPath(root))).rejects.toThrow();
      for (const dir of agentDirs) expect(await readdir(dir)).toEqual([]);
    });
  });

  it("restores a path an interrupted repoint emptied, and removes the hold it left", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      const hold = `${wrapperPath(root)}.qfai-repair-4242`;
      await mkdir(hold);
      await symlink(PLURAL_TARGET, path.join(hold, SHIPPED_SKILL), "dir");
      injectedFindings = [];
      const holdRelative = `${WRAPPER}.qfai-repair-4242`;

      const preview = (await repair(root, true, { includeMissing: true })).join("\n");
      expect(preview).toContain(`would relink ${WRAPPER}\n`);
      expect(preview).toContain(`would relink ${holdRelative}`);
      await expect(stat(wrapperPath(root))).rejects.toThrow();
      expect(await readlink(path.join(hold, SHIPPED_SKILL))).toBe(PLURAL_TARGET);
      const options = { includeMissing: true, onlyRelative: new Set([WRAPPER, holdRelative]) };

      const lines = await repair(root, false, options);
      expect(lines.join("\n")).toContain(`relinked ${WRAPPER}`);
      expect(await readlink(wrapperPath(root))).toBe(SINGULAR_TARGET);
      await expect(stat(hold)).rejects.toThrow();
    });
  });

  it("leaves a wrapper the gate reports missing absent when no repoint emptied it", async () => {
    // In an initialised project the gate reports a deleted wrapper. That is the
    // doctor's repair; a migration repoints links and changes nothing else.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      injectedFindings = [linkFinding(WRAPPER)];

      expect((await repair(root, true, { includeMissing: true })).join("\n")).toContain(
        "nothing to repair",
      );
      expect((await repair(root, false, { includeMissing: true })).join("\n")).toContain(
        "nothing to repair",
      );
      await expect(lstat(wrapperPath(root))).rejects.toThrow();

      expect((await repair(root)).join("\n")).toContain(`relinked ${WRAPPER}`);
      expect(await readlink(wrapperPath(root))).toBe(SINGULAR_TARGET);
    });
  });

  it("removes only the hold that justified the restore, and lists it in the dry run", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      const used = `${wrapperPath(root)}.qfai-repair-4242`;
      await mkdir(used);
      await symlink(PLURAL_TARGET, path.join(used, SHIPPED_SKILL), "dir");
      // A hold of a link to somewhere else, and a directory that only starts
      // like a hold. Neither records this repoint.
      const unrelated = `${wrapperPath(root)}.qfai-repair-5151`;
      await mkdir(unrelated);
      await symlink(path.join("..", "..", "nowhere"), path.join(unrelated, SHIPPED_SKILL), "dir");
      const lookalike = `${wrapperPath(root)}.qfai-repair-draft`;
      await mkdir(lookalike);
      await symlink(PLURAL_TARGET, path.join(lookalike, SHIPPED_SKILL), "dir");
      injectedFindings = [];

      const preview = (await repair(root, true, { includeMissing: true })).join("\n");
      const planned = preview
        .split("\n")
        .filter((line) => line.startsWith("  would relink "))
        .map((line) => line.slice("  would relink ".length));
      expect(planned).toEqual([WRAPPER, `${WRAPPER}.qfai-repair-4242`]);

      const lines = await repair(root, false, {
        includeMissing: true,
        onlyRelative: new Set(planned),
      });
      expect(lines.join("\n")).toContain(`relinked ${WRAPPER}.qfai-repair-4242`);
      expect(await readlink(wrapperPath(root))).toBe(SINGULAR_TARGET);
      await expect(lstat(used)).rejects.toThrow();
      expect(await readlink(path.join(unrelated, SHIPPED_SKILL))).toBe(
        path.join("..", "..", "nowhere"),
      );
      expect(await readlink(path.join(lookalike, SHIPPED_SKILL))).toBe(PLURAL_TARGET);
    });
  });

  it("keeps a hold that has gained other content, and says the removal did not complete", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      const hold = `${wrapperPath(root)}.qfai-repair-4242`;
      await mkdir(hold);
      await symlink(PLURAL_TARGET, path.join(hold, SHIPPED_SKILL), "dir");
      await writeFile(path.join(hold, "notes.md"), "kept\n", "utf-8");
      injectedFindings = [];
      const holdRelative = `${WRAPPER}.qfai-repair-4242`;

      const lines = await repair(root, false, {
        includeMissing: true,
        onlyRelative: new Set([WRAPPER, holdRelative]),
      });

      expect(lines.join("\n")).toContain(`could not relink ${holdRelative}`);
      expect(await readlink(wrapperPath(root))).toBe(SINGULAR_TARGET);
      expect(await readFile(path.join(hold, "notes.md"), "utf-8")).toBe("kept\n");
    });
  });

  it("removes a hold left beside a link that is already repointed", async () => {
    // A run that stopped after writing the new link and before removing its
    // hold. The link is right; the hold is the one change left to make.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      const hold = `${wrapperPath(root)}.qfai-repair-4242`;
      await mkdir(hold);
      await symlink(PLURAL_TARGET, path.join(hold, SHIPPED_SKILL), "dir");
      injectedFindings = [];
      const holdRelative = `${WRAPPER}.qfai-repair-4242`;

      const preview = (await repair(root, true, { includeMissing: true })).join("\n");
      expect(preview).toContain(`would relink ${holdRelative}`);
      expect(preview).not.toContain(`would relink ${WRAPPER}\n`);

      await repair(root, false, { includeMissing: true, onlyRelative: new Set([holdRelative]) });
      await expect(lstat(hold)).rejects.toThrow();
      expect(await readlink(wrapperPath(root))).toBe(SINGULAR_TARGET);
    });
  });

  it("removes a hold left beside a link that is already right on a doctor pass", async () => {
    // The gate does not name a link that is right, so the writer never visits
    // it. The hold beside it is removed all the same.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      const hold = `${wrapperPath(root)}.qfai-repair-4242`;
      await mkdir(hold);
      await symlink(PLURAL_TARGET, path.join(hold, SHIPPED_SKILL), "dir");
      injectedFindings = [];
      const holdRelative = `${WRAPPER}.qfai-repair-4242`;

      const preview = (await repair(root, true)).join("\n");
      expect(preview).toContain(`would relink ${holdRelative}`);
      expect(await readlink(path.join(hold, SHIPPED_SKILL))).toBe(PLURAL_TARGET);

      await repair(root);
      await expect(lstat(hold)).rejects.toThrow();
      expect(await readlink(wrapperPath(root))).toBe(SINGULAR_TARGET);
    });
  });

  it("rewrites a link the gate names that reaches the singular directory by another spelling", async () => {
    // Reaching the right directory is not the gate's rule, so a migration
    // does not read such a link as already right and leave it reported.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      const absolute = path.join(root, ".qfai", "assistant", "skill", SHIPPED_SKILL);
      await symlink(absolute, wrapperPath(root), "dir");
      injectedFindings = [linkFinding(WRAPPER)];

      const preview = (await repair(root, true, { includeMissing: true })).join("\n");
      expect(preview).toContain(`would relink ${WRAPPER}`);
      expect(preview).not.toContain(`left alone ${WRAPPER}`);
      expect(await readlink(wrapperPath(root))).toBe(absolute);

      const lines = await repair(root, false, {
        includeMissing: true,
        onlyRelative: new Set([WRAPPER]),
      });
      expect(lines.join("\n")).toContain(`relinked ${WRAPPER}`);
      expect(await readlink(wrapperPath(root))).toBe(SINGULAR_TARGET);
    });
  });

  it("reports a link the gate names that points at neither directory, without replacing it", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      const ownTarget = path.join("..", "..", "project-skills", SHIPPED_SKILL);
      await symlink(ownTarget, wrapperPath(root), "dir");
      injectedFindings = [linkFinding(WRAPPER)];

      const lines = await repair(root, false, { includeMissing: true });

      expect(lines.join("\n")).toContain(`left alone ${WRAPPER}: the link names`);
      expect(lines.join("\n")).not.toContain(`relinked ${WRAPPER}`);
      expect(await readlink(wrapperPath(root))).toBe(ownTarget);
    });
  });

  it("removes the holds beside a wrapper the doctor recreates", async () => {
    // A hold records a path a repair emptied. Once any writer fills the path
    // the record is false, and left behind it would make a later migration
    // restore a wrapper the project had since removed.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      const hold = `${wrapperPath(root)}.qfai-repair-4242`;
      await mkdir(hold);
      await symlink(PLURAL_TARGET, path.join(hold, SHIPPED_SKILL), "dir");
      injectedFindings = [linkFinding(WRAPPER)];

      const preview = (await repair(root, true)).join("\n");
      expect(preview).toContain(`would remove the hold of an interrupted repair: ${hold}`);
      expect(await readlink(path.join(hold, SHIPPED_SKILL))).toBe(PLURAL_TARGET);

      const lines = (await repair(root)).join("\n");
      expect(lines).toContain(`relinked ${WRAPPER}`);
      expect(lines).toContain(`removed the hold of an interrupted repair: ${hold}`);
      await expect(lstat(hold)).rejects.toThrow();
    });
  });

  it("puts the plural link back by rename when the platform refuses symlinks, and a rerun completes it", async () => {
    // Windows without Developer Mode refuses the put-back `symlink` for the
    // same reason it refused the new link. The held link itself goes back by
    // `rename`, so the path is not left empty with the original in a hold.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      await symlink(PLURAL_TARGET, wrapperPath(root), "dir");
      injectedFindings = [];
      const options = { includeMissing: true, onlyRelative: new Set([WRAPPER]) };
      symlinkDenied = true;

      const refused = await repair(root, false, options);
      expect(refused.join("\n")).toContain(`could not relink ${WRAPPER}`);
      expect(await readlink(wrapperPath(root))).toBe(PLURAL_TARGET);
      expect(
        (await readdir(path.dirname(wrapperPath(root)))).filter((name) =>
          name.startsWith(`${SHIPPED_SKILL}.qfai-repair-`),
        ),
      ).toEqual([]);

      symlinkDenied = false;
      const lines = await repair(root, false, options);
      expect(lines.join("\n")).toContain(`relinked ${WRAPPER}`);
      expect(await readlink(wrapperPath(root))).toBe(SINGULAR_TARGET);
      expect(
        (await readdir(path.dirname(wrapperPath(root)))).filter((name) =>
          name.startsWith(`${SHIPPED_SKILL}.qfai-repair-`),
        ),
      ).toEqual([]);
    });
  });

  it.runIf(process.platform === "win32")(
    "repoints a plural link whose target differs only in case on Windows",
    async () => {
      await withProject(async (root) => {
        if (!(await canCreateSymlink(root))) return;
        await wireProject(root);
        await rm(wrapperPath(root));
        await symlink(PLURAL_TARGET.toUpperCase(), wrapperPath(root), "dir");
        injectedFindings = [];

        const lines = await repair(root, false, {
          includeMissing: true,
          onlyRelative: new Set([WRAPPER]),
        });

        expect(lines.join("\n")).toContain(`relinked ${WRAPPER}`);
        expect(await readlink(wrapperPath(root))).toBe(SINGULAR_TARGET);
      });
    },
  );

  it("does not create a missing wrapper through a linked integration directory", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      const outside = path.join(root, "external-skills");
      await mkdir(outside, { recursive: true });
      const skillsDir = path.join(root, ".claude", "skills");
      await rm(skillsDir, { recursive: true, force: true });
      await symlink(outside, skillsDir, "dir");
      const hold = path.join(outside, `${SHIPPED_SKILL}.qfai-repair-4242`);
      await mkdir(hold);
      await symlink(PLURAL_TARGET, path.join(hold, SHIPPED_SKILL), "dir");
      injectedFindings = [];

      const lines = await repair(root, false, {
        includeMissing: true,
        onlyRelative: new Set([WRAPPER, `${WRAPPER}.qfai-repair-4242`]),
      });

      expect(lines.join("\n")).toContain("a linked parent occupies");
      await expect(stat(path.join(outside, SHIPPED_SKILL))).rejects.toThrow();
    });
  });

  it("reports a missing canonical source without creating a dangling migration wrapper", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(path.join(root, ".qfai", "assistant", "skill", SHIPPED_SKILL), {
        recursive: true,
        force: true,
      });
      await rm(wrapperPath(root));
      await symlink(PLURAL_TARGET, wrapperPath(root), "dir");
      injectedFindings = [];
      const options = { includeMissing: true, onlyRelative: new Set([WRAPPER]) };

      const preview = await repair(root, true, options);
      expect(preview.join("\n")).toContain(`left alone ${WRAPPER}: canonical source`);
      expect(preview.join("\n")).not.toContain(`would relink ${WRAPPER}`);

      const result = await repair(root, false, options);
      expect(result.join("\n")).toContain(`left alone ${WRAPPER}: canonical source`);
      expect(await readlink(wrapperPath(root))).toBe(PLURAL_TARGET);
    });
  });

  it("repoints a migration wrapper still linked to the plural directory the gate does not name", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      const pluralTarget = path.join("..", "..", ".qfai", "assistant", "skills", SHIPPED_SKILL);
      await symlink(pluralTarget, wrapperPath(root), "dir");
      injectedFindings = [];
      const options = { includeMissing: true, onlyRelative: new Set([WRAPPER]) };

      expect((await repair(root)).join("\n")).toContain("nothing to repair");
      expect((await repair(root, true, options)).join("\n")).toContain(`would relink ${WRAPPER}`);
      expect(await readlink(wrapperPath(root))).toBe(pluralTarget);

      const lines = await repair(root, false, options);
      expect(lines.join("\n")).toContain(`relinked ${WRAPPER}`);
      expect(await readlink(wrapperPath(root))).toBe(
        path.join("..", "..", ".qfai", "assistant", "skill", SHIPPED_SKILL),
      );
    });
  });

  it("leaves a migration wrapper linked elsewhere to the gate", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      const ownTarget = path.join("..", "..", "project-skills", SHIPPED_SKILL);
      await symlink(ownTarget, wrapperPath(root), "dir");
      injectedFindings = [];

      const lines = await repair(root, false, {
        includeMissing: true,
        onlyRelative: new Set([WRAPPER]),
      });

      expect(lines.join("\n")).toContain("nothing to repair");
      expect(await readlink(wrapperPath(root))).toBe(ownTarget);
    });
  });

  it("reports an occupied migration wrapper the gate does not name", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      await writeFile(wrapperPath(root), "project-owned wrapper\n", "utf-8");
      injectedFindings = [];

      const lines = await repair(root, false, {
        includeMissing: true,
        onlyRelative: new Set([WRAPPER]),
      });

      expect(lines.join("\n")).toContain(`left alone ${WRAPPER}: a regular file occupies the path`);
      expect(await readFile(wrapperPath(root), "utf-8")).toBe("project-owned wrapper\n");
    });
  });

  it("relinks a wrapper whose target string is wrong", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      await symlink(path.join("..", "..", "nowhere"), wrapperPath(root), "dir");
      injectedFindings = [linkFinding(WRAPPER)];

      const lines = await repair(root);

      expect(lines.join("\n")).toContain(`relinked ${WRAPPER}`);
      expect(await readlink(wrapperPath(root))).toContain(
        path.join(".qfai", "assistant", "skill", SHIPPED_SKILL),
      );
    });
  });

  it("rebuilds a wrapper a checkout flattened into a regular file", async () => {
    // `core.symlinks=false` is the Windows default and is not carried by a
    // clone, so the file holding the target string is the shape an operator
    // most often arrives with.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      const target = path.join("..", "..", ".qfai", "assistant", "skills", SHIPPED_SKILL);
      await rm(wrapperPath(root));
      await writeFile(wrapperPath(root), target, "utf-8");
      injectedFindings = [linkFinding(WRAPPER)];

      const lines = await repair(root);

      expect(lines.join("\n")).toContain(`relinked ${WRAPPER}`);
      expect((await stat(wrapperPath(root))).isDirectory()).toBe(true);
    });
  });

  it("leaves the skills tree and the shipped plain files alone", async () => {
    // The whole reason this exists rather than a call to `init --force`: a
    // repair scoped to one thing must not take the rest of the tree with it.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      const skillDoc = path.join(root, ".qfai", "assistant", "skill", SHIPPED_SKILL, "SKILL.md");
      await writeFile(skillDoc, "# edited by the project\n", "utf-8");
      const readme = path.join(root, ".claude", "skills", "README.md");
      await writeFile(readme, "# the project's own note\n", "utf-8");
      await rm(wrapperPath(root));
      injectedFindings = [linkFinding(WRAPPER)];

      await repair(root);

      const { readFile } = await import("node:fs/promises");
      expect(await readFile(skillDoc, "utf-8")).toBe("# edited by the project\n");
      expect(await readFile(readme, "utf-8")).toBe("# the project's own note\n");
    });
  });

  it("reports a wrapper occupied by a real directory instead of deleting it", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      await mkdir(wrapperPath(root), { recursive: true });
      await writeFile(path.join(wrapperPath(root), "notes.md"), "kept\n", "utf-8");
      injectedFindings = [linkFinding(WRAPPER)];

      const lines = await repair(root);

      expect(lines.join("\n")).toContain("a real directory occupies the path");
      expect((await stat(path.join(wrapperPath(root), "notes.md"))).isFile()).toBe(true);
    });
  });

  it("does not relink a wrapper this release ships no skill for", async () => {
    // A wrapper left behind by a retired skill resolves perfectly, and that is
    // the finding: the assistant is still loading instructions this release
    // dropped. Rewriting it would restore exactly what the gate is reporting.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      const retired = ".claude/skills/qfai-retired";
      injectedFindings = [linkFinding(retired)];

      const lines = await repair(root);

      expect(lines.join("\n")).toContain("this release ships no skill or agent by that name");
      await expect(stat(path.join(root, ".claude", "skills", "qfai-retired"))).rejects.toThrow();
    });
  });

  it("reports a rewrite the platform refused rather than a clean pass", async () => {
    // Creating a symlink needs Developer Mode or elevation on Windows. A repair
    // that cannot act has not repaired anything, and the summary has to say so.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      injectedFindings = [linkFinding(WRAPPER)];
      symlinkDenied = true;

      const lines = await repair(root);

      expect(lines.join("\n")).toContain("failed=1");
      expect(lines.join("\n")).toContain(`could not relink ${WRAPPER}`);
      expect(lines.join("\n")).toContain("relinked=0");
      await expect(stat(wrapperPath(root))).rejects.toThrow();
    });
  });

  it("writes nothing under --dry-run and says what a live run would do", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      injectedFindings = [linkFinding(WRAPPER)];

      const lines = await repair(root, true);

      expect(lines.join("\n")).toContain("would relink");
      expect(lines.join("\n")).toContain("(dry-run)");
      await expect(stat(wrapperPath(root))).rejects.toThrow();
    });
  });

  it("hands the writer's notes back instead of printing them", async () => {
    // `init` sends these to stdout, which is where its operator is looking.
    // This caller's stdout may be carrying a JSON document, and a note printed
    // into it is a parse error for everything downstream.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      const target = path.join("..", "..", ".qfai", "assistant", "skills", SHIPPED_SKILL);
      await rm(wrapperPath(root));
      await writeFile(wrapperPath(root), target, "utf-8");
      injectedFindings = [linkFinding(WRAPPER)];
      const written: string[] = [];
      const stdout = vi
        .spyOn(process.stdout, "write")
        .mockImplementation((chunk: unknown): boolean => {
          written.push(String(chunk));
          return true;
        });

      try {
        const lines = await repair(root);

        expect(written.join("")).not.toContain("flattened symlink");
        expect(lines.join("\n")).toContain("flattened symlink");
      } finally {
        stdout.mockRestore();
      }
    });
  });

  it("touches nothing when the gate reports no wrapper", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      injectedFindings = [];

      const lines = await repair(root);

      expect(lines.join("\n")).toContain("nothing to repair");
    });
  });

  it("says nothing a waiver has suppressed", async () => {
    // `validate` runs its findings through the waiver pass. Rewriting a wrapper
    // a project has decided to keep would undo that decision unattended.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await rm(wrapperPath(root));
      injectedFindings = [{ ...linkFinding(WRAPPER), suppressed: true }];

      const lines = await repair(root);

      expect(lines.join("\n")).toContain("nothing to repair");
      await expect(stat(wrapperPath(root))).rejects.toThrow();
    });
  });

  it("declines the whole pass when the wrappers cannot be inspected", async () => {
    // Without the findings there is no set of paths to act on, and acting on
    // the whole roster instead would write over what nobody asked about.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      inspectionThrows = true;

      const lines = await repair(root);

      expect(lines.join("\n")).toContain("could not be inspected");
      expect(lines.join("\n")).not.toContain("relinked");
    });
  });
});
