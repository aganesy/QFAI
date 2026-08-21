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
import { validateTestTodoStubs } from "../../src/core/validators/testTodoStubs.js";

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

describe("the vitest/jest dialect also matches its stack's skip form", () => {
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
      const stubs = issues.filter((i) => i.code === "QFAI-TEST-001");
      expect(stubs).toHaveLength(3);
      expect(stubs.map((i) => i.loc?.line)).toEqual([3, 4, 5]);
    });
  });

  it("keeps refs on the exact construct so waivers and grouping stay stable", async () => {
    await withTests({ "tests/a.test.ts": JS_SKIPS }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const refs = issues.filter((i) => i.code === "QFAI-TEST-001").map((i) => i.refs?.[0]);
      expect(refs).toEqual([`it${SKIP}`, `test${SKIP}`, `describe${SKIP}`]);
    });
  });

  it(`grades ${SKIP} as a warning while ${TODO} stays an error`, async () => {
    // A `.todo` is a bare declaration and can only mean work not done. A
    // `.skip` keeps its body and is what `qfai atdd scaffold` emits, so an
    // `error` would fail the scaffold's own output on sight — and `waivers.ts`
    // refuses any waiver aimed at an `error` rule, leaving a project no way to
    // park a suite short of switching the gate off entirely.
    await withTests({ "tests/a.test.ts": `${JS_STUB}${JS_SKIPS}` }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const bySeverity = new Map(
        issues
          .filter((i) => i.code === "QFAI-TEST-001")
          .map((i) => [i.refs?.[0] ?? "", i.severity] as const),
      );
      expect(bySeverity.get(`it${TODO}`)).toBe("error");
      expect(bySeverity.get(`it${SKIP}`)).toBe("warning");
      expect(bySeverity.get(`describe${SKIP}`)).toBe("warning");
    });
  });

  it("names the skip form in the message, not the todo form", async () => {
    await withTests({ "tests/a.test.ts": JS_SKIPS }, async (root) => {
      const issues = await validateTestTodoStubs(root, CONFIG);
      const first = issues.find((i) => i.code === "QFAI-TEST-001");
      expect(first?.message).toContain(`it${SKIP}`);
      expect(first?.message).not.toContain(TODO);
      expect(first?.message).toContain("vitest/jest");
    });
  });

  it("leaves a plain it()/describe() call alone", async () => {
    await withTests(
      {
        "tests/a.test.ts": 'describe("s", () => {\n  it("works", () => {});\n});\n',
        "tests/b.test.ts": "const rest = unit.skip(2);\n",
      },
      async (root) => {
        expect(await stubCodes(root)).not.toContain("QFAI-TEST-001");
      },
    );
  });
});
