// QFAI:AC-0001-0237-02

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";

describe("AC-0001-0237-02", () => {
  it("preserves unrelated settings and reminders and retains edited conflicts", async () => {
    const project = await graphProject();
    const reminder = {
      matcher: "Read",
      hooks: [{ type: "command", command: "existing-reminder" }],
    };
    const mcp = path.join(project.root, ".mcp.json");
    const settings = path.join(project.root, ".claude", "settings.json");
    try {
      await writeFile(mcp, JSON.stringify({ mcpServers: { adopter: { command: "keep-me" } } }));
      await mkdir(path.dirname(settings));
      await writeFile(
        settings,
        JSON.stringify({
          permissions: { allow: ["Read"], deny: ["Bash(rm:*)"] },
          hooks: { PreToolUse: [reminder] },
        }),
      );
      await project.initialize();
      const composed = JSON.parse(await readFile(settings, "utf8"));
      expect(composed.permissions.allow).toContain("Read");
      expect(composed.permissions.deny).toEqual(["Bash(rm:*)"]);
      expect(composed.hooks.PreToolUse[0]).toEqual(reminder);
      expect(
        composed.hooks.PreToolUse.some((group: unknown) =>
          JSON.stringify(group).includes("graph-hook.mjs"),
        ),
      ).toBe(true);
      const servers = JSON.parse(await readFile(mcp, "utf8")).mcpServers;
      expect(servers.adopter).toEqual({ command: "keep-me" });
      expect(Object.keys(servers)).toEqual(["adopter"]);
      expect(await readFile(mcp, "utf8")).toBe(
        JSON.stringify({ mcpServers: { adopter: { command: "keep-me" } } }),
      );
      const entry = path.join(project.root, ".qfai", "tools", "graph-cli.mjs");
      expect(await readFile(entry, "utf8")).toContain("runInstalledGraphCli");
      const edited = '{"mcpServers":{"adopter":{"command":"adopter-changed"}}}\n';
      await writeFile(mcp, edited);
      const editedEntry = "// Adopter graph entrypoint.\n";
      await writeFile(entry, editedEntry);
      await project.initialize();
      expect(await readFile(mcp, "utf8")).toBe(edited);
      expect(await readFile(entry, "utf8")).toBe(editedEntry);
    } finally {
      await project.dispose();
    }
  });
});
