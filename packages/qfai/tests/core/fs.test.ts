import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectFilesByGlobs,
  DEFAULT_GLOB_FILE_LIMIT,
} from "../../src/core/fs.js";

describe("collectFilesByGlobs", () => {
  it("truncates results when the limit is reached", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-fs-"));
    try {
      const files = ["a.txt", "b.txt", "c.txt"].map((name) =>
        path.join(root, name),
      );
      await Promise.all(files.map((file) => writeFile(file, "test\n")));

      const result = await collectFilesByGlobs(root, {
        globs: ["**/*.txt"],
        limit: 2,
      });

      expect(result.truncated).toBe(true);
      expect(result.limit).toBe(2);
      expect(result.files).toHaveLength(2);
      expect(result.matchedFileCount).toBe(2);

      const expected = new Set(files);
      for (const file of result.files) {
        expect(expected.has(file)).toBe(true);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns all files when under the limit", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-fs-"));
    try {
      const files = ["a.txt", "b.txt", "c.txt"].map((name) =>
        path.join(root, name),
      );
      await Promise.all(files.map((file) => writeFile(file, "test\n")));

      const result = await collectFilesByGlobs(root, {
        globs: ["**/*.txt"],
        limit: 10,
      });

      expect(result.truncated).toBe(false);
      expect(result.limit).toBe(10);
      expect(result.files).toHaveLength(3);
      expect(result.matchedFileCount).toBe(3);
      expect(new Set(result.files)).toEqual(new Set(files));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("normalizes limit edge cases", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-fs-"));
    try {
      const cases: Array<{ value?: number; expected: number }> = [
        { value: Number.NaN, expected: DEFAULT_GLOB_FILE_LIMIT },
        { value: -1, expected: DEFAULT_GLOB_FILE_LIMIT },
        { value: 0, expected: DEFAULT_GLOB_FILE_LIMIT },
        { value: 2.7, expected: 2 },
        { value: undefined, expected: DEFAULT_GLOB_FILE_LIMIT },
      ];

      for (const entry of cases) {
        const result = await collectFilesByGlobs(root, {
          globs: [],
          ...(entry.value !== undefined ? { limit: entry.value } : {}),
        });

        expect(result.limit).toBe(entry.expected);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
