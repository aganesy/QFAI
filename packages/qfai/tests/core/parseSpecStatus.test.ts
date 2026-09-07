import { describe, expect, it } from "vitest";

import { extractBulletField, parseSpec } from "../../src/core/parse/spec.js";

const HEADER = "# 01 Spec\n\n- Spec: spec-0042\n- Parent: CAP-0042\n";

describe("extractBulletField", () => {
  it("returns the trimmed value for a matching bullet", () => {
    expect(extractBulletField("- Status: active", "Status")).toBe("active");
  });

  it("returns undefined when the bullet is missing", () => {
    expect(extractBulletField("# heading\n", "Status")).toBeUndefined();
  });

  it("treats placeholder dash as undefined", () => {
    expect(extractBulletField("- Superseded-by: -", "Superseded-by")).toBeUndefined();
  });

  it("handles names containing hyphens", () => {
    expect(extractBulletField("- Deprecated-at: 2026-05-02", "Deprecated-at")).toBe("2026-05-02");
  });

  it("ignores values inside other lines", () => {
    expect(extractBulletField("Notes: irrelevant Status: hidden", "Status")).toBeUndefined();
  });

  it("does not read a wrapped value off the next line", () => {
    // `- Status:` with the value on the following line is not the
    // `- Name: value` bullet the rule asks for; accepting it would retire a
    // spec on a declaration `QFAI-STATUS-001` never saw.
    expect(extractBulletField("- Status:\ndeprecated\n", "Status")).toBeUndefined();
    expect(extractBulletField("- Deprecated-at:\n  2026-01-01\n", "Deprecated-at")).toBeUndefined();
  });

  it("fails closed on an empty bullet even when a later one has a value", () => {
    // The first bullet is the spec's declaration; an empty one is a missing
    // value, not an invitation to look further down the document.
    expect(extractBulletField("- Status:\n\n- Status: active\n", "Status")).toBeUndefined();
  });

  it("still reads a value written on the bullet's own line", () => {
    expect(extractBulletField("-  Status  :  superseded  \n", "Status")).toBe("superseded");
    expect(extractBulletField("- Status: active\r\n", "Status")).toBe("active");
  });

  it("ignores a nested bullet and takes the document's own metadata", () => {
    // A quoted retirement under `- Notes:` is a child bullet, not this
    // document's lifecycle — but read as metadata it retires the spec, and
    // `maskNonSpecRegions` keeps list continuations on purpose, so nothing
    // else would remove it. The real `- Status: active` below must win.
    const md = [
      "- Notes:",
      "    - Status: deprecated",
      "    - Deprecated-at: 2026-01-01",
      "- Status: active",
      "",
    ].join("\n");
    expect(extractBulletField(md, "Status")).toBe("active");
    expect(extractBulletField(md, "Deprecated-at")).toBeUndefined();
  });

  it("fails closed when only a nested declaration exists", () => {
    // No top-level bullet at all: the spec stays current and the missing
    // declaration is QFAI-STATUS-001's to report, rather than an indented
    // quotation silently retiring it.
    const md = ["- Notes:", "    - Status: deprecated", ""].join("\n");
    expect(extractBulletField(md, "Status")).toBeUndefined();
  });

  it("requires a space after the bullet marker", () => {
    // `-Status: deprecated` is not a list item at all — CommonMark needs a
    // space after the marker, so this renders as literal paragraph text. Read
    // as metadata it was a complete retirement, and prose alone took a whole
    // ledger out of the gate with no status rule able to report it.
    expect(extractBulletField("-Status: deprecated\n", "Status")).toBeUndefined();
    expect(extractBulletField("-Deprecated-at: 2026-01-01\n", "Deprecated-at")).toBeUndefined();
    expect(extractBulletField("-Superseded-by: spec-0002\n", "Superseded-by")).toBeUndefined();
  });

  it("still reads a real bullet, whatever the spacing after the marker", () => {
    // The guard above must reject the missing space only — a tab or extra
    // spaces are still a list marker.
    expect(extractBulletField("- Status: active\n", "Status")).toBe("active");
    expect(extractBulletField("-\tStatus: active\n", "Status")).toBe("active");
    expect(extractBulletField("-   Status: active\n", "Status")).toBe("active");
  });
});

describe("parseSpec status fields", () => {
  it("extracts active status with no extra fields", () => {
    const md = `${HEADER}- Status: active\n`;
    const parsed = parseSpec(md, "spec-0042/01_Spec.md");
    expect(parsed.status).toBe("active");
    expect(parsed.statusRaw).toBe("active");
    expect(parsed.supersededBy).toBeUndefined();
    expect(parsed.deprecatedAt).toBeUndefined();
  });

  it("extracts superseded status with Superseded-by reference", () => {
    const md = `${HEADER}- Status: superseded\n- Superseded-by: spec-0099\n`;
    const parsed = parseSpec(md, "spec-0042/01_Spec.md");
    expect(parsed.status).toBe("superseded");
    expect(parsed.supersededBy).toBe("spec-0099");
  });

  it("extracts deprecated status with date", () => {
    const md = `${HEADER}- Status: deprecated\n- Deprecated-at: 2026-05-02\n`;
    const parsed = parseSpec(md, "spec-0042/01_Spec.md");
    expect(parsed.status).toBe("deprecated");
    expect(parsed.deprecatedAt).toBe("2026-05-02");
  });

  it("preserves invalid status values in statusRaw but leaves status undefined", () => {
    const md = `${HEADER}- Status: archived\n`;
    const parsed = parseSpec(md, "spec-0042/01_Spec.md");
    expect(parsed.statusRaw).toBe("archived");
    expect(parsed.status).toBeUndefined();
  });

  it("treats missing Status bullet as undefined", () => {
    const md = HEADER;
    const parsed = parseSpec(md, "spec-0042/01_Spec.md");
    expect(parsed.statusRaw).toBeUndefined();
    expect(parsed.status).toBeUndefined();
  });
});
