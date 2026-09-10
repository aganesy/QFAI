// `qfai init --force` clears `QFAI-LINK-001`, and it also regenerates the
// skills tree, the agents and the shipped plain files. An unattended pass
// cannot reach for a command that wide, so the repair here writes symlinks and
// nothing else — and reports, rather than passes over, every path a link
// rewrite is not the repair for.

import { mkdir, mkdtemp, readlink, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AGENT_INTEGRATION_CONFIGS,
  SKILL_INTEGRATION_DIRS,
  repairIntegrationWrappers,
} from "../../../src/cli/commands/init.js";
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
});

/** A skill the shipped roster carries, so its wrapper is one init would write. */
const SHIPPED_SKILL = "qfai-atdd";
const WRAPPER = `.claude/skills/${SHIPPED_SKILL}`;

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
  const canonical = path.join(root, ".qfai", "assistant", "skills", SHIPPED_SKILL);
  await mkdir(canonical, { recursive: true });
  await writeFile(path.join(canonical, "SKILL.md"), "# skill\n", "utf-8");
  await mkdir(path.join(root, ".qfai", "assistant", "agents"), { recursive: true });

  for (const dir of SKILL_INTEGRATION_DIRS) {
    const absolute = path.join(root, ...dir.split("/"));
    await mkdir(absolute, { recursive: true });
    const target = path.join(
      ...dir.split("/").map(() => ".."),
      ".qfai",
      "assistant",
      "skills",
      SHIPPED_SKILL,
    );
    await symlink(target, path.join(absolute, SHIPPED_SKILL), "dir");
  }
  for (const { dir } of AGENT_INTEGRATION_CONFIGS) {
    await mkdir(path.join(root, ...dir.split("/")), { recursive: true });
  }
}

/** Runs the repair and hands back the lines it reported. */
async function repair(root: string, dryRun = false): Promise<string[]> {
  const lines: string[] = [];
  await repairIntegrationWrappers(root, dryRun, (line) => lines.push(line));
  return lines;
}

const wrapperPath = (root: string): string => path.join(root, ".claude", "skills", SHIPPED_SKILL);

describe("repairIntegrationWrappers", () => {
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
        path.join(".qfai", "assistant", "skills", SHIPPED_SKILL),
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
      const skillDoc = path.join(root, ".qfai", "assistant", "skills", SHIPPED_SKILL, "SKILL.md");
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
