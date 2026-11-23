// Graph provisioning starts npm through the lookup doctor's installs use. On Windows, with no
// npm entry beside node, it runs the entry found on PATH with node, and with none on PATH it
// reports a failed npm prerequisite instead of starting a bare `npm`, which needs a shell there.
// `npmCommand` is pointed at a Node directory without npm beside it; `vi.mock` is hoisted to
// module scope, so these cases live in their own file.

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type * as GraphProcess from "../../../src/core/graph/process.js";
import { prepareGraphRuntimes } from "../../../src/core/graph/prepare.js";
import { renderGraphPreparation } from "../../../src/core/graph/presentation.js";
import { graphProcessFixture } from "../../helpers/graphProcess.js";

vi.mock("../../../src/core/graph/process.js", async () => {
  const actual = await vi.importActual<typeof GraphProcess>("../../../src/core/graph/process.js");
  return {
    ...actual,
    npmCommand: async (lookup: GraphProcess.NpmLookup = {}) => {
      const tmp = (await import("node:os")).tmpdir();
      const join = (await import("node:path")).join;
      return actual.npmCommand({
        ...lookup,
        nodeDirectory: join(tmp, "qfai-graph-no-node", "bin"),
      });
    },
  };
});

const tempDirs: string[] = [];
const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
const originalPath = process.env["PATH"];

beforeEach(() => {
  Object.defineProperty(process, "platform", { value: "win32", configurable: true });
});

afterEach(async () => {
  if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform);
  process.env["PATH"] = originalPath;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function tempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

// QFAI:EX-0001-0237-05
it("runs npm's JavaScript entry from PATH with node to download CodeGraph", async () => {
  const root = await tempRoot("qfai-graph-npm-onpath-");
  const entry = path.join(root, "npm-home", "node_modules", "npm", "bin", "npm-cli.js");
  await mkdir(path.dirname(entry), { recursive: true });
  await writeFile(entry, "", "utf-8");
  process.env["PATH"] = path.join(root, "npm-home");
  const fixture = graphProcessFixture();

  // The download fails once recorded, so the run stops before any Windows-only activation.
  await prepareGraphRuntimes(root, async (command, args, options) => {
    const result = await fixture.run(command, args, options);
    return args.includes("--prefix") ? { exitCode: 1, stdout: "" } : result;
  });

  const install = fixture.calls.find((call) => call.args.includes("--prefix"));
  expect(install?.command).toBe(process.execPath);
  expect(install?.args[0]).toBe(entry);
  expect(install?.args[1]).toBe("install");
});

// QFAI:EX-0001-0237-05
it("reports a failed npm prerequisite when no npm entry is beside node or on PATH", async () => {
  const root = await tempRoot("qfai-graph-npm-missing-");
  process.env["PATH"] = path.join(root, "bin");
  const fixture = graphProcessFixture();

  const result = await prepareGraphRuntimes(root, fixture.run);

  expect(result.runtime).toBe("not-ready");
  expect(result.failedStep).toBe("npm prerequisite");
  expect(renderGraphPreparation(result)).toContain(
    "Cause: npm's JavaScript entry (npm-cli.js) was not found beside node or on PATH.",
  );
  expect(fixture.calls.some((call) => call.args.includes("--prefix"))).toBe(false);
  expect(fixture.calls.some((call) => call.command === "npm")).toBe(false);
});
