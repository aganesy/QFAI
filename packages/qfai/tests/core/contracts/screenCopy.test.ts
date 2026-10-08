import { describe, expect, it } from "vitest";

import { analyzeScreenCopy, normalizeCopy } from "../../../src/core/contracts/screenCopy.js";

const base = {
  title: "Edit draft",
  primary_tasks: [{ id: "t1", label: "Save", acceptance: "saved" }],
  elements: [{ id: "body", label: "Body" }],
  actions: [{ id: "save", label: "Save draft" }],
  supplements: [],
};

describe("normalizeCopy", () => {
  // QFAI:EX-0001-0230-07
  it("sets case, spacing and closing punctuation aside and nothing else", () => {
    expect(normalizeCopy("  Save   Draft!! ")).toBe("save draft");
    expect(normalizeCopy("Save draft")).toBe(normalizeCopy("SAVE DRAFT."));
    expect(normalizeCopy("Save a draft")).not.toBe(normalizeCopy("Save draft"));
    expect(normalizeCopy("Save, draft")).not.toBe(normalizeCopy("Save draft"));
  });

  it("treats full-width forms as their plain counterparts", () => {
    // Full-width SAVE, written as escapes so the file holds no full-width character.
    expect(normalizeCopy("\uFF33\uFF21\uFF36\uFF25")).toBe("save");
  });
});

describe("analyzeScreenCopy", () => {
  // QFAI:EX-0001-0230-02
  it("finds nothing in a screen with empty supplements and no structure", () => {
    expect(analyzeScreenCopy(base)).toEqual([]);
  });

  // QFAI:EX-0001-0230-03
  it("tells the author what to write when supplements is absent", () => {
    const without = Object.fromEntries(
      Object.entries(base).filter(([key]) => key !== "supplements"),
    );
    const [finding, ...rest] = analyzeScreenCopy(without);
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ kind: "shape", severity: "error" });
    expect(finding?.remedy).toContain("`supplements: []`");
  });

  // QFAI:EX-0001-0230-04
  it("requires tasks and members to be non-empty lists of ids", () => {
    const findings = analyzeScreenCopy({
      ...base,
      structure: [{ id: "g", tasks: "t1", members: [] }],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("`tasks`, `members`");
  });

  it("asks for a heading to be left out rather than empty", () => {
    const findings = analyzeScreenCopy({
      ...base,
      structure: [{ id: "g", heading: " ", tasks: ["t1"], members: ["body"] }],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("omit the key");
  });

  it("reads a repeated group id once, as a shape finding", () => {
    const group = { id: "g", tasks: ["t1"], members: ["body"] };
    const findings = analyzeScreenCopy({ ...base, structure: [group, group] });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ kind: "shape" });
    expect(findings[0]?.message).toContain("repeats the group `id` `g`");
  });

  // QFAI:EX-0001-0230-05
  it("reports every dangling reference as an error", () => {
    const findings = analyzeScreenCopy({
      ...base,
      structure: [{ id: "g", tasks: ["t2"], members: ["body", "missing"] }],
      supplements: [
        { id: "s", near: "nowhere", when: "error", text: "Not saved. Try again.", why: "Failure." },
      ],
    });
    expect(findings.map((finding) => finding.kind)).toEqual([
      "reference",
      "reference",
      "reference",
    ]);
    expect(findings.every((finding) => finding.severity === "error")).toBe(true);
  });

  // QFAI:EX-0001-0230-07
  it("warns, and does not fail, on an exact repeat", () => {
    const findings = analyzeScreenCopy({
      ...base,
      supplements: [
        { id: "s", near: "save", when: "default", text: "save DRAFT", why: "Restates the label." },
      ],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ kind: "repeat", severity: "warning" });
  });

  it("compares a supplement with the heading of the group it sits near", () => {
    const findings = analyzeScreenCopy({
      ...base,
      structure: [{ id: "g", heading: "Draft body", tasks: ["t1"], members: ["body", "save"] }],
      supplements: [
        { id: "s", near: "g", when: "default", text: "Draft body", why: "Restates the heading." },
      ],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("repeats");
  });

  // QFAI:EX-0001-0230-08
  it("does not compare wording by meaning", () => {
    const findings = analyzeScreenCopy({
      ...base,
      supplements: [
        {
          id: "s",
          near: "save",
          when: "success",
          text: "Saved to Drafts",
          why: "After the click the user cannot see where the draft went.",
        },
      ],
    });
    expect(findings).toEqual([]);
  });
});
