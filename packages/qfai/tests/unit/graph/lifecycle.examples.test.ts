import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

// QFAI:EX-0001-0233-04
// Mutation: packages/qfai/package.json `"build": "tsup",` -> `"postinstall": "node dist/cli/index.mjs init", "build": "tsup",` fails "npm installation has no graph provisioning lifecycle"
it("npm installation has no graph provisioning lifecycle", async () => {
  const file = fileURLToPath(new URL("../../../package.json", import.meta.url));
  const manifest = JSON.parse(await readFile(file, "utf8")) as { scripts: Record<string, string> };
  const installationScripts = Object.entries(manifest.scripts)
    .filter(([name]) => ["preinstall", "install", "postinstall"].includes(name))
    .map(([, command]) => command);
  expect(
    installationScripts.some((command) =>
      /codegraph|graphify|(?:qfai|dist[/\\]cli[/\\]index)[^;\n]*\binit\b/.test(command),
    ),
  ).toBe(false);
});
