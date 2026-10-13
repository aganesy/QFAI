// QFAI:AC-0001-0233-06

import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";
import { prepareGraphIntegration } from "../../../../src/index.js";
import { getInitAssetsDir } from "../../../../src/shared/assets.js";

describe("AC-0001-0233-06", () => {
  it("uses the public integration for fresh upgraded and package-owned assistant layouts", async () => {
    const source = path.join(getInitAssetsDir(), ".qfai", "assistant");
    const constitution = path.join(source, "rule", "constitution.md");
    const original = await readFile(constitution);
    const wrappers: string[] = [];
    for (const layout of ["fresh", "upgraded", "package-owned"]) {
      const project = await graphProject();
      try {
        if (layout !== "fresh") await mkdir(path.join(project.root, ".qfai"));
        if (layout === "upgraded")
          await writeFile(path.join(project.root, ".qfai", "notes.md"), "Keep notes.\n");
        if (layout === "package-owned")
          await symlink(
            source,
            path.join(project.root, ".qfai", "assistant"),
            process.platform === "win32" ? "junction" : "dir",
          );
        const result = await prepareGraphIntegration(project.root, project.fixture.run);
        expect(result.runtime).toBe("installed");
        expect(result.conflicts).toEqual([]);
        expect(result.hosts.map((host) => host.host)).toEqual([
          "claude",
          "codex",
          "copilot",
          "vscode",
        ]);
        wrappers.push(
          await readFile(path.join(project.root, ".qfai", "tools", "graph-cli.mjs"), "utf8"),
        );
        expect(wrappers.at(-1)).toContain("runInstalledGraphCli");
        await expect(readFile(path.join(project.root, ".mcp.json"))).rejects.toMatchObject({
          code: "ENOENT",
        });
        await expect(
          readFile(path.join(project.root, ".qfai", "tools", "graph-manager.mjs")),
        ).rejects.toMatchObject({ code: "ENOENT" });
        expect(await readFile(constitution)).toEqual(original);
      } finally {
        await project.dispose();
      }
    }
    expect(new Set(wrappers).size).toBe(1);
  });
});
