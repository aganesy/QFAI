/**
 * The design-system validators run inside `qfai validate` when their prerequisite files exist,
 * and the package exposes no command or source for a removed runtime.
 */

import { appendFile, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { run } from "../../src/cli/main.js";
import { loadConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const packageRoot = process.cwd();
const roots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

/** An initialized project whose configuration names `tokens` as the design tokens directory. */
async function projectWithTokensDirectory(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-validator-slice-"));
  roots.push(root);
  await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
  await appendFile(
    path.join(root, "qfai.config.yaml"),
    "\nuiux:\n  designTokensDir: tokens\n",
    "utf-8",
  );
  return root;
}

async function designTokenFindings(
  root: string,
): Promise<Array<[string, string, string | undefined]>> {
  const result = await validateProject(root, await loadConfig(root), { profile: "full" });
  return result.issues
    .filter((found) => found.code.startsWith("QFAI-DT-"))
    .map((found) => [found.code, found.severity, found.file]);
}

async function captureHelp(): Promise<string> {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  });
  const previousExitCode = process.exitCode;
  try {
    await run(["--help"], process.cwd());
  } finally {
    process.exitCode = previousExitCode;
  }
  return chunks.join("");
}

/** The command heads the help lists under `Commands:`. */
function listedCommands(help: string): string[] {
  const start = help.indexOf("Commands:");
  const end = help.indexOf("Options:");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return help
    .slice(start + "Commands:".length, end)
    .split("\n")
    .filter((line) => /^ {2}\S/.test(line))
    .map((line) => line.trim().split(/\s{2,}/)[0] ?? "");
}

async function filesUnder(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await filesUnder(full)));
    else found.push(full);
  }
  return found;
}

describe("design-system validator slices", () => {
  const EMPTY_TOKEN = ["primitive:", "  color:", "    base:", "      $value: ''", ""].join("\n");

  // QFAI:AC-0001-0158-01
  // QFAI:AC-0001-0042-02
  // QFAI:EX-0001-0042-02
  it("report on a design-token file when it exists and on nothing when it does not", async () => {
    const root = await projectWithTokensDirectory();
    expect(await designTokenFindings(root)).toEqual([]);

    await mkdir(path.join(root, "tokens"), { recursive: true });
    await writeFile(path.join(root, "tokens", "design-tokens.yaml"), EMPTY_TOKEN, "utf-8");

    const reported = await designTokenFindings(root);
    expect(reported).toContainEqual(["QFAI-DT-004", "error", "tokens/design-tokens.yaml"]);
  });

  // QFAI:AC-0001-0158-01
  // QFAI:AC-0001-0042-02
  it("are reached through validate alone, and nothing names the removed full-harness runtime", async () => {
    const commands = listedCommands(await captureHelp());
    expect(commands).toEqual(expect.arrayContaining(["init", "validate", "report", "doctor"]));
    for (const command of commands) {
      expect(command, command).not.toMatch(/token|audit|design|harness/i);
    }

    const shipped = [
      ...(await filesUnder(path.join(packageRoot, "src"))),
      ...(await filesUnder(getInitAssetsDir())),
    ];
    expect(shipped.length).toBeGreaterThan(100);
    const naming: string[] = [];
    for (const file of shipped) {
      if ((await readFile(file, "utf-8")).includes("full-harness")) naming.push(file);
    }
    expect(naming).toEqual([]);
  });
});
