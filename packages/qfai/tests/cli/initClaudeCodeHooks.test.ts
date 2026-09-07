/**
 * What `qfai init` does about `.claude/settings.json`.
 *
 * A fresh project gets the whole shipped file from the create-only root copy.
 * A project that already has settings of its own gets only the hook entries,
 * merged in — and that is the case worth testing, because it is the one the
 * copy alone cannot reach and the one where a wrong merge damages a file the
 * project owns.
 */

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { DOCUMENTATION_CLARITY_HOOK_MARKER } from "../../src/core/claudeCodeHooks.js";
import { captureStderr } from "../helpers/stderr.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const SETTINGS = path.join(".claude", "settings.json");

/** One `qfai init` run with its console output swallowed; returns what it wrote to stderr. */
async function initInto(root: string): Promise<string> {
  let stderr = "";
  await captureStdout(async () => {
    stderr = await captureStderr(async () => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
    });
  });
  return stderr;
}

async function seedSettings(root: string, settings: unknown): Promise<void> {
  await mkdir(path.join(root, ".claude"), { recursive: true });
  await writeFile(path.join(root, SETTINGS), `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
}

async function readSettings(root: string): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(await readFile(path.join(root, SETTINGS), "utf-8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("settings file is not a JSON object");
  }
  return { ...parsed };
}

async function withTempRoot(body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-hooks-"));
  try {
    await body(root);
  } finally {
    await removeTempTree(root);
  }
}

describe("qfai init and the documentation-clarity hooks", () => {
  it("seeds the whole settings file into a project that has none", async () => {
    await withTempRoot(async (root) => {
      await initInto(root);

      const text = await readFile(path.join(root, SETTINGS), "utf-8");
      expect(text).toContain(DOCUMENTATION_CLARITY_HOOK_MARKER);
      expect(text).toContain("mcp__github__");
    });
  });

  it("merges the entries into settings the project already had", async () => {
    await withTempRoot(async (root) => {
      const ownHook = { matcher: "Bash", hooks: [{ type: "command", command: "./own.sh" }] };
      await seedSettings(root, {
        permissions: { allow: ["Bash(git status)"] },
        hooks: { PreToolUse: [ownHook] },
      });

      await initInto(root);

      const settings = await readSettings(root);
      // Everything the project had is still there, and still first.
      expect(settings.permissions).toEqual({ allow: ["Bash(git status)"] });
      const asText = JSON.stringify(settings);
      expect(asText).toContain("./own.sh");
      expect(asText).toContain(DOCUMENTATION_CLARITY_HOOK_MARKER);
      expect(asText.indexOf("./own.sh")).toBeLessThan(
        asText.indexOf(DOCUMENTATION_CLARITY_HOOK_MARKER),
      );
    });
  });

  it("adds the entries exactly once across repeated runs", async () => {
    await withTempRoot(async (root) => {
      await seedSettings(root, { hooks: {} });

      await initInto(root);
      const afterFirst = await readFile(path.join(root, SETTINGS), "utf-8");
      await initInto(root);
      const afterSecond = await readFile(path.join(root, SETTINGS), "utf-8");

      expect(afterSecond).toBe(afterFirst);
      expect(afterSecond.split(DOCUMENTATION_CLARITY_HOOK_MARKER)).toHaveLength(4);
    });
  });

  it("leaves a settings file it cannot parse exactly as it found it, and says so", async () => {
    await withTempRoot(async (root) => {
      const damaged = '{ "hooks": "off",\n';
      await mkdir(path.join(root, ".claude"), { recursive: true });
      await writeFile(path.join(root, SETTINGS), damaged, "utf-8");

      const stderr = await initInto(root);

      expect(await readFile(path.join(root, SETTINGS), "utf-8")).toBe(damaged);
      expect(stderr).toContain("documentation-clarity");
    });
  });

  // A read that fails for any reason other than "nothing is there" — a
  // permission, or the path being something other than a file. The rest of the
  // run is worth more than the reminder, so the fault is reported and init
  // finishes; a throw here would abandon every later step over one optional file.
  //
  // The settings path is made a DIRECTORY rather than chmod-ed unreadable:
  // `chmod 000` does not stop a privileged user, so that test passes vacuously
  // wherever the suite runs as root, while `EISDIR` is a fault on every account.
  it("reports a settings path it cannot read and still completes the run", async () => {
    await withTempRoot(async (root) => {
      await mkdir(path.join(root, SETTINGS), { recursive: true });

      const stderr = await initInto(root);

      expect(stderr).toContain("documentation-clarity");
      expect(stderr).toContain(".claude/settings.json");
      // init got past it: the files it writes beside the hooks are all there.
      await expect(readFile(path.join(root, "AGENTS.md"), "utf-8")).resolves.toContain(
        "documentation-clarity.md",
      );
    });
  });
});
