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
  identifiersIn,
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

/** The names an executable-code fragment uses, as the graph reads them. */
const namesUsedIn = (source: string): Set<string> => identifiersIn(toExecutableCode(source));

describe("identifiersIn over executable code", () => {
  it("does not see a name that only appears in a doc comment", () => {
    const names = namesUsedIn(
      ["/**", " * `validateFoo` (QFAI-PROT-310) covers that case.", " */", "const x = 1;"].join(
        "\n",
      ),
    );
    expect(names.has("validateFoo")).toBe(false);
  });

  it("does not see a name that only appears in a string literal", () => {
    expect(namesUsedIn('const label = "validateFoo(root)";').has("validateFoo")).toBe(false);
  });

  it("does not see a barrel re-export", () => {
    expect(
      namesUsedIn('export { validateFoo } from "./prototyping/foo.js";').has("validateFoo"),
    ).toBe(false);
  });

  it("does not see the from-less spelling of a barrel re-export", () => {
    const names = namesUsedIn(
      ['import { validateFoo } from "./prototyping/foo.js";', "export { validateFoo };"].join("\n"),
    );
    expect(names.has("validateFoo")).toBe(false);
  });

  it("does not see an import statement", () => {
    expect(
      namesUsedIn('import { validateFoo } from "./prototyping/foo.js";').has("validateFoo"),
    ).toBe(false);
  });

  it("does not see the function's own declaration header", () => {
    expect(namesUsedIn(DEFINITION).has("validateFoo")).toBe(false);
  });

  it("does not confuse a longer name that merely ends with the searched one", () => {
    const names = namesUsedIn("revalidateFoo(root, config);");
    expect(names.has("revalidateFoo")).toBe(true);
    expect(names.has("validateFoo")).toBe(false);
  });

  it("sees a direct call", () => {
    expect(
      namesUsedIn("const issues = [...(await validateFoo(root, config))];").has("validateFoo"),
    ).toBe(true);
  });

  it("sees a namespaced call and a namespaced reference", () => {
    expect(namesUsedIn("validators.validateFoo(root, config);").has("validateFoo")).toBe(true);
    expect(namesUsedIn("const registry = [validators.validateFoo];").has("validateFoo")).toBe(true);
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

  it("is not fooled by a destructured parameter list", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return [];\n}"), [
      module_(
        "/src/core/validators/prototyping/foo.ts",
        "export function validateFoo({ root, config }: Options): Issue[] {\n  return validateBar(root);\n}",
      ),
    ]);
    expect(graph.isCalled("validateBar")).toBe(false);
  });

  it("does not count a call inside an unused generic helper", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return [];\n}"), [
      module_(
        "/src/core/validators/generic.ts",
        "export function unused<T extends object>(input: T): T {\n  validateFoo(input);\n  return input;\n}",
      ),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("does not count a default argument of a function nothing calls", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return [];\n}"), [
      module_(
        "/src/core/validators/defaults.ts",
        "export function unused(value = validateFoo(root)) {\n  return value;\n}",
      ),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("counts a default argument once the function itself is reachable", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return used();\n}"), [
      module_(
        "/src/core/validators/defaults.ts",
        "export function used(value = validateFoo(root)) {\n  return value;\n}",
      ),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(true);
  });

  it("does not treat a type-only alias as a runtime use", () => {
    const graph = buildWiringGraph(
      entry(
        'import type { validateFoo as FooValidator } from "./validators/index.js";\ntype Slot = FooValidator;\nexport function run(): Slot | undefined {\n  return undefined;\n}',
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("does not count a local re-export as wiring", () => {
    const graph = buildWiringGraph(
      entry(
        'import { validateFoo } from "./prototyping/foo.js";\nexport { validateFoo };\nexport function run() {\n  return [];\n}',
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("follows a delegation chain more than two modules deep", () => {
    const graph = buildWiringGraph(
      entry("export function run() {\n  return orchestrate(root);\n}"),
      [
        module_(
          "/src/core/validators/orchestrator.ts",
          "export function orchestrate(root) {\n  return helper(root);\n}",
        ),
        module_(
          "/src/core/validators/helper.ts",
          "export function helper(root) {\n  return validateFoo(root);\n}",
        ),
      ],
    );
    expect(graph.isCalled("validateFoo")).toBe(true);
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
