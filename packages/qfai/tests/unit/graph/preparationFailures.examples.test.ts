import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import {
  GRAPH_VERSIONS,
  graphRuntimePaths,
  prepareGraphRuntimes,
  shellArgument,
  windowsPathLimitRecovery,
} from "../../../src/core/graph/prepare.js";
import { renderGraphPreparation } from "../../../src/core/graph/presentation.js";
import { graphProcessFixture } from "../../helpers/graphProcess.js";
import { graphAnalysisRoot } from "../../../src/core/graph/analysis.js";
import {
  GRAPH_PROCESS_LIMITS,
  runGraphProcess,
  type GraphProcessResult,
} from "../../../src/core/graph/process.js";

// QFAI:EX-0001-0237-05
// Mutation: packages/qfai/src/core/graph/prepare.ts `recovery: "Install Python 3.10 or later and uv, then run qfai init again."` -> `recovery: "Install Python 3.9 and uv, then run qfai init again."` fails "reports an unmet interpreter prerequisite with a recovery action"
it("reports an unmet interpreter prerequisite with a recovery action", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-prerequisite-"));
  const fixture = graphProcessFixture();
  try {
    const result = await prepareGraphRuntimes(root, (command, args, options) =>
      command === "uv" && args[0] === "venv"
        ? Promise.resolve({ exitCode: 1, stdout: "" })
        : fixture.run(command, args, options),
    );
    expect(result.runtime).toBe("not-ready");
    expect(result.failedStep).toContain("Python 3.10+");
    expect(renderGraphPreparation(result)).toContain("Install Python 3.10 or later and uv");
    expect(renderGraphPreparation(result)).toContain("CodeGraph: not-ready");
    expect(renderGraphPreparation(result)).toContain("Graphify: not-ready");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-21
// Mutation: packages/qfai/src/core/graph/prepare.ts `(await inspectCurrentCodeAnalysis(root, run)) ? "code-ready" : "code-not-ready"` -> `(await inspectCurrentCodeAnalysis(root, run)) ? "code-not-ready" : "code-ready"` fails "reports current code analysis without starting another analysis or document model"
it("reports current code analysis without starting another analysis or document model", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-current-"));
  const fixture = graphProcessFixture();
  try {
    await prepareGraphRuntimes(root, fixture.run);
    await writeFile(path.join(root, "source.ts"), "export const current = true;\n");
    const analysis = graphAnalysisRoot(root, "codegraph");
    await mkdir(path.join(analysis, ".codegraph"), { recursive: true });
    await writeFile(
      path.join(analysis, ".codegraph", "codegraph.db"),
      "native-status port fixture\n",
    );
    const calls: string[][] = [];
    const result = await prepareGraphRuntimes(root, async (command, args, options) => {
      if (args.includes("status")) {
        calls.push([...args]);
        return {
          exitCode: 0,
          stdout: JSON.stringify({
            initialized: true,
            version: "1.6.2",
            projectPath: analysis,
            worktreeMismatch: null,
            pendingChanges: { added: 0, modified: 0, removed: 0 },
            index: {
              state: "complete",
              pendingRefs: 0,
              reindexRecommended: false,
              builtWithExtractionVersion: 1,
              currentExtractionVersion: 1,
              builtWithVersion: "1.6.2",
            },
          }),
        };
      }
      return fixture.run(command, args, options);
    });
    expect(result.code).toBe("code-ready");
    expect(result.documents).toBe("documents-not-ready");
    expect(calls).toHaveLength(1);
    expect(
      fixture.calls.some(
        (call) =>
          call.args.includes("index") ||
          call.args.includes("extract") ||
          call.args.includes("serve"),
      ),
    ).toBe(false);
    expect(await readFile(path.join(analysis, "source.ts"), "utf8")).toBe(
      "export const current = true;\n",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-20
// Mutation: packages/qfai/src/core/graph/presentation.ts `${preparation.documents}` -> `${preparation.code}` fails "distinguishes installed tools from unset document processing"
it("distinguishes installed tools from unset document processing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-readiness-"));
  const fixture = graphProcessFixture();
  try {
    const result = await prepareGraphRuntimes(root, fixture.run);
    const output = renderGraphPreparation(result);
    expect(result.failedStep).toBeUndefined();
    expect(output).toContain("CodeGraph: installed");
    expect(output).toContain("Graphify: installed");
    expect(output).toContain("  documents-not-ready");
    expect(output).toContain(".qfai/graph-processing.json");
    expect(output).toContain(".agents/rules/graph-exploration.md");
    expect(output).toContain("node .qfai/tools/graph-cli.mjs documents");
    expect(
      fixture.calls.some(
        (call) => call.args.includes("extract") || call.args.includes("--backend"),
      ),
    ).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-15
// Mutation: packages/qfai/src/core/graph/prepare.ts `graphifyVersion.stdout.trim() !== GRAPH_VERSIONS.graphify` -> `false` fails "does not activate a replacement with an unsupported version"
it("does not activate a replacement with an unsupported version", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-incompatible-"));
  const fixture = graphProcessFixture();
  try {
    await prepareGraphRuntimes(root, fixture.run);
    const paths = graphRuntimePaths(root);
    const prior = await readFile(paths.python);
    const result = await prepareGraphRuntimes(root, (command, args, options) =>
      args.includes("-c")
        ? Promise.resolve({ exitCode: 0, stdout: "99.0.0" })
        : fixture.run(command, args, options),
    );
    expect(result.failedStep).toBe("Graphify compatibility");
    expect(result.runtime).toBe("not-ready");
    expect(await readFile(paths.python)).toEqual(prior);
    expect(renderGraphPreparation(result)).toContain("Previous installation: retained");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-14
// Mutation: packages/qfai/src/core/graph/prepare.ts `previousInstallation: codegraphReady || graphifyReady ? "retained" : "none",` -> `previousInstallation: "none",` fails "retains the prior installation after an interrupted replacement download"
it("retains the prior installation after an interrupted replacement download", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-download-"));
  const fixture = graphProcessFixture();
  try {
    await prepareGraphRuntimes(root, fixture.run);
    const paths = graphRuntimePaths(root);
    const prior = await readFile(paths.codegraph);
    const result = await prepareGraphRuntimes(root, (command, args, options) => {
      if (command === paths.python) return Promise.resolve({ exitCode: 0, stdout: "0.9.85" });
      if (args[0] === "pip") return Promise.resolve({ exitCode: 1, stdout: "" });
      return fixture.run(command, args, options);
    });
    expect(result.runtime).toBe("not-ready");
    expect(result.failedStep).toBe("Graphify download");
    expect(await readFile(paths.codegraph)).toEqual(prior);
    expect(renderGraphPreparation(result)).toContain("Previous installation: retained");
    expect(renderGraphPreparation(result)).toContain("CodeGraph: installed");
    expect(renderGraphPreparation(result)).toContain("Graphify: not-ready");
    const inverse = await prepareGraphRuntimes(root, (command, args, options) => {
      if (args.includes("--version")) return Promise.resolve({ exitCode: 0, stdout: "1.6.1" });
      if (args.includes("install") && args.includes("--prefix"))
        return Promise.resolve({ exitCode: 1, stdout: "" });
      return fixture.run(command, args, options);
    });
    expect(inverse.failedStep).toBe("CodeGraph download");
    expect(renderGraphPreparation(inverse)).toContain("CodeGraph: not-ready");
    expect(renderGraphPreparation(inverse)).toContain("Graphify: installed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/** The argument as the shell of this platform reads it literally. */
function quoted(value: string): string {
  return shellArgument(value) ?? "unquotable";
}

// QFAI:EX-0001-0237-22
// Mutation: packages/qfai/src/core/graph/prepare.ts `const directory = shellArgument(created);` -> `const directory = shellArgument(path.join(os.tmpdir(), "qfai-graph-check", engine));` fails "names a command to rerun a failed download by hand"
it("names a command to rerun a failed download by hand", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-rerun-"));
  const fixture = graphProcessFixture();
  const installerOutput = "INSTALLER-OUTPUT-SENTINEL token=secret";
  const allocated: string[] = [];
  try {
    const graphifyResult = await prepareGraphRuntimes(root, (command, args, options) =>
      args[0] === "pip"
        ? Promise.resolve({ exitCode: 1, stdout: installerOutput })
        : fixture.run(command, args, options),
    );
    const graphifyDirectory = await freshRerunDirectory(
      graphifyResult.rerun?.directory,
      "graphify",
    );
    allocated.push(graphifyDirectory);
    expect(graphifyDirectory).not.toContain(root);
    const graphify = renderGraphPreparation(graphifyResult);
    expect(graphify).toContain("Failed step: Graphify download");
    expect(graphify).toContain(
      `Recovery: Run uv pip install --python ${quoted(">=3.10")} --target ${quoted(graphifyDirectory)} ${quoted(`graphifyy[ollama]==${GRAPH_VERSIONS.graphify}`)} to see the cause, fix it, then run qfai init again. Then delete ${quoted(graphifyDirectory)}.`,
    );
    expect(graphify).not.toContain("Preparation failed.");
    expect(graphify).not.toContain("reported cause");
    expect(graphify).not.toContain(installerOutput);
    const codegraphResult = await prepareGraphRuntimes(root, (command, args, options) =>
      args.includes("install") && args.includes("--prefix")
        ? Promise.resolve({ exitCode: 1, stdout: installerOutput })
        : fixture.run(command, args, options),
    );
    const codegraphDirectory = await freshRerunDirectory(
      codegraphResult.rerun?.directory,
      "codegraph",
    );
    allocated.push(codegraphDirectory);
    expect(codegraphDirectory).not.toContain(root);
    const codegraph = renderGraphPreparation(codegraphResult);
    expect(codegraph).toContain("Failed step: CodeGraph download");
    expect(codegraph).toContain(
      `Recovery: Run npm install --prefix ${quoted(codegraphDirectory)} --no-audit --no-fund --save-exact --ignore-scripts @colbymchenry/codegraph@${GRAPH_VERSIONS.codegraph} to see the cause, fix it, then run qfai init again. Then delete ${quoted(codegraphDirectory)}.`,
    );
    expect(codegraph).not.toContain(installerOutput);
    // A second failure gets a directory of its own, never the one a first failure named.
    const again = await prepareGraphRuntimes(root, (command, args, options) =>
      args[0] === "pip"
        ? Promise.resolve({ exitCode: 1, stdout: "" })
        : fixture.run(command, args, options),
    );
    const againDirectory = await freshRerunDirectory(again.rerun?.directory, "graphify");
    allocated.push(againDirectory);
    expect(againDirectory).not.toBe(graphifyDirectory);
  } finally {
    for (const directory of allocated) await rm(directory, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

/** Unquotes a shown rerun directory and checks it was allocated empty under the temporary directory. */
async function freshRerunDirectory(shown: string | undefined, engine: string): Promise<string> {
  expect(shown).toBeDefined();
  const text = shown ?? "";
  const directory = /^["']/.test(text) ? text.slice(1, -1) : text;
  expect(shown).toBe(quoted(directory));
  expect(path.dirname(directory)).toBe(os.tmpdir());
  expect(path.basename(directory)).toMatch(new RegExp(`^qfai-graph-check-${engine}-`));
  expect(await readdir(directory)).toEqual([]);
  return directory;
}

// QFAI:EX-0001-0237-22
// Mutation: packages/qfai/src/core/graph/prepare.ts `if (platform === "win32")` -> `if (false)` fails "quotes a rerun argument for the shell of the platform"
it("quotes a rerun argument for the shell of the platform", () => {
  expect(shellArgument("--no-audit", "linux")).toBe("--no-audit");
  expect(shellArgument("/tmp/qfai-graph-check-graphify-Ab12Cd", "linux")).toBe(
    "/tmp/qfai-graph-check-graphify-Ab12Cd",
  );
  expect(shellArgument("@colbymchenry/codegraph@1.6.2", "win32")).toBe(
    "@colbymchenry/codegraph@1.6.2",
  );
  expect(shellArgument(">=3.10", "linux")).toBe("'>=3.10'");
  expect(shellArgument(">=3.10", "win32")).toBe('">=3.10"');
  expect(shellArgument("/tmp/it's $HOME `x`", "darwin")).toBe("'/tmp/it'\\''s $HOME `x`'");
  expect(shellArgument("C:\\Users\\a b\\Temp", "win32")).toBe('"C:\\Users\\a b\\Temp"');
  for (const unsafe of ["C:\\Users\\$a", "C:\\Users\\`a", "C:\\Users\\%a%", 'C:\\"a'])
    expect(shellArgument(unsafe, "win32")).toBeUndefined();
  expect(shellArgument("/tmp/forged\nline", "linux")).toBeUndefined();
  expect(shellArgument("C:\\forged\u001b[2J", "win32")).toBeUndefined();
});

// A temporary directory that cannot be allocated, or carries a control character, leaves the
// generic recovery line rather than a forged one.
it("keeps the generic recovery line when no rerun directory can be allocated", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-rerun-escape-"));
  const fixture = graphProcessFixture();
  const tmpdir = vi.spyOn(os, "tmpdir").mockReturnValue(path.join(root, "forged\nline"));
  try {
    const result = await prepareGraphRuntimes(root, (command, args, options) =>
      args[0] === "pip"
        ? Promise.resolve({ exitCode: 1, stdout: "" })
        : fixture.run(command, args, options),
    );
    expect(result.failedStep).toBe("Graphify download");
    expect(result.rerun).toBeUndefined();
    const output = renderGraphPreparation(result);
    expect(output).toContain(
      "Recovery: Preparation failed. Fix the cause, then run qfai init again.",
    );
    expect(output.split("\n").some((line) => line.startsWith("line"))).toBe(false);
  } finally {
    tmpdir.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-27
// Mutation: packages/qfai/src/core/graph/prepare.ts `.slice(0, CAUSE_LINES)` -> `` fails "names the cause of a failed version check"
it("names the cause of a failed version check", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-version-cause-"));
  const fixture = graphProcessFixture();
  const stderr = ["first\tline", "", ...Array.from({ length: 7 }, (_, index) => `line ${index}`)];
  try {
    const failed = await prepareGraphRuntimes(root, (command, args, options) =>
      args.includes("--version")
        ? Promise.resolve({ exitCode: 3, stdout: "", stderr: `${stderr.join("\r\n")}\n` })
        : fixture.run(command, args, options),
    );
    expect(failed.failedStep).toBe("CodeGraph compatibility");
    const output = renderGraphPreparation(failed);
    expect(output).toContain(
      "Cause: the CodeGraph version check exited with code 3: first line | line 0 | line 1 | line 2 | line 3.",
    );
    expect(output).not.toContain("line 4");
    const forged = await prepareGraphRuntimes(root, (command, args, options) =>
      args.includes("--version")
        ? Promise.resolve({ exitCode: 1, stdout: "", stderr: `\u001b[2J${"x".repeat(600)}` })
        : fixture.run(command, args, options),
    );
    expect(renderGraphPreparation(forged)).toContain(`"\\x1b[2J${"x".repeat(496)}..."`);
    const printed = await prepareGraphRuntimes(root, (command, args, options) =>
      args.includes("-c")
        ? Promise.resolve({ exitCode: 0, stdout: "0.9.85\n" })
        : fixture.run(command, args, options),
    );
    expect(printed.failedStep).toBe("Graphify compatibility");
    expect(renderGraphPreparation(printed)).toContain(
      `Cause: the Graphify version check printed 0.9.85, expected ${GRAPH_VERSIONS.graphify}.`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-27
// Mutation: packages/qfai/src/core/graph/prepare.ts `if (platform !== "win32") return undefined;` -> `` fails "names the Windows path limit for a deep project root"
it("names the Windows path limit for a deep project root", () => {
  const deep = path.win32.join("C:", "d".repeat(170));
  expect(windowsPathLimitRecovery(deep, "win32")).toBe(
    "The graph tool files reach about 339 characters, near or past the Windows limit of 260. Move the project to a shorter path, or enable Windows long paths (LongPathsEnabled), then run qfai init again.",
  );
  expect(windowsPathLimitRecovery(path.win32.join("C:", "tmp", "qs"), "win32")).toBeUndefined();
  expect(windowsPathLimitRecovery(deep, "linux")).toBeUndefined();
});

// QFAI:EX-0001-0237-28
// Mutation: packages/qfai/src/core/graph/prepare.ts `path.join(path.dirname(current.directory), ...)` -> `path.join(root, ".qfai", "tools", ...)` fails "stages a runtime beside the installed one"
it("stages a runtime beside the installed one", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-staging-"));
  const fixture = graphProcessFixture();
  try {
    const installed = graphRuntimePaths(root);
    expect((await prepareGraphRuntimes(root, fixture.run)).runtime).toBe("installed");
    const install = fixture.calls.find((call) => call.args.includes("--prefix"));
    const prefix = install?.args[install.args.indexOf("--prefix") + 1] ?? "";
    const staging = path.dirname(prefix);
    expect(path.basename(prefix)).toBe("codegraph");
    expect(path.dirname(staging)).toBe(path.dirname(installed.directory));
    expect(path.basename(staging)).toMatch(/^\.p-[0-9a-f]{8}$/);
    expect(staging.length - installed.directory.length).toBeLessThanOrEqual(12);
    const version = fixture.calls.find((call) => call.args.includes("--version"));
    expect(version?.args[0]).toBe(
      path.join(staging, path.relative(installed.directory, installed.codegraph)),
    );
    expect(fixture.calls.find((call) => call.args[0] === "venv")?.args.at(-1)).toBe(
      path.join(staging, "graphify"),
    );
    expect(await readdir(path.dirname(installed.directory))).toEqual([
      path.basename(installed.directory),
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-27
// Mutation: packages/qfai/src/core/graph/process.ts `if (typeof cause.code === "string") return { failure: \`could not start (${cause.code})\` };` -> `` fails "says a version check could not start or was stopped instead of giving an exit code"
it("says a version check could not start or was stopped instead of giving an exit code", async () => {
  const exited = await runGraphProcess(
    process.execPath,
    ["-e", "process.stderr.write('boom'); process.exit(4)"],
    { cwd: os.tmpdir(), captureStderr: true },
  );
  expect(exited).toEqual({ exitCode: 4, stdout: "", stderr: "boom" });
  expect(
    await runGraphProcess(
      process.execPath,
      ["-e", "process.stderr.write('boom'); process.exit(4)"],
      {
        cwd: os.tmpdir(),
      },
    ),
  ).toEqual({ exitCode: 4, stdout: "" });
  const missing = await runGraphProcess(path.join(os.tmpdir(), "qfai-no-such-command"), [], {
    cwd: os.tmpdir(),
    captureStderr: true,
  });
  expect(missing.failure).toBe("could not start (ENOENT)");
  const stopped = await runGraphProcess(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], {
    cwd: os.tmpdir(),
    timeoutMs: 200,
  });
  expect(stopped).toMatchObject({
    failure: "did not finish within 0.2 seconds and was stopped",
    limit: "time",
  });

  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-version-start-"));
  const fixture = graphProcessFixture();
  try {
    for (const failure of ["could not start (ENOENT)", "was stopped (SIGTERM)"]) {
      const result = await prepareGraphRuntimes(root, (command, args, options) =>
        args.includes("--version")
          ? Promise.resolve({ exitCode: 1, stdout: "", failure })
          : fixture.run(command, args, options),
      );
      const output = renderGraphPreparation(result);
      expect(output).toContain(`Cause: the CodeGraph version check ${failure}.`);
      expect(output).not.toContain("exited with code");
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-29
// Mutation: packages/qfai/src/core/graph/process.ts `return result.limit && result.failure ? \`Cause: the ${step} ${result.failure}.\` : undefined;` -> `return undefined;` fails "names the limit a download, setup or version check passed"
it("names the limit a download, setup or version check passed", async () => {
  const output = await runGraphProcess(
    process.execPath,
    ["-e", "process.stdout.write('x'.repeat(4096))"],
    { cwd: os.tmpdir(), maxBufferBytes: 1024 },
  );
  expect(output).toMatchObject({
    exitCode: 1,
    failure: "printed more than 1024 bytes of output and was stopped",
    limit: "output",
  });

  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-limit-"));
  const fixture = graphProcessFixture();
  const stopped = (failure: string, limit: "time" | "output"): GraphProcessResult => ({
    exitCode: 1,
    stdout: "",
    failure,
    limit,
  });
  const allocated: string[] = [];
  try {
    const limits: { timeoutMs: number | undefined; maxBufferBytes: number | undefined }[] = [];
    const download = await prepareGraphRuntimes(root, (command, args, options) => {
      if (args.includes("install")) {
        limits.push({ timeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
        if (args.includes("--prefix"))
          return Promise.resolve(
            stopped("did not finish within 15 minutes and was stopped", "time"),
          );
      }
      return fixture.run(command, args, options);
    });
    expect(limits).toEqual([GRAPH_PROCESS_LIMITS.download]);
    const downloadShown = renderGraphPreparation(download);
    expect(downloadShown).toContain("Failed step: CodeGraph download");
    expect(downloadShown).toContain("Recovery: Run npm install");
    expect(downloadShown).toContain(
      "Cause: the CodeGraph download did not finish within 15 minutes and was stopped.",
    );

    const graphifyLimits: { timeoutMs: number | undefined; maxBufferBytes: number | undefined }[] =
      [];
    const graphify = await prepareGraphRuntimes(root, (command, args, options) => {
      if (args[0] === "pip") {
        graphifyLimits.push({
          timeoutMs: options.timeoutMs,
          maxBufferBytes: options.maxBufferBytes,
        });
        return Promise.resolve(
          stopped("printed more than 16 MiB of output and was stopped", "output"),
        );
      }
      return fixture.run(command, args, options);
    });
    expect(graphifyLimits).toEqual([GRAPH_PROCESS_LIMITS.download]);
    expect(renderGraphPreparation(graphify)).toContain(
      "Cause: the Graphify download printed more than 16 MiB of output and was stopped.",
    );

    const setup = await prepareGraphRuntimes(root, (command, args, options) =>
      command === "uv" && args[0] === "venv"
        ? Promise.resolve(stopped("did not finish within 2 minutes and was stopped", "time"))
        : fixture.run(command, args, options),
    );
    const setupShown = renderGraphPreparation(setup);
    expect(setup.failedStep).toBe("Python environment setup");
    expect(setupShown).toContain(
      "Cause: the Python environment setup did not finish within 2 minutes and was stopped. Run qfai init again.",
    );
    expect(setupShown).not.toContain("Install Python 3.10 or later");
    expect(setupShown).not.toContain("prerequisite");

    const check = await prepareGraphRuntimes(root, (command, args, options) =>
      args.includes("--version")
        ? Promise.resolve(stopped("did not finish within 2 minutes and was stopped", "time"))
        : fixture.run(command, args, options),
    );
    const checkShown = renderGraphPreparation(check);
    expect(check.failedStep).toBe("CodeGraph compatibility");
    expect(checkShown).toContain(
      "Cause: the CodeGraph version check did not finish within 2 minutes and was stopped.",
    );
    expect(checkShown).not.toContain("printed");
    allocated.push(
      await freshRerunDirectory(download.rerun?.directory, "codegraph"),
      await freshRerunDirectory(graphify.rerun?.directory, "graphify"),
    );
  } finally {
    for (const directory of allocated) await rm(directory, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-28
// Mutation: packages/qfai/src/core/graph/prepare.ts `await rm(staged.directory, { recursive: true, force: true });` -> `` fails "removes the staging directory after a failed version check"
it("removes the staging directory after a failed version check", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-staging-failed-"));
  const fixture = graphProcessFixture();
  const captured: boolean[] = [];
  try {
    const result = await prepareGraphRuntimes(root, (command, args, options) => {
      captured.push(options.captureStderr === true);
      return args.includes("--version")
        ? Promise.resolve({ exitCode: 2, stdout: "" })
        : fixture.run(command, args, options);
    });
    expect(result.failedStep).toBe("CodeGraph compatibility");
    const install = fixture.calls.find((call) => call.args.includes("--prefix"));
    const prefix = install?.args[install.args.indexOf("--prefix") + 1] ?? "";
    expect(path.basename(path.dirname(prefix))).toMatch(/^\.p-[0-9a-f]{8}$/);
    expect(await readdir(path.dirname(graphRuntimePaths(root).directory))).toEqual([]);
    // Only the version check asks for stderr; the install does not.
    expect(captured).toEqual([false, true]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
