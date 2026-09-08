// `validate` fails a tree whose integration wrappers do not resolve, because a
// skill is loaded through that path and nothing else. `doctor` reported the same
// tree as healthy: `skills.integrity` compares CONTENT, and the canonical tree
// behind a broken wrapper is untouched. Both were right, and only one of them
// was wired to a gate — so the command an operator reaches for said the
// environment was fine, which reads as "the error must be real".

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AGENT_INTEGRATION_CONFIGS,
  SKILL_INTEGRATION_DIRS,
} from "../../../../src/cli/commands/init.js";
import { createDoctorData } from "../../../../src/core/doctor.js";
import type { Issue } from "../../../../src/core/types.js";
import type * as IntegrationSurface from "../../../../src/core/validators/integrationSurface.js";

/**
 * Findings to answer with instead of walking the tree, for the one state a
 * POSIX filesystem cannot hold.
 *
 * `canonicalReachable` is true only when `stat` raises `EPERM` on a directory
 * symlink, which is Windows refusing to follow a reparse point of the wrong
 * type. On Linux that `stat` succeeds, so the `warning` half of
 * `QFAI-LINK-001` — the half the Windows report is actually about — has no
 * on-disk fixture here. Injecting the finding is how the rest of this suite
 * reaches platform states it cannot stage.
 */
let injectedFindings: Issue[] | null = null;

/** Makes the walk fail the way an unreadable directory or link does. */
let inspectionThrows = false;

/** One `QFAI-LINK-001` at the severity under test. */
const linkFinding = (severity: Issue["severity"], relative: string): Issue => ({
  code: "QFAI-LINK-001",
  severity,
  category: "canonical",
  message: `${relative} cannot be followed`,
  file: relative,
  refs: [relative],
  suggested_action: "set core.symlinks and re-run qfai init",
});

vi.mock("../../../../src/core/validators/integrationSurface.js", async (importOriginal) => {
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
});

/** A skill the shipped roster carries, so its wrapper is in scope. */
const SHIPPED_SKILL = "qfai-atdd";

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-links-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * Whether this machine can create one at all.
 *
 * Windows refuses without Developer Mode or elevation, and every fixture here
 * is built out of symlinks — so without this probe the suite fails on the
 * platform whose behaviour it exists to describe.
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

const linksCheck = (data: Awaited<ReturnType<typeof createDoctorData>>) =>
  data.checks.find((check) => check.id === "integration.links");

/** Repoints one wrapper at `target`, relative to the wrapper's own directory. */
async function repoint(root: string, target: string[]): Promise<void> {
  const wrapper = path.join(root, ".claude", "skills", SHIPPED_SKILL);
  await rm(wrapper);
  await symlink(path.join("..", "..", ...target), wrapper, "dir");
}

