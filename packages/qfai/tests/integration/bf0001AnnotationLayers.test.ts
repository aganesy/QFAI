import { describe, expect, it } from "vitest";

import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import {
  validateStoryTreeObligationsModel,
  type StoryTestFile,
} from "../../src/core/validators/storyTreeObligations.js";

const flow = "BF-0099";
const criterion = "AC-0099-0001-01";
const example = "EX-0099-0001-01";
const story = "spec/02_business-flow/business-flow-0099/user-story-0099-0001";
const model = buildStoryTreeModel(
  new Map([
    ["spec/02_business-flow/business-flow-0099/business-flow.md", `# ${flow}: Sample\n`],
    [`${story}/01_User-story.md`, "# US-0099-0001: Sample\n"],
    [`${story}/02_Acceptance-Criteria.md`, `\`\`\`gherkin\n# ${criterion}\n\`\`\`\n`],
    [
      `${story}/03_Example.md`,
      `| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| ${example} | ${criterion} | in | out |\n`,
    ],
  ]),
);

function file(kind: StoryTestFile["kind"], id: string): StoryTestFile {
  return {
    file: `tests/${kind ?? "unit"}/sample.test.ts`,
    content: `// ${["QFAI", id].join(":")}`,
    kind,
    selectedForExample: true,
  };
}

function hasMissing(id: string, files: StoryTestFile[], profile: "atdd" | "tdd"): boolean {
  return validateStoryTreeObligationsModel(model, files, profile).some(
    (finding) => finding.code === "QFAI-STORY-006" && finding.refs?.includes(id),
  );
}

describe("BF-0001 story annotation layers", () => {
  // QFAI:EX-0001-0010-01
  it("counts a BF annotation in an E2E test", () => {
    expect(hasMissing(flow, [file("e2e", flow)], "atdd")).toBe(false);
  });

  // QFAI:EX-0001-0010-02
  // QFAI:EX-0001-0071-01
  it("counts an AC annotation in integration or API tests", () => {
    for (const kind of ["integration", "api"] as const) {
      expect(hasMissing(criterion, [file(kind, criterion)], "atdd")).toBe(false);
    }
  });

  // QFAI:EX-0001-0010-04
  it("counts an EX annotation in a selected unit test", () => {
    expect(hasMissing(example, [file(null, example)], "tdd")).toBe(false);
  });

  // QFAI:EX-0001-0010-04
  it("does not count an EX annotation in an E2E test and reports it as misplaced", () => {
    const e2e = file("e2e", example);
    const findings = validateStoryTreeObligationsModel(model, [e2e], "tdd");
    expect(
      findings.some((finding) => finding.code === "QFAI-STORY-006" && finding.refs?.includes(example)),
    ).toBe(true);
    expect(findings).toContainEqual(
      expect.objectContaining({ code: "QFAI-STORY-007", file: e2e.file, refs: [example] }),
    );
  });

  // QFAI:EX-0001-0058-04
  it("reports misplaced BF and AC annotations without counting coverage", () => {
    for (const [kind, id] of [
      ["integration", flow],
      [null, criterion],
    ] as const) {
      const findings = validateStoryTreeObligationsModel(model, [file(kind, id)], "atdd");
      expect(
        findings.some((finding) => finding.code === "QFAI-STORY-007" && finding.refs?.includes(id)),
      ).toBe(true);
      expect(
        findings.some((finding) => finding.code === "QFAI-STORY-006" && finding.refs?.includes(id)),
      ).toBe(true);
    }
  });

  // QFAI:EX-0001-0010-07
  // QFAI:EX-0001-0010-08
  it("ignores the retired SPEC and contract annotation forms", () => {
    for (const legacy of [
      ["QFAI", "SPEC-0099", "BF-0099"].join(":"),
      ["QFAI", "CON-API-1"].join(":"),
    ]) {
      const findings = validateStoryTreeObligationsModel(
        model,
        [{ ...file("e2e", flow), content: `// ${legacy}` }],
        "atdd",
      );
      expect(
        findings.some(
          (finding) => finding.code === "QFAI-STORY-006" && finding.refs?.includes(flow),
        ),
      ).toBe(true);
    }
  });
});
