import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const assetRoot = path.join(packageRoot, "assets/init/.qfai/assistant");
const rootMirror = path.join(repoRoot, ".qfai/assistant");
const ruleName = "rule/test-layers.md";
const removedMap = "catalog/test-layers-ci-lanes.md";
const read = (file: string): string => readFileSync(file, "utf8");

describe("the layer to CI lane map is part of the layer rule", () => {
  // QFAI:EX-0002-0021-02
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

  // QFAI:EX-0002-0021-01
  // QFAI:EX-0002-0021-03
  // QFAI:EX-0002-0021-04
  it("keeps the mapping inside the existing vocabulary and test scan", () => {
    const section = read(path.join(assetRoot, ruleName)).split("## CI lane mapping\n")[1] ?? "";
    expect(section).toContain("This section adds no layer token or layer heading");
    expect(section).toMatch(/does not activate\s+per-level routing/u);
    expect(section).toContain("Place test annotations only in paths scanned by");
    expect(section).toContain("`validation.traceability.testFileGlobs`");
    expect(section).not.toMatch(/^### L\w+/m);
    expect(section).not.toMatch(/layer-[a-z]+/);
    expect(section).not.toMatch(/`QFAI:TC-[^`]+`/);

    const rule = read(path.join(assetRoot, ruleName));
    const tokens = new Set([...rule.matchAll(/layer-[a-z0-9-]+/g)].map((match) => match[0]));
    expect([...tokens].sort()).toEqual([
      "layer-api",
      "layer-component",
      "layer-e2e",
      "layer-integration",
      "layer-unit",
    ]);
    const headings = [...rule.matchAll(/^#{1,6}\s*L\d+\s+(.+)$/gm)].map((match) => match[0]);
    expect(headings).toEqual([
      "### L1 Unit",
      "### L2 Component",
      "### L3 Integration",
      "### L4 API",
      "### L5 E2E",
    ]);
  });

  // QFAI:EX-0002-0021-05
  it("names only catalogued layers", () => {
    const rule = read(path.join(assetRoot, ruleName));
    const section = (rule.split("## CI lane mapping\n")[1] ?? "").split("\n## ")[0] ?? "";
    expect(section.length).toBeGreaterThan(0);

    const catalog = new Set(
      [...rule.matchAll(/^\|\s*L\d\s*\|\s*([^|]+?)\s*\|\s*`layer-[a-z0-9]+`/gm)].map(
        (match) => match[1] ?? "",
      ),
    );
    expect([...catalog].sort()).toEqual(["API", "Component", "E2E", "Integration", "Unit"]);
    const named = new Set(
      [...section.matchAll(/\b([A-Z][A-Za-z0-9]*)(?:\s+and\s+([A-Z][A-Za-z0-9]*))?\s+tests\b/g)]
        .flatMap((match) => [match[1], match[2]])
        .filter((name): name is string => name !== undefined),
    );
    expect(named.size, "the mapping section must name the layers it routes").toBeGreaterThan(0);
    expect([...named].filter((name) => !catalog.has(name))).toEqual([]);
  });

  // QFAI:EX-0002-0021-06
  it("mirrors the authored rule through a linked directory", () => {
    const source = path.join(assetRoot, ruleName);
    const mirrored = path.join(rootMirror, ruleName);
    expect(lstatSync(path.dirname(mirrored)).isSymbolicLink()).toBe(true);
    expect(realpathSync(mirrored)).toBe(realpathSync(source));
    expect(read(mirrored)).toBe(read(source));
  });
});
