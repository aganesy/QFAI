/**
 * `QFAI-TEST-001` is the only stub-detection rule qfai ships, and its whole
 * detector was one constant matching the vitest/jest `*.todo(` forms.
 *
 * File selection is stack-agnostic — the validator honours
 * `validation.traceability.testFileGlobs` — so on a Python, Go, Java, Rust,
 * Ruby or C# repository it opened and read every test file and then returned a
 * clean result that meant nothing. `qfai-implement` puts that clean result on
 * its FINAL CHECKLIST and builds a completion prohibition on top of it, so a
 * repository full of `pytest.skip` placeholders cleared the only gate qfai has
 * against exactly that.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import {
  STUB_SOURCE_FILE_PATTERN,
  validateTestTodoStubs,
} from "../../src/core/validators/testTodoStubs.js";

// Source-level split of the `*.todo(` token: this validator scans the repo's
// own test files, so a literal occurrence here would make the suite report
// itself. Mirrors what `testTodoStubs.test.ts` already does.
const TODO = ".todo";
// Same split for the `*.skip(` token, which the JS/TS dialect now matches too.
const SKIP = ".skip";
const JS_STUB = `it${TODO}('later');
`;

const CONFIG: QfaiConfig = {
  ...defaultConfig,
  validation: {
    ...defaultConfig.validation,
    traceability: {
      ...defaultConfig.validation.traceability,
      testFileGlobs: ["tests/**/*"],
    },
  },
};

async function withTests<T>(
  files: Record<string, string>,
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  try {
    for (const [rel, body] of Object.entries(files)) {
      const file = path.join(root, rel);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const stubCodes = async (root: string): Promise<string[]> =>
  (await validateTestTodoStubs(root, CONFIG)).map((i) => i.code);

describe("every supported stack's stub construct is detected", () => {
  const cases: Array<[string, string, string]> = [
    ["tests/a.test.ts", JS_STUB, "vitest/jest"],
    ["tests/test_a.py", "import pytest\n\n\ndef test_a():\n    pytest.skip('later')\n", "pytest"],
    ["tests/b_test.py", "@pytest.mark.xfail\ndef test_b():\n    pass\n", "pytest"],
    ["tests/a_test.go", 'func TestA(t *testing.T) {\n\tt.Skip("later")\n}\n', "go test"],
    ["tests/AT.java", "@Disabled\nclass AT {}\n", "JUnit"],
    ["tests/a.rs", "#[ignore]\nfn a() {}\n", "cargo test"],
    ["tests/a_spec.rb", "it 'x' do\n  skip 'later'\nend\n", "RSpec"],
    ["tests/AT.cs", '[Ignore("later")]\npublic void A() {}\n', ".NET"],
    // xUnit's own skip. The reason is a string literal, and `maskNonCode`
    // blanks it together with its opening quote, so a pattern that ended in
    // `"` matched nothing at all here.
    [
      "tests/Skipped.cs",
      '[Fact(Skip = "later")]\npublic void A() {}\n',
      "xUnit string-reason Skip",
    ],
    // The reason need not be a literal for the test to be skipped.
    [
      "tests/SkipConst.cs",
      "[Fact(Skip = Reasons.NotDone)]\npublic void A() {}\n",
      "xUnit constant-reason Skip",
    ],
    // `Theory` derives from `Fact` and takes the same `Skip`.
    [
      "tests/SkipTheory.cs",
      '[Theory(DisplayName = "x", Skip = "later")]\npublic void A(int n) {}\n',
      "xUnit Theory Skip",
    ],
    // The argument list may wrap; the attribute is still one attribute.
    [
      "tests/SkipWrapped.cs",
      '[Fact(\n    Skip = "later"\n)]\npublic void A() {}\n',
      "xUnit wrapped Skip",
    ],
  ];

  for (const [file, body, runner] of cases) {
    it(`reports a ${runner} stub in ${path.extname(file)}`, async () => {
      await withTests({ [file]: body }, async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      });
    });
  }

  it("names the stack's own runner, not vitest/jest, in the message", async () => {
    // A Python author told their stub "is silent in vitest/jest" reads the
    // finding as a false positive.
    await withTests({ "tests/test_a.py": "pytest.skip('later')\n" }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      expect(issues.find((i) => i.code === "QFAI-TEST-001")?.message).toContain("pytest/unittest");
    });
  });

  it("stays silent on a real test with no stub", async () => {
    await withTests(
      {
        "tests/test_a.py": "def test_a():\n    assert 1 == 1\n",
        "tests/a.test.ts": "it('works', () => expect(1).toBe(1));\n",
      },
      async (root) => {
        expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
      },
    );
  });
});

describe("QFAI-TEST-002 — a clean run on an unknown stack is not evidence", () => {
  it("names extensions the validator has no dialect for", async () => {
    // This is the defect's core: without it, `0 stubs` on a stack qfai cannot
    // check is indistinguishable from `0 stubs` on one it did.
    await withTests({ "tests/a.ex": 'test "x" do\n  :ok\nend\n' }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const coverage = issues.find((i) => i.code === "QFAI-TEST-002");
      expect(coverage?.severity).toBe("info");
      expect(coverage?.refs).toEqual([".ex"]);
    });
  });

  it("stays silent when every scanned file had a dialect", async () => {
    await withTests({ "tests/a.test.ts": "it('works', () => {});\n" }, async (root) => {
      expect(await stubCodes(root)).not.toContain("QFAI-TEST-002");
    });
  });

  it("reports each unknown extension once, not once per file", async () => {
    await withTests(
      { "tests/a.ex": "x\n", "tests/b.ex": "y\n", "tests/c.erl": "z\n" },
      async (root) => {
        const issues = await validateTestTodoStubs(root, CONFIG);
        const coverage = issues.filter((i) => i.code === "QFAI-TEST-002");
        expect(coverage).toHaveLength(1);
        expect(coverage[0]?.refs).toEqual([".erl", ".ex"]);
      },
    );
  });
});

