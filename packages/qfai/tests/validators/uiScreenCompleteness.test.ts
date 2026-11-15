/**
 * The `states` and `navigation` every application screen of a UI contract
 * declares, and the `list` block of each list or table element on it.
 *
 * A screen without them is built with only its elements and actions: no empty,
 * loading, error or success state, no place in the app, and lists with no
 * search, sort or paging. A marketing screen is read against its own pattern
 * reference and is asked for none of them.
 */
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { ISSUE_EXPECTED_BY_CODE } from "../../src/cli/commands/validate.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateContracts } from "../../src/core/validators/contracts.js";
import {
  LIST_ELEMENT_TYPES,
  SCREEN_STATE_IDS,
  UI_ELEMENT_LIST_RULE_ID,
  UI_SCREEN_NAVIGATION_RULE_ID,
  UI_SCREEN_STATES_RULE_ID,
  validateUiScreenCompleteness,
} from "../../src/core/validators/uiScreenCompleteness.js";

const tempDirs: string[] = [];
const CONTRACT = ".qfai/spec/03_contract/ui/ui-0001-app.yaml";
const SDD_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
  "qfai-sdd",
);
const SAMPLE = path.join(SDD_DIR, "templates", "contracts", "ui-contract.sample.yaml");

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-complete-"));
  tempDirs.push(root);
  await mkdir(path.dirname(path.join(root, CONTRACT)), { recursive: true });
  return root;
}

async function rootWithContract(...screenLines: string[]): Promise<string> {
  const root = await tempRoot();
  await writeFile(path.join(root, CONTRACT), ["screens:", ...screenLines, ""].join("\n"), "utf-8");
  return root;
}

const ALL_STATES = [
  "    states:",
  "      - { id: default, renders: the orders, next: open one }",
  "      - { id: empty, renders: no orders yet, next: start one }",
  "      - { id: loading, renders: progress in place of the rows, next: wait }",
  "      - { id: error, renders: an alert with a retry, next: retry }",
  "      - { id: success, none: the screen changes nothing }",
];

const NAVIGATION = [
  "    navigation:",
  "      shell: app_shell",
  "      entry_points: [Orders item in the main navigation]",
  "      back_to: nowhere; the screen is top level",
];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0039-40
describe("a screen that declares its states and navigation", () => {
  it("raises nothing, nor does `navigation: none` with a reason or a marketing screen", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      ...NAVIGATION,
      ...ALL_STATES,
      "  - id: print_receipt",
      "    route: /orders/:id/print",
      "    navigation:",
      "      none: a print view opened in its own window; the browser closes it",
      ...ALL_STATES,
      "  - id: home",
      "    route: /",
      "    surface: marketing",
    );

    expect(await validateUiScreenCompleteness(root, defaultConfig)).toEqual([]);
  });

  it("lists the five states in the order the guide writes them", () => {
    expect(SCREEN_STATE_IDS).toEqual(["default", "empty", "loading", "error", "success"]);
  });
});

// QFAI:EX-0001-0039-41
describe("a screen whose states are missing", () => {
  it("warns once per screen, naming the file, the screen and each state it lacks", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      ...NAVIGATION,
      "  - id: settings",
      "    route: /settings",
      ...NAVIGATION,
      "    states:",
      "      - { id: default, renders: the settings, next: change one }",
      "      - { id: loading, renders: progress, next: wait }",
      "      - { id: error, renders: an alert, next: retry }",
    );

    const issues = await validateUiScreenCompleteness(root, defaultConfig);

    expect(issues.map((finding) => finding.code)).toEqual([
      UI_SCREEN_STATES_RULE_ID,
      UI_SCREEN_STATES_RULE_ID,
    ]);
    expect(UI_SCREEN_STATES_RULE_ID).toBe("QFAI-CONTRACT-053");
    const [orders, settings] = issues;
    expect(orders?.severity).toBe("warning");
    expect(orders?.file).toBe(CONTRACT);
    expect(orders?.refs).toEqual(["orders"]);
    expect(orders?.message).toContain("screen 'orders'");
    expect(orders?.message).toContain("declares no `states`");
    expect(settings?.message).toContain("screen 'settings'");
    expect(settings?.message).toContain("`empty`, `success`");
    expect(settings?.message).not.toContain("`default`");
    expect(settings?.suggested_action).toContain("`none`");
  });

  it("runs with the contract checks", async () => {
    const root = await rootWithContract("  - id: orders", "    route: /orders", ...NAVIGATION);

    const codes = (await validateContracts(root, defaultConfig)).map((finding) => finding.code);

    expect(codes).toContain("QFAI-CONTRACT-053");
    expect(ISSUE_EXPECTED_BY_CODE["QFAI-CONTRACT-053"]).toBeDefined();
  });
});

