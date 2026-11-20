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

/** The errno each operation raises on the waiver file; empty means no fault. */
const faults = vi.hoisted(() => ({ access: "", readFile: "" }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    access: async (...args: Parameters<FsPromises["access"]>) => {
      if (faults.access && isWaiverFile(args[0])) throw errno(faults.access, args[0]);
      return actual.access(...args);
    },
    readFile: async (...args: Parameters<FsPromises["readFile"]>) => {
      if (faults.readFile && isWaiverFile(args[0])) throw errno(faults.readFile, args[0]);
      return actual.readFile(...args);
    },
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

function errno(code: string, target: unknown): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`${code}: simulated, open '${String(target)}'`);
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
  faults.access = "";
  faults.readFile = "";
});

describe("applyWaivers when the waiver file cannot be read", () => {
  it("reports an untraversable directory with the path and cause", async () => {
    await withProject(async (root) => {
      // A directory without search permission fails the probe and the read alike.
      faults.access = "EACCES";
      faults.readFile = "EACCES";

      const result = await applyWaivers(root, [finding]);

      const readFailures = result.issues.filter((item) => item.code === "QFAI-WAIVER-001");
      expect(readFailures).toHaveLength(1);
      expect(readFailures[0]?.file).toBe(path.join(root, ".qfai", "waivers.yml"));
      expect(readFailures[0]?.message).toContain("Failed to read waivers.yml");
      expect(readFailures[0]?.message).toContain("EACCES");
      expect(result.waivers.active).toEqual([]);
    });
  });

  it("treats a file removed before the read as no waiver file", async () => {
    await withProject(async (root) => {
      // The file was there when a probe would have looked, and gone by the read.
      faults.readFile = "ENOENT";

      const result = await applyWaivers(root, [finding]);

      expect(result.issues).toEqual([finding]);
      expect(result.waivers.active).toEqual([]);
    });
  });
});