describe("Ruby heredoc bodies are fixture text, not executing code", () => {
  const HEREDOC_SPEC = [
    "EXPECTED = <<~TEXT",
    "  pending: two rows still to reconcile",
    "  skip: the archived row",
    "TEXT",
    "",
    "it 'renders the summary' do",
    "  expect(render).to eq(EXPECTED)",
    "end",
    "",
  ].join("\n");

  it("does not report a heredoc line beginning with pending or skip", async () => {
    // The Ruby pattern is line-anchored, so without heredoc masking this
    // fixture body produced two QFAI-TEST-001 errors on a passing spec.
    await withTests({ "tests/render_spec.rb": HEREDOC_SPEC }, async (root) => {
      expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
    });
  });

  it("still reports a real stub after the heredoc terminator", async () => {
    await withTests(
      { "tests/render_spec.rb": `${HEREDOC_SPEC}it 'later' do\n  skip 'later'\nend\n` },
      async (root) => {
        const issues = await validateTestTodoStubs(root, CONFIG);
        expect(issues.filter((i) => i.code === "QFAI-TEST-001")).toHaveLength(1);
        expect(issues.find((i) => i.code === "QFAI-TEST-001")?.loc?.line).toBe(10);
      },
    );
  });

  it("does not mistake the append operator for a heredoc opener", async () => {
    await withTests(
      { "tests/append_spec.rb": "rows = []\nrows <<row\nskip 'later'\n" },
      async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      },
    );
  });
});

describe("STUB_SOURCE_FILE_PATTERN — coverage information for a caller's own globs", () => {
  it("collects an undialected test source so QFAI-TEST-002 can name it", async () => {
    // The ATDD completion gate brings its own globs. Restricting them to the
    // extensions with a dialect made a PHP-only acceptance suite produce an
    // unconditionally clean gate — the reading QFAI-TEST-002 exists to stop.
    await withTests({ "tests/e2e/spec-0001/UserTest.php": "<?php\n" }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG, {
        globs: [`tests/e2e/${STUB_SOURCE_FILE_PATTERN}`],
      });
      expect(issues.find((i) => i.code === "QFAI-TEST-002")?.refs).toEqual([".php"]);
    });
  });

  it("collects a Gherkin acceptance suite", async () => {
    // On a Cucumber stack the `.feature` files are the acceptance suite, and
    // the standard ATDD glob points straight at them. Leaving the extension out
    // selected no file at all, so the gate came back clean over a directory
    // nothing had opened.
    await withTests({ "tests/e2e/spec-0001/login.feature": "Feature: login\n" }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG, {
        globs: [`tests/e2e/${STUB_SOURCE_FILE_PATTERN}`],
      });
      expect(issues.find((i) => i.code === "QFAI-TEST-002")?.refs).toEqual([".feature"]);
    });
  });

  it("leaves fixtures and data files out of the disclaimer", async () => {
    await withTests(
      {
        "tests/e2e/spec-0001/users.json": "{}\n",
        "tests/e2e/spec-0001/README.md": "notes\n",
        "tests/e2e/spec-0001/us-0001.test.ts": "it('works', () => {});\n",
      },
      async (root) => {
        const issues = await validateTestTodoStubs(root, CONFIG, {
          globs: [`tests/e2e/${STUB_SOURCE_FILE_PATTERN}`],
        });
        expect(issues.map((i) => i.code)).not.toContain("QFAI-TEST-002");
      },
    );
  });
});

/**
 * Masking and matching both have to hold on the forms a real repository writes.
 *
 * Each of these was a false positive: a construct that is not a skipped test,
 * blocking the ATDD / full gate on work that has nothing to do with stubs.
 */
describe("constructs that look like stubs but are not", () => {
  // `Skip` is an ordinary identifier. Matching it anywhere blocked a gate on a
  // fixture record or a helper type that happens to carry a field of that name.
  const csharpNonStubs: Array<[string, string, string]> = [
    ["tests/Fixture.cs", "var options = new Options { Skip = false };\n", "a field assignment"],
    ["tests/Row.cs", "public bool Skip = SomeValue;\n", "a field declaration"],
    ["tests/Cmp.cs", "if (row.Skip == other.Skip) { }\n", "a comparison"],
    // Not a test attribute: `Skip` on it skips nothing.
    ["tests/Custom.cs", '[Trait(Skip = "x")]\npublic void A() {}\n', "a non-test attribute"],
  ];

  for (const [file, body, what] of csharpNonStubs) {
    it(`does not report ${what} in C#`, async () => {
      await withTests({ [file]: body }, async (root) => {
        expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
      });
    });
  }

  // A Rust raw string exists to hold unescaped quotes. Ending the span at the
  // first inner `"` exposed the rest of the line as code, and prose about
  // `#[ignore]` became a finding.
  const rustRawStrings: Array<[string, string, string]> = [
    ["tests/a.rs", 'let s = r#"Use " #[ignore] to disable"#;\n', "a hashed raw string"],
    ["tests/b.rs", 'let s = r##"quote "# inside #[ignore]"##;\n', "a double-hashed raw string"],
    ["tests/c.rs", 'let s = r"plain #[ignore] text";\n', "an unhashed raw string"],
    ["tests/d.rs", 'let s = br#"bytes " #[ignore]"#;\n', "a byte raw string"],
  ];

  for (const [file, body, what] of rustRawStrings) {
    it(`does not report #[ignore] inside ${what}`, async () => {
      await withTests({ [file]: body }, async (root) => {
        expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
      });
    });
  }

  // …and the masking must not swallow the real thing that follows it.
  it("still reports a real #[ignore] after a raw string", async () => {
    await withTests(
      { "tests/e.rs": 'let s = r#"see " #[ignore]"#;\n\n#[ignore]\nfn a() {}\n' },
      async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      },
    );
  });
});

