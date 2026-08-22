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
