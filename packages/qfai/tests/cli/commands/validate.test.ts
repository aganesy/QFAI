/**
 * TC-3.9.x — validate.ts QFAI-DCON-* known-codes contract.
 *
 * The Phase 3b plan vacates DCON IDs tied to deleted yaml validators
 * (006/007/008/010/011/014/015/016/017 + 020/021) and adds DCON-030/031/032
 * for the new root DESIGN.md gates. 005/009/012/013/018/019 are preserved.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runValidate } from "../../../src/cli/commands/validate.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-validate-"));
  tempDirs.push(dir);
  return dir;
}

async function readSrc(filename: string): Promise<string> {
  const repoRoot = path.resolve(__dirname, "../../..");
  const file = path.join(repoRoot, "src", "cli", "commands", filename);
  return readFile(file, "utf-8");
}

describe("validate.ts QFAI-DCON-* known codes (TC-3.9.x)", () => {
  it("TC-3.9.1: new validator IDs return correct error messages", async () => {
    const src = await readSrc("validate.ts");
    expect(src).toMatch(/"QFAI-DCON-030":[\s\S]*?DESIGN\.md/);
    expect(src).toMatch(/"QFAI-DCON-031":[\s\S]*?DESIGN\.md\.lock\.yaml/);
    expect(src).toMatch(/"QFAI-DCON-032":[\s\S]*?sha256/);
  });

  it("TC-3.9.2: removed validator IDs are no longer in the lookup map", async () => {
    const src = await readSrc("validate.ts");
    for (const removed of [
      "QFAI-DCON-002",
      "QFAI-DCON-003",
      "QFAI-DCON-004",
      "QFAI-DCON-006",
      "QFAI-DCON-007",
      "QFAI-DCON-008",
      "QFAI-DCON-010",
      "QFAI-DCON-011",
      "QFAI-DCON-014",
      "QFAI-DCON-015",
      "QFAI-DCON-016",
      "QFAI-DCON-017",
      "QFAI-DCON-018",
      "QFAI-DCON-020",
      "QFAI-DCON-021",
    ]) {
      expect(src.includes(`"${removed}":`), `${removed} must be vacated`).toBe(false);
    }
  });

  it("TC-3.9.3: gap-allowed numbering preserved (005/009/012/013/019/030/031/032 present)", async () => {
    const src = await readSrc("validate.ts");
    for (const preserved of [
      "QFAI-DCON-001",
      "QFAI-DCON-005",
      "QFAI-DCON-009",
      "QFAI-DCON-012",
      "QFAI-DCON-013",
      "QFAI-DCON-019",
      "QFAI-DCON-030",
      "QFAI-DCON-031",
      "QFAI-DCON-032",
    ]) {
      expect(src.includes(`"${preserved}":`), `${preserved} must be present`).toBe(true);
    }
  });

  it("TC-3.9.4: new IDs map to non-empty messages (not undefined)", async () => {
    const src = await readSrc("validate.ts");
    // The literal map is in src; we extract each line and assert non-empty
    // value. Robustness > exhaustiveness here — the smoke is sufficient
    // because TC-3.9.1 already pinned content.
    for (const id of ["QFAI-DCON-030", "QFAI-DCON-031", "QFAI-DCON-032"]) {
      const re = new RegExp(`"${id}":[\\s\\S]*?"([^"]+)"`);
      const match = re.exec(src);
      expect(match, `${id} should map to a non-empty string`).not.toBeNull();
      expect((match?.[1] ?? "").length).toBeGreaterThan(0);
    }
  });

  it("TC-3.9.5: validate emits DCON-030 when root DESIGN.md is missing", async () => {
    const root = await newTempDir();
    // Minimal UI-bearing project without DESIGN.md.
    await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
    await mkdir(path.join(root, ".qfai/contracts/design"), { recursive: true });
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/contracts/ui/ui.yaml"),
      "screens:\n  - id: home\n    title: Home\n    route: /\n",
      "utf-8",
    );
    await writeFile(
      path.join(root, ".qfai/specs/spec-0001/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec\n",
      "utf-8",
    );
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      ["paths:", "  contractsDir: .qfai/contracts", "  specsDir: .qfai/specs", ""].join("\n"),
      "utf-8",
    );
    await runValidate({ root, strict: false, format: "text" });
    const validateJson = JSON.parse(
      await readFile(path.join(root, ".qfai/report/validate.json"), "utf-8"),
    ) as { issues: Array<{ code: string }> };
    expect(validateJson.issues.some((i) => i.code === "QFAI-DCON-030")).toBe(true);
  });
});