describe("a masking pass must not blank real code past its own construct", () => {
  it("reads `rows <<ITEM` as an append, not an unterminated heredoc", async () => {
    // `<<TAG` is both a heredoc opener and `Array#<<` applied to a constant.
    // Read as a heredoc with no terminator, the body blanked to end of file and
    // every stub after it vanished from the scan — a clean gate over a file
    // nothing looked at.
    await withTests(
      {
        "tests/a_spec.rb": [
          "rows = []",
          "rows <<ITEM",
          "it 'x' do",
          "  pending 'later'",
          "end",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      },
    );
  });

  it("still blanks a heredoc that does have its terminator", async () => {
    await withTests(
      {
        "tests/b_spec.rb": [
          "text = <<ITEM",
          "  pending 'this is fixture prose, not a stub'",
          "ITEM",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
      },
    );
  });

  it("blanks a C# verbatim string whole, line breaks included", async () => {
    // `@"…"` may hold newlines, so the single-line `"` span ended it at the
    // first break and re-exposed the rest of the fixture as code.
    await withTests(
      {
        "tests/AT.cs": [
          'var expected = @"first line',
          "[Ignore] quoted inside expected output",
          'last line";',
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
      },
    );
  });

  it("blanks a C# raw string whole, and stops at its own closing run", async () => {
    await withTests(
      {
        "tests/BT.cs": [
          'var expected = """',
          "[Ignore] quoted inside expected output",
          '""";',
          '[Ignore("later")]',
          "public void B() {}",
          "",
        ].join("\n"),
      },
      async (root) => {
        // The fixture's `[Ignore]` is masked; the real attribute after the
        // string's close is not — a mask that ran on would have hidden it.
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
        expect(await stubCodes(root)).toHaveLength(1);
      },
    );
  });
});

/**
 * Every mask here reads one language's lexical rules. Sharing a definition
 * between two languages that spell a construct the same way, or leaving a form
 * out of one, blanks the wrong range — and a blanked range is a stub the gate
 * cannot see.
 */
describe("each dialect's mask follows its own language, not a neighbour's", () => {
  it("does not open a Ruby heredoc inside a regex literal", async () => {
    // `/<<~TEXT/` is a valid pattern. Read as a heredoc opener it has no
    // terminator, so the body blanked to end of file and the real stub below it
    // left the scan.
    await withTests(
      {
        "tests/re_spec.rb": [
          "pattern = /<<~TEXT/",
          "it 'x' do",
          "  pending 'later'",
          "end",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      },
    );
  });

  it("does not open a Ruby heredoc inside a %r literal", async () => {
    await withTests(
      {
        "tests/pr_spec.rb": ["pattern = %r{<<~TEXT}", "pending 'later'", ""].join("\n"),
      },
      async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      },
    );
  });

  it("blanks a %r literal's own body, and stops at its delimiter", async () => {
    await withTests(
      {
        "tests/pb_spec.rb": ["pattern = %r{", "pending", "}x", "skip 'later'", ""].join("\n"),
      },
      async (root) => {
        // The `pending` line is pattern text; the `skip` after the delimiter is
        // the real stub, and a mask that ran on would have hidden it.
        const issues = await validateTestTodoStubs(root, CONFIG);
        expect(issues.filter((i) => i.code === "QFAI-TEST-001").map((i) => i.loc?.line)).toEqual([
          4,
        ]);
      },
    );
  });

  it("reads a Ruby division as division, not as an unclosed pattern", async () => {
    await withTests(
      {
        "tests/div_spec.rb": ["average = total / count", "pending 'later'", ""].join("\n"),
      },
      async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      },
    );
  });

  it("takes no backslash escape in a Kotlin raw string", async () => {
    // Kotlin's `"""` is a raw string and Java's is a text block, so the shared
    // definition escaped a trailing backslash: the mask skipped the first quote
    // of the closing delimiter, ran to end of file, and took the real
    // `@Disabled` with it.
    await withTests(
      {
        "tests/ATest.kt": ['val windowsPath = """C:\\dir\\"""', "@Disabled", "fun a() {}", ""].join(
          "\n",
        ),
      },
      async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      },
    );
  });

  it("still blanks a Kotlin raw string that holds the construct", async () => {
    await withTests({ "tests/BTest.kt": 'val expected = """\n@Disabled\n"""\n' }, async (root) => {
      expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
    });
  });

  it("still blanks a Java text block that holds the construct", async () => {
    await withTests(
      {
        "tests/CTest.java": [
          'String expected = """',
          "@Disabled quoted inside expected output",
          '""";',
          "@Disabled",
          "void c() {}",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await validateTestTodoStubs(root, CONFIG);
        expect(issues.filter((i) => i.code === "QFAI-TEST-001").map((i) => i.loc?.line)).toEqual([
          4,
        ]);
      },
    );
  });

  it("closes a Rust block comment at its outermost delimiter", async () => {
    // Rust block comments nest, so the shared flat definition ended the outer
    // one at the inner delimiter and reported the commented-out attribute after
    // it as a real one.
    await withTests(
      { "tests/n.rs": "/* outer /* inner */ #[ignore] */\nfn a() {}\n" },
      async (root) => {
        expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
      },
    );
  });

  it("still reports a real #[ignore] after a nested block comment", async () => {
    await withTests(
      { "tests/o.rs": "/* outer /* inner */ still comment */\n#[ignore]\nfn a() {}\n" },
      async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      },
    );
  });

  const csharpInterpolated: Array<[string, string, string]> = [
    ["tests/DT.cs", '@$"first line', "an interpolated verbatim string"],
    ["tests/ET.cs", '$@"first line', "a verbatim string with the prefixes reversed"],
    ["tests/FT.cs", '$"""', "an interpolated raw string"],
  ];

  for (const [file, opener, what] of csharpInterpolated) {
    it(`blanks ${what} whole, line breaks included`, async () => {
      // Only `@"` was matched, so the interpolated spellings fell through to
      // the single-line span, ended at the first break, and re-exposed the rest
      // of the fixture as code.
      const close = opener === '$"""' ? '"""' : '"';
      await withTests(
        {
          [file]: [
            `var expected = ${opener}`,
            "[Ignore] quoted inside expected output",
            `${close};`,
            "",
          ].join("\n"),
        },
        async (root) => {
          expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
        },
      );
    });
  }

  it("still reports a real [Ignore] after an interpolated verbatim string", async () => {
    await withTests(
      {
        "tests/GT.cs": [
          'var expected = @$"holds [Ignore] as text";',
          '[Ignore("later")]',
          "public void G() {}",
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      },
    );
  });

  it("scans a Python f-string's replacement field as the code it is", async () => {
    // The field is evaluated when the string is built, so the test really is
    // skipped. Blanking the literal whole took the only evidence of it out of
    // the scan.
    await withTests(
      { "tests/test_f.py": "def test_a():\n    note = f\"{pytest.skip('later')}\"\n" },
      async (root) => {
        expect(await stubCodes(root)).toContain("QFAI-TEST-001");
      },
    );
  });

  it("still blanks the literal halves of a Python f-string", async () => {
    await withTests(
      {
        "tests/test_g.py": [
          "def test_a():",
          '    doc = f"see pytest.skip( in the docs, {name}"',
          '    braces = f"{{pytest.skip(}} is a literal brace"',
          "",
        ].join("\n"),
      },
      async (root) => {
        expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
      },
    );
  });
});

describe("two stubs on one line are two findings", () => {
  it("gives each occurrence its own column", async () => {
    // `full` runs this validator once per profile and dedupes the overlap on
    // (code, file, line, refs). Without the column the second stub on a line
    // shared every field with the first and was dropped.
    await withTests(
      { "tests/a.test.ts": `it${TODO}('one'); it${TODO}('two');\n` },
      async (root) => {
        const found = (await validateTestTodoStubs(root, CONFIG)).filter(
          (i) => i.code === "QFAI-TEST-001",
        );
        expect(found).toHaveLength(2);
        const columns = found.map((i) => i.loc?.column);
        expect(columns.every((c) => typeof c === "number")).toBe(true);
        expect(new Set(columns).size).toBe(2);
      },
    );
  });
});

describe("the opt-out still turns the whole validator off", () => {
  it("returns nothing when forbidTestTodoStubs is false", async () => {
    await withTests({ "tests/a.test.ts": JS_STUB }, async (root) => {
      const off: QfaiConfig = {
        ...CONFIG,
        validation: {
          ...CONFIG.validation,
          testStrategy: { ...CONFIG.validation.testStrategy, forbidTestTodoStubs: false },
        },
      };
      expect(await validateTestTodoStubs(root, off)).toEqual([]);
    });
  });
});

describe("QFAI-TEST-003 — the vitest/jest skip form is its own rule", () => {
  // Six of the seven dialects matched their stack's *skip* construct while the
  // JS/TS entry matched `.todo` alone, so `it.skip` / `test.skip` /
  // `describe.skip` — the form a developer actually writes to park a suite
  // mid-change, and the form `qfai atdd scaffold` emits — cleared the only
  // gate qfai has against work left as a silent placeholder.
  const JS_SKIPS = [
    'import { describe, it, test } from "vitest";',
    "",
    `it${SKIP}("skip form", () => {});`,
    `test${SKIP}("test skip form", () => {});`,
    `describe${SKIP}("suite skip form", () => {`,
    '  it("would run", () => {});',
    "});",
    "",
  ].join("\n");

  it("reports every skip spelling, one finding per occurrence", async () => {
    await withTests({ "tests/a.test.ts": JS_SKIPS }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const stubs = issues.filter((i) => i.code === "QFAI-TEST-003");
      expect(stubs).toHaveLength(3);
      expect(stubs.map((i) => i.loc?.line)).toEqual([3, 4, 5]);
    });
  });

  // `qfai atdd scaffold` writes its skeletons as `it.skip`, and
  // `D-SCAFFOLD-PLACEHOLDER` owns an unfilled scaffold with a ladder of its
  // own: a warning for `atdd.scaffoldEscalateCycles` validate runs, then an
  // error. Reporting the same block here too would fail `--fail-on error` on
  // the scaffold's own output before a line of it was written, and would
  // overrule that ladder from outside.
  // What `qfai atdd scaffold` writes: the sentinel AND a per-TC TODO line.
  // The validator that owns an unfilled skeleton requires both, so a fixture
  // carrying only the sentinel is a file it passes over — and this gate
  // standing aside for that would leave the skipped case reported by neither.
  const SCAFFOLDED = [
    'import { describe, it } from "vitest";',
    "",
    "// TODO: implement assertion for TC-0001-0001",
    `it${SKIP}("pending — scaffold placeholder", () => {`,
    "  // QFAI-SCAFFOLD-PLACEHOLDER — replace this block with a real assertion.",
    "});",
    "",
  ].join("\n");

  it("leaves an unfilled scaffold to the rule that owns it", async () => {
    await withTests({ "tests/a.test.ts": SCAFFOLDED }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);

      expect(issues.filter((i) => i.code === "QFAI-TEST-003")).toEqual([]);
    });
  });

  // The marker is the scaffold's own line, so authoring the block removes it.
  // A `.skip` left behind after that is a hand-written one.
  it("reports the skip once the scaffold's own marker is gone", async () => {
    const authored = [
      'import { describe, it } from "vitest";',
      "",
      `it${SKIP}("parked by hand", () => {`,
      "  expect(1).toBe(1);",
      "});",
      "",
    ].join("\n");

    await withTests({ "tests/a.test.ts": authored }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);

      expect(issues.filter((i) => i.code === "QFAI-TEST-003")).toHaveLength(1);
    });
  });

  // The exemption is for the skip form only. The scaffold writes no `.todo`,
  // so one in a scaffold file was put there by hand and is still the stub rule.
  it("still reports a todo stub inside a scaffold file", async () => {
    const mixed = [
      'import { describe, it } from "vitest";',
      "",
      "// TODO: implement assertion for TC-0001-0001",
      `it${SKIP}("pending — scaffold placeholder", () => {`,
      "  // QFAI-SCAFFOLD-PLACEHOLDER — replace this block with a real assertion.",
      "});",
      'it.todo("added by hand");',
      "",
    ].join("\n");

    await withTests({ "tests/a.test.ts": mixed }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);

      expect(issues.filter((i) => i.code === "QFAI-TEST-003")).toEqual([]);
      expect(issues.filter((i) => i.code === "QFAI-TEST-001")).toHaveLength(1);
    });
  });

  it("keeps refs on the exact construct so waivers and grouping stay stable", async () => {
    await withTests({ "tests/a.test.ts": JS_SKIPS }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const refs = issues.filter((i) => i.code === "QFAI-TEST-003").map((i) => i.refs?.[0]);
      expect(refs).toEqual([`it${SKIP}`, `test${SKIP}`, `describe${SKIP}`]);
    });
  });

  it(`files ${SKIP} under its own rule, alongside ${TODO}`, async () => {
    // A `.todo` is a bare declaration and can only mean work not done. A
    // `.skip` keeps its body and is what `qfai atdd scaffold` emits, so an
    // `error` would fail the scaffold's own output on sight.
    //
    // The separate *code* matters as much as the severity: `waivers.ts`
    // grades a waiver against the highest severity its rule produced in the
    // run (`buildRuleSeverityIndex`) and rejects any waiver aimed at an
    // `error` rule. Sharing `QFAI-TEST-001` would let this file's single
    // `.todo` promote the whole rule to `error` and take the per-path waiver
    // — the remediation the `.skip` finding advertises — away with it.
    await withTests({ "tests/a.test.ts": `${JS_STUB}${JS_SKIPS}` }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const graded = new Map(
        issues.map((i) => [i.refs?.[0] ?? "", { code: i.code, severity: i.severity }] as const),
      );
      expect(graded.get(`it${TODO}`)).toEqual({ code: "QFAI-TEST-001", severity: "error" });
      expect(graded.get(`it${SKIP}`)).toEqual({ code: "QFAI-TEST-003", severity: "error" });
      expect(graded.get(`describe${SKIP}`)).toEqual({
        code: "QFAI-TEST-003",
        severity: "error",
      });
      // The gate `qfai-implement`'s FINAL CHECKLIST reads stays todo-only.
      expect(issues.filter((i) => i.code === "QFAI-TEST-001")).toHaveLength(1);
    });
  });

  it("reports at error", async () => {
    await withTests({ "tests/a.test.ts": JS_SKIPS }, async (root) => {
      const issues = (await validateTestTodoStubs(root, CONFIG)).filter(
        (i) => i.code === "QFAI-TEST-003",
      );
      expect(issues, "the fixture stopped producing skip findings").not.toEqual([]);
      for (const found of issues) {
        expect(found.severity).toBe("error");
      }
      // The `.todo` rule keeps its own hard error.
      const todo = await withTests({ "tests/b.test.ts": JS_STUB }, (r) =>
        validateTestTodoStubs(r, CONFIG),
      );
      expect(todo.find((i) => i.code === "QFAI-TEST-001")?.severity).toBe("error");
    });
  });

  it("names the skip form in the message, not the todo form", async () => {
    await withTests({ "tests/a.test.ts": JS_SKIPS }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const first = issues.find((i) => i.code === "QFAI-TEST-003");
      expect(first?.message).toContain(`it${SKIP}`);
      expect(first?.message).not.toContain(TODO);
      expect(first?.message).toContain("vitest/jest");
    });
  });

  it("tells the operator to drop the modifier, not to delete the test", async () => {
    // `.skip` keeps its body, so the `.todo` remediation ("delete the stub")
    // followed literally throws away a working test.
    await withTests({ "tests/a.test.ts": `${JS_STUB}${JS_SKIPS}` }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const skipAction = issues.find((i) => i.code === "QFAI-TEST-003")?.suggested_action ?? "";
      expect(skipAction).toContain("Remove the skip modifier");
      expect(skipAction).not.toContain("delete the stub");
      // The remedy used to end at a per-path waiver. The rule is an error, so
      // that route is closed and the text says so rather than leaving the
      // operator to discover it from a refusal.
      expect(skipAction).toContain("No waiver reaches this finding");
      const todoAction = issues.find((i) => i.code === "QFAI-TEST-001")?.suggested_action ?? "";
      expect(todoAction).toContain("delete the stub");
    });
  });

  it(`also matches the chained ${SKIP}.each spellings`, async () => {
    // The chained `.each` form puts a `.` where the bare form puts its `(`,
    // so a pattern anchored straight onto the open paren let an
    // unconditionally skipped parameterized suite through unreported.
    const chained = [
      `test${SKIP}.each([[1], [2]])("case %i", (n) => {});`,
      `describe${SKIP}.each([[1]])("suite %i", () => {});`,
      `it${SKIP}.each\`
      a
      \`("tagged", () => {});`,
      "",
    ].join("\n");
    await withTests({ "tests/a.test.ts": chained }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const skipped = issues.filter((i) => i.code === "QFAI-TEST-003");
      expect(skipped.map((i) => i.refs?.[0])).toEqual([
        `test${SKIP}`,
        `describe${SKIP}`,
        `it${SKIP}`,
      ]);
      expect(skipped.every((i) => i.severity === "error")).toBe(true);
    });
  });

  it(`also matches a ${SKIP} sitting behind a leading modifier`, async () => {
    // `test.concurrent` + `.skip` is a valid Jest spelling — the token is
    // split in the fixture below for the same reason the constants at the top
    // of this file are. The modifier pushes `skip` off the root identifier, so
    // a pattern demanding the token directly after `test` reported nothing for
    // an unconditionally skipped concurrent test.
    const modified = [
      `test.concurrent${SKIP}("concurrent skip", async () => {});`,
      `test.concurrent${SKIP}.each([[1]])("concurrent skip each %i", async (n) => {});`,
      `it.failing${SKIP}("failing skip", () => {});`,
      "",
    ].join("\n");
    await withTests({ "tests/a.test.ts": modified }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const skipped = issues.filter((i) => i.code === "QFAI-TEST-003");
      expect(skipped.map((i) => i.loc?.line)).toEqual([1, 2, 3]);
      // The label stays root + token, as it already did for the trailing
      // `.each` chain, so `refs` does not fragment once per modifier.
      expect(skipped.map((i) => i.refs?.[0])).toEqual([`test${SKIP}`, `test${SKIP}`, `it${SKIP}`]);
      expect(skipped.every((i) => i.severity === "error")).toBe(true);
    });
  });

  it(`also matches a chain broken over a newline`, async () => {
    // A member chain carries a line break at any of its dots, and that is what
    // a printer emits once the chain outgrows the print width. The scan used
    // to split the file into lines first, so `test.concurrent` + newline +
    // `.skip(...)` — one valid call — was contained by no line it looked at
    // and went unreported even under `--fail-on warning`.
    const broken = [
      "test.concurrent",
      `  ${SKIP}("concurrent skip over two lines", async () => {});`,
      `test${SKIP}`,
      '  .each([[1]])("skip each over two lines %i", (n) => {});',
      "it",
      `  ${SKIP}("plain skip over two lines", () => {});`,
      "describe",
      `  ${TODO}("todo over two lines");`,
      "",
    ].join("\n");
    await withTests({ "tests/a.test.ts": broken }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const skipped = issues.filter((i) => i.code === "QFAI-TEST-003");
      expect(skipped.map((i) => i.refs?.[0])).toEqual([`test${SKIP}`, `test${SKIP}`, `it${SKIP}`]);
      // The line the construct *starts* on — the root identifier's — and every
      // finding after a multi-line match still lands on its own line.
      expect(skipped.map((i) => i.loc?.line)).toEqual([1, 3, 5]);
      expect(skipped.every((i) => i.severity === "error")).toBe(true);
      const todo = issues.filter((i) => i.code === "QFAI-TEST-001");
      expect(todo.map((i) => i.loc?.line)).toEqual([7]);
    });
  });

  it("keeps a Ruby stub on its own line when blank lines precede it", async () => {
    // Over-correction pin for the whole-file scan: the RSpec pattern anchors on
    // `^` and then eats the indent, so a `\s*` indent would swallow the blank
    // lines above the construct and file the finding against the first of them.
    const spec = ["it 'x' do", "", "", "  skip 'later'", "end", ""].join("\n");
    await withTests({ "tests/a_spec.rb": spec }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      expect(issues.filter((i) => i.code === "QFAI-TEST-001").map((i) => i.loc?.line)).toEqual([4]);
    });
  });

  it("keeps the JS member chain allowed to break over a newline", async () => {
    // The other half of the pair below: confining the cross-line reach to the
    // JS dialect must not take it away from the JS dialect. A chain a printer
    // split at its `.` is still one call, and still a parked test.
    await withTests(
      { "tests/a.test.ts": `test\n  ${SKIP}("still one call", () => {});\n` },
      async (root) => {
        const issues = await validateTestTodoStubs(root, CONFIG);
        const skipped = issues.filter((i) => i.code === "QFAI-TEST-003");
        expect(skipped.map((i) => i.loc?.line)).toEqual([1]);
      },
    );
  });

  it("does not let a non-JS pattern reach across a newline", async () => {
    // Scanning the whole file let every dialect's `\s*` consume a line break,
    // not just the JS member chain's. `pytest.skip` bound to a name, with an
    // unrelated call expression on the next line, is no call at all — but
    // `pytest.skip` + newline + `(` matched, and filed an **error** against a
    // file with nothing skipped in it, failing an ordinary `--fail-on error`.
    await withTests(
      {
        "tests/test_a.py": "skip_fn = pytest.skip\n(result)\n",
        "tests/a_test.go": "fn := t.Skip\n(result)\n",
        "tests/AT.cs": 'string Skip\n= "later";\n',
      },
      async (root) => {
        expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
      },
    );
  });

  it("still reports each non-JS stub written on one line", async () => {
    // Over-correction pin for the newline gate: the construct these dialects
    // actually use is a single statement, and every one of them must survive.
    await withTests(
      {
        "tests/test_a.py": "def test_a():\n    pytest.skip('later')\n",
        "tests/a_test.go": 'func TestA(t *testing.T) {\n\tt.Skip("later")\n}\n',
        "tests/AT.cs": '[Fact(Skip = "later")]\npublic void A() {}\n',
      },
      async (root) => {
        const issues = await validateTestTodoStubs(root, CONFIG);
        expect(issues.filter((i) => i.code === "QFAI-TEST-001")).toHaveLength(3);
      },
    );
  });

  it("ignores the construct inside a comment or a literal, not the real call", async () => {
    // A regex over a raw file cannot tell a parked test from a fixture that
    // *holds* one as data. This validator scans a repository's own test files,
    // where a generator or parser suite carries the construct in a string and
    // prose spells it out in a comment — so `--fail-on warning` failed with
    // nothing skipped anywhere. Both directions are pinned in one fixture: the
    // five inert spellings stay silent and the real call on line 8 does not.
    const mixed = [
      `const source = "it${SKIP}(name, fn)";`,
      "const emitted = `test" + SKIP + "(name, fn)`;",
      `const matcher = /it${SKIP}(pending)/;`,
      `// describe${SKIP}("example", () => {});`,
      "/*",
      ` * it${TODO}("documented later");`,
      " */",
      `it${SKIP}("really parked", () => {});`,
      "",
    ].join("\n");
    await withTests({ "tests/a.test.ts": mixed }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      expect(issues.filter((i) => i.code === "QFAI-TEST-001")).toEqual([]);
      const skipped = issues.filter((i) => i.code === "QFAI-TEST-003");
      expect(skipped.map((i) => i.loc?.line)).toEqual([8]);
      expect(skipped.map((i) => i.refs?.[0])).toEqual([`it${SKIP}`]);
    });
  });

  it("still matches a chain a comment sits inside", async () => {
    // Over-correction pin for the mask: it blanks one character per character,
    // so a comment between the root identifier and the `.skip` link collapses
    // to whitespace the chain pattern already tolerates instead of splitting
    // the call in two.
    const commented = `it /* parked for now */ ${SKIP}("x", () => {});\n`;
    await withTests({ "tests/a.test.ts": commented }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const skipped = issues.filter((i) => i.code === "QFAI-TEST-003");
      expect(skipped.map((i) => i.loc?.line)).toEqual([1]);
      expect(skipped.map((i) => i.refs?.[0])).toEqual([`it${SKIP}`]);
    });
  });

  it("leaves a plain it()/describe() call alone", async () => {
    await withTests(
      {
        "tests/a.test.ts": 'describe("s", () => {\n  it("works", () => {});\n});\n',
        "tests/b.test.ts": "const rest = unit.skip(2);\n",
        // A modifier chain carrying no skip/todo token at all: the widened
        // leading-modifier match must not turn every chained call into a stub.
        "tests/d.test.ts": 'test.concurrent.each([[1]])("runs", async (n) => {});\n',
        // The same chain broken over a newline. Tolerating the line break must
        // not cost the negative case: still no skip/todo token in it.
        "tests/e.test.ts": 'test.concurrent\n  .each([[1]])("runs", async (n) => {});\n',
        // Prose naming the construct at a line end, with the next line opening
        // on a comment marker rather than the call's paren. Only whitespace may
        // stand between the token and the `(` that makes it a call.
        "tests/f.test.ts": `// spellings: it${SKIP}\n// (and it${TODO})\n`,
        // Prose naming the construct inside a markdown code span. A repo's own
        // test files are full of these, and `qfai validate` scans them, so a
        // pattern that accepts a backtick straight after the bare form turns
        // every mention into a reported stub.
        "tests/c.test.ts": `// Excludes \`it${SKIP}\` / \`it${TODO}\` — they never run.\n`,
      },
      async (root) => {
        const codes = await stubCodes(root);
        expect(codes).not.toContain("QFAI-TEST-001");
        expect(codes).not.toContain("QFAI-TEST-003");
      },
    );
  });
});

