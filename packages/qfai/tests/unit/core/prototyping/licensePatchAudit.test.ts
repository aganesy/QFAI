/**
 * licensePatchAudit row shape lockdown
 * (spec-0012 Phase 4 / REQ-0012-0071 / TC-0012-0468).
 *
 * The audit row contract is exactly:
 *   { appliedAt: string (ISO), patchSha256: 64-hex, addedSources: string[] }
 *
 * No additional keys are accepted. `patchSha256 = sha256(patch bytes)`.
 */

import { describe, expect, it } from "vitest";

import {
  applyLicensePatch,
  computePatchSha256,
  isLicensePatchAuditRow,
  parseLicensePatch,
} from "../../../../src/core/prototyping/licensePatchAudit.js";
import type { LicenseCatalog } from "../../../../src/core/prototyping/licenseVerify.js";

const liveCatalog: LicenseCatalog = {
  allowedSources: ["unsplash", "pexels"],
  licenseTiers: {
    unsplash: ["unsplash-license"],
    pexels: ["pexels-free"],
  },
};

describe("isLicensePatchAuditRow: 3-or-4-key shape lockdown", () => {
  it("accepts the canonical 3-key shape with valid types", () => {
    const row = {
      appliedAt: "2026-05-25T00:00:00.000Z",
      patchSha256: "a".repeat(64),
      addedSources: ["wikimedia-commons"],
    };
    expect(isLicensePatchAuditRow(row)).toBe(true);
  });

  it("accepts the canonical 4-key shape with optional addedLicenseTiers", () => {
    const row = {
      appliedAt: "2026-05-25T00:00:00.000Z",
      patchSha256: "a".repeat(64),
      addedSources: ["wikimedia-commons"],
      addedLicenseTiers: { "wikimedia-commons": ["cc-by-sa-4.0", "cc0-1.0"] },
    };
    expect(isLicensePatchAuditRow(row)).toBe(true);
  });

  it("rejects rows with addedLicenseTiers of the wrong shape", () => {
    // Non-object addedLicenseTiers.
    expect(
      isLicensePatchAuditRow({
        appliedAt: "2026-05-25T00:00:00.000Z",
        patchSha256: "a".repeat(64),
        addedSources: [],
        addedLicenseTiers: ["not an object"],
      }),
    ).toBe(false);
    // Non-array tier list.
    expect(
      isLicensePatchAuditRow({
        appliedAt: "2026-05-25T00:00:00.000Z",
        patchSha256: "a".repeat(64),
        addedSources: [],
        addedLicenseTiers: { "wikimedia-commons": "cc-by-sa-4.0" },
      }),
    ).toBe(false);
    // Empty / non-string tier entries.
    expect(
      isLicensePatchAuditRow({
        appliedAt: "2026-05-25T00:00:00.000Z",
        patchSha256: "a".repeat(64),
        addedSources: [],
        addedLicenseTiers: { "wikimedia-commons": [""] },
      }),
    ).toBe(false);
  });

  it("rejects rows with additional top-level keys", () => {
    expect(
      isLicensePatchAuditRow({
        appliedAt: "2026-05-25T00:00:00.000Z",
        patchSha256: "a".repeat(64),
        addedSources: [],
        extraKey: "not allowed",
      }),
    ).toBe(false);
  });

  it("rejects rows missing any of the 3 required keys", () => {
    expect(
      isLicensePatchAuditRow({
        patchSha256: "a".repeat(64),
        addedSources: [],
      }),
    ).toBe(false);
    expect(
      isLicensePatchAuditRow({
        appliedAt: "2026-05-25T00:00:00.000Z",
        addedSources: [],
      }),
    ).toBe(false);
    expect(
      isLicensePatchAuditRow({
        appliedAt: "2026-05-25T00:00:00.000Z",
        patchSha256: "a".repeat(64),
      }),
    ).toBe(false);
  });

  it("rejects rows with malformed patchSha256 (not 64-hex)", () => {
    expect(
      isLicensePatchAuditRow({
        appliedAt: "2026-05-25T00:00:00.000Z",
        patchSha256: "deadbeef",
        addedSources: [],
      }),
    ).toBe(false);
  });
});

describe("applyLicensePatch: audit row uses sha256(patch bytes)", () => {
  it("computes patchSha256 from the raw patch bytes", () => {
    const patchBytes = Buffer.from('{"addedSources":["wikimedia-commons"]}', "utf-8");
    const expected = computePatchSha256(patchBytes);
    const parsed = parseLicensePatch({ addedSources: ["wikimedia-commons"] });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("parse failed");
    const applied = applyLicensePatch(
      liveCatalog,
      parsed.patch,
      patchBytes,
      "2026-05-25T00:00:00.000Z",
    );
    expect(applied.auditRow.patchSha256).toBe(expected);
    expect(applied.auditRow.addedSources).toEqual(["wikimedia-commons"]);
    expect(applied.auditRow.appliedAt).toBe("2026-05-25T00:00:00.000Z");
    // Round-trip the row through the shape lockdown.
    expect(isLicensePatchAuditRow(applied.auditRow)).toBe(true);
  });

  it("rejects deletion/modification patches outright", () => {
    expect(parseLicensePatch({ removeSources: ["pexels"] }).ok).toBe(false);
    expect(parseLicensePatch({ modify: { unsplash: "x" } }).ok).toBe(false);
  });

  it("preserves existing allowedSources when adding a new source", () => {
    const parsed = parseLicensePatch({ addedSources: ["wikimedia-commons"] });
    if (!parsed.ok) throw new Error("parse failed");
    const applied = applyLicensePatch(
      liveCatalog,
      parsed.patch,
      Buffer.from("x"),
      "2026-05-25T00:00:00.000Z",
    );
    expect(applied.nextCatalog.allowedSources).toEqual(["unsplash", "pexels", "wikimedia-commons"]);
  });

  it("populates addedLicenseTiers on the audit row when the patch adds tiers", () => {
    const parsed = parseLicensePatch({
      addedSources: ["wikimedia-commons"],
      addedLicenseTiers: { "wikimedia-commons": ["cc-by-sa-4.0", "cc0-1.0"] },
    });
    if (!parsed.ok) throw new Error("parse failed");
    const applied = applyLicensePatch(
      liveCatalog,
      parsed.patch,
      Buffer.from("x"),
      "2026-05-25T00:00:00.000Z",
    );
    expect(applied.auditRow.addedLicenseTiers).toEqual({
      "wikimedia-commons": ["cc-by-sa-4.0", "cc0-1.0"],
    });
    // 4-key shape is still accepted by the shape lockdown.
    expect(isLicensePatchAuditRow(applied.auditRow)).toBe(true);
  });

  it("omits addedLicenseTiers when the patch only adds sources (backward-compat)", () => {
    const parsed = parseLicensePatch({ addedSources: ["wikimedia-commons"] });
    if (!parsed.ok) throw new Error("parse failed");
    const applied = applyLicensePatch(
      liveCatalog,
      parsed.patch,
      Buffer.from("x"),
      "2026-05-25T00:00:00.000Z",
    );
    expect(applied.auditRow.addedLicenseTiers).toBeUndefined();
    // 3-key shape stays the canonical default and still passes the lockdown.
    expect(isLicensePatchAuditRow(applied.auditRow)).toBe(true);
    expect(Object.keys(applied.auditRow).sort()).toEqual([
      "addedSources",
      "appliedAt",
      "patchSha256",
    ]);
  });
});
