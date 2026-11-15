/**
 * `qfai validate` shape-checks the `omitted` list of each UI contract screen,
 * and the shipped rule and reviewer card send the reason for a part left out to
 * that list.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ISSUE_EXPECTED_BY_CODE } from "../../src/cli/commands/validate.js";
import { validateProject } from "../../src/core/validate.js";

const CODE = "QFAI-CONTRACT-052";
const CONTRACT = path.join(".qfai", "spec", "03_contract", "ui", "ui-0001-app.yaml");
const initRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
);

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-omitted-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function contract(...screenLines: string[]): Promise<void> {
  const file = path.join(root, CONTRACT);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, ["screens:", ...screenLines, ""].join("\n"), "utf-8");
}

async function omittedFindings() {
  const { issues } = await validateProject(root, undefined, { profile: "sdd" });
  return issues.filter((item) => item.code === CODE);
}

// QFAI:AC-0001-0039-05
describe("validate shape-checks the omitted list of each UI contract screen", () => {
  it("raises nothing for an absent, empty or well-formed list", async () => {
    await contract(
      "  - id: home",
      "    route: /",
      "    omitted:",
      "      - part: one shared component per repeated pattern",
      "        reason: no pattern repeats across the two screens",
      "  - id: orders",
      "    route: /orders",
      "  - id: settings",
      "    route: /settings",
      "    omitted: []",
    );
    expect(await omittedFindings()).toEqual([]);
  });

  it("raises one error per unreadable entry and describes the rule", async () => {
    await contract(
      "  - id: orders",
      "    route: /orders",
      "    omitted:",
      "      - part: pagination",
      "      - reason: rows arrive sorted",
    );
    const reported = await omittedFindings();
    expect(reported).toHaveLength(2);
    expect(reported.every((item) => item.severity === "error")).toBe(true);
    expect(reported[0]?.message).toContain("`omitted[0]` has no non-blank string `reason`");
    expect(reported[1]?.message).toContain("`omitted[1]` has no non-blank string `part`");
    expect(ISSUE_EXPECTED_BY_CODE[CODE]).toContain("`part`");
    expect(ISSUE_EXPECTED_BY_CODE[CODE]).toContain("`reason`");
  });
});

// QFAI:AC-0001-0305-05
describe("a part a screen leaves out is recorded in one place", () => {
  it("the rule and the reviewer card both name the omitted list", async () => {
    const rule = await readFile(
      path.join(initRoot, "root", ".agents", "rules", "interface-clarity.md"),
      "utf-8",
    );
    const card = await readFile(
      path.join(initRoot, ".qfai", "assistant", "agent", "product-surface-reviewer.md"),
      "utf-8",
    );
    for (const text of [rule, card]) {
      const flat = text.replace(/\s+/g, " ");
      expect(flat).toContain("`omitted` list");
      expect(flat).toContain("app frame");
    }
  });
});
