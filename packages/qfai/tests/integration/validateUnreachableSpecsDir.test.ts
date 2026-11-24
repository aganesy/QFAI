/**
 * `qfai validate` on a `paths.specsDir` root it may not reach reports an unfinished run.
 *
 * Only a root that is not there is an empty scan. A root the run may not reach stops validation,
 * and `runValidate` turns that into one `QFAI-SCAN-002` naming the directory and the errno, with
 * a non-zero exit, rather than a pass over an empty story tree. Its suggested action is the
 * advice for an unreadable path, not the Windows worktree note, which fits `EPERM` alone.
 *
 * The root is made unreachable by rejecting `access` on that one path with `EACCES`, so the case
 * runs on every platform and as root, where a mode bit would not stop the check.
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import type * as FsPromisesModule from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { graphProcessFixture } from "../helpers/graphProcess.js";

type FsPromises = typeof FsPromisesModule;

const denied = vi.hoisted(() => ({ target: "" }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    access: (...args: Parameters<FsPromises["access"]>) => {
      const [target] = args;
      if (denied.target !== "" && path.resolve(String(target)) === denied.target) {
        const error: NodeJS.ErrnoException = new Error(
          `EACCES: permission denied, access '${denied.target}'`,
        );
        error.code = "EACCES";
        error.syscall = "access";
        error.path = denied.target;
        return Promise.reject(error);
      }
      return actual.access(...args);
    },
  };
});

const { runInit } = await import("../../src/cli/commands/init.js");
const { runValidate } = await import("../../src/cli/commands/validate.js");

const dirs: string[] = [];

afterEach(async () => {
  denied.target = "";
  for (const dir of dirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

type Finding = { code: string; severity: string; message: string; suggested_action?: string };

/** The exit code of `qfai validate` under the default `--fail-on`, and the findings it wrote. */
async function validate(root: string): Promise<{ exitCode: number; issues: Finding[] }> {
  const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  let exitCode: number;
  try {
    exitCode = await runValidate({ root, strict: false, format: "text" });
  } finally {
    write.mockRestore();
    stderr.mockRestore();
  }
  const raw = await readFile(path.join(root, ".qfai", "report", "validate.json"), "utf-8");
  const parsed: { issues: Finding[] } = JSON.parse(raw);
  return { exitCode, issues: parsed.issues };
}

// QFAI:EX-0001-0039-67
describe("validate on a paths.specsDir root it may not reach", () => {
  it("fails with one QFAI-SCAN-002 naming the directory and EACCES, with advice for an unreadable path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-unreachable-specs-"));
    dirs.push(root);
    await runInit(
      { dir: root, force: false, dryRun: false, yes: true },
      undefined,
      graphProcessFixture().run,
    );
    const specsDir = path.resolve(root, ".qfai", "spec");

    // The control: while the root is reachable, the run finishes.
    const reachable = await validate(root);
    expect(reachable.issues.map((entry) => entry.code)).not.toContain("QFAI-SCAN-002");

    denied.target = specsDir;
    const unreachable = await validate(root);
    expect(unreachable.exitCode).toBe(1);
    const incomplete = unreachable.issues.filter((entry) => entry.code === "QFAI-SCAN-002");
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.severity).toBe("error");
    expect(incomplete[0]?.message).toContain("EACCES");
    expect(incomplete[0]?.message).toContain(specsDir);
    expect(incomplete[0]?.suggested_action).toContain("make it readable by this user");
    expect(incomplete[0]?.suggested_action).not.toContain("worktree");
    expect(incomplete[0]?.suggested_action).not.toContain("qfai init");
  });
});
