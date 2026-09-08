// `validate` fails a tree whose integration wrappers do not resolve, because a
// skill is loaded through that path and nothing else. `doctor` reported the same
// tree as healthy: `skills.integrity` compares CONTENT, and the canonical tree
// behind a broken wrapper is untouched. Both were right, and only one of them
// was wired to a gate — so the command an operator reaches for said the
// environment was fine, which reads as "the error must be real".

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  AGENT_INTEGRATION_CONFIGS,
  SKILL_INTEGRATION_DIRS,
} from "../../../../src/cli/commands/init.js";
import { createDoctorData } from "../../../../src/core/doctor.js";

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

describe("integration.links", () => {
  it("reports a wrapper that does not resolve, on the tree validate fails", async () => {
    await withProject(async (root) => {
      await wireProject(root);
      // The shape a Windows `git worktree` produces: the wrapper is present and
      // the canonical tree is intact, but the link cannot be followed. A
      // dangling target reaches the same predicate on any platform.
      const wrapper = path.join(root, ".claude", "skills", SHIPPED_SKILL);
      await rm(wrapper);
      await symlink(path.join("..", "..", ".qfai", "assistant", "skills", "gone"), wrapper, "dir");

      const check = linksCheck(await createDoctorData({ startDir: root, rootExplicit: true }));

      expect(check?.severity).toBe("error");
      expect(check?.message).toContain("do not resolve");
      // The cure, named where the operator is already looking.
      expect(check?.message).toContain("qfai init --force");
    });
  });

  it("says the wrappers resolve when they do", async () => {
    await withProject(async (root) => {
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
      await wireProject(root);
      const wrapper = path.join(root, ".claude", "skills", SHIPPED_SKILL);
      await rm(wrapper);
      await symlink(path.join("..", "..", ".qfai", "assistant", "skills", "gone"), wrapper, "dir");

      const data = await createDoctorData({ startDir: root, rootExplicit: true });

      expect(linksCheck(data)?.severity).toBe("error");
      expect(data.checks.find((check) => check.id === "skills.integrity")).toBeDefined();
    });
  });
});
