/**
 * E2E acceptance for spec-0013 CHG-006 user stories US-0013-0012,
 * US-0013-0013, US-0013-0014:
 *   - US-0013-0012: resolve the active discussion pack via a single
 *     helper reading `.qfai/state.json#discussion.currentId` (no
 *     modification-time guessing; clear recovery error on ambiguity).
 *   - US-0013-0013: surface_type auto-populate on a UI-companion spec;
 *     D-SURFACE-TYPE-MISSING warns when frontmatter is absent.
 *   - US-0013-0014: structured primary_tasks `{id,label,acceptance}`
 *     shape accepted; recommended count band 3..7 named in
 *     QFAI-AUD-020 warning text.
 *
 * Converted from `.skip` test-first skeletons to deterministic
 * temp-fixture invocations of the production helpers. Per the layer
 * policy each block carries only the US annotation comment.
 */
// QFAI:SPEC-0013:US-0013-0012
// QFAI:SPEC-0013:US-0013-0013
// QFAI:SPEC-0013:US-0013-0014

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { populateSurfaceTypeIfUiCompanion } from "../../src/core/detection/surfaceType.js";
import {
  resolveActiveDiscussionPack,
  ResolveActiveDiscussionPackError,
} from "../../src/core/discussionPack.js";
import { writeDiscussionCurrentId } from "../../src/core/state.js";
import { validateDesignAudit } from "../../src/core/validators/designAudit.js";
import { validateSurfaceTypeDrift } from "../../src/core/validators/surfaceTypeDrift.js";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-chg006-e2e-"));
});

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true });
  }
});

async function seedDiscussionPack(name: string): Promise<string> {
  const packDir = path.join(root, ".qfai", "discussion", name);
  await mkdir(packDir, { recursive: true });
  return packDir;
}

async function seedSpec(specId: string, body: string): Promise<string> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specId}`);
  await mkdir(specDir, { recursive: true });
  const specPath = path.join(specDir, "01_Spec.md");
  await writeFile(specPath, body, "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# User stories\n", "utf-8");
  await writeFile(
    path.join(specDir, "03_Acceptance-Criteria.md"),
    "# Acceptance Criteria\n",
    "utf-8",
  );
  return specPath;
}

async function seedUiCompanion(filename: string, body: string): Promise<void> {
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(path.join(uiDir, filename), body, "utf-8");
}

describe("spec-0013 US-0013-0012 active-pack resolver", () => {
  it("QFAI:SPEC-0013:US-0013-0012 — normal: resolver returns the pack named in state.json#discussion.currentId", async () => {
    const expected = await seedDiscussionPack("discussion-20260527075558258");
    await writeDiscussionCurrentId(root, "discussion-20260527075558258");
    const resolved = await resolveActiveDiscussionPack(root);
    expect(resolved).toBe(expected);
  });

  it("QFAI:SPEC-0013:US-0013-0012 — error: absent/missing currentId raises a recovery error", async () => {
    await seedDiscussionPack("discussion-20260101000000000");
    await expect(resolveActiveDiscussionPack(root)).rejects.toBeInstanceOf(
      ResolveActiveDiscussionPackError,
    );
    try {
      await resolveActiveDiscussionPack(root);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toMatch(/qfai discussion use <id>/);
      expect(message).toMatch(/discussion-20260101000000000/);
    }
  });
});

describe("spec-0013 US-0013-0013 surface_type auto-populate", () => {
  it("QFAI:SPEC-0013:US-0013-0013 — normal: populator writes surface_type: ui-bearing when a UI companion exists", async () => {
    const specPath = await seedSpec(
      "0099",
      ["---", "id: spec-0099", "---", "", "# Sample", ""].join("\n"),
    );
    await seedUiCompanion(
      "ui-0099-dashboard.yaml",
      ["screens:", "  - id: dashboard", "    route: /dashboard", "    primary_tasks: []", ""].join(
        "\n",
      ),
    );
    const result = await populateSurfaceTypeIfUiCompanion(root, "0099", defaultConfig);
    expect(result.changed).toBe(true);
    const body = await readFile(specPath, "utf-8");
    expect(body).toMatch(/surface_type:\s*ui-bearing/);
  });

  it("QFAI:SPEC-0013:US-0013-0013 — boundary/error: D-SURFACE-TYPE-MISSING warns on companion-without-frontmatter", async () => {
    await seedSpec(
      "0091",
      ["---", "id: spec-0091", "---", "", "# Sample", ""].join("\n"),
    );
    await seedUiCompanion(
      "ui-0091-dashboard.yaml",
      ["screens:", "  - id: dashboard", "    route: /dashboard", "    primary_tasks: []", ""].join(
        "\n",
      ),
    );
    const issues = await validateSurfaceTypeDrift(root, defaultConfig);
    const drift = issues.find((issue) => issue.code === "D-SURFACE-TYPE-MISSING");
    expect(drift, "expected D-SURFACE-TYPE-MISSING warning").toBeDefined();
    expect(drift?.severity).toBe("warning");
  });
});

describe("spec-0013 US-0013-0014 primary_tasks band + shape", () => {
  async function seedUi(uiContract: string) {
    await seedUiCompanion("sample.yaml", uiContract);
    return validateDesignAudit(root, defaultConfig);
  }

  it("QFAI:SPEC-0013:US-0013-0014 — normal: structured items accepted and band 3..7 named in warning when count out-of-band", async () => {
    const tasks = Array.from({ length: 9 }, (_, i) => `      - task_${i + 1}`).join("\n");
    const issues = await seedUi(
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
    expect(warning, "expected QFAI-AUD-020 for count=9").toBeDefined();
    expect(warning?.message ?? "").toMatch(/3\.\.7|3 to 7/);
  });

  it("QFAI:SPEC-0013:US-0013-0014 — error/boundary: count below 3 warns; incomplete structured item rejected", async () => {
    const issues = await seedUi(
      [
        "screens:",
        "  - id: dashboard",
        "    title: Dashboard",
        "    route: /dashboard",
        "    primary_tasks:",
        "      - id: t1",
        "        label: Mark shipped",
        // intentionally missing acceptance
        "      - id: t2",
        "        label: Inspect",
        "        acceptance: drawer opens",
        "",
      ].join("\n"),
    );
    expect(issues.find((issue) => issue.code === "QFAI-AUD-020")).toBeDefined();
    const shape = issues.find((issue) => issue.code === "QFAI-AUD-021");
    expect(shape, "expected QFAI-AUD-021 for incomplete structured item").toBeDefined();
    expect(shape?.severity).toBe("error");
  });
});
