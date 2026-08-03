/**
 * Integration acceptance for spec-0013 CHG-006 test cases
 * TC-0013-0028..0035 (active-pack resolver, surface_type frontmatter
 * auto-populate + D-SURFACE-TYPE-MISSING, primary_tasks band + shape).
 *
 * Converted from `.skip` test-first skeletons to deterministic temp-dir
 * fixtures invoking the production helpers directly. Each block sets
 * up an isolated workspace with `mkdtemp` and tears it down via
 * `afterEach`.
 */
// QFAI:SPEC-0013:TC-0013-0028
// QFAI:SPEC-0013:TC-0013-0029
// QFAI:SPEC-0013:TC-0013-0030
// QFAI:SPEC-0013:TC-0013-0031
// QFAI:SPEC-0013:TC-0013-0032
// QFAI:SPEC-0013:TC-0013-0033
// QFAI:SPEC-0013:TC-0013-0034
// QFAI:SPEC-0013:TC-0013-0035

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { SUNSETS, deprecationSeverity } from "../../src/core/sunset.js";
import { resolveToolVersion } from "../../src/core/version.js";
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
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(path.join(uiDir, filename), content, "utf-8");
}

async function makeSpec(specId: string, body: string): Promise<string> {
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

describe("spec-0013 active-pack resolver CHG-006", () => {
  it("QFAI:SPEC-0013:TC-0013-0028 — normal: the single helper returns the pack named in state.json#discussion.currentId", async () => {
    const expected = await makeDiscussionPack("discussion-20260527075558258");
    await writeDiscussionCurrentId(root, "discussion-20260527075558258");
    const resolved = await resolveActiveDiscussionPack(root);
    expect(resolved).toBe(expected);
  });

  it("QFAI:SPEC-0013:TC-0013-0029 — error: absent/missing currentId raises a recovery error naming candidate dirs and 'qfai discussion use <id>'", async () => {
    await makeDiscussionPack("discussion-20260101000000000");
    await makeDiscussionPack("discussion-20260202000000000");
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
});

describe("spec-0013 surface_type frontmatter CHG-006", () => {
  it("QFAI:SPEC-0013:TC-0013-0030 — normal: populator writes 'surface_type: ui-bearing' when a UI companion exists", async () => {
    const specPath = await makeSpec(
      "0099",
      ["---", "id: spec-0099", "---", "", "# Sample", ""].join("\n"),
    );
    await makeUiContract(
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

  it("QFAI:SPEC-0013:TC-0013-0031 — boundary: D-SURFACE-TYPE-MISSING (warning) when companion exists but frontmatter is absent; no finding without companion", async () => {
    await makeSpec("0091", ["---", "id: spec-0091", "---", "", "# Sample", ""].join("\n"));
    await makeSpec("0092", ["---", "id: spec-0092", "---", "", "# Sample", ""].join("\n"));
    await makeUiContract(
      "ui-0091-dashboard.yaml",
      ["screens:", "  - id: dashboard", "    route: /dashboard", "    primary_tasks: []", ""].join(
        "\n",
      ),
    );
    const issues = await validateSurfaceTypeDrift(root, defaultConfig);
    const drift91 = issues.find(
      (issue) => issue.code === "D-SURFACE-TYPE-MISSING" && (issue.message ?? "").includes("0091"),
    );
    const drift92 = issues.find(
      (issue) => issue.code === "D-SURFACE-TYPE-MISSING" && (issue.message ?? "").includes("0092"),
    );
    expect(drift91, "expected drift finding for spec-0091").toBeDefined();
    // Version-computed, not a literal. This asserted `"warning"` while the
    // finding's own remediation text promised escalation "in a future minor
    // release", so it kept passing through the release that was supposed to
    // change it. Comparing against `deprecationSeverity` breaks if the
    // validator hard-codes again, and holds on both sides of the sunset.
    expect(drift91?.severity).toBe(
      deprecationSeverity(await resolveToolVersion(), SUNSETS.surfaceTypeMissing),
    );
    expect(drift92, "expected NO drift finding for spec-0092 (no companion)").toBeUndefined();
  });
});

describe("spec-0013 primary_tasks band + shape CHG-006", () => {
  async function withinBandIssues(uiContract: string) {
    await makeUiContract("sample.yaml", uiContract);
    return validateDesignAudit(root, defaultConfig);
  }

  it("QFAI:SPEC-0013:TC-0013-0032 — normal: QFAI-AUD-020 warning text names the band 3..7 when count is 9", async () => {
    const tasks = Array.from({ length: 9 }, (_, i) => `      - task_${i + 1}`).join("\n");
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
    // QFAI-AUD-020 is a count-band finding, not a deprecation — it has no
    // sunset and stays a warning.
    expect(warning?.severity).toBe("warning");
    expect(warning?.message ?? "").toMatch(/3\.\.7|3 to 7/);
  });

  it("QFAI:SPEC-0013:TC-0013-0033 — boundary: counts 2 and 8 warn; 3 and 7 do not", async () => {
    // count == 2: warn
    {
      const issues = await withinBandIssues(
        [
          "screens:",
          "  - id: dashboard",
          "    title: Dashboard",
          "    route: /dashboard",
          "    primary_tasks:",
          "      - t1",
          "      - t2",
          "",
        ].join("\n"),
      );
      expect(issues.find((issue) => issue.code === "QFAI-AUD-020")).toBeDefined();
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
          "      - t1",
          "      - t2",
          "      - t3",
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
          "      - t1",
          "      - t2",
          "      - t3",
          "      - t4",
          "      - t5",
          "      - t6",
          "      - t7",
          "      - t8",
          "",
        ].join("\n"),
      );
      expect(issues.find((issue) => issue.code === "QFAI-AUD-020")).toBeDefined();
    }
  });

  it("QFAI:SPEC-0013:TC-0013-0034 — normal: string-only AND complete structured items are accepted", async () => {
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
    expect(issues.find((issue) => issue.code === "QFAI-AUD-021")).toBeUndefined();
    expect(issues.find((issue) => issue.code === "QFAI-AUD-020")).toBeUndefined();
  });

  it("QFAI:SPEC-0013:TC-0013-0035 — error: structured item missing acceptance is rejected (closed schema)", async () => {
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
