/**
 * The `surface` a UI contract screen declares.
 *
 * A marketing screen is built and reviewed against the marketing patterns, an
 * application screen against the business patterns and the business-screen
 * floor. The key is optional and defaults to `application`; only a value outside
 * the vocabulary is reported, because it points at a pattern list that does not
 * exist.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateContracts } from "../../src/core/validators/contracts.js";
import {
  DEFAULT_SCREEN_SURFACE,
  UI_SCREEN_SURFACE_RULE_ID,
  screenSurfaceOf,
  validateUiScreenSurface,
} from "../../src/core/validators/uiScreenSurface.js";

const tempDirs: string[] = [];
const CONTRACT = ".qfai/spec/03_contract/ui/ui-0001-site.yaml";

async function rootWithContract(...screenLines: string[]): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-surface-"));
  tempDirs.push(root);
  const abs = path.join(root, CONTRACT);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, ["screens:", ...screenLines, ""].join("\n"), "utf-8");
  return root;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0039-34
describe("the surface a screen reads as", () => {
  it("is application when the entry writes none or leaves it empty", () => {
    expect(DEFAULT_SCREEN_SURFACE).toBe("application");
    expect(screenSurfaceOf({ id: "orders" })).toBe("application");
    expect(screenSurfaceOf({ id: "orders", surface: null })).toBe("application");
    expect(screenSurfaceOf({ id: "orders", surface: "" })).toBe("application");
  });

  it("is the declared kind for application and marketing", () => {
    expect(screenSurfaceOf({ surface: "application" })).toBe("application");
    expect(screenSurfaceOf({ surface: "marketing" })).toBe("marketing");
  });

  it("is no kind for a value outside the vocabulary", () => {
    expect(screenSurfaceOf({ surface: "landing" })).toBeUndefined();
    expect(screenSurfaceOf({ surface: 1 })).toBeUndefined();
  });
});

// QFAI:EX-0001-0039-34
// QFAI:EX-0001-0039-35
describe("validate and the surface key", () => {
  it("accepts application, marketing and an absent key", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      "  - id: home",
      "    route: /",
      "    surface: marketing",
      "  - id: settings",
      "    route: /settings",
      "    surface: application",
      "  - id: pricing",
      "    route: /pricing",
      "    surface:",
      "  - id: guide",
      "    route: /guide",
      '    surface: ""',
    );

    expect(await validateUiScreenSurface(root, defaultConfig)).toEqual([]);
  });

  it("reports another value at error, naming the screen, the value and the vocabulary", async () => {
    const root = await rootWithContract(
      "  - id: home",
      "    route: /",
      "    surface: landing",
      "  - id: orders",
      "    route: /orders",
    );

    const issues = await validateUiScreenSurface(root, defaultConfig);

    expect(issues).toHaveLength(1);
    const [finding] = issues;
    expect(finding?.code).toBe(UI_SCREEN_SURFACE_RULE_ID);
    expect(finding?.code).toBe("QFAI-CONTRACT-051");
    expect(finding?.severity).toBe("error");
    expect(finding?.file).toBe(CONTRACT);
    expect(finding?.message).toContain("screen 'home'");
    expect(finding?.message).toContain("`surface: landing`");
    expect(finding?.message).toContain("`application` or `marketing`");
  });

  it("reports a value that is not a string as written", async () => {
    const root = await rootWithContract("  - id: home", "    route: /", "    surface: [marketing]");

    const [finding] = await validateUiScreenSurface(root, defaultConfig);

    expect(finding?.message).toContain('`surface: ["marketing"]`');
  });

  it("runs with the contract checks", async () => {
    const root = await rootWithContract("  - id: home", "    route: /", "    surface: Marketing");

    const codes = (await validateContracts(root, defaultConfig)).map((issue) => issue.code);

    expect(codes).toContain("QFAI-CONTRACT-051");
  });
});
