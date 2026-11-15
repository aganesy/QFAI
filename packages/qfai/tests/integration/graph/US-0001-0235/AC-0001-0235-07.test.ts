// QFAI:AC-0001-0235-07

import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { installedGraphHookResult } from "../../../helpers/graphCli.js";

describe("AC-0001-0235-07", () => {
  it("lets a search of files outside the project run and keeps any other search denied", async () => {
    const base = await realpath(await mkdtemp(path.join(os.tmpdir(), "qfai-outside-search-")));
    const root = path.join(base, "project");
    const outside = path.join(base, "outside");
    try {
      // The enforcement file the installed hook reads, as qfai init writes it.
      await mkdir(path.join(root, ".qfai", "tools"), { recursive: true });
      await writeFile(
        path.join(root, ".qfai", "tools", "graph-enforcement.json"),
        JSON.stringify({ kind: "graph-enforcement", denyExploration: true }),
      );
      await mkdir(path.join(root, "src"), { recursive: true });
      await writeFile(path.join(root, "src", "a.ts"), "export const foo = 1;\n");
      await mkdir(outside, { recursive: true });
      await writeFile(path.join(outside, "notes.txt"), "foo\n");
      await symlink(
        root,
        path.join(outside, "link"),
        process.platform === "win32" ? "junction" : "dir",
      );
      const out = outside.split(path.sep).join("/");
      const run = (command: string) =>
        installedGraphHookResult(root, {
          tool_name: "Bash",
          session_id: "outside-search-session",
          cwd: root,
          tool_input: { command },
        });
      const allowed = await run(`grep -n foo ${out}/notes.txt`);
      expect(allowed.output).toBe("");
      expect(allowed.failures).toBe(0);
      for (const command of [
        `grep -n foo ${out}/notes.txt src/a.ts`,
        `grep -n foo ${out}/link/src/a.ts`,
        `rg foo ${out}`,
        "grep -rn foo",
        `grep -n foo ${out}/*.txt`,
        `echo x; grep -n foo ${out}/notes.txt`,
      ]) {
        const denied = await run(command);
        expect(denied.output, command).toContain('"permissionDecision":"deny"');
        expect(denied.failures, command).toBe(0);
      }
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
