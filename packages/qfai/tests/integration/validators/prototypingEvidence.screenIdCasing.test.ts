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
    expect(codes.every((c) => c === "QFAI-PROT-010")).toBe(true);
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

  it("REJECTS hyphen-form ids in .yml extension (not just .yaml)", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
    const screensYaml = ["screens:", `  - id: home-page\n    route: "/home-page"`].join("\n");
    await writeFile(path.join(root, ".qfai/contracts/ui/main.yml"), `${screensYaml}\n`, "utf-8");
    const issues = await validateScreenIdCasing(root, ".qfai/contracts");
    expect(issues.length).toBe(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-010");
    expect(issues[0]?.message).toMatch(/home-page/);
  });

  // Regression: when `paths.contractsDir` is an ABSOLUTE path (e.g. the
  // operator points it at an out-of-tree contracts checkout), the
  // validator must honor that absolute path verbatim and NOT prepend
  // `root` to it. The prior implementation used `path.join(root, abs)`
  // which silently concatenated and scanned the wrong directory,
  // dropping every QFAI-PROT-010 hit. The fix uses `path.resolve`,
  // which correctly returns the absolute arg verbatim.
  it("HONORS an absolute contractsDir (regression: path.resolve, not path.join)", async () => {
    const root = await newTempDir();
    const absContracts = await newTempDir();
    // Seed hyphen-form ids under the ABSOLUTE contractsDir/ui dir.
    await mkdir(path.join(absContracts, "ui"), { recursive: true });
    const screensYaml = [
      "screens:",
      `  - id: home-page\n    route: "/home-page"`,
      `  - id: settings-panel\n    route: "/settings-panel"`,
    ].join("\n");
    await writeFile(path.join(absContracts, "ui/main.yaml"), `${screensYaml}\n`, "utf-8");

    expect(path.isAbsolute(absContracts)).toBe(true);
    const issues = await validateScreenIdCasing(root, absContracts);
    expect(issues.length).toBe(2);
    expect(issues.every((i) => i.code === "QFAI-PROT-010")).toBe(true);
    const messages = issues.map((i) => i.message).join("\n");
    expect(messages).toMatch(/home-page/);
    expect(messages).toMatch(/settings-panel/);

    // Also confirm: the buggy code path (`path.join(root, absContracts)`)
    // would have produced a directory that does not contain the seeded
    // hyphen-form contracts. Spot-check by passing a deliberately wrong
    // root: results must be identical because the absolute contractsDir
    // is honored verbatim regardless of root.
    const otherRoot = await newTempDir();
    const issuesOtherRoot = await validateScreenIdCasing(otherRoot, absContracts);
    expect(issuesOtherRoot.length).toBe(2);
  });
});
