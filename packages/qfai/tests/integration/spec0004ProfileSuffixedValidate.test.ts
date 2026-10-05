/**
 * Integration: spec-0004 CHG-005 — Profile-suffixed validate output +
 * SSOT-sync pair-changed CI lane.
 *
 * Covers TC-0004-0055..0066.
 */
// QFAI:EX-0001-0047-01
// QFAI:EX-0001-0047-01
// QFAI:EX-0001-0047-02
// QFAI:EX-0001-0047-02

import { mkdir, mkdtemp, readFile, writeFile, access } from "node:fs/promises";
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

describe("TC-0004-0058: legacy path escalates to error at tool version 1.10.0 when consumer evidence exists", () => {
  it("D-DEPRECATED-PATH escalates to error and validate does NOT write the legacy file (but a pre-existing legacy file from a prior consumer remains)", async () => {
    // Seed a stale legacy file (simulating a prior pre-sunset write or a
    // consumer-managed file). This is the on-disk evidence the new
    // post-sunset emission gate keys off.
    const legacy = path.join(root, ".qfai/output/validate.json");
    await mkdir(path.dirname(legacy), { recursive: true });
    const stalePlaceholder = '{"stale": "pre-sunset placeholder"}';
    await writeFile(legacy, stalePlaceholder, "utf-8");

    await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.10.0",
    });

    // Legacy file still exists (validate did NOT delete it), but content
    // is unchanged — validate did NOT write to it under post-sunset.
    expect(await pathExists(legacy)).toBe(true);
    const legacyContent = await readFile(legacy, "utf-8");
    expect(legacyContent).toBe(stalePlaceholder);

    // The escalated finding appears in the always-latest report so
    // operators see why the legacy file is now stale.
    const latest = path.join(root, ".qfai/report/validate.json");
    const body = JSON.parse(await readFile(latest, "utf-8")) as {
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    const dep = body.issues.find((i) => i.code === "D-DEPRECATED-PATH");
    expect(dep).toBeDefined();
    expect(dep?.severity).toBe("error");
  });

  it("D-DEPRECATED-PATH is SUPPRESSED at tool version 1.10.0 when no legacy file is on disk (no consumer evidence)", async () => {
    // No pre-seed: clean project never used the legacy path.
    const legacy = path.join(root, ".qfai/output/validate.json");
    expect(await pathExists(legacy)).toBe(false);

    await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.10.0",
    });

    // Legacy file still absent — validate did not create it.
    expect(await pathExists(legacy)).toBe(false);

    // D-DEPRECATED-PATH must NOT be emitted: there is no consumer
    // evidence and the user never touched the legacy path.
    const latest = path.join(root, ".qfai/report/validate.json");
    const body = JSON.parse(await readFile(latest, "utf-8")) as {
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    const dep = body.issues.find((i) => i.code === "D-DEPRECATED-PATH");
    expect(dep).toBeUndefined();
  });
});

// QFAI:AC-0001-0047-02
// QFAI:EX-0001-0047-02
describe("legacy validate path becomes an error after the sunset", () => {
  it("consumer pointed at legacy path under tool 1.10.0+ surfaces D-DEPRECATED-PATH at error severity", async () => {
    // "Consumer pointed at legacy path" = the legacy file exists on disk
    // (from a prior pre-sunset run OR a manually-managed consumer write).
    // The post-sunset gate keys off this evidence to avoid noise on
    // projects that never used the legacy surface.
    const legacy = path.join(root, ".qfai/output/validate.json");
    await mkdir(path.dirname(legacy), { recursive: true });
    await writeFile(legacy, '{"stale": "prior consumer write"}', "utf-8");

    await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.10.0",
    });
    // The escalated finding appears in the always-latest report; the legacy
    // path is no longer being written by validate post-sunset, so a
    // consumer reading the legacy path will be blocked and the
    // operator-facing escalated D-DEPRECATED-PATH names the cutoff.
    const latest = path.join(root, ".qfai/report/validate.json");
    const body = JSON.parse(await readFile(latest, "utf-8")) as {
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    const dep = body.issues.find((i) => i.code === "D-DEPRECATED-PATH");
    expect(dep).toBeDefined();
    expect(dep?.severity).toBe("error");
    expect(dep?.message).toContain("1.10.0");
  });
});