describe(`${SKIP} as a statement inside a running test`, () => {
  // Playwright writes a runtime guard with the same two tokens a parked test
  // uses: `test.skip(condition, reason)` called from inside a test body. That
  // test is registered, reported and executed — it stops early only when the
  // condition holds. Everything the rule says is wrong for it: there is no
  // modifier to drop, and deleting the call removes the guard rather than
  // restoring a test. The finding is an error, and an error cannot be waived,
  // so a repository with a legitimate guard would have no passing state at all.
  const PLAYWRIGHT = 'import { expect, test } from "@playwright/test";';

  const guard = (argument: string): string =>
    [
      PLAYWRIGHT,
      "",
      'test("quarantined lines hold no lease", async ({ page }) => {',
      `  test${SKIP}(${argument});`,
      "  await expect(page.getByRole('status')).toHaveText('quarantined');",
      "});",
      "",
    ].join("\n");

  it.each([
    ["a negated call", "!fleetIsAwake(), 'every line is powered off at night'"],
    ["a bare identifier", "nightly, 'no error line exists at night'"],
    ["an environment lookup", "process.env.CI !== undefined, 'not on CI'"],
    ["a member expression", "fixture.asleep, 'asleep'"],
    ["no argument at all", ""],
  ])("says nothing about %s", async (_name, argument) => {
    await withTests({ "tests/e2e/a.spec.ts": guard(argument) }, async (root) => {
      expect(await stubCodes(root)).not.toContain("QFAI-TEST-003");
    });
  });

  it("still reports the parked form, whose first argument is the name", async () => {
    // The one that must survive: same tokens, same file, string first
    // argument. Excluding the guard cannot cost the rule its subject.
    const parked = [PLAYWRIGHT, "", `test${SKIP}("parked", async () => {});`, ""].join("\n");
    await withTests({ "tests/e2e/a.spec.ts": parked }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const skipped = issues.filter((i) => i.code === "QFAI-TEST-003");
      expect(skipped.map((i) => i.loc?.line)).toEqual([3]);
    });
  });

  it("reads a template literal as a name, not as a condition", async () => {
    const parked = [PLAYWRIGHT, "", "test" + SKIP + "(`parked ${n}`, async () => {});", ""].join(
      "\n",
    );
    await withTests({ "tests/e2e/a.spec.ts": parked }, async (root) => {
      expect(await stubCodes(root)).toContain("QFAI-TEST-003");
    });
  });

  it("keeps the parked parameterized suite, whose first argument is a table", async () => {
    // `test.skip.each([...])(...)` opens on an array, which is not a name —
    // but the trailing chain says the construct is the parked parameterized
    // form regardless of what it is called with.
    const each = `test${SKIP}.each([[1], [2]])("case %i", (n) => {});\n`;
    await withTests({ "tests/a.test.ts": each }, async (root) => {
      expect(await stubCodes(root)).toContain("QFAI-TEST-003");
    });
  });

  it(`leaves ${TODO} an error whatever it is called with`, async () => {
    // `todo` has no runtime form, so the argument shape decides nothing here.
    await withTests({ "tests/a.test.ts": `it${TODO}(pending);\n` }, async (root) => {
      expect(await stubCodes(root)).toContain("QFAI-TEST-001");
    });
  });
});

