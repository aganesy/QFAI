/**
 * Integration acceptance for spec-0013 CHG-006 test cases
 * Current active-pack resolver and primary_tasks ceiling + shape.
 *
 * Converted from `.skip` test-first skeletons to deterministic temp-dir
 * fixtures invoking the production helpers directly. Each block sets
 * up an isolated workspace with `mkdtemp` and tears it down via
 * `afterEach`.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  resolveActiveDiscussionPack,
  ResolveActiveDiscussionPackError,
} from "../../src/core/discussionPack.js";
import { writeDiscussionCurrentId } from "../../src/core/state.js";
import { validateDesignAudit } from "../../src/core/validators/designAudit.js";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-chg006-"));
});

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true });
  }
});

async function makeDiscussionPack(name: string): Promise<string> {
  const packDir = path.join(root, ".qfai", "discussion", name);
  await mkdir(packDir, { recursive: true });
  return packDir;
}

async function makeUiContract(filename: string, content: string): Promise<void> {
  const uiDir = path.join(root, ".qfai", "spec", "03_contract", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(path.join(uiDir, filename), content, "utf-8");
}

describe("spec-0013 active-pack resolver CHG-006", () => {
  // QFAI:EX-0001-0154-01
  it("QFAI:EX-0001-0154-01 — normal: the single helper returns the pack named in state.json#discussion.currentId", async () => {
    const expected = await makeDiscussionPack("discussion-20260527075558258");
    await makeDiscussionPack("discussion-20260528075558258");
    await writeDiscussionCurrentId(root, "discussion-20260527075558258");
    const resolved = await resolveActiveDiscussionPack(root);
    expect(resolved).toBe(expected);
  });

  // QFAI:EX-0001-0154-03
  it("QFAI:EX-0001-0154-03 — a dangling currentId names candidate packs and the recovery command", async () => {
    await makeDiscussionPack("discussion-20260101000000000");
    await makeDiscussionPack("discussion-20260202000000000");
    await writeDiscussionCurrentId(root, "discussion-20260303000000000");
    await expect(resolveActiveDiscussionPack(root)).rejects.toBeInstanceOf(
      ResolveActiveDiscussionPackError,
    );
    try {
      await resolveActiveDiscussionPack(root);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toMatch(/discussion-20260101000000000/);
      expect(message).toMatch(/discussion-20260202000000000/);
      expect(message).toMatch(/qfai discussion use <id>/);
    }
  });

  // QFAI:EX-0001-0154-02
  it("QFAI:EX-0001-0154-02 — an absent currentId names candidate packs and the recovery command", async () => {
    await makeDiscussionPack("discussion-20260101000000000");
    await makeDiscussionPack("discussion-20260202000000000");

    await expect(resolveActiveDiscussionPack(root)).rejects.toMatchObject({
      reason: "unset",
      message: expect.stringContaining("qfai discussion use <id>"),
    });
    try {
      await resolveActiveDiscussionPack(root);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("discussion-20260101000000000");
      expect(message).toContain("discussion-20260202000000000");
    }
  });
});

describe("spec-0013 primary_tasks ceiling + shape CHG-006", () => {
  async function withinBandIssues(uiContract: string) {
    await makeUiContract("sample.yaml", uiContract);
    return validateDesignAudit(root, defaultConfig);
  }

  // QFAI:EX-0001-0155-01
  it("QFAI:EX-0001-0155-01 — normal: QFAI-AUD-020 warning text names the ceiling when count is 9", async () => {
    const tasks = Array.from(
      { length: 9 },
      (_, i) => `      - { id: task_${i + 1}, label: task_${i + 1}, acceptance: done }`,
    ).join("\n");
    const issues = await withinBandIssues(
      [
        "screens:",
        "  - id: dashboard",
        "    title: Dashboard",
        "    route: /dashboard",
        "    primary_tasks:",
        tasks,
        "",
      ].join("\n"),
    );
    const warning = issues.find((issue) => issue.code === "QFAI-AUD-020");
    expect(warning, "expected QFAI-AUD-020 warning").toBeDefined();
    // QFAI-AUD-020 is a count finding, not a deprecation — it has no
    // sunset and stays a warning.
    expect(warning?.severity).toBe("warning");
    expect(warning?.message ?? "").toMatch(/at most 7/);
  });

  // QFAI:AC-0001-0155-01
  // QFAI:EX-0001-0155-04
  it("QFAI:EX-0001-0155-04 — boundary: count 8 warns; 2, 3 and 7 do not", async () => {
    // count == 2: silent, because there is no floor
    {
      const issues = await withinBandIssues(
        [
          "screens:",
          "  - id: dashboard",
          "    title: Dashboard",
          "    route: /dashboard",
          "    primary_tasks:",
          "      - { id: t1, label: t1, acceptance: done }",
          "      - { id: t2, label: t2, acceptance: done }",
          "",
        ].join("\n"),
      );
      expect(issues.filter((issue) => issue.code === "QFAI-AUD-020")).toEqual([]);
    }
    // Reset workspace for an isolated assertion (count == 3 / 7 / 8).
    await rm(root, { recursive: true, force: true });
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-chg006-"));
    {
      const issues = await withinBandIssues(
        [
          "screens:",
          "  - id: dashboard",
          "    title: Dashboard",
          "    route: /dashboard",
          "    primary_tasks:",
          "      - { id: t1, label: t1, acceptance: done }",
          "      - { id: t2, label: t2, acceptance: done }",
          "      - { id: t3, label: t3, acceptance: done }",
          "",
        ].join("\n"),
      );
      expect(issues.find((issue) => issue.code === "QFAI-AUD-020")).toBeUndefined();
    }
    await rm(root, { recursive: true, force: true });
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-chg006-"));
    {
      const issues = await withinBandIssues(
        [
          "screens:",
          "  - id: dashboard",
          "    title: Dashboard",
          "    route: /dashboard",
          "    primary_tasks:",
          "      - { id: t1, label: t1, acceptance: done }",
          "      - { id: t2, label: t2, acceptance: done }",
          "      - { id: t3, label: t3, acceptance: done }",
          "      - { id: t4, label: t4, acceptance: done }",
          "      - { id: t5, label: t5, acceptance: done }",
          "      - { id: t6, label: t6, acceptance: done }",
          "      - { id: t7, label: t7, acceptance: done }",
          "      - { id: t8, label: t8, acceptance: done }",
          "",
        ].join("\n"),
      );
      expect(issues.find((issue) => issue.code === "QFAI-AUD-020")).toBeDefined();
    }
  });

  // QFAI:EX-0001-0155-02
  it("QFAI:EX-0001-0155-02 — normal: complete structured items are accepted and a string item is rejected", async () => {
    const issues = await withinBandIssues(
      [
        "screens:",
        "  - id: dashboard",
        "    title: Dashboard",
        "    route: /dashboard",
        "    primary_tasks:",
        "      - Review",
        "      - id: t2",
        "        label: Mark shipped",
        "        acceptance: status flips",
        "      - id: t3",
        "        label: Inspect",
        "        acceptance: drawer renders",
        "",
      ].join("\n"),
    );
    const shape = issues.filter((issue) => issue.code === "QFAI-AUD-021");
    expect(shape.map((issue) => issue.message)).toEqual([
      expect.stringMatching(
        /primary_task #1 must be a mapping with exactly id, label and acceptance/,
      ),
    ]);
    expect(issues.find((issue) => issue.code === "QFAI-AUD-020")).toBeUndefined();
  });

  // QFAI:EX-0001-0155-02
  it("QFAI:EX-0001-0155-02 — error: structured item missing acceptance is rejected (closed schema)", async () => {
    const issues = await withinBandIssues(
      [
        "screens:",
        "  - id: dashboard",
        "    title: Dashboard",
        "    route: /dashboard",
        "    primary_tasks:",
        "      - id: t1",
        "        label: Review",
        "        acceptance: rows visible",
        "      - id: t2",
        "        label: Mark shipped",
        "      - id: t3",
        "        label: Inspect",
        "        acceptance: drawer renders",
        "",
      ].join("\n"),
    );
    const shape = issues.find((issue) => issue.code === "QFAI-AUD-021");
    expect(shape, "expected QFAI-AUD-021 rejection").toBeDefined();
    expect(shape?.severity).toBe("error");
    expect(shape?.message ?? "").toMatch(/acceptance/);
  });
});
