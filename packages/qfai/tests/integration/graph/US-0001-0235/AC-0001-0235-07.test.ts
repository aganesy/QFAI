// QFAI:AC-0001-0235-07

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";
import { installedGraphHookResult } from "../../../helpers/graphCli.js";

describe("AC-0001-0235-07", () => {
  it("lets a search of files outside the project run and keeps any other search denied", async () => {
    const project = await graphProject();
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-outside-search-"));
    try {
      await project.initialize();
      await mkdir(path.join(project.root, "src"), { recursive: true });
      await writeFile(path.join(project.root, "src", "a.ts"), "export const foo = 1;\n");
      await writeFile(path.join(outside, "notes.txt"), "foo\n");
      await symlink(
        project.root,
        path.join(outside, "link"),
        process.platform === "win32" ? "junction" : "dir",
      );
      const out = outside.split(path.sep).join("/");
      const run = (command: string) =>
        installedGraphHookResult(project.root, {
          tool_name: "Bash",
          session_id: "outside-search-session",
          cwd: project.root,
          tool_input: { command },
        });
      const allowed = await run(`grep -n foo ${out}/notes.txt`);
      expect(allowed.output).toBe("");
      expect(allowed.failures).toBe(0);
      for (const command of [
        `grep -n foo ${out}/notes.txt src/a.ts`,
        `grep -n foo ${out}/link/src/a.ts`,
        "grep -rn foo",
        `grep -n foo ${out}/*.txt`,
      ]) {
        const denied = await run(command);
        expect(denied.output, command).toContain('"permissionDecision":"deny"');
        expect(denied.failures, command).toBe(0);
      }
    } finally {
      await rm(outside, { recursive: true, force: true });
      await project.dispose();
    }
  });
});
