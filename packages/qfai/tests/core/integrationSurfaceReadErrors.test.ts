/**
 * A filesystem that is failing must not read as a surface that is fine.
 *
 * The roster read was `readdir(...).catch(() => [])` and the wrapper probe was
 * `lstat(...).catch(() => null)`. Both fold every error into "absent", and
 * absent is the benign case: an empty roster takes the early return and an
 * absent wrapper is skipped, so `EACCES` on `.qfai/assistant/skills` — or a
 * disk erroring under the wrapper directories — produced a clean
 * `QFAI-LINK-001` pass at exactly the moment the assistant could load nothing.
 *
 * Only `ENOENT` / `ENOTDIR` mean absent. This file lives apart from
 * `integrationSurface.test.ts` because `vi.mock` is hoisted to module scope and
 * would otherwise apply to every case in that file.
 */

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { readdirSpy, lstatSpy, accessSpy, statSpy, readlinkSpy } = vi.hoisted(() => ({
  readdirSpy: vi.fn(),
  lstatSpy: vi.fn(),
  accessSpy: vi.fn(),
  statSpy: vi.fn(),
  readlinkSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    readdir: (...args: unknown[]) => readdirSpy(actual, ...args),
    lstat: (...args: unknown[]) => lstatSpy(actual, ...args),
    access: (...args: unknown[]) => accessSpy(actual, ...args),
    stat: (...args: unknown[]) => statSpy(actual, ...args),
    readlink: (...args: unknown[]) => readlinkSpy(actual, ...args),
  };
});

const { validateIntegrationSurface } =
  await import("../../src/core/validators/integrationSurface.js");

function errno(code: string): NodeJS.ErrnoException {
  const error = new Error(`simulated ${code}`) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-link-errors-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** A canonical tree with one shipped skill, so the roster is non-empty. */
async function seedCanonical(root: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), "# skill\n", "utf-8");
}

beforeEach(() => {
  readdirSpy.mockReset();
  lstatSpy.mockReset();
  accessSpy.mockReset();
  statSpy.mockReset();
  readlinkSpy.mockReset();
  readdirSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.readdir(...args));
  lstatSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.lstat(...args));
  accessSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.access(...args));
  statSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.stat(...args));
  readlinkSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
    actual.readlink(...args),
  );
});

describe("validateIntegrationSurface read errors", () => {
  it("propagates EACCES on the canonical skills directory", async () => {
    await withProject(async (root) => {
      await seedCanonical(root);
      readdirSpy.mockImplementation((actual: FsPromises, dir: string, ...rest: never[]) =>
        dir.endsWith(path.join("assistant", "skills"))
          ? Promise.reject(errno("EACCES"))
          : actual.readdir(dir, ...rest),
      );

      await expect(validateIntegrationSurface(root)).rejects.toThrow("simulated EACCES");
    });
  });

  it("propagates EIO on a wrapper probe", async () => {
    await withProject(async (root) => {
      await seedCanonical(root);
      lstatSpy.mockImplementation(() => Promise.reject(errno("EIO")));

      await expect(validateIntegrationSurface(root)).rejects.toThrow("simulated EIO");
    });
  });

  it("propagates EACCES on the SKILL.md membership probe", async () => {
    // The directory reads fine; the file inside it does not. Folding that into
    // `false` drops the skill from the roster, and if it were the only
    // canonical entry the early return then passed a broken surface with no
    // finding — the guarantee holding everywhere except where membership is
    // decided.
    await withProject(async (root) => {
      await seedCanonical(root);
      accessSpy.mockImplementation((_actual: FsPromises, filePath: string) =>
        filePath.endsWith("SKILL.md")
          ? Promise.reject(errno("EACCES"))
          : Promise.resolve(undefined),
      );

      await expect(validateIntegrationSurface(root)).rejects.toThrow("simulated EACCES");
    });
  });

  it("propagates ENOTDIR, which says a path component is not a directory", async () => {
    // `.claude/skills` written as a regular file makes every child probe return
    // ENOTDIR. Read as "not created yet", every wrapper under it was skipped and
    // a surface the assistant can load nothing from passed — the exact failure
    // this rule exists to catch.
    await withProject(async (root) => {
      await seedCanonical(root);
      lstatSpy.mockImplementation(() => Promise.reject(errno("ENOTDIR")));

      await expect(validateIntegrationSurface(root)).rejects.toThrow("simulated ENOTDIR");
    });
  });

  it("propagates a stat failure instead of calling the wrapper dangling", async () => {
    // The remedy this finding prints is "re-run `qfai init`", which leaves the
    // wrapper `skipped` because the target string is already correct — a
    // QFAI-LINK-001 an operator cannot clear by following it.
    await withProject(async (root) => {
      await seedCanonical(root);
      const wrapper = path.join(root, ".claude", "skills", "qfai-atdd");
      await mkdir(path.dirname(wrapper), { recursive: true });
      await symlink("../../.qfai/assistant/skills/qfai-atdd", wrapper, "dir");
      statSpy.mockImplementation(() => Promise.reject(errno("EACCES")));

      await expect(validateIntegrationSurface(root)).rejects.toThrow("simulated EACCES");
    });
  });

  it("propagates a readlink failure instead of reporting the wrong target", async () => {
    // A transient EIO reported a healthy wrapper as `points at ?`, and the
    // remedy the finding prints — re-run `qfai init` — calls the same
    // `readlink` and fails the same way.
    await withProject(async (root) => {
      await seedCanonical(root);
      const wrapper = path.join(root, ".claude", "skills", "qfai-atdd");
      await mkdir(path.dirname(wrapper), { recursive: true });
      await symlink("../../.qfai/assistant/skills/qfai-atdd", wrapper, "dir");
      readlinkSpy.mockImplementation(() => Promise.reject(errno("EIO")));

      await expect(validateIntegrationSurface(root)).rejects.toThrow("simulated EIO");
    });
  });

  it("still treats a missing directory as nothing to check", async () => {
    await withProject(async (root) => {
      await seedCanonical(root);

      // No wrapper directories exist at all — the ordinary state of a project
      // that has not run `qfai init` yet, and not a finding.
      await expect(validateIntegrationSurface(root)).resolves.toEqual([]);
    });
  });
});

describe("a structurally broken target is a finding, not a crash", () => {
  it("reports ELOOP instead of propagating it", async () => {
    // `ELOOP` says the target is a symlink cycle — structural damage to the
    // thing this rule inspects, not a transient fault. Re-thrown, `qfai
    // validate` exited with a stack trace and named nothing to repair.
    await withProject(async (root) => {
      await seedCanonical(root);
      const wrapper = path.join(root, ".claude", "skills", "qfai-atdd");
      await mkdir(path.dirname(wrapper), { recursive: true });
      await symlink("../../.qfai/assistant/skills/qfai-atdd", wrapper, "dir");
      statSpy.mockImplementation(() => Promise.reject(errno("ELOOP")));

      const issues = await validateIntegrationSurface(root);
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-LINK-001"]);
      expect(issues[0]?.message).toContain("symlink cycle");
    });
  });
});
