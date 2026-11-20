/**
 * Only a missing `.qfai/waivers.yml` means there is no waiver file.
 *
 * The loader used to probe the file with `access` first and treat every probe
 * failure as absence. A containing directory that cannot be traversed then read
 * as "no waivers" and the read-error diagnostic never fired, while a file that
 * vanished between the probe and the read was reported as unreadable. The file
 * is now read directly and only `ENOENT` is absence.
 *
 * This file lives apart from `waivers.test.ts` because `vi.mock` is hoisted to
 * module scope and would otherwise apply to every case in that file.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Issue } from "../../src/core/types.js";

type FsPromises = typeof fsPromises;

const { accessSpy, readFileSpy } = vi.hoisted(() => ({
  accessSpy: vi.fn(),
  readFileSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    access: (...args: unknown[]) => accessSpy(actual, ...args),
    readFile: (...args: unknown[]) => readFileSpy(actual, ...args),
  };
});

const { applyWaivers } = await import("../../src/core/waivers.js");

const WAIVERS = [
  "version: 1",
  "waivers:",
  "  - id: WVR-20261120-01",
  "    rule: COMPAT-003",
  "    scope:",
  '      paths: ["**"]',
  '    reason: "accepted for now"',
  '    expires: "2099-01-01"',
  '    evidence: "decisions.md"',
  "",
].join("\n");

function errno(code: string, target: string): NodeJS.ErrnoException {
  const error = new Error(`${code}: simulated, open '${target}'`) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

function isWaiverFile(target: unknown): boolean {
  return String(target).endsWith(path.join(".qfai", "waivers.yml"));
}

const finding: Issue = {
  code: "QFAI-COMPAT-003",
  severity: "warning",
  category: "change",
  message: "sample finding",
  rule: "COMPAT-003",
};

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-waiver-read-"));
  try {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "waivers.yml"), WAIVERS, "utf-8");
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

beforeEach(() => {
  accessSpy.mockReset();
  readFileSpy.mockReset();
  accessSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.access(...args));
  readFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
    actual.readFile(...args),
  );
});

describe("applyWaivers when the waiver file cannot be read", () => {
  it("reports an untraversable directory with the path and cause", async () => {
    await withProject(async (root) => {
      const waiverPath = path.join(root, ".qfai", "waivers.yml");
      // A directory without search permission fails the probe and the read alike.
      accessSpy.mockImplementation((actual: FsPromises, target: string, ...rest: never[]) =>
        isWaiverFile(target)
          ? Promise.reject(errno("EACCES", target))
          : actual.access(target, ...rest),
      );
      readFileSpy.mockImplementation((actual: FsPromises, target: string, ...rest: never[]) =>
        isWaiverFile(target)
          ? Promise.reject(errno("EACCES", target))
          : actual.readFile(target, ...rest),
      );

      const result = await applyWaivers(root, [finding]);

      const readFailures = result.issues.filter((item) => item.code === "QFAI-WAIVER-001");
      expect(readFailures).toHaveLength(1);
      expect(readFailures[0]?.file).toBe(waiverPath);
      expect(readFailures[0]?.message).toContain("Failed to read waivers.yml");
      expect(readFailures[0]?.message).toContain("EACCES");
      expect(result.waivers.active).toEqual([]);
    });
  });

  it("treats a file removed before the read as no waiver file", async () => {
    await withProject(async (root) => {
      // The file was there when a probe would have looked, and gone by the read.
      readFileSpy.mockImplementation((actual: FsPromises, target: string, ...rest: never[]) =>
        isWaiverFile(target)
          ? Promise.reject(errno("ENOENT", target))
          : actual.readFile(target, ...rest),
      );

      const result = await applyWaivers(root, [finding]);

      expect(result.issues).toEqual([finding]);
      expect(result.waivers.active).toEqual([]);
    });
  });
});
