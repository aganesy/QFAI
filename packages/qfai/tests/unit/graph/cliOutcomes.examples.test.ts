import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import * as initCommand from "../../../src/cli/commands/init.js";
import { run } from "../../../src/cli/main.js";
import { captureStdout } from "../../helpers/stdout.js";
import { runInit } from "../../../src/cli/commands/init.js";
import { graphProcessFixture } from "../../helpers/graphProcess.js";

// QFAI:EX-0001-0237-16
it("classifies the native scandir failure as required-file IO", async () => {
  const failure = Object.assign(new Error("ENOTDIR: not a directory, scandir"), {
    code: "ENOTDIR",
    syscall: "scandir",
    path: "destination.txt/.qfai/spec",
  });
  const initialize = vi.spyOn(initCommand, "runInit").mockRejectedValue(failure);
  const previousExit = process.exitCode;
  try {
    process.exitCode = undefined;
    await expect(captureStdout(() => run(["init"], process.cwd()))).resolves.toBeTypeOf("string");
    expect(process.exitCode).toBe(64);
  } finally {
    initialize.mockRestore();
    process.exitCode = previousExit;
  }
});

// QFAI:EX-0001-0237-16
// Mutation: packages/qfai/src/cli/main.ts `isFileSystemError(current) &&` -> `false &&` fails "returns the required-file IO exit code when the destination is a file"
it("returns the required-file IO exit code when the destination is a file", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-io-"));
  const destination = path.join(root, "destination.txt");
  const previousExit = process.exitCode;
  try {
    await writeFile(destination, "Keep this file.\n");
    process.exitCode = undefined;
    await expect(
      captureStdout(() => run(["init", "--dir", destination], root)),
    ).resolves.toBeTypeOf("string");
    expect(process.exitCode).toBe(64);
  } finally {
    process.exitCode = previousExit;
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-18
// Mutation: packages/qfai/src/cli/lib/args.ts `invalidExitCode: 2,` -> `invalidExitCode: 3,` fails "refuses invalid init arguments with exit two before provisioning"
it("refuses invalid init arguments with exit two before provisioning", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-arguments-"));
  const previousExit = process.exitCode;
  try {
    process.exitCode = undefined;
    await captureStdout(() => run(["init", "--unknown-graph-option", "--dir", root], root));
    expect(process.exitCode).toBe(2);
    expect(await readdir(root)).toEqual([]);
  } finally {
    process.exitCode = previousExit;
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-17
// Mutation: packages/qfai/src/core/graph/presentation.ts `"Graph tools preview",` -> `"Graph tools",` fails "previews graph preparation without writes or graph processes"
it("previews graph preparation without writes or graph processes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-preview-"));
  const fixture = graphProcessFixture();
  try {
    const output = await captureStdout(() =>
      runInit({ dir: root, force: false, dryRun: true, yes: false }, {}, fixture.run),
    );
    expect(output).toContain("Graph tools preview");
    expect(output).toContain("Planned actions");
    expect(output).toContain("Observed status");
    expect(output).toContain(
      "Preview only. No files, downloads, analysis or processes were changed.",
    );
    expect(output).not.toContain("CodeGraph: installed");
    expect(await readdir(root)).toEqual([]);
    expect(fixture.calls).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
