/**
 * Whether a project with web screens has an accessibility check: a selected
 * test file whose text names axe. The rule warns only; it reads the UI
 * contracts and the story-tree test selection and nothing else, and it does
 * not run or parse a test.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import {
  UI_ACCESSIBILITY_LAYER_RULE_ID,
  namesAxe,
  isWebRoute,
  validateUiAccessibilityLayer,
} from "../../src/core/validators/uiAccessibilityLayer.js";

const tempDirs: string[] = [];
const CONTRACT = ".qfai/spec/03_contract/ui/ui-0001-orders.yaml";

async function project(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-axe-layer-"));
  tempDirs.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const abs = path.join(root, relative);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf-8");
  }
  return root;
}

function contract(...routes: string[]): string {
  return [
    "screens:",
    ...routes.flatMap((route, index) => [`  - id: screen_${String(index)}`, `    route: ${route}`]),
    "",
  ].join("\n");
}

const AXE_SPEC = [
  'import AxeBuilder from "@axe-core/playwright";',
  'import { expect, test } from "./fixtures";',
  'test("orders", async ({ page }) => {',
  "  const { violations } = await new AxeBuilder({ page }).analyze();",
  "  expect(violations).toEqual([]);",
  "});",
  "",
].join("\n");

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0311-01
describe("what makes a project a UI project and what counts as naming axe", () => {
  it("reads a route that starts with / as a web route, and a command line as none", () => {
    expect(isWebRoute("/orders")).toBe(true);
    expect(isWebRoute(" /")).toBe(true);
    expect(isWebRoute("qfai init")).toBe(false);
    expect(isWebRoute("orders")).toBe(false);
  });

  it("counts AxeBuilder and an @axe-core/ package name, and nothing else", () => {
    expect(namesAxe(AXE_SPEC)).toBe(true);
    expect(namesAxe('const { AxeBuilder } = require("x");')).toBe(true);
    expect(namesAxe('import { checkA11y } from "@axe-core/react";')).toBe(true);
    expect(namesAxe('test("orders", () => { expect(1).toBe(1); });')).toBe(false);
    expect(namesAxe("// accessibility is checked by hand")).toBe(false);
  });

  it("reads text only, so a comment or an unused import counts as well", () => {
    expect(namesAxe("// TODO: run AxeBuilder here")).toBe(true);
    expect(namesAxe('import AxeBuilder from "@axe-core/playwright";')).toBe(true);
  });
});

// QFAI:EX-0001-0311-01
describe("validate and the accessibility layer", () => {
  it("warns once, naming the web screens, when no selected test file names axe", async () => {
    const root = await project({
      [CONTRACT]: contract("/orders", "/orders/new"),
      "tests/e2e/BF-0001.test.ts": 'test("journey", () => {});\n',
    });

    const issues = await validateUiAccessibilityLayer(root, defaultConfig);

    expect(issues).toHaveLength(1);
    const [finding] = issues;
    expect(finding?.code).toBe(UI_ACCESSIBILITY_LAYER_RULE_ID);
    expect(finding?.code).toBe("QFAI-AXE-001");
    expect(finding?.severity).toBe("warning");
    expect(finding?.file).toBe(CONTRACT);
    expect(finding?.refs).toEqual(["screen_0", "screen_1"]);
    expect(finding?.message).toContain("2 screen(s) with a web route");
    expect(finding?.message).toContain("'/orders'");
    expect(finding?.message).toContain(
      "no selected test file contains `AxeBuilder` or an `@axe-core/` package name",
    );
    expect(finding?.message).not.toContain("calls axe");
  });

  it("raises nothing when a spec under the E2E layer names axe", async () => {
    const root = await project({
      [CONTRACT]: contract("/orders"),
      "tests/e2e/accessibility.spec.ts": AXE_SPEC,
    });

    expect(await validateUiAccessibilityLayer(root, defaultConfig)).toEqual([]);
  });

  it("raises nothing when a file the configured globs select names axe", async () => {
    const root = await project({
      [CONTRACT]: contract("/orders"),
      "web/a11y/routes.check.ts": AXE_SPEC,
    });
    const config: QfaiConfig = {
      ...defaultConfig,
      validation: {
        ...defaultConfig.validation,
        traceability: {
          ...defaultConfig.validation.traceability,
          testFileGlobs: ["web/**/*.check.ts"],
        },
      },
    };

    expect(await validateUiAccessibilityLayer(root, config)).toEqual([]);
  });

  it("does not count axe named in a file the selection leaves out", async () => {
    const root = await project({
      [CONTRACT]: contract("/orders"),
      "scripts/a11y.ts": AXE_SPEC,
    });

    expect(await validateUiAccessibilityLayer(root, defaultConfig)).toHaveLength(1);
  });

  it("raises nothing for a project with no UI contract, or with terminal screens only", async () => {
    const none = await project({ "tests/e2e/BF-0001.test.ts": 'test("journey", () => {});\n' });
    const terminal = await project({ [CONTRACT]: contract("qfai init", "qfai init --dry-run") });

    expect(await validateUiAccessibilityLayer(none, defaultConfig)).toEqual([]);
    expect(await validateUiAccessibilityLayer(terminal, defaultConfig)).toEqual([]);
  });
});
