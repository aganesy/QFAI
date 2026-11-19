/**
 * `scripts/regen-shipped-entry.mjs` (`pnpm pins:entry`) run against the built CLI.
 *
 * The init it runs to obtain the generated Copilot instructions writes that file before it
 * prepares the graph tools, and exits non-zero when that preparation fails. The tool must not
 * depend on it: here the search path holds Node.js alone, so a graph download or the uv
 * prerequisite cannot succeed, and the tool still has to compute the digest the repository pins.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/integration/scripts → tests/integration → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "regen-shipped-entry.mjs");
const CLI = path.join(REPO_ROOT, "packages", "qfai", "dist", "cli", "index.mjs");

const INPUTS = [
  ["packages", "qfai", "assets", "init", "root", "AGENTS.md"],
  ["packages", "qfai", "tests", "fixtures", "shipped-entry", "agents.txt"],
  ["packages", "qfai", "tests", "helpers", "shippedLaneCommands.ts"],
];

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** The environment of this process with a search path that holds only the Node.js directory. */
function nodeOnlyEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (name.toLowerCase() !== "path") environment[name] = value;
  }
  environment.PATH = path.dirname(process.execPath);
  return environment;
}

describe("pins:entry with the built CLI", () => {
  it(
    "computes the pinned Copilot digest when graph preparation cannot run",
    { timeout: 120_000 },
    async () => {
      expect(existsSync(CLI), `${CLI} is missing; run \`pnpm build\``).toBe(true);
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-regen-entry-cli-"));
      tempDirs.push(root);
      for (const segments of INPUTS) {
        await cp(path.join(REPO_ROOT, ...segments), path.join(root, ...segments));
      }

      const child = spawnSync(process.execPath, [SCRIPT, "--root", root, "--cli", CLI], {
        encoding: "utf-8",
        env: nodeOnlyEnvironment(),
      });
      const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;

      expect(child.status, output).toBe(0);
      expect(output).toMatch(/copilot-instructions\.md digest unchanged/);
      for (const segments of INPUTS) {
        expect(await readFile(path.join(root, ...segments), "utf-8")).toBe(
          await readFile(path.join(REPO_ROOT, ...segments), "utf-8"),
        );
      }
    },
  );
});
