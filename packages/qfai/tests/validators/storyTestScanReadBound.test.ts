/**
 * The story-tree test scan reads every selected test file. A selection may hold thousands of
 * files, and opening them all at once can exhaust file descriptors (`EMFILE`), so the reads are
 * made in bounded batches. The reads of files under the fixture are delayed and counted while in
 * flight, so the bound is observed rather than inferred.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it, vi } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";

const reads = { root: "", inFlight: 0, peak: 0, started: [] as string[] };

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof fsPromises>("node:fs/promises");
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      const [file] = args;
      if (reads.root === "" || typeof file !== "string" || !file.startsWith(reads.root)) {
        return actual.readFile(...args);
      }
      reads.started.push(file);
      reads.inFlight += 1;
      reads.peak = Math.max(reads.peak, reads.inFlight);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return await actual.readFile(...args);
      } finally {
        reads.inFlight -= 1;
      }
    },
  };
});

const { readStoryTests, STORY_TEST_READ_BATCH } =
  await import("../../src/core/validators/storyTreeObligations.js");

const CONFIG: QfaiConfig = {
  ...defaultConfig,
  validation: {
    ...defaultConfig.validation,
    traceability: {
      ...defaultConfig.validation.traceability,
      testFileGlobs: ["tests/**/*.test.ts"],
      testFileExcludeGlobs: [],
    },
  },
};

let fixtureRoot = "";

afterEach(async () => {
  reads.root = "";
  if (fixtureRoot !== "") await rm(fixtureRoot, { recursive: true, force: true });
  fixtureRoot = "";
});

it("never has more test files open than the read bound, and keeps the selection order", async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-story-read-bound-"));
  const count = STORY_TEST_READ_BATCH * 3 + 5;
  await mkdir(path.join(fixtureRoot, "tests", "unit"), { recursive: true });
  for (let index = 0; index < count; index += 1) {
    const name = `t${String(index).padStart(4, "0")}.test.ts`;
    await writeFile(path.join(fixtureRoot, "tests", "unit", name), `// ${name}\n`, "utf8");
  }
  reads.root = path.resolve(fixtureRoot);
  reads.inFlight = 0;
  reads.peak = 0;
  reads.started = [];

  const { files, truncated } = await readStoryTests(fixtureRoot, CONFIG);

  expect(truncated).toBe(false);
  expect(files).toHaveLength(count);
  expect(reads.peak).toBeGreaterThan(1);
  expect(reads.peak).toBeLessThanOrEqual(STORY_TEST_READ_BATCH);
  expect(files.map((file) => file.file)).toEqual(reads.started);
  for (const file of files) expect(file.content).toBe(`// ${path.basename(file.file)}\n`);
});
