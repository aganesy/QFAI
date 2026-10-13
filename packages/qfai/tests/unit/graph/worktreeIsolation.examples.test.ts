import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { restoreCompletedCodeAnalysis } from "../../../src/core/graph/reuse.js";
import { graphAnalysisRoot, graphRuntimePaths } from "../../../src/core/graph/layout.js";
import { codegraphEnvironment } from "../../../src/core/graph/process.js";
import { completedCodeSnapshotFixture } from "../../helpers/graphReuse.js";

// QFAI:EX-0001-0236-04
// Mutation: packages/qfai/src/core/graph/reuse.ts `await cp(cached, staged, { recursive: true, dereference: false });` -> `await (await import("node:fs/promises")).symlink(cached, staged, process.platform === "win32" ? "junction" : "dir");` fails "keeps concurrent worktree copies and their native operations independent"
it("keeps concurrent worktree copies and their native operations independent", async () => {
  const fixture = await completedCodeSnapshotFixture();
  const other = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-other-worktree-"));
  const operations: { cwd: string; args: readonly string[] }[] = [];
  const run: typeof fixture.run = (command, args, options) => {
    operations.push({ cwd: options.cwd, args });
    return fixture.run(command, args, options);
  };
  try {
    await writeFile(
      path.join(other, "checkout.ts"),
      await readFile(path.join(fixture.root, "checkout.ts"), "utf8"),
    );
    await expect(
      Promise.all([
        restoreCompletedCodeAnalysis(fixture.root, run, fixture.environment),
        restoreCompletedCodeAnalysis(other, run, fixture.environment),
      ]),
    ).resolves.toEqual(["restored", "restored"]);
    const first = path.join(fixture.analysis, ".codegraph", "codegraph.db");
    const second = path.join(graphAnalysisRoot(other, "codegraph"), ".codegraph", "codegraph.db");
    expect((await lstat(first)).nlink).toBe(1);
    expect((await lstat(second)).nlink).toBe(1);
    expect((await lstat(first)).ino).not.toBe((await lstat(second)).ino);
    await Promise.all([
      writeFile(first, "First worktree uncommitted state"),
      writeFile(second, "Second worktree uncommitted state"),
    ]);
    expect(await readFile(first, "utf8")).toBe("First worktree uncommitted state");
    expect(await readFile(second, "utf8")).toBe("Second worktree uncommitted state");
    expect(
      await readFile(
        path.join(fixture.candidate, "analysis", ".codegraph", "codegraph.db"),
        "utf8",
      ),
    ).toBe("Process-port DB marker");
    const checks = operations.filter((operation) => operation.args.includes("status"));
    expect(new Set(checks.map((operation) => operation.cwd))).toEqual(
      new Set([fixture.root, other]),
    );
    expect(
      operations.some(
        (operation) => operation.args.includes("watch") || operation.args.includes("serve"),
      ),
    ).toBe(false);
  } finally {
    await fixture.dispose();
    await rm(other, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0236-05
// Mutation: packages/qfai/src/core/graph/layout.ts `const directory = path.join(root, ".qfai", "tools", "runtimes", graphEnvironmentKey(environment));` -> `const directory = path.join(root, ".qfai", "tools", "runtimes", graphEnvironmentKey({ ...environment, platform: "win32" }));` fails "separates Windows and WSL runtime analysis and native home state for the same root"
it("separates Windows and WSL runtime analysis and native home state for the same root", () => {
  const root = path.resolve("same-worktree");
  const windows = { platform: "win32", architecture: "x64" };
  const wsl = { platform: "linux", architecture: "x64" };
  const windowsRuntime = graphRuntimePaths(root, windows);
  const wslRuntime = graphRuntimePaths(root, wsl);
  expect(windowsRuntime.directory).not.toBe(wslRuntime.directory);
  expect(windowsRuntime.python).toContain(path.join("Scripts", "python.exe"));
  expect(wslRuntime.python).toContain(path.join("bin", "python"));
  for (const engine of ["codegraph", "graphify", "graphify-code"] as const) {
    expect(graphAnalysisRoot(root, engine, windows)).not.toBe(graphAnalysisRoot(root, engine, wsl));
  }
  expect(codegraphEnvironment(root, windows).HOME).not.toBe(codegraphEnvironment(root, wsl).HOME);
  expect(codegraphEnvironment(root, windows).CODEGRAPH_INSTALL_DIR).not.toBe(
    codegraphEnvironment(root, wsl).CODEGRAPH_INSTALL_DIR,
  );
});
