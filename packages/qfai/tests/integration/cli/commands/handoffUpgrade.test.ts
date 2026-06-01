/**
 * Integration: `qfai handoff upgrade <legacy-file>` happy-path
 * (TC-0015-0030, AC-0015-0020).
 *
 * - emits a conforming `.qfai/handoff.yaml` at the canonical path
 * - recognized fields are mapped to schema-defined slots
 * - ALL original fields preserved under a `legacy:` key (no data loss)
 */
// QFAI:SPEC-0015:TC-0015-0030

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runHandoffUpgrade } from "../../../../src/cli/commands/handoffUpgrade.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-handoff-upgrade-int-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const LEGACY_BODY = `# legacy session handoff
companyName: Acme
primarySpecId: spec-0012
startDate: 2026-05-27
unrecognizedField: legacy-only-data
customNotes: "remember to migrate"
`;

describe("TC-0015-0030: handoff upgrade emits conforming yaml + preserves originals", () => {
  it("maps recognized fields and preserves all originals under legacy:", async () => {
    await writeFile(path.join(root, "session-handoff.yaml"), LEGACY_BODY, "utf-8");
    const out: string[] = [];
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "session-handoff.yaml",
      write: (m) => out.push(m),
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(0);
    expect(errs).toEqual([]);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    // Canonical slots mapped.
    expect(body).toMatch(/companyName: "Acme"/);
    expect(body).toMatch(/primarySpecId: "spec-0012"/);
    expect(body).toMatch(/startDate: "2026-05-27"/);
    // legacy: key carries the full original payload (lossless).
    expect(body).toMatch(/legacy:/);
    expect(body).toMatch(/unrecognizedField/);
    expect(body).toMatch(/customNotes/);
    // Success line printed.
    expect(out.join("\n")).toMatch(/handoff\.yaml/);
  });

  it("upgrades a JSON-formatted legacy file equally", async () => {
    const jsonBody = JSON.stringify(
      {
        companyName: "JsonCo",
        primarySpecId: "spec-0099",
        customExtra: { nested: true },
      },
      null,
      2,
    );
    await writeFile(path.join(root, "legacy.json"), jsonBody, "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.json",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    expect(body).toMatch(/companyName: "JsonCo"/);
    expect(body).toMatch(/primarySpecId: "spec-0099"/);
    // Nested original payload preserved under legacy:
    expect(body).toMatch(/customExtra/);
  });
});
