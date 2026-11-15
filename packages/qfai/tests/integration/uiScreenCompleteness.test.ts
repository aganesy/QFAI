/**
 * `qfai validate` warns about an application screen of a UI contract that
 * declares no states or no navigation, or has a list with no list behaviour,
 * and asks a marketing screen for none of them.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";

const STATES = "QFAI-CONTRACT-053";
const NAVIGATION = "QFAI-CONTRACT-054";
const CONTRACT = path.join(".qfai", "spec", "03_contract", "ui", "ui-0001-app.yaml");

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-completeness-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function contract(...screenLines: string[]): Promise<void> {
  const file = path.join(root, CONTRACT);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, ["screens:", ...screenLines, ""].join("\n"), "utf-8");
}

async function completenessFindings() {
  const { issues } = await validateProject(root, undefined, { profile: "sdd" });
  return issues.filter((item) => item.code === STATES || item.code === NAVIGATION);
}

// QFAI:AC-0001-0039-07
describe("validate warns about a screen with no states or no navigation", () => {
  it("warns for the application screen and asks the marketing screen for neither", async () => {
    await contract(
      "  - id: orders",
      "    route: /orders",
      "    states:",
      "      - { id: default, renders: the orders, next: open one }",
      "      - { id: loading, renders: progress, next: wait }",
      "  - id: print_receipt",
      "    route: /orders/:id/print",
      "    navigation:",
      "      none: a print view opened in its own window; the browser closes it",
      "    states:",
      "      - { id: default, renders: the receipt, next: print it }",
      "      - { id: empty, none: a receipt always has an order }",
      "      - { id: loading, renders: progress, next: wait }",
      "      - { id: error, renders: an alert with a retry, next: retry }",
      "      - { id: success, none: printing is the browser's }",
      "  - id: home",
      "    route: /",
      "    surface: marketing",
    );

    const findings = await completenessFindings();

    expect(findings.map((item) => [item.code, item.severity, item.refs])).toEqual([
      [STATES, "warning", ["orders"]],
      [NAVIGATION, "warning", ["orders"]],
    ]);
    const [states, navigation] = findings;
    expect(states?.message).toContain("`empty`, `error`, `success`");
    expect(states?.file).toBe(CONTRACT.split(path.sep).join("/"));
    expect(navigation?.suggested_action).toContain("`navigation: { none: <reason> }`");
  });
});

// QFAI:AC-0001-0039-08
describe("validate warns about a list or table element with no list behaviour", () => {
  it("warns for the application screen's table and asks the marketing screen's table for nothing", async () => {
    await contract(
      "  - id: orders",
      "    route: /orders",
      "    elements:",
      "      - { id: orders_table, type: table }",
      "      - id: steps_list",
      "        type: list",
      "        list: { none: the three fixed checkout steps are always shown together }",
      "  - id: pricing",
      "    route: /pricing",
      "    surface: marketing",
      "    elements:",
      "      - { id: plans_table, type: table }",
    );

    const { issues } = await validateProject(root, undefined, { profile: "sdd" });
    const findings = issues.filter((item) => item.code === "QFAI-CONTRACT-055");

    expect(findings.map((item) => [item.severity, item.refs])).toEqual([
      ["warning", ["orders", "orders_table"]],
    ]);
    expect(findings[0]?.suggested_action).toContain("`list: { none: <reason> }`");
  });
});
