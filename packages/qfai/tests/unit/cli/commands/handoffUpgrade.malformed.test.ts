/**
 * Unit: `qfai handoff upgrade` malformed-input handling (TC-0015-0031,
 * AC-0015-0020).
 *
 * - malformed / unreadable legacy file → clear error
 * - the canonical destination is NOT overwritten or partially emitted
 */
// QFAI:SPEC-0015:TC-0015-0031

import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runHandoffUpgrade } from "../../../../src/cli/commands/handoffUpgrade.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-handoff-upgrade-unit-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0015-0031: handoff upgrade rejects malformed input without partial overwrite", () => {
  it("errors when the legacy file is absent and writes nothing", async () => {
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "missing.yaml",
      write: () => undefined,
      writeErr: (m) => errs.push(m),
    });
    expect(code).not.toBe(0);
    expect(errs.join("\n")).toMatch(/not found|missing|legacy/i);
    // Canonical handoff.yaml must NOT exist.
    let exists = true;
    try {
      await access(path.join(root, "handoff.yaml"));
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });

  it("preserves a pre-existing canonical handoff.yaml when malformed legacy input is rejected", async () => {
    const preExistingBody = "companyName: pre-existing\n";
    await writeFile(path.join(root, "handoff.yaml"), preExistingBody, "utf-8");
    // Legacy file body is empty / pure whitespace — no parseable keys.
    await writeFile(path.join(root, "legacy.yaml"), "   \n\n  \n", "utf-8");
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.yaml",
      write: () => undefined,
      writeErr: (m) => errs.push(m),
    });
    expect(code).not.toBe(0);
    expect(errs.join("\n")).toMatch(/malformed|no recognizable/i);
    // handoff.yaml must NOT be overwritten / partially emitted.
    const after = await readFile(path.join(root, "handoff.yaml"), "utf-8");
    expect(after).toBe(preExistingBody);
  });
});
