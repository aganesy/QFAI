/**
 * The `omitted` list a UI contract screen declares.
 *
 * A screen records each part of the business-screen list it leaves out as a
 * `{ part, reason }` entry, so a reviewer can tell a deliberate omission from a
 * missing part. The key is optional; only an entry the reviewer cannot read as
 * a part and a reason is reported.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateContracts } from "../../src/core/validators/contracts.js";
import {
  UI_SCREEN_OMITTED_RULE_ID,
  omittedDefectsOf,
  validateUiScreenOmitted,
} from "../../src/core/validators/uiScreenOmitted.js";

const tempDirs: string[] = [];
const CONTRACT = path.join(".qfai", "spec", "03_contract", "ui", "ui-0001-app.yaml");

async function rootWithContract(...screenLines: string[]): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-omitted-"));
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
describe("validate accepts a screen's omitted list", () => {
  it("finds no defect in an absent, empty or well-formed list", () => {
    expect(omittedDefectsOf({ id: "orders" })).toEqual([]);
    expect(omittedDefectsOf({ id: "orders", omitted: null })).toEqual([]);
    expect(omittedDefectsOf({ id: "orders", omitted: [] })).toEqual([]);
    expect(
      omittedDefectsOf({
        id: "orders",
        omitted: [{ part: "pagination", reason: "the list holds at most ten rows" }],
      }),
    ).toEqual([]);
  });

  it("raises nothing for screens that write no list, an empty one or full entries", async () => {
    const root = await rootWithContract(
      "  - id: home",
      "    route: /",
      "    omitted:",
      "      - part: app shell",
      "        reason: the application has one screen, so there is nothing to navigate to",
      "  - id: orders",
      "    route: /orders",
      "  - id: settings",
      "    route: /settings",
      "    omitted:",
      "  - id: drafts",
      "    route: /drafts",
      "    omitted: []",
    );

    expect(await validateUiScreenOmitted(root, defaultConfig)).toEqual([]);
  });
});

// QFAI:EX-0001-0039-37
describe("validate reports an omitted list it cannot read", () => {
  it("names a list that is not a list, an entry that is not a mapping and a blank key", () => {
    expect(omittedDefectsOf({ omitted: "pagination" })).toEqual(["`omitted` is not a list"]);
    expect(omittedDefectsOf({ omitted: ["pagination"] })).toEqual([
      "`omitted[0]` is not a mapping with `part` and `reason`",
    ]);
    expect(
      omittedDefectsOf({
        omitted: [{ part: "sort" }, { part: " ", reason: "x" }, { reason: "" }],
      }),
    ).toEqual([
      "`omitted[0]` has no `reason`",
      "`omitted[1]` has no `part`",
      "`omitted[2]` has no `part` and no `reason`",
    ]);
  });

  it("reports each defect at error, naming the contract, the screen and the entry", async () => {
    const root = await rootWithContract(
      "  - id: orders",
      "    route: /orders",
      "    omitted:",
      "      - part: pagination",
      "      - part: sort",
      "        reason: rows arrive in the order they are due",
    );

    const issues = await validateUiScreenOmitted(root, defaultConfig);

    expect(issues).toHaveLength(1);
    const [finding] = issues;
    expect(finding?.code).toBe(UI_SCREEN_OMITTED_RULE_ID);
    expect(finding?.code).toBe("QFAI-CONTRACT-052");
    expect(finding?.severity).toBe("error");
    expect(finding?.file).toBe(CONTRACT.split(path.sep).join("/"));
    expect(finding?.message).toContain("screen 'orders'");
    expect(finding?.message).toContain("`omitted[0]` has no `reason`");
    expect(finding?.refs).toEqual(["orders"]);
  });

  it("runs with the contract checks", async () => {
    const root = await rootWithContract("  - id: home", "    route: /", "    omitted: pagination");

    const codes = (await validateContracts(root, defaultConfig)).map((issue) => issue.code);

    expect(codes).toContain("QFAI-CONTRACT-052");
  });
});
