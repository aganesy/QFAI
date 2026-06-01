/**
 * Tests for `populateSurfaceTypeIfUiCompanion` — the helper that
 * `/qfai-sdd` invokes to write `surface_type: ui-bearing` into a
 * spec's `01_Spec.md` frontmatter when a matching
 * `.qfai/contracts/ui/<spec>-*.yaml` companion is present.
 *
 * Plus the `D-SURFACE-TYPE-MISSING` warning emitted when a UI
 * companion exists but the frontmatter has not been set yet.
 */
// QFAI:SPEC-0013:TC-0013-0030
// QFAI:SPEC-0013:TC-0013-0031

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { populateSurfaceTypeIfUiCompanion } from "../../src/core/detection/surfaceType.js";
import { validateSurfaceTypeDrift } from "../../src/core/validators/surfaceTypeDrift.js";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-surface-type-"));
});

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true });
  }
});

async function makeSpec(specId: string, specBody: string): Promise<string> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specId}`);
  await mkdir(specDir, { recursive: true });
  const specPath = path.join(specDir, "01_Spec.md");
  await writeFile(specPath, specBody, "utf-8");
  // Minimal layered v1421 marker (`02_User-stories.md`) so
  // `collectSpecEntries` classifies the dir consistently.
  await writeFile(path.join(specDir, "02_User-stories.md"), "# User stories\n", "utf-8");
  await writeFile(
    path.join(specDir, "03_Acceptance-Criteria.md"),
    "# Acceptance Criteria\n",
    "utf-8",
  );
  return specPath;
}

async function makeUiCompanion(specId: string, slug: string): Promise<void> {
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  const fileName = `ui-${specId}-${slug}.yaml`;
  await writeFile(
    path.join(uiDir, fileName),
    ["screens:", "  - id: dashboard", "    route: /dashboard", "    primary_tasks: []", ""].join(
      "\n",
    ),
    "utf-8",
  );
}

describe("TC-0013-0030: populateSurfaceTypeIfUiCompanion auto-populates frontmatter", () => {
  it("writes `surface_type: ui-bearing` when a UI companion is present and frontmatter lacks the key", async () => {
    const specPath = await makeSpec(
      "0099",
      ["---", "id: spec-0099", "---", "", "# Sample spec", ""].join("\n"),
    );
    await makeUiCompanion("0099", "dashboard");

    const result = await populateSurfaceTypeIfUiCompanion(root, "0099", defaultConfig);
    expect(result.changed).toBe(true);

    const updated = await readFile(specPath, "utf-8");
    expect(updated).toMatch(/surface_type:\s*ui-bearing/);
  });

  it("is idempotent — running twice does not duplicate the key or otherwise mutate the file", async () => {
    const specPath = await makeSpec(
      "0098",
      ["---", "id: spec-0098", "---", "", "# Sample spec", ""].join("\n"),
    );
    await makeUiCompanion("0098", "panel");

    await populateSurfaceTypeIfUiCompanion(root, "0098", defaultConfig);
    const afterFirst = await readFile(specPath, "utf-8");
    const second = await populateSurfaceTypeIfUiCompanion(root, "0098", defaultConfig);
    const afterSecond = await readFile(specPath, "utf-8");

    expect(second.changed).toBe(false);
    expect(afterSecond).toBe(afterFirst);
    expect(afterSecond.match(/surface_type:\s*ui-bearing/g)?.length ?? 0).toBe(1);
  });

  it("does nothing (returns changed=false) for a spec with no UI companion", async () => {
    const specPath = await makeSpec(
      "0097",
      ["---", "id: spec-0097", "---", "", "# Sample spec", ""].join("\n"),
    );

    const result = await populateSurfaceTypeIfUiCompanion(root, "0097", defaultConfig);
    expect(result.changed).toBe(false);

    const body = await readFile(specPath, "utf-8");
    expect(body).not.toMatch(/surface_type:\s*ui-bearing/);
  });
});

describe("TC-0013-0031: D-SURFACE-TYPE-MISSING warns on companion-without-frontmatter", () => {
  it("emits D-SURFACE-TYPE-MISSING (warning) when a UI companion exists but frontmatter lacks the key", async () => {
    await makeSpec("0090", ["---", "id: spec-0090", "---", "", "# Sample spec", ""].join("\n"));
    await makeUiCompanion("0090", "home");

    const issues = await validateSurfaceTypeDrift(root, defaultConfig);
    const drift = issues.find((issue) => issue.code === "D-SURFACE-TYPE-MISSING");
    expect(drift, "expected a D-SURFACE-TYPE-MISSING finding").toBeDefined();
    expect(drift?.severity).toBe("warning");
    expect(drift?.message ?? "").toMatch(/0090/);
    expect(drift?.message ?? "").toMatch(/surface_type/);
  });

  it("emits no D-SURFACE-TYPE-MISSING finding when the spec has no UI companion", async () => {
    await makeSpec("0089", ["---", "id: spec-0089", "---", "", "# Sample spec", ""].join("\n"));
    const issues = await validateSurfaceTypeDrift(root, defaultConfig);
    const drift = issues.find((issue) => issue.code === "D-SURFACE-TYPE-MISSING");
    expect(drift).toBeUndefined();
  });

  it("emits no D-SURFACE-TYPE-MISSING finding when frontmatter already declares surface_type: ui-bearing", async () => {
    await makeSpec(
      "0088",
      ["---", "id: spec-0088", "surface_type: ui-bearing", "---", "", "# Sample spec", ""].join(
        "\n",
      ),
    );
    await makeUiCompanion("0088", "settings");
    const issues = await validateSurfaceTypeDrift(root, defaultConfig);
    const drift = issues.find((issue) => issue.code === "D-SURFACE-TYPE-MISSING");
    expect(drift).toBeUndefined();
  });
});
