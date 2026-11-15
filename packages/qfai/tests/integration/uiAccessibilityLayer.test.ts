/**
 * A full `qfai validate` warns when a project whose UI contracts declare a web
 * route has no test file that calls axe, and the shipped steps write and run
 * the accessibility spec that silences it.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ISSUE_EXPECTED_BY_CODE } from "../../src/cli/commands/validate.js";
import { validateProject } from "../../src/core/validate.js";

const CODE = "QFAI-AXE-001";
const CONTRACT = path.join(".qfai", "spec", "03_contract", "ui", "ui-0001-orders.yaml");
const assistant = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
);

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-axe-validate-"));
  const file = path.join(root, CONTRACT);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, "screens:\n  - id: orders\n    route: /orders\n", "utf-8");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function axeFindings(profile: "verify" | "full" | "tdd") {
  const { issues } = await validateProject(root, undefined, { profile });
  return issues.filter((item) => item.code === CODE);
}

// QFAI:AC-0001-0311-01
describe("validate warns about a UI project with no accessibility check", () => {
  it("warns in verify and full, and not in a partial profile", async () => {
    const verify = await axeFindings("verify");
    expect(verify).toHaveLength(1);
    expect(verify[0]?.severity).toBe("warning");
    expect(await axeFindings("full")).toHaveLength(1);
    expect(await axeFindings("tdd")).toEqual([]);
    expect(ISSUE_EXPECTED_BY_CODE[CODE]).toContain("calls axe");
  });

  it("is quiet once the E2E layer holds a spec that calls axe", async () => {
    const spec = path.join(root, "tests", "e2e", "accessibility.spec.ts");
    await mkdir(path.dirname(spec), { recursive: true });
    await writeFile(
      spec,
      'import AxeBuilder from "@axe-core/playwright";\nexport const builder = AxeBuilder;\n',
      "utf-8",
    );
    expect(await axeFindings("verify")).toEqual([]);
  });
});

// QFAI:AC-0001-0311-02
describe("the shipped steps write, run and note the accessibility check", () => {
  it("links the scaffold, the template, the layer and both verify gates", async () => {
    const scaffold = await readFile(
      path.join(assistant, "step", "implement-scaffold", "STEP.md"),
      "utf-8",
    );
    const repoGate = await readFile(
      path.join(assistant, "step", "verify-repo-gate", "STEP.md"),
      "utf-8",
    );
    const qfaiGate = await readFile(
      path.join(assistant, "step", "verify-qfai-gate", "STEP.md"),
      "utf-8",
    );
    const layers = await readFile(path.join(assistant, "rule", "test-layers.md"), "utf-8");

    expect(scaffold).toContain(
      ".qfai/assistant/skill/qfai-implement/references/accessibility-check.md",
    );
    for (const text of [scaffold, repoGate, qfaiGate]) {
      expect(text).toContain(".qfai/assistant/rule/test-layers.md#l6-accessibility");
    }
    expect(layers).toContain("### L6 Accessibility");
    expect(qfaiGate).toContain(CODE);
  });
});
