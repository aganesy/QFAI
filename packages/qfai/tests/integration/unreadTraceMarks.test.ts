import { describe, expect, it } from "vitest";

import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import {
  validateStoryTreeObligationsModel,
  type StoryTestFile,
} from "../../src/core/validators/storyTreeObligations.js";

const story = ["QFAI", "US-0001-0001"].join(":");
const retired = ["QFAI", "SPEC-0001", "TC-0001-0001"].join(":");

function selected(file: string, content: string): StoryTestFile {
  return { file, content, kind: null, selectedForExample: true };
}

function unread(files: StoryTestFile[], profile: "atdd" | "tdd" = "tdd") {
  const model = buildStoryTreeModel(new Map());
  const findings = validateStoryTreeObligationsModel(model, files, profile);
  return findings.filter((finding) => finding.code === "QFAI-STORY-014");
}

describe("a trace mark no check reads", () => {
  // QFAI:EX-0001-0056-13
  // QFAI:AC-0001-0056-07
  it("warns on each mark on a comment line, not inside a string literal", () => {
    const comments = selected(
      "tests/unit/order.test.ts",
      `// ${story}\nit("pays", () => {});\n  # ${retired}\n`,
    );
    const strings = selected(
      "tests/unit/migration.test.ts",
      `const input = "// ${story}";\nexpect(output).toContain("${retired}");\n`,
    );
    const findings = unread([comments, strings]);
    expect(findings.map((finding) => [finding.file, finding.loc?.line, finding.refs])).toEqual([
      ["tests/unit/order.test.ts", 1, [story]],
      ["tests/unit/order.test.ts", 3, [retired]],
    ]);
    expect(findings.every((finding) => finding.severity === "warning")).toBe(true);
  });

  // QFAI:EX-0001-0056-13
  it("leaves a file the test globs do not select, and the atdd profile, alone", () => {
    const list = { ...selected("tests/e2e/list.md", `// ${story}\n`), selectedForExample: false };
    expect(unread([list])).toEqual([]);
    expect(unread([selected("tests/unit/order.test.ts", `// ${story}\n`)], "atdd")).toEqual([]);
  });
});
