/**
 * The `pattern` a UI contract screen declares.
 *
 * A screen names its type in the shipped business UI pattern reference by the
 * type's ID, so the author, the implementer and the reviewer read the same
 * entry. The key is optional; only a value outside the vocabulary is reported,
 * because it names an entry the reference does not have.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { ISSUE_EXPECTED_BY_CODE } from "../../src/cli/commands/validate.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateContracts } from "../../src/core/validators/contracts.js";
import {
  SCREEN_PATTERNS,
  UI_SCREEN_PATTERN_RULE_ID,
  screenPatternOf,
  validateUiScreenPattern,
} from "../../src/core/validators/uiScreenPattern.js";

const tempDirs: string[] = [];
const CONTRACT = ".qfai/spec/03_contract/ui/ui-0001-orders.yaml";
const REFERENCE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/init/.qfai/assistant/skill/qfai-sdd/references/business-ui-patterns.md",
);

async function rootWithContract(...screenLines: string[]): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-pattern-"));
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

// QFAI:EX-0001-0039-36
describe("the pattern a screen declares", () => {
  it("is each ID the business UI pattern reference gives a screen type", async () => {
    const text = await readFile(REFERENCE, "utf-8");
    const ids = Array.from(text.matchAll(/^ID: `([a-z]+)`\.\r?$/gm), (match) => match[1]);

    expect(ids).toEqual([...SCREEN_PATTERNS]);
    expect(SCREEN_PATTERNS).toEqual(["list", "detail", "form", "settings", "members", "dashboard"]);
    for (const id of SCREEN_PATTERNS) {
      expect(screenPatternOf({ pattern: id })).toBe(id);
    }
  });

  it("is none when the entry writes no pattern or leaves it empty", () => {
    expect(screenPatternOf({ id: "orders" })).toBeNull();
    expect(screenPatternOf({ id: "orders", pattern: null })).toBeNull();
    expect(screenPatternOf({ id: "orders", pattern: "" })).toBeNull();
  });

  it("is no type for a value outside the vocabulary", () => {
    expect(screenPatternOf({ pattern: "table" })).toBeUndefined();
    expect(screenPatternOf({ pattern: "List" })).toBeUndefined();
    expect(screenPatternOf({ pattern: 1 })).toBeUndefined();
  });
});

// QFAI:EX-0001-0039-36
// QFAI:EX-0001-0039-37
describe("validate and the pattern key", () => {
  it("accepts every type ID and an absent or empty key", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      "    pattern: list",
      "  - id: order",
      "    route: /orders/1",
      "    pattern: detail",
      "  - id: new-order",
      "    route: /orders/new",
      "    pattern: form",
      "  - id: settings",
      "    route: /settings",
      "    pattern: settings",
      "  - id: members",
      "    route: /members",
      "    pattern: members",
      "  - id: home",
      "    route: /home",
      "    pattern: dashboard",
      "  - id: welcome",
      "    route: /welcome",
      "  - id: help",
      "    route: /help",
      "    pattern:",
      "  - id: about",
      "    route: /about",
      '    pattern: ""',
    );

    expect(await validateUiScreenPattern(root, defaultConfig)).toEqual([]);
  });

  it("reports another value at error, naming the screen, the value and the vocabulary", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      "    pattern: table",
      "  - id: order",
      "    route: /orders/1",
      "    pattern: detail",
    );

    const issues = await validateUiScreenPattern(root, defaultConfig);

    expect(issues).toHaveLength(1);
    const [finding] = issues;
    expect(finding?.code).toBe(UI_SCREEN_PATTERN_RULE_ID);
    expect(finding?.code).toBe("QFAI-CONTRACT-052");
    expect(finding?.severity).toBe("error");
    expect(finding?.file).toBe(CONTRACT);
    expect(finding?.message).toContain("screen 'orders'");
    expect(finding?.message).toContain("`pattern: table`");
    expect(finding?.message).toContain(
      "`list`, `detail`, `form`, `settings`, `members`, `dashboard`",
    );
    expect(ISSUE_EXPECTED_BY_CODE["QFAI-CONTRACT-052"]).toContain("`pattern`");
  });

  it("reports a value that is not a string as written", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      "    pattern: [list]",
    );

    const [finding] = await validateUiScreenPattern(root, defaultConfig);

    expect(finding?.message).toContain('`pattern: ["list"]`');
  });

  it("runs with the contract checks", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      "    pattern: List",
    );

    const codes = (await validateContracts(root, defaultConfig)).map((issue) => issue.code);

    expect(codes).toContain("QFAI-CONTRACT-052");
  });
});
