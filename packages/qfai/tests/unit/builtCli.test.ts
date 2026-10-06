import { mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { assertBuiltCliFresh, describeBuiltCliProblem } from "../helpers/builtCli.js";
import { removeTempTree } from "../helpers/tempTree.js";

const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((dir) => removeTempTree(dir)));
});

async function packageWithBuild(builtAt: number, sourceAt: number): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-built-cli-"));
  temporary.push(root);
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "dist", "cli"), { recursive: true });
  const written = [
    [path.join(root, "package.json"), 0],
    [path.join(root, "tsup.config.ts"), 0],
    [path.join(root, "tsconfig.build.json"), 0],
    [path.join(root, "src", "cli.ts"), sourceAt],
    [path.join(root, "dist", "cli", "index.mjs"), builtAt],
  ] as const;
  for (const [file, seconds] of written) {
    await writeFile(file, "");
    await utimes(file, seconds, seconds);
  }
  return root;
}

it("reports nothing when the build is newer than every source file", async () => {
  const root = await packageWithBuild(2000, 1000);
  expect(
    describeBuiltCliProblem(path.join(root, "dist", "cli", "index.mjs"), root),
  ).toBeUndefined();
});

it("names the newer source file and the build command when the build is stale", async () => {
  const root = await packageWithBuild(1000, 2000);
  const problem = describeBuiltCliProblem(path.join(root, "dist", "cli", "index.mjs"), root);
  expect(problem).toContain(path.join("src", "cli.ts"));
  expect(problem).toContain("pnpm -C packages/qfai build");
});

it("names the missing build and the build command when the CLI file is absent", async () => {
  const root = await packageWithBuild(2000, 1000);
  const missing = path.join(root, "dist", "cli", "absent.mjs");
  const problem = describeBuiltCliProblem(missing, root);
  expect(problem).toContain("missing");
  expect(problem).toContain(missing);
  expect(problem).toContain("pnpm -C packages/qfai build");
});

it("throws the problem as an error", () => {
  expect(() => assertBuiltCliFresh(path.join(os.tmpdir(), "qfai-no-such-build.mjs"))).toThrow(
    "pnpm -C packages/qfai build",
  );
});