// QFAI:EX-0001-0039-42
describe("a screen whose navigation is missing", () => {
  it("warns for no `navigation` and for a `none` with no reason, naming the `none` form", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      ...ALL_STATES,
      "  - id: help",
      "    route: /help",
      "    navigation:",
      '      none: ""',
      ...ALL_STATES,
    );

    const issues = await validateUiScreenCompleteness(root, defaultConfig);

    expect(issues.map((finding) => finding.code)).toEqual([
      UI_SCREEN_NAVIGATION_RULE_ID,
      UI_SCREEN_NAVIGATION_RULE_ID,
    ]);
    expect(UI_SCREEN_NAVIGATION_RULE_ID).toBe("QFAI-CONTRACT-054");
    const [orders, help] = issues;
    expect(orders?.severity).toBe("warning");
    expect(orders?.file).toBe(CONTRACT);
    expect(orders?.message).toContain("screen 'orders'");
    expect(help?.message).toContain("screen 'help'");
    expect(help?.suggested_action).toContain("`navigation: { none: <reason> }`");
  });

  it("runs with the contract checks", async () => {
    const root = await rootWithContract("  - id: orders", "    route: /orders", ...ALL_STATES);

    const codes = (await validateContracts(root, defaultConfig)).map((finding) => finding.code);

    expect(codes).toContain("QFAI-CONTRACT-054");
    expect(ISSUE_EXPECTED_BY_CODE["QFAI-CONTRACT-054"]).toBeDefined();
  });
});

// QFAI:EX-0001-0039-44
describe("a list or table element that declares its list behaviour", () => {
  it("raises nothing, nor does `list: none` with a reason or a table on a marketing screen", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      ...NAVIGATION,
      ...ALL_STATES,
      "    elements:",
      "      - id: orders_table",
      "        type: table",
      "        list:",
      "          columns: [order number, status]",
      "          search: order number",
      "          filters: [status]",
      "          sort: newest first",
      "          pagination: 25 rows per page on the server",
      "      - id: steps_list",
      "        type: list",
      "        list:",
      "          none: the three fixed steps of the checkout are always shown together",
      "      - id: order_search_input",
      "        type: input",
      "  - id: pricing",
      "    route: /pricing",
      "    surface: marketing",
      "    elements:",
      "      - id: plans_table",
      "        type: table",
    );

    expect(await validateUiScreenCompleteness(root, defaultConfig)).toEqual([]);
  });

  it("reads list and table elements only", () => {
    expect(LIST_ELEMENT_TYPES).toEqual(["list", "table"]);
  });
});

// QFAI:EX-0001-0039-45
describe("a list or table element whose list behaviour is missing", () => {
  it("warns for no `list` and for a `none` with no reason, naming the screen and the element", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      ...NAVIGATION,
      ...ALL_STATES,
      "    elements:",
      "      - id: orders_table",
      "        type: table",
      "      - id: recent_list",
      "        type: list",
      "        list:",
      '          none: ""',
    );

    const issues = await validateUiScreenCompleteness(root, defaultConfig);

    expect(issues.map((finding) => finding.code)).toEqual([
      UI_ELEMENT_LIST_RULE_ID,
      UI_ELEMENT_LIST_RULE_ID,
    ]);
    expect(UI_ELEMENT_LIST_RULE_ID).toBe("QFAI-CONTRACT-055");
    const [table, list] = issues;
    expect(table?.severity).toBe("warning");
    expect(table?.file).toBe(CONTRACT);
    expect(table?.refs).toEqual(["orders", "orders_table"]);
    expect(table?.message).toContain("screen 'orders'");
    expect(table?.message).toContain("`type: table` element 'orders_table'");
    expect(list?.message).toContain("`type: list` element 'recent_list'");
    expect(list?.suggested_action).toContain("`list: { none: <reason> }`");
  });

  it("runs with the contract checks", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      ...NAVIGATION,
      ...ALL_STATES,
      "    elements:",
      "      - { id: orders_table, type: table }",
    );

    const codes = (await validateContracts(root, defaultConfig)).map((finding) => finding.code);

    expect(codes).toContain("QFAI-CONTRACT-055");
    expect(ISSUE_EXPECTED_BY_CODE["QFAI-CONTRACT-055"]).toBeDefined();
  });
});

// QFAI:EX-0001-0039-43
// QFAI:EX-0001-0039-46
describe("the shipped UI contract sample", () => {
  it("raises none of the warnings", async () => {
    const root = await tempRoot();
    await copyFile(SAMPLE, path.join(root, CONTRACT));

    expect(await validateUiScreenCompleteness(root, defaultConfig)).toEqual([]);
  });

  it("is described, with the `none` form, in the guide, the rules and the contract step", async () => {
    const flat = async (...parts: string[]): Promise<string> =>
      (await readFile(path.join(SDD_DIR, ...parts), "utf-8")).replace(/\s+/g, " ");
    const documents = [
      await flat("references", "ui-contract-guide.md"),
      await flat("references", "contract-artifact-rules.md"),
      await flat("..", "..", "step", "sdd-contract", "STEP.md"),
    ];
    for (const text of documents) {
      expect(text).toContain("`QFAI-CONTRACT-053`");
      expect(text).toContain("`QFAI-CONTRACT-054`");
      expect(text).toContain("`QFAI-CONTRACT-055`");
    }
    expect(documents[0]).toContain("`navigation: { none: <reason> }`");
    expect(documents[2]).toContain("`navigation: { none: <reason> }`");
    expect(documents[0]).toContain("`list: { none: <reason> }`");
    expect(documents[2]).toContain("`list: { none: <reason> }`");
  });
});
