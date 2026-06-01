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

  // Regression: nested YAML in the legacy body MUST be preserved under
  // `legacy:` — pre-fix the regex scanner silently dropped indented
  // values, violating AC-0015-0020.
  it("preserves nested YAML mappings (signature.by / signature.on) under legacy:", async () => {
    const nestedBody = [
      "# legacy with nested YAML",
      "companyName: Acme",
      "primarySpecId: spec-0012",
      "signature:",
      "  by: user-alpha",
      "  on: 2026-05-31T12:00:00Z",
      "metadata:",
      "  tags:",
      "    - migration",
      "    - second-wave",
      "  reviewer: reviewer-bravo",
      "",
    ].join("\n");
    await writeFile(path.join(root, "session-handoff.yaml"), nestedBody, "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "session-handoff.yaml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    // Canonical slots mapped.
    expect(body).toMatch(/companyName: "Acme"/);
    expect(body).toMatch(/primarySpecId: "spec-0012"/);
    // Nested signature.by / signature.on preserved under legacy:.
    expect(body).toMatch(/signature:/);
    expect(body).toMatch(/by: user-alpha/);
    expect(body).toMatch(/on: 2026-05-31T12:00:00Z/);
    // Nested list under metadata.tags preserved.
    expect(body).toMatch(/metadata:/);
    expect(body).toMatch(/tags:/);
    expect(body).toMatch(/- migration/);
    expect(body).toMatch(/- second-wave/);
    expect(body).toMatch(/reviewer: reviewer-bravo/);
  });

  // Regression: mixed scalar + nested keys must BOTH be preserved.
  it("preserves a mix of scalar and nested values under legacy:", async () => {
    const mixedBody = [
      "companyName: MixedCo",
      "customScalar: hello",
      "nestedBlock:",
      "  inner: value",
      "  innerNumber: 42",
      "",
    ].join("\n");
    await writeFile(path.join(root, "legacy.yaml"), mixedBody, "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.yaml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    expect(body).toMatch(/companyName: "MixedCo"/);
    expect(body).toMatch(/customScalar: hello/);
    expect(body).toMatch(/nestedBlock:/);
    expect(body).toMatch(/inner: value/);
    expect(body).toMatch(/innerNumber: 42/);
  });

  // Regression: malformed-but-non-empty legacy bodies (YAML parses to
  // a non-object: list, scalar, null) MUST still produce a parseable
  // canonical handoff.yaml with the raw legacy text preserved under
  // the `__legacy_raw__` sentinel so AC-0015-0020's "no data is lost"
  // contract holds even on shape mismatches.
  it("preserves raw legacy text under __legacy_raw__ when YAML yields a non-object payload", async () => {
    // A YAML sequence (top-level list) parses to an array — the
    // structured-object branch refuses it, so the stage-3 fallback
    // engages.
    const listBody = ["- item-one", "- item-two", "- item-three", ""].join("\n");
    await writeFile(path.join(root, "list-legacy.yaml"), listBody, "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "list-legacy.yaml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    // The raw sentinel and the original bytes are both present.
    expect(body).toMatch(/legacy:/);
    expect(body).toMatch(/__legacy_raw__/);
    expect(body).toMatch(/item-one/);
    expect(body).toMatch(/item-two/);
    expect(body).toMatch(/item-three/);
    // The canonical handoff.yaml must itself be re-parseable as YAML
    // (the sentinel-bearing legacy block does not break the document).
    const { parse: parseYaml } = await import("yaml");
    const reparsed = parseYaml(body) as Record<string, unknown>;
    expect(reparsed).toBeTruthy();
    expect(reparsed.legacy).toBeTruthy();
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

  // Pin AC-0015-0020's "no data loss" contract for the YAML
  // nested-keys path. The previous YAML test only covered flat
  // scalar key=value pairs; the regex fallback at L70-83 would
  // silently drop nested values from a non-flat YAML legacy file.
  // M4 (commit 992f6a13) rewired parseLegacyBody to call
  // `yaml.parse(...)` BEFORE the regex fallback, so nested mapping
  // structures (`signature:\n  by: alice`, block scalars, etc.) now
  // round-trip via `yaml.stringify` in toYaml. This test seeds a
  // nested YAML legacy body and asserts the nested values land in
  // the emitted `legacy:` block — pin the contract against future
  // regression to a flat-only parser.
  it("preserves nested YAML legacy fields under legacy: (no data loss)", async () => {
    const nestedYaml = `# legacy session handoff with nested keys
companyName: Acme
primarySpecId: spec-0012
signature:
  by: alice
  on: 2026-05-27
metadata:
  reviewer: bob
  notes: |
    multi-line
    block scalar
    survives
`;
    await writeFile(path.join(root, "session-handoff.yaml"), nestedYaml, "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "session-handoff.yaml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    // Canonical slots from the recognized fields.
    expect(body).toMatch(/companyName: "Acme"/);
    expect(body).toMatch(/primarySpecId: "spec-0012"/);
    // Nested mapping values must appear in the emitted legacy: block.
    // Pre-fix the column-0 regex scanner would drop these silently.
    expect(body).toMatch(/signature:/);
    expect(body).toMatch(/by: alice/);
    expect(body).toMatch(/on: 2026-05-27/);
    expect(body).toMatch(/metadata:/);
    expect(body).toMatch(/reviewer: bob/);
    // Block scalar content must round-trip — at least one
    // representative line from the multi-line body survives.
    expect(body).toMatch(/multi-line/);
    expect(body).toMatch(/block scalar/);
  });
});
