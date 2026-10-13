import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { runGraphProcess } from "../../../src/core/graph/process.js";
import { ensureGraphGitignore, GRAPH_IGNORE_MARKER } from "../../../src/core/graph/ignore.js";

async function repository() {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-ignore-"));
  expect((await runGraphProcess("git", ["init", "--quiet"], { cwd: root })).exitCode).toBe(0);
  await mkdir(path.join(root, ".qfai"));
  return root;
}

// QFAI:EX-0001-0236-16
// Mutation: packages/qfai/src/core/graph/ignore.ts `/.qfai/tools/${newline}` -> `/.qfai/runtime-only/${newline}` fails "excludes generated analysis runtimes caches and markers while keeping source definitions trackable"
it("excludes generated analysis runtimes caches and markers while keeping source definitions trackable", async () => {
  const root = await repository();
  try {
    expect((await ensureGraphGitignore(root, runGraphProcess)).conflicts).toEqual([]);
    for (const generated of [
      ".qfai/tools/analysis/win32-x64/codegraph/.codegraph/codegraph.db",
      ".qfai/tools/analysis/win32-x64/graphify/graphify-out/graph.json",
      ".qfai/tools/analysis/win32-x64/graphify/graphify-out/manifest.json",
      ".qfai/tools/analysis/win32-x64/graphify/graphify-out/cache/entry.json",
      ".qfai/tools/runtimes/win32-x64/graphify/Scripts/python.exe",
      ".qfai/tools/session/socket.json",
    ]) {
      expect(
        (
          await runGraphProcess("git", ["check-ignore", "--no-index", "-q", generated], {
            cwd: root,
          })
        ).exitCode,
        generated,
      ).toBe(0);
    }
    for (const source of ["checkout.ts", ".qfai/graph-processing.json"]) {
      expect(
        (await runGraphProcess("git", ["check-ignore", "--no-index", "-q", source], { cwd: root }))
          .exitCode,
        source,
      ).toBe(1);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0236-17
// Mutation: packages/qfai/src/core/graph/ignore.ts `if (content.includes(GRAPH_IGNORE_MARKER)) {` -> `if (false) {` fails "preserves removed managed ignores and tracked output with concrete conflict recovery"
it("preserves removed managed ignores and tracked output with concrete conflict recovery", async () => {
  for (const choice of ["removed", "tracked", "negated"] as const) {
    const root = await repository();
    try {
      const content =
        choice === "removed"
          ? `${GRAPH_IGNORE_MARKER}\n# Generated files are intentionally tracked\n`
          : choice === "negated"
            ? `${GRAPH_IGNORE_MARKER}\n/.qfai/tools/\n!/.qfai/tools/\n`
            : "# Adopter choices\n";
      await writeFile(path.join(root, ".gitignore"), content);
      if (choice === "tracked") {
        await mkdir(path.join(root, ".qfai", "tools"));
        await writeFile(path.join(root, ".qfai", "tools", "graph.json"), "Tracked by adopter");
        expect(
          (await runGraphProcess("git", ["add", "--", ".qfai/tools/graph.json"], { cwd: root }))
            .exitCode,
        ).toBe(0);
      }
      const result = await ensureGraphGitignore(root, runGraphProcess);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toContain(".qfai/tools/");
      expect(result.files).toEqual([]);
      expect(await readFile(path.join(root, ".gitignore"), "utf8")).toBe(content);
      if (choice === "tracked") {
        expect(await readFile(path.join(root, ".qfai", "tools", "graph.json"), "utf8")).toBe(
          "Tracked by adopter",
        );
        expect(
          (
            await runGraphProcess("git", ["ls-files", "--", ".qfai/tools/graph.json"], {
              cwd: root,
            })
          ).stdout.trim(),
        ).toBe(".qfai/tools/graph.json");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});
