/**
 * Unit tests for the wiring-guard text primitives and its call graph.
 *
 * The first half pins the three shapes that used to satisfy the old raw-text
 * guard without any code calling anything: a doc comment, a string literal and
 * a barrel re-export. Each must read as "not invoked" here, or the meta-test in
 * `validators-are-wired.test.ts` goes back to being green for validators
 * nothing calls.
 *
 * The second half pins reachability itself: a call only counts when the
 * function containing it is reachable, an import alias resolves to the real
 * name, and a validator handed to a dispatch table still counts as wired.
 */
import { describe, expect, it } from "vitest";

import {
  buildWiringGraph,
  isInvoked,
  stripCommentsAndLiterals,
  stripDeclarationHeaders,
  toExecutableCode,
} from "../helpers/wiringGraph.js";

const DEFINITION = [
  "export function validateFoo(root: string): Issue[] {",
  "  return [];",
  "}",
].join("\n");

describe("stripCommentsAndLiterals", () => {
  it("drops block comments, including doc-comment prose", () => {
    const stripped = stripCommentsAndLiterals("/**\n * validateFoo covers it.\n */\nconst x = 1;");
    expect(stripped).not.toContain("validateFoo");
    expect(stripped).toContain("const x = 1;");
  });

  it("drops line comments without eating the following line", () => {
    const stripped = stripCommentsAndLiterals(
      "// don't call validateFoo(root)\nvalidateBar(root);",
    );
    expect(stripped).not.toContain("validateFoo");
    expect(stripped).toContain("validateBar(root)");
  });

  it("drops string and template literals", () => {
    const stripped = stripCommentsAndLiterals(
      [
        'const a = "validateFoo(root)";',
        "const b = `validateFoo(root)`;",
        "validateBar(root);",
      ].join("\n"),
    );
    expect(stripped).not.toContain("validateFoo");
    expect(stripped).toContain("validateBar(root)");
  });

  it("does not let a quote inside a regex literal swallow the code after it", () => {
    const stripped = stripCommentsAndLiterals(
      ["const re = /from\\s+[\"'](\\S+)[\"']/g;", "validateBar(root);"].join("\n"),
    );
    expect(stripped).toContain("validateBar(root)");
  });

  it("keeps a division expression intact", () => {
    const stripped = stripCommentsAndLiterals("const ratio = total / count;\nvalidateBar(root);");
    expect(stripped).toContain("total / count");
    expect(stripped).toContain("validateBar(root)");
  });
});

describe("stripDeclarationHeaders", () => {
  it("removes the declared name but keeps the parameter list", () => {
    const stripped = stripDeclarationHeaders(DEFINITION);
    expect(stripped).not.toContain("validateFoo");
    expect(stripped).toContain("function (root: string)");
  });

  it("removes async declaration headers too", () => {
    expect(stripDeclarationHeaders("export async function validateFoo(root) {}")).not.toContain(
      "validateFoo",
    );
  });
});

describe("isInvoked", () => {
  it("is false for a name that only appears in a doc comment", () => {
    const code = toExecutableCode(
      ["/**", " * `validateFoo` (QFAI-PROT-310) covers that case.", " */", "const x = 1;"].join(
        "\n",
      ),
    );
    expect(isInvoked("validateFoo", code)).toBe(false);
  });

  it("is false for a barrel re-export", () => {
    const code = toExecutableCode('export { validateFoo } from "./prototyping/foo.js";');
    expect(isInvoked("validateFoo", code)).toBe(false);
  });

  it("is false for an import statement", () => {
    const code = toExecutableCode('import { validateFoo } from "./prototyping/foo.js";');
    expect(isInvoked("validateFoo", code)).toBe(false);
  });

  it("is false for the function's own definition", () => {
    expect(isInvoked("validateFoo", toExecutableCode(DEFINITION))).toBe(false);
  });

  it("is false for a longer name that merely ends with the searched one", () => {
    const code = toExecutableCode("revalidateFoo(root, config);");
    expect(isInvoked("validateFoo", code)).toBe(false);
  });

  it("is true for a direct call", () => {
    const code = toExecutableCode("const issues = [...(await validateFoo(root, config))];");
    expect(isInvoked("validateFoo", code)).toBe(true);
  });

  it("is true for a call written across a line break", () => {
    const code = toExecutableCode("validateFoo (\n  root,\n  config,\n);");
    expect(isInvoked("validateFoo", code)).toBe(true);
  });

  it("is true for a namespaced call", () => {
    const code = toExecutableCode("validators.validateFoo(root, config);");
    expect(isInvoked("validateFoo", code)).toBe(true);
  });

  it("is true when the definition file also calls the function", () => {
    const code = toExecutableCode([DEFINITION, "const out = validateFoo(root);"].join("\n"));
    expect(isInvoked("validateFoo", code)).toBe(true);
  });
});

