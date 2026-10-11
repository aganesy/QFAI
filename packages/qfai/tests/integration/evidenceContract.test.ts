import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { readImplementFlowSteps } from "../helpers/implementSteps.js";
import { readShipped, sectionOf, shippedExists } from "../helpers/shippedAssistant.js";
import { removeTempTree } from "../helpers/tempTree.js";

async function readSkill(): Promise<string> {
  return readImplementFlowSteps(path.join(getInitAssetsDir(), ".qfai", "assistant"));
}

describe("implementation evidence contract", () => {
  it("does not accept an unevidenced status or reasoning as proof of a gate", async () => {
    const skill = await readSkill();
    expect(skill).toMatch(/Evidence without a command and result pair does not prove a\s+gate/);
    expect(skill).toMatch(/A failing or unrun gate cannot be reported as PASS/);
    expect(skill).toMatch(/when its RED, GREEN and Refactor results are\s+observed and recorded/);
  });
});

const OBSERVATION_GUIDE = "skill/qfai-run/references/reached-step-observations.md";

async function nativeObservationExample(): Promise<string> {
  expect(shippedExists(OBSERVATION_GUIDE), "the shipped reached-step guide exists").toBe(true);
  const guide = await readShipped(OBSERVATION_GUIDE);
  const example = sectionOf(guide, "## Native read-only example");
  const blocks = [...example.matchAll(/```js\r?\n([\s\S]*?)\r?\n```/g)];
  expect(blocks, "one actual published native example, not a fixture substitute").toHaveLength(1);
  const code = blocks[0]?.[1] ?? "";
  expect(code).not.toBe("");
  return code;
}

interface ObservationFixture {
  root: string;
  source: string;
  program: string;
  env: NodeJS.ProcessEnv;
  git: (args: readonly string[]) => string;
}

async function withObservationFixture(
  code: string,
  run: (fixture: ObservationFixture) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "qfai-observation-proof-"));
  try {
    const env: NodeJS.ProcessEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
    );
    const git = (args: readonly string[]): string =>
      execFileSync(
        "git",
        [
          "-c",
          "maintenance.auto=false",
          "-c",
          "gc.auto=0",
          "-c",
          "core.autocrlf=false",
          "-C",
          root,
          ...args,
        ],
        { encoding: "utf8", env, maxBuffer: 1024 * 1024, timeout: 10_000 },
      );
    git(["init", "--initial-branch=main"]);
    await writeFile(path.join(root, "receipt.txt"), "original controlled artifact\n", "utf8");
    git(["add", "--", "receipt.txt"]);
    git([
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "Controlled source",
    ]);
    const source = git(["rev-parse", "HEAD"]).trim();
    const program = path.join(root, "native-observations.mjs");
    await writeFile(program, code, "utf8");
    await run({ root, source, program, env, git });
  } finally {
    await removeTempTree(root);
  }
}

// These controlled native examples prove only the published Git reads and their raw outcomes.
// They do not certify a person's reached-step comparison, understanding or adherence.
// QFAI:AC-0001-0224-12
describe("the published native observation example", () => {
  // QFAI:EX-0001-0224-37
  it("reads source and artifact without changing tracked bytes, index or HEAD", async () => {
    const code = await nativeObservationExample();
    await withObservationFixture(code, async ({ root, source, program, env }) => {
      const files = [
        path.join(root, "receipt.txt"),
        path.join(root, ".git", "index"),
        path.join(root, ".git", "HEAD"),
        program,
      ];
      const before = await Promise.all(files.map((file) => readFile(file)));
      const observed = spawnSync(process.execPath, [program, root, source, "receipt.txt"], {
        encoding: "utf8",
        env,
        maxBuffer: 4 * 1024 * 1024,
        timeout: 30_000,
      });
      expect(observed.error).toBeUndefined();
      expect(observed.signal).toBeNull();
      expect(observed.status).toBe(0);
      expect(observed.stderr).toBe("");
      expect(observed.stdout).toContain(source);
      expect(observed.stdout).toContain("original controlled artifact");
      expect(observed.stdout.match(/exit: 0/g)).toHaveLength(3);
      expect(await Promise.all(files.map((file) => readFile(file)))).toEqual(before);
    });
  });

  // QFAI:EX-0001-0224-41
  it("retains the missing artifact command's nonzero exit and raw stderr without writes", async () => {
    const code = await nativeObservationExample();
    await withObservationFixture(code, async ({ root, source, program, env }) => {
      const before = await readFile(path.join(root, ".git", "index"));
      const observed = spawnSync(process.execPath, [program, root, source, "missing-receipt.txt"], {
        encoding: "utf8",
        env,
        maxBuffer: 4 * 1024 * 1024,
        timeout: 30_000,
      });
      expect(observed.error).toBeUndefined();
      expect(observed.signal).toBeNull();
      expect(observed.status).toBe(1);
      expect(observed.stdout).toMatch(/git show exit: [1-9]\d*/);
      expect(observed.stderr).toContain("missing-receipt.txt");
      expect(observed.stderr).toMatch(/fatal:/i);
      expect(await readFile(path.join(root, ".git", "index"))).toEqual(before);
      expect(await readFile(path.join(root, "receipt.txt"), "utf8")).toBe(
        "original controlled artifact\n",
      );
    });
  });

  // QFAI:EX-0001-0224-39
  it("exposes an old-source artifact beside current HEAD for the human identity comparison", async () => {
    const code = await nativeObservationExample();
    await withObservationFixture(code, async ({ root, source, program, env, git }) => {
      await writeFile(path.join(root, "receipt.txt"), "current controlled artifact\n", "utf8");
      git(["add", "--", "receipt.txt"]);
      git([
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "-m",
        "New controlled source",
      ]);
      const current = git(["rev-parse", "HEAD"]).trim();
      expect(current).not.toBe(source);
      const observed = spawnSync(process.execPath, [program, root, source, "receipt.txt"], {
        encoding: "utf8",
        env,
        maxBuffer: 4 * 1024 * 1024,
        timeout: 30_000,
      });
      expect(observed.error).toBeUndefined();
      expect(observed.status).toBe(0);
      expect(observed.stdout).toContain(current);
      expect(observed.stdout).toContain("original controlled artifact");
      expect(observed.stdout).not.toContain("current controlled artifact");
      expect(await readFile(path.join(root, "receipt.txt"), "utf8")).toBe(
        "current controlled artifact\n",
      );
      const binding = sectionOf(
        await readShipped(OBSERVATION_GUIDE),
        "## Purpose and source binding",
      );
      expect(binding).toMatch(/old source[\s\S]*UNVERIFIED/i);
    });
  });
});
