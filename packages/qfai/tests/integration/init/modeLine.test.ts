/**
 * Integration: init writes no workflow mode and asks for none, and its summary names the mode in
 * force on one line, `active` when the key is absent.
 */
// QFAI:SPEC-0003:TC-0003-0071
// QFAI:SPEC-0003:TC-0003-0072
// QFAI:SPEC-0003:TC-0003-0073
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { initQuietly, withEmptyRepo, withInstall } from "./upgradeStates.js";

const MODE_LINE = /^Workflow mode: .*$/gm;

function configPath(root: string): string {
  return path.join(root, "qfai.config.yaml");
}

function modeLines(output: string): string[] {
  return output.match(MODE_LINE) ?? [];
}

describe("the mode line", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("TC-0003-0071: Fresh non-interactive init: no mode key, mode line active", async () => {
    await withEmptyRepo(async (root) => {
      const output = await initQuietly(root, false, false);

      const config: unknown = parseYaml(await readFile(configPath(root), "utf-8"));
      expect(config).toBeTypeOf("object");
      expect(Object.keys(config ?? {})).not.toContain("workflow");
      expect(output).not.toMatch(/\?\s*$/m);
      expect(modeLines(output)).toEqual(["Workflow mode: active"]);
    });
  });

  it("TC-0003-0072: Upgrade with no mode key: config unchanged, mode active", async () => {
    await withInstall([], async (root) => {
      const before = await readFile(configPath(root));
      expect(before.toString("utf-8")).not.toMatch(/^workflow:/m);

      const output = await initQuietly(root);

      expect(await readFile(configPath(root))).toEqual(before);
      expect(modeLines(output)).toEqual(["Workflow mode: active"]);
    });
  });

  it("TC-0003-0073: Mode line for active, shadow, off and an invalid value", async () => {
    const expected: Record<string, string> = {
      active: "Workflow mode: active",
      shadow: "Workflow mode: shadow",
      off: "Workflow mode: off",
      bogus: 'Workflow mode: "bogus" is invalid; expected active, shadow or off',
    };
    for (const [mode, line] of Object.entries(expected)) {
      await withInstall([], async (root) => {
        const file = configPath(root);
        await writeFile(file, `${await readFile(file, "utf-8")}workflow:\n  mode: ${mode}\n`);
        const before = await readFile(file);

        const output = await initQuietly(root);

        expect(await readFile(file)).toEqual(before);
        expect(modeLines(output)).toEqual([line]);
        expect(process.exitCode ?? 0).toBe(0);
      });
    }
  });
});