describe("integration.links", () => {
  it("reports a wrapper whose canonical document is gone, at the gate's severity", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await repoint(root, [".qfai", "assistant", "skills", "gone"]);

      const check = linksCheck(await createDoctorData({ startDir: root, rootExplicit: true }));

      expect(check?.severity).toBe("error");
      expect(check?.message).toContain("need attention");
      expect(check?.details?.["wrappers"]).toEqual([".claude/skills/qfai-atdd"]);
    });
  });

  it("keeps the warning severity when the canonical document still reads", async () => {
    // The shape a Windows `git worktree` produces, and the one this check exists
    // for: the link cannot be followed while the documents behind it are intact,
    // which the validator reports as a `warning`. Hard-coding `error` here would
    // put `doctor` on the far side of `--fail-on error` from `validate` on the
    // most common case of all — the mismatch this check was added to end.
    await withProject(async (root) => {
      await wireProject(root);
      injectedFindings = [linkFinding("warning", ".claude/skills/qfai-atdd")];

      const check = linksCheck(await createDoctorData({ startDir: root, rootExplicit: true }));

      expect(check?.severity).toBe("warning");
    });
  });

  it("takes the worse severity when the tree holds both damage classes", async () => {
    await withProject(async (root) => {
      await wireProject(root);
      injectedFindings = [
        linkFinding("warning", ".claude/skills/qfai-atdd"),
        linkFinding("error", ".codex/skills/qfai-atdd"),
      ];

      const check = linksCheck(await createDoctorData({ startDir: root, rootExplicit: true }));

      expect(check?.severity).toBe("error");
    });
  });

  it("reports an inspection that could not run at all as an error", async () => {
    // The validator propagates a permission or I/O failure and takes `validate`
    // down with it. Reporting the same tree as an advisory would pass `doctor`
    // under `--fail-on error` while the gate fails — the disagreement this
    // check exists to remove. A check that could not run has not passed.
    await withProject(async (root) => {
      await wireProject(root);
      inspectionThrows = true;

      const check = linksCheck(await createDoctorData({ startDir: root, rootExplicit: true }));

      expect(check?.severity).toBe("error");
      expect(check?.message).toContain("Could not inspect");
    });
  });

  it("says nothing a waiver has suppressed", async () => {
    // `validate` runs its findings through the waiver pass. Reading the raw
    // validator instead would fail `doctor` on a tree whose gate passes, which
    // is the same disagreement one layer along.
    await withProject(async (root) => {
      await wireProject(root);
      const suppressed = linkFinding("warning", ".claude/skills/qfai-atdd");
      injectedFindings = [{ ...suppressed, suppressed: true }];

      const check = linksCheck(await createDoctorData({ startDir: root, rootExplicit: true }));

      expect(check?.severity).toBe("ok");
    });
  });

  it("keeps its next action in the language doctor's output is written in", async () => {
    // The validator's per-shape remedy is written for `validate`'s reader and
    // is not all English. Copying it into `doctor --format json` would break
    // that output's language contract on exactly the runs that hit the
    // shapes carrying the longest remedies.
    await withProject(async (root) => {
      await wireProject(root);
      injectedFindings = [
        {
          ...linkFinding("warning", ".claude/skills/qfai-atdd"),
          suggested_action: "再実行してください",
        },
      ];

      const check = linksCheck(await createDoctorData({ startDir: root, rootExplicit: true }));
      const actions = check?.details?.["nextActions"];

      expect(actions).toEqual([
        "Run qfai validate and follow the QFAI-LINK-001 finding for these paths",
      ]);
      expect(JSON.stringify(actions)).not.toContain("再実行");
    });
  });

  it("does not tell the reader a resolving wrapper is not being loaded", async () => {
    // A wrapper left behind by a retired skill resolves perfectly, and that is
    // the problem: the assistant is loading instructions this release no longer
    // ships. Describing every finding as "not being loaded" hid the one case
    // where something IS loaded and should not be.
    await withProject(async (root) => {
      await wireProject(root);
      injectedFindings = [linkFinding("warning", ".claude/skills/qfai-retired")];

      const check = linksCheck(await createDoctorData({ startDir: root, rootExplicit: true }));

      expect(check?.message).not.toContain("not being loaded");
      expect(check?.message).not.toContain("do not resolve");
      expect(check?.message).toContain("QFAI-LINK-001");
    });
  });

  it("does not prescribe --force, which repairs more than the wrappers", async () => {
    // `--force` regenerates the skills tree, the agents and the shipped plain
    // files, so a reader who follows it loses local edits — and several of
    // these states are not repaired by re-running `init` at all.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await repoint(root, [".qfai", "assistant", "skills", "gone"]);

      const check = linksCheck(await createDoctorData({ startDir: root, rootExplicit: true }));
      const actions = check?.details?.["nextActions"];

      expect(Array.isArray(actions) && actions.length > 0).toBe(true);
      expect(check?.message).not.toContain("--force");
    });
  });

  it("says the wrappers resolve when they do", async () => {
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);

      const check = linksCheck(await createDoctorData({ startDir: root, rootExplicit: true }));

      expect(check?.severity).toBe("ok");
    });
  });

  it("agrees with skills.integrity rather than replacing it", async () => {
    // The two ask different questions and both belong: content is unchanged on
    // a tree whose wrappers are broken, which is exactly why one check could
    // not answer for the other.
    await withProject(async (root) => {
      if (!(await canCreateSymlink(root))) return;
      await wireProject(root);
      await repoint(root, [".qfai", "assistant", "skills", "gone"]);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });

      expect(linksCheck(data)?.severity).toBe("error");
      expect(data.checks.find((check) => check.id === "skills.integrity")).toBeDefined();
    });
  });
});