describe("buildWiringGraph", () => {
  const entry = (source: string): { file: string; source: string } => ({
    file: "/src/core/validate.ts",
    source,
  });
  const module_ = (file: string, source: string): { file: string; source: string } => ({
    file,
    source,
  });

  const BARREL = module_(
    "/src/core/validators/index.ts",
    'export { validateFoo } from "./prototyping/foo.js";\nexport { validateBar } from "./prototyping/bar.js";',
  );

  it("counts a call made from the entry module", () => {
    const graph = buildWiringGraph(
      entry(
        'import { validateFoo } from "./validators/index.js";\nexport function run() {\n  validateFoo(root);\n}',
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateFoo")).toBe(true);
  });

  it("does not count a validator that is only re-exported by the barrel", () => {
    const graph = buildWiringGraph(
      entry(
        'import { validateFoo } from "./validators/index.js";\nexport function run() {\n  validateFoo(root);\n}',
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateBar")).toBe(false);
  });

  it("counts a call made from an orchestrator the entry module calls", () => {
    const graph = buildWiringGraph(
      entry(
        'import { validateFoo } from "./validators/index.js";\nexport function run() {\n  validateFoo(root);\n}',
      ),
      [
        BARREL,
        module_(
          "/src/core/validators/prototyping/foo.ts",
          "export function validateFoo(root) {\n  return validateBar(root);\n}",
        ),
      ],
    );
    expect(graph.isCalled("validateBar")).toBe(true);
  });

  it("does not count a call made from a function nothing calls", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return [];\n}"), [
      BARREL,
      module_(
        "/src/core/validators/prototyping/foo.ts",
        "export function validateFoo(root) {\n  return validateBar(root);\n}",
      ),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(false);
    expect(graph.isCalled("validateBar")).toBe(false);
  });

  it("counts module-level code, which runs as soon as the module is imported", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return [];\n}"), [
      module_("/src/core/validators/eager.ts", "const seed = validateFoo(root);"),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(true);
  });

  it("resolves a call made through an import alias", () => {
    const graph = buildWiringGraph(
      entry(
        'import { validateFoo as runFoo } from "./validators/index.js";\nexport function run() {\n  runFoo(root);\n}',
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateFoo")).toBe(true);
  });

  it("counts a validator handed to a dispatch table instead of called inline", () => {
    const graph = buildWiringGraph(
      entry(
        'import { validateFoo } from "./validators/index.js";\nconst REGISTRY = [validateFoo];\nexport function run() {\n  return REGISTRY.map((fn) => fn(root));\n}',
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateFoo")).toBe(true);
  });

  it("does not count a name that only appears in a doc comment of a loaded module", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return [];\n}"), [
      module_(
        "/src/core/validators/prototyping/foo.ts",
        "/** validateFoo(root) is described here. */\nconst x = 1;",
      ),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("carries reachability through an arrow-function orchestrator", () => {
    const graph = buildWiringGraph(
      entry("export function run() {\n  return orchestrate(root);\n}"),
      [
        module_(
          "/src/core/validators/orchestrator.ts",
          "export const orchestrate = async (root) => {\n  return validateFoo(root);\n};\nexport const unused = (root) => {\n  return validateBar(root);\n};",
        ),
      ],
    );
    expect(graph.isCalled("validateFoo")).toBe(true);
    expect(graph.isCalled("validateBar")).toBe(false);
  });
});
