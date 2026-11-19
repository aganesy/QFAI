/**
 * `qfai validate` reads the surface kind and the business screen type of each
 * UI contract screen, and the
 * shipped steps, card and rule read a marketing screen against its own floor.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ISSUE_EXPECTED_BY_CODE } from "../../src/cli/commands/validate.js";
import { validateProject } from "../../src/core/validate.js";

const CODE = "QFAI-CONTRACT-051";
const CONTRACT = path.join(".qfai", "spec", "03_contract", "ui", "ui-0001-site.yaml");
const initRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
);

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-surface-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function contract(...screenLines: string[]): Promise<void> {
  const file = path.join(root, CONTRACT);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, ["screens:", ...screenLines, ""].join("\n"), "utf-8");
}

async function surfaceFindings() {
  const { issues } = await validateProject(root, undefined, { profile: "sdd" });
  return issues.filter((item) => item.code === CODE);
}

// QFAI:AC-0001-0039-04
describe("validate reads the surface kind of each UI contract screen", () => {
  it("raises nothing for an absent, empty, application or marketing surface", async () => {
    await contract(
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
    );
    expect(await surfaceFindings()).toEqual([]);
  });

  it("raises one error for another value and describes the rule", async () => {
    await contract("  - id: home", "    route: /", "    surface: landing");
    const reported = await surfaceFindings();
    expect(reported).toHaveLength(1);
    expect(reported[0]?.severity).toBe("error");
    expect(reported[0]?.message).toContain("`surface: landing`");
    expect(ISSUE_EXPECTED_BY_CODE[CODE]).toContain("`application` or `marketing`");
  });
});

// QFAI:AC-0001-0039-06
describe("validate reads the business screen type of each UI contract screen", () => {
  it("raises nothing for a type ID or an absent pattern, and one error for another value or a pattern on a marketing screen", async () => {
    await contract(
      "  - id: orders",
      "    route: /orders",
      "    pattern: list",
      "  - id: welcome",
      "    route: /welcome",
      "  - id: report",
      "    route: /report",
      "    pattern: table",
      "  - id: pricing",
      "    route: /pricing",
      "    surface: marketing",
      "    pattern: list",
    );
    const { issues } = await validateProject(root, undefined, { profile: "sdd" });
    const reported = issues.filter((item) => item.code === "QFAI-CONTRACT-056");
    expect(reported).toHaveLength(2);
    expect(reported.every((item) => item.severity === "error")).toBe(true);
    const report = reported.find((item) => item.message.includes("screen 'report'"));
    const pricing = reported.find((item) => item.message.includes("screen 'pricing'"));
    expect(report?.message).toContain("`pattern: table`");
    expect(pricing?.message).toContain("A marketing screen takes no `pattern`");
  });
});

// QFAI:AC-0001-0308-01
describe("a marketing screen is read against its own floor", () => {
  it("cites a heading the shipped interface-clarity rule declares", async () => {
    const rule = await readFile(
      path.join(initRoot, "root/.agents/rules/interface-clarity.md"),
      "utf-8",
    );
    const heading = "## What a marketing screen always has";
    expect(rule.split(/\r?\n/)).toContain(heading);
    for (const citer of [
      ".qfai/assistant/step/sdd-contract/STEP.md",
      ".qfai/assistant/agent/product-surface-reviewer.md",
      ".qfai/assistant/rule/references/reviewer-findings.md",
    ]) {
      const text = await readFile(path.join(initRoot, citer), "utf-8");
      const cites =
        text.includes("interface-clarity.md#what-a-marketing-screen-always-has") ||
        text.includes(`\`${heading}\``);
      expect(cites, citer).toBe(true);
    }
  });
});
