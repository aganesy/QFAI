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
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

async function createNonUiPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function completeScreenEntryNested(
  id: string,
  opts?: { missingStates?: string[]; skipTransitions?: boolean },
): string {
  const lines = [
    `### Screen: ${id}`,
    "",
    `- screen_id: ${id}`,
    `- route: /app/${id}`,
    `- purpose: Main ${id} view`,
    `- actor: end-user`,
    "- primary_tasks:",
    "  - View data: click list → data table displayed",
    "  - Edit entries: click edit → form opens",
    "- secondary_tasks:",
    "  - Export data: click export → file downloaded",
    "  - Filter results: use filter bar → table filtered",
    "- required_states:",
  ];
  const allStates = ["default", "loading", "empty", "error"];
  const includeStates = allStates.filter((s) => !(opts?.missingStates ?? []).includes(s));
  for (const s of includeStates) {
    lines.push(`  - ${s}: ${s} state description`);
  }
  if (!opts?.skipTransitions) {
    lines.push(
      "- transitions:",
      "  - empty → loading: data fetch initiated",
      "  - loading → default: data received",
      "  - loading → error: fetch failure",
      "  - error → loading: retry action",
    );
  }
  lines.push(
    "- observable_outcomes:",
    "  - Data displayed → visible in table",
    "  - Changes saved → toast notification",
    `- notes_for_verify: Check responsive layout`,
    `- notes_for_reviewer: Focus on loading state`,
  );
  return lines.join("\n");
}

describe("screen contract validator", () => {
  it("nested bullet canonical pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = ["# Screen Contracts", "", completeScreenEntryNested("dashboard")].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("nested bullet state coverage edge", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      completeScreenEntryNested("dashboard", { missingStates: ["empty", "error"] }),
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    const stateIssue = issues.find((i) => i.code === "UIX-VAL-SCREEN-CONTRACT-STATE-COVERAGE");
    expect(stateIssue).toBeDefined();
    expect(stateIssue?.message).toContain("empty");
    expect(stateIssue?.message).toContain("error");
  });

  it("rejects legacy flat nested fields", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      "### Screen: dashboard",
      "",
      "- screen_id: dashboard",
      "- route: /app/dashboard",
      "- purpose: Main dashboard view",
      "- actor: end-user",
      "- primary_tasks: View data, Edit entries",
      "- secondary_tasks: Export data",
      "- required_states: default, loading, empty, error",
      "- transitions: default -> loading",
      "- observable_outcomes: Data displayed",
      "- notes_for_verify: Check layout",
      "- notes_for_reviewer: Focus on states",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    expect(issues.some((i) => i.code === "UIX-VAL-SCREEN-CONTRACT-LEGACY-FORMAT")).toBe(true);
  });

  it("nested bullet incomplete (missing transitions)", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      completeScreenEntryNested("dashboard", { skipTransitions: true }),
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    const incompleteIssue = issues.find(
      (i) => i.code === "UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE",
    );
    expect(incompleteIssue).toBeDefined();
    expect(incompleteIssue?.message).toContain("transitions");
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
      "- primary_tasks:",
      "  - View data: open dashboard summary",
      "- secondary_tasks:",
      "  - Export data: download CSV",
      "- required_states:",
      "  - default: Ready state",
      "  - loading: Spinner state",
      "  - empty: Empty list state",
      "  - error: Retry state",
      "- notes_for_verify: Check layout",
      "- notes_for_reviewer: Focus on states",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

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
      completeScreenEntryNested("main-dashboard"),
      "",
      completeScreenEntryNested("main-dashboard"), // duplicate
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

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
      completeScreenEntryNested("dashboard", { missingStates: ["empty", "error"] }),
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    const stateIssue = issues.find((i) => i.code === "UIX-VAL-SCREEN-CONTRACT-STATE-COVERAGE");
    expect(stateIssue).toBeDefined();
    expect(stateIssue?.severity).toBe("error");
    expect(stateIssue?.message).toContain("empty");
    expect(stateIssue?.message).toContain("error");
  });
});

describe("a screen that does one thing", () => {
  /**
   * The minimum screen the contract permits: one primary task, no
   * secondary task, four declared states, and no transition or outcome
   * beyond what the one task produces.
   *
   * Every nested key is present. What varies is whether a list under it
   * holds anything, which is the distinction the validator has to make —
   * an explicit empty list is an answer, a missing key is not.
   */
  function simpleScreen(id: string): string {
    return [
      `### Screen: ${id}`,
      "",
      `- screen_id: ${id}`,
      `- route: /app/${id}`,
      `- purpose: Confirm the pending action`,
      `- actor: end-user`,
      "- primary_tasks:",
      "  - Confirm: click confirm → the action is applied",
      "- secondary_tasks:",
      "- required_states:",
      "  - default: the action is described and confirm is enabled",
      "  - loading: confirm is disabled while the action runs",
      "  - empty: there is nothing pending to confirm",
      "  - error: the action failed and can be retried",
      "- transitions:",
      "- observable_outcomes:",
      `- notes_for_verify: Confirm is the only control`,
      `- notes_for_reviewer: Nothing else belongs on this screen`,
    ].join("\n");
  }

  async function issuesFor(
    content: string,
  ): Promise<Awaited<ReturnType<typeof validateScreenContractSchema>>> {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "40_screen_contracts.md"),
      ["# Screen Contracts", "", content].join("\n"),
      "utf-8",
    );
    return validateScreenContractSchema(root, defaultConfig);
  }

  it("validates", async () => {
    expect(await issuesFor(simpleScreen("confirm"))).toEqual([]);
  });

  // The three keys answered by being declared, each dropped on its own, so
  // one of them silently becoming optional-when-absent is reported rather
  // than covered by the other two.
  it.each(["secondary_tasks", "transitions", "observable_outcomes"])(
    "still reports %s when the key is absent rather than empty",
    async (key) => {
      const content = simpleScreen("confirm")
        .split("\n")
        .filter((line) => line !== `- ${key}:`)
        .join("\n");
      const incomplete = (await issuesFor(content)).find(
        (i) => i.code === "UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE",
      );
      expect(incomplete?.message).toContain(key);
    },
  );

  // These two are required to hold something. A screen with no primary
  // task is not a screen, and an unrepresented empty or error state is a
  // real defect rather than an answer.
  it.each(["primary_tasks", "required_states"])(
    "still reports %s when the list is empty",
    async (key) => {
      const lines = simpleScreen("confirm").split("\n");
      const start = lines.indexOf(`- ${key}:`);
      const end = lines.findIndex((line, i) => i > start && line.startsWith("- "));
      const content = [...lines.slice(0, start + 1), ...lines.slice(end)].join("\n");
      const incomplete = (await issuesFor(content)).find(
        (i) => i.code === "UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE",
      );
      expect(incomplete?.message).toContain(key);
    },
  );
});
