/**
 * Screen contract validator tests — spec-0034 TDD-0020..TDD-0024
 *
 * QFAI:SPEC-0002:TC-0002-0020
 * QFAI:SPEC-0002:TC-0002-0021
 * QFAI:SPEC-0002:TC-0002-0022
 * QFAI:SPEC-0002:TC-0002-0023
 * QFAI:SPEC-0002:TC-0002-0024
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateScreenContractSchema } from "../../../src/core/validators/uix/screenContract.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-"));
  tempDirs.push(dir);
  return dir;
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

async function createNonUiPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
}

function completeScreenEntry(id: string, states = "default, loading, empty, error"): string {
  return [
    `### Screen: ${id}`,
    "",
    `- screen_id: ${id}`,
    `- route: /app/${id}`,
    `- purpose: Main ${id} view`,
    `- actor: end-user`,
    `- primary_tasks: View data, Edit entries`,
    `- required_states: ${states}`,
    `- transitions: Navigate to detail, Back to list`,
    `- observable_outcomes: Data displayed, Changes saved`,
    `- notes_for_verify: Check responsive layout`,
    `- notes_for_reviewer: Focus on loading state`,
  ].join("\n");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("screen contract validator", () => {
  it("complete pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      completeScreenEntry("dashboard"),
      "",
      completeScreenEntry("settings"),
      "",
      completeScreenEntry("profile"),
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("incomplete fail", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // Screen missing transitions and observable_outcomes
    const content = [
      "# Screen Contracts",
      "",
      "### Screen: dashboard",
      "",
      "- screen_id: dashboard",
      "- route: /app/dashboard",
      "- purpose: Main view",
      "- actor: end-user",
      "- primary_tasks: View data",
      "- required_states: default, loading, empty, error",
      "- notes_for_verify: Check layout",
      "- notes_for_reviewer: Focus on states",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe("UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE");
  });

  it("non-UI skip", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateScreenContractSchema(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("duplicate screen_id", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      completeScreenEntry("main-dashboard"),
      "",
      completeScreenEntry("main-dashboard"), // duplicate
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    const dupIssue = issues.find((i) => i.code === "UIX-VAL-SCREEN-CONTRACT-DUPLICATE-ID");
    expect(dupIssue).toBeDefined();
    expect(dupIssue?.severity).toBe("error");
  });

  it("state coverage edge", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // Missing empty and error states
    const content = [
      "# Screen Contracts",
      "",
      completeScreenEntry("dashboard", "default, loading"),
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    const stateIssue = issues.find((i) => i.code === "UIX-VAL-SCREEN-CONTRACT-STATE-COVERAGE");
    expect(stateIssue).toBeDefined();
    expect(stateIssue?.severity).toBe("error");
    expect(stateIssue?.message).toContain("empty");
    expect(stateIssue?.message).toContain("error");
  });
});