describe("the runner a finding names is the one the file runs on", () => {
  // The dialect is chosen by extension, and `.spec.ts` is as readily a
  // Playwright file as a vitest one. The message tells the operator what a
  // parked test costs them, so naming a runner the file never reaches makes
  // the finding read as being about some other file.
  const parked = `test${SKIP}("parked", async () => {});\n`;

  it("names Playwright for a file that imports it", async () => {
    const file = `import { test } from "@playwright/test";\n\n${parked}`;
    await withTests({ "tests/e2e/a.spec.ts": file }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const message = issues.find((i) => i.code === "QFAI-TEST-003")?.message ?? "";
      expect(message).toContain("silent in Playwright");
      expect(message).not.toContain("vitest/jest");
    });
  });

  it("names Playwright for a require of it too", async () => {
    const file = `const { test } = require("@playwright/test");\n\n${parked}`;
    await withTests({ "tests/e2e/a.spec.ts": file }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      expect(issues.find((i) => i.code === "QFAI-TEST-003")?.message).toContain(
        "silent in Playwright",
      );
    });
  });

  it("keeps vitest/jest for a file that imports neither", async () => {
    const file = `import { test } from "vitest";\n\n${parked}`;
    await withTests({ "tests/a.test.ts": file }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      expect(issues.find((i) => i.code === "QFAI-TEST-003")?.message).toContain(
        "silent in vitest/jest",
      );
    });
  });

  it("leaves a stack with its own runner alone", async () => {
    // The Playwright reading is a split of one dialect, not a rule about every
    // file: a Python stub still names pytest.
    await withTests({ "tests/a_test.py": "pytest.skip('later')\n" }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      expect(issues.find((i) => i.code === "QFAI-TEST-001")?.message).toContain(
        "silent in pytest/unittest",
      );
    });
  });
});
