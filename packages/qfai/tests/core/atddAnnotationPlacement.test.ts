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
      // An escaped quote keeps the string open, so the fence it reaches is
      // not the closer.
      "a Python docstring past an escaped fence",
      "test_pay.py",
      `F = """one \\""" ${ID}"""\ndef test_pay():\n    assert pay()\n`,
    ],
    [
      // An unquoted heredoc label is an identifier, whatever its case.
      "a lowercase Ruby heredoc",
      "pay_spec.rb",
      `F = <<foo\n${ID}\nfoo\nit "pays" do\nend\n`,
    ],
    [
      // The interpolated verbatim prefix is written either way round.
      "a C# interpolated verbatim fixture",
      "PayTests.cs",
      `class PayTests {\n  string F = @$"first\n${ID}";\n  [Fact] public void Pays() {}\n}\n`,
    ],
    [
      // Groovy writes a slashy string, and a dollar-slashy one.
      "a Groovy dollar-slashy string",
      "PaySpec.groovy",
      `def id = $/${ID}/$\ndef "pays"() { expect: pay() }\n`,
    ],
    [
      // `test` is not a declaration in Java; its tests are named by
      // annotations, so a call to an ordinary helper is data.
      "a Java helper call",
      "PayTest.java",
      `class PayTest {\n  void setUp() { test("${ID}"); }\n  @Test void pays() {}\n}\n`,
    ],
    [
      // An assignment named DisplayName outside a test attribute is data.
      "a C# fixture field named DisplayName",
      "PayTests.cs",
      `class PayTests {\n  var c = new Case { DisplayName = "${ID}" };\n  [Fact] public void Pays() {}\n}\n`,
    ],
    [
      // An ordinary list named ids, with no parametrize marker beside it.
      "a Python list named ids",
      "test_pay.py",
      `ids = ["${ID}"]\ndef test_pay():\n    assert pay()\n`,
    ],
    [
      // Ruby writes a regex between slashes, as JavaScript does.
      "a Ruby regex literal",
      "pay_spec.rb",
      `PATTERN = /${ID}/\nit "pays" do\nend\n`,
    ],
    [
      // A raw string takes no escapes, so the quotes inside a fixture are
      // ordinary characters and the first of them ends nothing.
      "a Rust raw string",
      "pay.rs",
      `const F: &str = r#"{\\"reference\\":\\"${ID}\\"}"#;\n#[test]\nfn pays() {}\n`,
    ],
    [
      // A heredoc body spans lines and no other rule consumes it.
      "a PHP heredoc",
      "PayTest.php",
      `<?php\n$fixture = <<<TXT\n${ID}\nTXT;\nclass PayTest { public function testPays() {} }\n`,
    ],
    [
      // A verbatim string spans lines, and the single-line scanner stopped
      // at the first newline and left the rest visible.
      "a C# verbatim fixture",
      "PayTests.cs",
      `class PayTests {\n  const string F = @"first\n${ID}";\n  [Fact] public void Pays() {}\n}\n`,
    ],
    [
      "a C# raw fixture",
      "PayTests.cs",
      `class PayTests {\n  const string F = """\n  ${ID}\n  """;\n  [Fact] public void Pays() {}\n}\n`,
    ],
    [
      // A typed percent literal names itself wherever it stands, including
      // as a command argument, where an identifier precedes it.
      "a Ruby percent literal after an expression",
      "pay_spec.rb",
      `logger.debug %q{${ID}}\nit "pays" do\nend\n`,
    ],
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
      // Java's block comments do not nest, so the first close ends the
      // comment and what follows is code again.
      "a Java annotation before a nested-looking comment",
      "PayTest.java",
      `/* ${ID} */\nclass PayTest {\n  @Test void pays() {}\n}\n`,
    ],
    [
      // Rust's block comments nest, so an inner close does not expose the
      // quote after it.
      "a Rust annotation in a nested comment",
      "pay.rs",
      `/* outer /* inner */ quote \\" then ${ID} */\n#[test]\nfn pays() {}\n`,
    ],
    [
      // An apostrophe in a Ruby block comment is not a string opener.
      "a Ruby annotation in a block comment",
      "pay_spec.rb",
      `=begin\nthis test\u0027s coverage: ${ID}\n=end\nit "pays" do\nend\n`,
    ],
    [
      // Every `#` opens a comment in Python, `#[` included.
      "a Python comment opening with a bracket",
      "test_pay.py",
      `#[ this test\u0027s coverage: ${ID} ]\ndef test_pay():\n    assert pay()\n`,
    ],
    [
      // `'T` is a type parameter, with no closing apostrophe after it.
      "an F# annotation after a type parameter",
      "PayTests.fs",
      `let isNull (value: \u0027T) = false // ${ID}\nlet tests = testCase "pays" <| fun _ -> ()\n`,
    ],
    [
      // The sole element may be spelled out, and written as a text block.
      "a JUnit display name spelled with value",
      "PayTest.java",
      `class PayTest {\n  @Test\n  @DisplayName(value = "${ID} pays")\n  void pays() {}\n}\n`,
    ],
    [
      // ScalaTest takes a triple-quoted name.
      "a ScalaTest triple-quoted name",
      "PaySpec.scala",
      `class PaySpec { test("""${ID} pays""") { pay() } }\n`,
    ],
    [
      // A display name is written in whichever literal form the author
      // reached for, and the masking reads all three.
      "an xUnit display name in a verbatim string",
      "PayTests.cs",
      `class PayTests {\n  [Fact(DisplayName = @"${ID} pays")]\n  public void Pays() {}\n}\n`,
    ],
    [
      // Kotlin nests its block comments, so an inner close does not end the
      // outer one and the apostrophe after it is still inside a comment.
      "a Kotlin annotation in a nested comment",
      "PayTest.kt",
      `/* outer /* inner */ this test\u0027s coverage: ${ID} */\nclass PayTest {\n  @Test fun pays() {}\n}\n`,
    ],
    [
      // A parameterized case takes its collected name from the id.
      "a pytest parameter id",
      "test_pay.py",
      `import pytest\n\n@pytest.mark.parametrize("n", [1], ids=["${ID} pays"])\ndef test_pay(n):\n    assert pay(n)\n`,
    ],
    [
      // Floor division, not a comment. Read as one, the rest of the line
      // went unscanned and the quoted value after it stayed visible.
      "a Python comment after floor division",
      "test_pay.py",
      `HALF = 4 // 2  # ${ID}\ndef test_pay():\n    assert pay()\n`,
    ],
    [
      // A raw string ends at the next backtick whatever stands before it.
      "a Go comment after a raw string ending in a backslash",
      "pay_test.go",
      `const path = \`C:\\\`\n// ${ID}\nfunc TestPay(t *testing.T) {}\n`,
    ],
    [
      // `name` need not be the first argument of the annotation.
      "a JUnit name after another argument",
      "PayTest.java",
      `class PayTest {\n  @ParameterizedTest(autoCloseArguments = false, name = "${ID} pays")\n  void pays(int n) {}\n}\n`,
    ],
    [
      // An apostrophe inside a block comment is not a string opener.
      "an F# annotation in a block comment",
      "PayTests.fs",
      `(* this test\u0027s coverage: ${ID} *)\nlet tests = testCase "pays" <| fun _ -> ()\n`,
    ],
    [
      // The attribute is code; the name inside it is the annotation.
      "a PHPUnit TestDox name",
      "PayTest.php",
      `<?php\nclass PayTest {\n  #[TestDox(\u0027${ID} pays\u0027)]\n  public function testPays() {}\n}\n`,
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
