import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { LAYER_TAGS } from "../../src/core/testStrategyTags.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const assetRoot = path.join(packageRoot, "assets/init/.qfai/assistant");
const rootMirror = path.join(repoRoot, ".qfai/assistant");
const ruleName = "rule/test-layers.md";
const removedMap = "catalog/test-layers-ci-lanes.md";
const read = (file: string): string => readFileSync(file, "utf8");

describe("the layer to CI lane map is part of the layer rule", () => {
  it("moves the mapping into the shipped rule without preserving a second copy", () => {
    const rule = read(path.join(assetRoot, ruleName));
    const section = rule.split("## CI lane mapping\n")[1];

    expect(section).toBeDefined();
    expect(section).toContain("Unit and Component tests to a");
    expect(section).toContain("Integration and API tests to jobs");
    expect(section).toContain("E2E tests to a journey job");
    expect(section).toContain("A missing lane or an unrun command is UNRUN, not PASS");
    expect(existsSync(path.join(assetRoot, removedMap))).toBe(false);
    expect(existsSync(path.join(rootMirror, removedMap))).toBe(false);
  });

  it("does not define a layer token or direct annotation placement in the mapping section", () => {
    const section = read(path.join(assetRoot, ruleName)).split("## CI lane mapping\n")[1] ?? "";
    expect(section).not.toMatch(/^### L\w+/m);
    expect(section).not.toMatch(/layer-[a-z]+/);
    expect(
      section
        .split(/\r?\n/)
        .filter((line) => /\b(must|place|put)\b/i.test(line) && /annotat/i.test(line)),
    ).toEqual([]);
    expect([...LAYER_TAGS].sort()).toEqual([
      "layer-api",
      "layer-component",
      "layer-e2e",
      "layer-integration",
      "layer-unit",
    ]);
  });

  it("mirrors the authored rule through a symbolic link", () => {
    const source = path.join(assetRoot, ruleName);
    const mirrored = path.join(rootMirror, ruleName);
    expect(lstatSync(mirrored).isSymbolicLink()).toBe(true);
    expect(realpathSync(mirrored)).toBe(realpathSync(source));
    expect(read(mirrored)).toBe(read(source));
  });
});
