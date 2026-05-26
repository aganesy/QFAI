/**
 * Screen-id casing validator (spec-0012 Phase 3 / REQ-0012-0066).
 *
 * Asserts the new validator REJECTS hyphen-form `screens[].id` entries
 * in UI contracts with a naming error, and ACCEPTS underscore-form
 * entries. Hyphen casing forces the operator to choose between
 * filesystem-mirror paths (`iter-NN/<screen-id>.png`) and stable
 * code-side identifiers; the underscore convention removes that
 * tension and keeps the evidence aggregate dirs (Area D, TC-0448)
 * consistent end-to-end.
 */

// QFAI:SPEC-0012:TC-0012-0464

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateScreenIdCasing } from "../../../src/core/validators/prototypingEvidence.ts";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-id-casing-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedUiContract(root: string, screenIds: string[]): Promise<void> {
  await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
  const screensYaml = ["screens:"]
    .concat(screenIds.map((id) => `  - id: ${id}\n    route: "/${id}"`))
    .join("\n");
  await writeFile(path.join(root, ".qfai/contracts/ui/main.yaml"), `${screensYaml}\n`, "utf-8");
}

describe("screen-id casing validator", () => {
  it("ACCEPTS underscore-form ids (home_page / settings_panel)", async () => {
    const root = await newTempDir();
    await seedUiContract(root, ["home_page", "settings_panel"]);
    const issues = await validateScreenIdCasing(root, ".qfai/contracts");
    expect(issues).toEqual([]);
  });

  it("REJECTS hyphen-form ids (home-page / settings-panel) with naming error", async () => {
    const root = await newTempDir();
    await seedUiContract(root, ["home-page", "settings-panel"]);
    const issues = await validateScreenIdCasing(root, ".qfai/contracts");
    expect(issues.length).toBeGreaterThanOrEqual(2);
    const codes = issues.map((i) => i.code);
    expect(codes.every((c) => c === "QFAI-PROT-008")).toBe(true);
    const messages = issues.map((i) => i.message).join("\n");
    expect(messages).toMatch(/home-page/);
    expect(messages).toMatch(/settings-panel/);
  });

  it("ACCEPTS simple all-lowercase ids without hyphen (home / settings)", async () => {
    const root = await newTempDir();
    await seedUiContract(root, ["home", "settings"]);
    const issues = await validateScreenIdCasing(root, ".qfai/contracts");
    expect(issues).toEqual([]);
  });

  it("REJECTS a mixed list and reports only the hyphen-form entries", async () => {
    const root = await newTempDir();
    await seedUiContract(root, ["home_page", "settings-panel", "ok_one"]);
    const issues = await validateScreenIdCasing(root, ".qfai/contracts");
    expect(issues.length).toBe(1);
    expect(issues[0]?.message).toMatch(/settings-panel/);
  });
});
