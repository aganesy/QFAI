/**
 * Integration: spec-0004 CHG-005 — Profile-suffixed validate output +
 * SSOT-sync pair-changed CI lane.
 *
 * Covers TC-0004-0055..0066.
 */
// QFAI:EX-0001-0047-01
// QFAI:EX-0001-0047-01

import { mkdtemp, readFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { removeTempTree } from "../helpers/tempTree.js";

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-spec0004-chg005-${prefix}-`));
}

let root: string;

beforeEach(async () => {
  root = await newRoot("base");
});

afterEach(async () => {
  await removeTempTree(root);
});

// ────────────────────────────────────────────────────────────────────────────
// REQ-0120 — Profile-suffixed validate output
// ────────────────────────────────────────────────────────────────────────────

describe("TC-0004-0055: profile-suffixed path written per invocation", () => {
  it("running --profile prototyping then --profile default produces both validate-<profile>.json files with independent contents", async () => {
    await runValidate({ root, strict: false, profile: "prototyping" });
    await runValidate({ root, strict: false, profile: "tdd" });

    const protoPath = path.join(root, ".qfai/report/validate-prototyping.json");
    const defaultPath = path.join(root, ".qfai/report/validate-tdd.json");

    expect(await pathExists(protoPath)).toBe(true);
    expect(await pathExists(defaultPath)).toBe(true);

    const protoBody = JSON.parse(await readFile(protoPath, "utf-8")) as { profile?: string };
    const defaultBody = JSON.parse(await readFile(defaultPath, "utf-8")) as { profile?: string };
    expect(protoBody.profile).toBe("prototyping");
    expect(defaultBody.profile).toBe("tdd");
    // Independent — at minimum the `profile` field differs.
    expect(protoBody.profile).not.toBe(defaultBody.profile);
  });
});

describe("TC-0004-0056: always-latest validate.json#profile reflects most-recent run", () => {
  it("top-level profile field flips between consecutive profile invocations", async () => {
    const alwaysLatest = path.join(root, ".qfai/report/validate.json");

    await runValidate({ root, strict: false, profile: "prototyping" });
    let body = JSON.parse(await readFile(alwaysLatest, "utf-8")) as { profile?: string };
    expect(body.profile).toBe("prototyping");

    await runValidate({ root, strict: false, profile: "tdd" });
    body = JSON.parse(await readFile(alwaysLatest, "utf-8")) as { profile?: string };
    expect(body.profile).toBe("tdd");
  });

  // QFAI:AC-0001-0047-01
  // QFAI:EX-0001-0047-01
  it("records a run with no profile as the full profile", async () => {
    await runValidate({ root, strict: false });
    const full = JSON.parse(
      await readFile(path.join(root, ".qfai/report/validate-full.json"), "utf-8"),
    ) as { profile?: string };
    const latest = JSON.parse(
      await readFile(path.join(root, ".qfai/report/validate.json"), "utf-8"),
    ) as { profile?: string };
    expect(full.profile).toBe("full");
    expect(latest.profile).toBe("full");
  });
});
