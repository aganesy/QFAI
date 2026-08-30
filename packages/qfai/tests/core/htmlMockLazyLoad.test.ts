/**
 * Review finding [32]: `validateHtmlMock` imported jsdom whether or not it had anything to parse.
 *
 * Moving that import off module scope is what stopped every `qfai` command paying jsdom's 910 ms.
 * Paying it inside the validator regardless handed the whole saving straight back to `validate`,
 * which is the command that runs on the overwhelmingly common tree with no HTML mock in it at all —
 * and because the import now happens after `startTime`, a project whose `htmlMockTimeout` is under
 * 910 ms would raise `QFAI-MOCK-099` having inspected nothing.
 *
 * Asserted by MOCKING the module rather than by timing it. A stopwatch here measures the module
 * cache: by the time this file runs, another test has usually loaded jsdom already, so the import
 * is free and the assertion passes whatever the code does. A factory that throws cannot be
 * satisfied that way — it runs if and only if the import does.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/core/uiux/htmlMockDom.js", () => {
  throw new Error("jsdom-backed module imported with no HTML mock block to parse");
});

import { validateHtmlMock } from "../../src/core/validators/htmlMock.js";
import type { QfaiConfig } from "../../src/core/config.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

function config(): QfaiConfig {
  return {
    paths: {
      discussionDir: ".qfai/discussion",
      specsDir: ".qfai/specs",
    },
    uiux: { htmlMockTimeout: 2000 },
  } as unknown as QfaiConfig;
}

describe("the HTML mock validator loads jsdom only when there is a block to parse", () => {
  it("returns without importing it on a tree that has no mock block", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mock-"));
    dirs.push(root);
    await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
    // A real markdown file with a real fenced block, so the scan has something to read and reject
    // rather than finding no files at all — the assertion must not hold for the empty-tree reason.
    await writeFile(
      path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md"),
      ["# Spec", "", "```ts", "const x = 1;", "```", ""].join("\n"),
      "utf-8",
    );

    await expect(validateHtmlMock(root, "web", config())).resolves.toEqual([]);
  });
});
