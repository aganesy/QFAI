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

function located(files: StoryTestFile[]) {
  return unread(files).map((finding) => [finding.file, finding.loc?.line, finding.refs]);
}

describe("a trace mark no check reads", () => {
  // QFAI:EX-0001-0056-13
  // QFAI:AC-0001-0056-07
  it("warns on each mark in a comment, not inside a string literal", () => {
    const slashes = selected("tests/unit/order.test.ts", `// ${story}\nit("pays", () => {});\n`);
    const hashes = selected("tests/unit/order_test.py", `x = 1\n# ${retired}\n`);
    const strings = selected(
      "tests/unit/migration.test.ts",
      `const input = "// ${story}";\nexpect(output).toContain("${retired}");\n`,
    );
    expect(located([slashes, hashes, strings])).toEqual([
      ["tests/unit/order.test.ts", 1, [story]],
      ["tests/unit/order_test.py", 2, [retired]],
    ]);
    expect(unread([slashes]).every((finding) => finding.severity === "warning")).toBe(true);
  });

  // QFAI:EX-0001-0056-13
  it("reads a block comment whose continuation line has no leading asterisk", () => {
    const block = selected("tests/unit/block.test.ts", `/*\n${story}\n*/\nit("pays", () => {});\n`);
    expect(located([block])).toEqual([["tests/unit/block.test.ts", 2, [story]]]);
  });

  // QFAI:EX-0001-0056-13
  it("leaves a mark inside a multiline string or after a private field alone", () => {
    const template = selected(
      "tests/unit/fixture.test.ts",
      ["const text = `", `// ${story}`, `// ${retired}`, "`;", ""].join("\n"),
    );
    const privateField = selected(
      "tests/unit/field.test.ts",
      `class Box {\n  #label = "${story}";\n}\n`,
    );
    const docstring = selected(
      "tests/unit/fixture_test.py",
      [`text = """`, `# ${story}`, `"""`, ""].join("\n"),
    );
    expect(located([template, privateField, docstring])).toEqual([]);
  });

  // QFAI:EX-0001-0056-13
  it("leaves a file the test globs do not select, and the atdd profile, alone", () => {
    const list = { ...selected("tests/e2e/list.md", `// ${story}\n`), selectedForExample: false };
    expect(unread([list])).toEqual([]);
    expect(unread([selected("tests/unit/order.test.ts", `// ${story}\n`)], "atdd")).toEqual([]);
  });
});
