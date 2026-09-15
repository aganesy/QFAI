import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

const TC_TABLE = [
  "# 06 Test Cases",
  "",
  "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   | Notes  |",
  "| ------- | ----- | ------- | ------- | ------ | ---------- | ------ |",
  "| TC-0001 | L3    | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |",
  "",
].join("\n");

/** Runs the coverage gate over one integration test file with this body. */
async function codesFor(body: string, fileName = "a.test.ts"): Promise<string[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-annotation-placement-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 US\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), TC_TABLE, "utf-8");

    const testDir = path.join(root, "tests", "integration");
    await mkdir(testDir, { recursive: true });
    await writeFile(path.join(testDir, fileName), body, "utf-8");

    // The scan reads the extensions the configured test globs name.
    const config = {
      ...defaultConfig,
      validation: {
        ...defaultConfig.validation,
        traceability: {
          ...defaultConfig.validation.traceability,
          testFileGlobs: [`tests/**/*${path.extname(fileName)}`],
        },
      },
    };
    const issues = await validateAtddCodeTraceability(root, config);
    return issues.map((entry) => entry.code);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("where an annotation may sit", () => {
  // The name is where the id is also visible in the runner's output, so it is
  // what people copy when they add a test. Reading only comments reported the
  // obligation as unreferenced while pointing at a directory that held a
  // passing test naming that exact id.
  it.each([
    ["a double-quoted name", 'it("QFAI:SPEC-0001:TC-0001 does the thing", () => {});'],
    ["a single-quoted name", "it('QFAI:SPEC-0001:TC-0001 does the thing', () => {});"],
    ["a template name", "it(`QFAI:SPEC-0001:TC-0001 does ${what} thing`, () => {});"],
    ["a describe name", 'describe("QFAI:SPEC-0001:TC-0001 the thing", () => {});'],
    ["a name behind a modifier", 'it.each(rows)("QFAI:SPEC-0001:TC-0001 %s", () => {});'],
    ["a leading comment", '/* QFAI:SPEC-0001:TC-0001 */\nit("does the thing", () => {});'],
  ])("counts an annotation written as %s", async (_placement, body) => {
    expect(await codesFor(body)).not.toContain("QFAI-ATDD-112");
  });

  it("does not count an id a file holds as data", async () => {
    // The reason the scan reads comments and not literals: a ledger quoting the
    // ids it is about would otherwise mark every one of them covered. A name is
    // exempt from that because it is the first argument of a declaration, which
    // is a position data never occupies.
    const body = [
      'const blessed: Record<string, string> = { "QFAI:SPEC-0001:TC-0001": "sha256-abc" };',
      'it("does the thing", () => {});',
    ].join("\n");

    expect(await codesFor(body)).toContain("QFAI-ATDD-112");
  });

  // The id is assembled so this file carries no annotation of its own.
  const ID = ["QFAI", "SPEC-0001", "TC-0001"].join(":");

  it.each([
    ["Python", "test_pay.py", `CASES = ["${ID}"]\n\ndef test_pay():\n    assert pay()\n`],
    ["a Python docstring", "test_pay.py", `def test_pay():\n    """${ID}"""\n    assert pay()\n`],
    ["Ruby", "pay_spec.rb", `CASES = ["${ID}"]\nit "pays" do\nend\n`],
    ["Go", "pay_test.go", `var cases = []string{"${ID}"}\n\nfunc TestPay(t *testing.T) {}\n`],
    [
      "Java",
      "PayTest.java",
      `class PayTest {\n  String id = "${ID}";\n  @Test void pays() {}\n}\n`,
    ],
    [
      "C#",
      "PayTests.cs",
      `class PayTests {\n  string id = "${ID}";\n  [Fact] public void Pays() {}\n}\n`,
    ],
    ["Rust", "pay.rs", `const CASES: &[&str] = &["${ID}"];\n#[test]\nfn pays() {}\n`],
    [
      // `%q{}` and a heredoc are each one literal. A lexer knowing only
      // quoted strings walks past them and leaves the id visible.
      "a Ruby percent literal",
      "pay_spec.rb",
      `CASES = [%q{${ID}}]\nit "pays" do\nend\n`,
    ],
    ["a Ruby heredoc", "pay_spec.rb", `FIXTURE = <<~IDS\n  ${ID}\nIDS\nit "pays" do\nend\n`],
    [
      // `in` is a membership operator in Kotlin, not a word-spec anchor.
      "a Kotlin membership test",
      "PayTest.kt",
      `class PayTest {\n  val present = "${ID}" in fixtureIds\n  @Test fun pays() {}\n}\n`,
    ],
  ])("does not count an id a %s test holds as data", async (_language, fileName, body) => {
    expect(await codesFor(body, fileName)).toContain("QFAI-ATDD-112");
  });

  it.each([
    ["a Python comment", "test_pay.py", `# ${ID}\ndef test_pay():\n    assert pay()\n`],
    ["an RSpec name", "pay_spec.rb", `it "${ID} pays" do\nend\n`],
    [
      "a Go subtest name",
      "pay_test.go",
      `func TestPay(t *testing.T) {\n  t.Run("${ID} pays", func(t *testing.T) {})\n}\n`,
    ],
    [
      "a JUnit display name",
      "PayTest.java",
      `class PayTest {\n  @Test\n  @DisplayName("${ID} pays")\n  void pays() {}\n}\n`,
    ],
    [
      // Expecto names a test in its own call, so masking `.fs` without
      // reading that form made a real annotation disappear.
      "an Expecto test-case name",
      "PayTests.fs",
      `let tests = testCase "${ID} pays" <| fun _ -> ()\n`,
    ],
    [
      // An odd number of apostrophes on the line: paired as quotes they
      // swallowed the comment the annotation sits in.
      "a Rust comment after a lifetime",
      "pay.rs",
      `fn compare<'a>(x: &'a str, y: &'a str) -> bool { x == y } // ${ID}\n#[test]\nfn pays() {}\n`,
    ],
    [
      "a Kotlin function name",
      "PayTest.kt",
      `class PayTest {\n  @Test fun \`${ID} pays\`() {}\n}\n`,
    ],
    [
      "an xUnit display name",
      "PayTests.cs",
      `class PayTests {\n  [Fact(DisplayName = "${ID} pays")]\n  public void Pays() {}\n}\n`,
    ],
    ["a Rust comment", "pay.rs", `// ${ID}\n#[test]\nfn pays() {}\n`],
  ])("counts an annotation written as %s", async (_placement, fileName, body) => {
    expect(await codesFor(body, fileName)).not.toContain("QFAI-ATDD-112");
  });

  it("does not count a test declaration quoted inside a fixture", async () => {
    // A fixture that writes a test file as a template literal holds the same
    // characters as a real declaration. Reading those would restore the hazard
    // above by the back door, so a declaration counts only where the runner
    // name survives masking — that is, where it is code rather than quoted.
    const body = [
      "const fixture = `",
      '  it("QFAI:SPEC-0001:TC-0001 written by the generator", () => {});',
      "`;",
      'it("does the thing", () => { use(fixture); });',
    ].join("\n");

    expect(await codesFor(body)).toContain("QFAI-ATDD-112");
  });
});
