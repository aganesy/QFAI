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
  collectModuleBindings,
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

  it("does not see an object key that merely repeats a validator name", () => {
    expect(namesUsedIn("const registry = { validateFoo: noop };").has("validateFoo")).toBe(false);
    expect(namesUsedIn("const registry = { a: 1, validateFoo: noop };").has("validateFoo")).toBe(
      false,
    );
  });

  it("does not see a property declared in a class body", () => {
    const names = namesUsedIn(
      ["class Registry {", "  ready = true;", "  validateFoo: Validator;", "}"].join("\n"),
    );
    expect(names.has("validateFoo")).toBe(false);
  });

  it("does not see a name that lives only in the type domain", () => {
    expect(namesUsedIn("type Slot = typeof validateFoo;").has("validateFoo")).toBe(false);
    expect(
      namesUsedIn(
        ["export interface Registry {", "  slot: typeof validateFoo;", "}"].join("\n"),
      ).has("validateFoo"),
    ).toBe(false);
  });

  it("still sees a validator handed in as the value of a property", () => {
    expect(namesUsedIn("const registry = { foo: validateFoo };").has("validateFoo")).toBe(true);
    expect(namesUsedIn("const registry = { validateFoo };").has("validateFoo")).toBe(true);
  });

  it("still sees a validator picked by a ternary", () => {
    expect(namesUsedIn("const fn = strict ? validateFoo : noop;").has("validateFoo")).toBe(true);
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

  it("does not count a call made from an entry orchestrator nothing calls", () => {
    // The failure this guard exists for: delete the call to the orchestrator
    // and every validator it names must go back to reading as unwired.
    const graph = buildWiringGraph(
      entry(
        [
          'import { validateFoo } from "./validators/index.js";',
          "export function run() {",
          "  return [];",
          "}",
          "async function runPrototypingValidators(root) {",
          "  return validateFoo(root);",
          "}",
        ].join("\n"),
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("counts a call made from an entry orchestrator the exported entry point reaches", () => {
    const graph = buildWiringGraph(
      entry(
        [
          'import { validateFoo } from "./validators/index.js";',
          "export function run(root) {",
          "  return runPrototypingValidators(root);",
          "}",
          "async function runPrototypingValidators(root) {",
          "  return validateFoo(root);",
          "}",
        ].join("\n"),
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateFoo")).toBe(true);
  });

  it("does not count a call in an expression-bodied arrow nothing calls", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return [];\n}"), [
      module_("/src/core/validators/concise.ts", "export const unused = () => validateFoo(root);"),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("counts an expression-bodied arrow once something calls it", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return used(root);\n}"), [
      module_(
        "/src/core/validators/concise.ts",
        "export const used = (root) => validateFoo(root);",
      ),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(true);
  });

  it("keeps same-named helpers in two modules apart", () => {
    // A call to the reachable module's `helper` must not drag in the dead
    // module's identically named `helper`.
    const graph = buildWiringGraph(
      entry(
        [
          'import { reachable } from "./validators/live.js";',
          "export function run(root) {",
          "  return reachable(root);",
          "}",
        ].join("\n"),
      ),
      [
        module_(
          "/src/core/validators/live.ts",
          "export function reachable(root) {\n  return helper(root);\n}\nfunction helper(root) {\n  return [];\n}",
        ),
        module_(
          "/src/core/validators/dead.ts",
          "export function unreachable(root) {\n  return helper(root);\n}\nfunction helper(root) {\n  return validateFoo(root);\n}",
        ),
      ],
    );
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("does not count a call inside a nested helper the enclosing function never calls", () => {
    // The shape `validate.ts` actually has: `runProfileOwnValidators` lives
    // inside `runProfileValidators`. Reaching the outer function must not admit
    // an inner body nothing invokes, or deleting the inner call would go unseen.
    const graph = buildWiringGraph(
      entry(
        [
          'import { validateFoo } from "./validators/index.js";',
          "export function run(root) {",
          "  async function runOwnValidators(target) {",
          "    return validateFoo(target);",
          "  }",
          "  return [];",
          "}",
        ].join("\n"),
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("counts a call inside a nested helper the enclosing function does call", () => {
    const graph = buildWiringGraph(
      entry(
        [
          'import { validateFoo } from "./validators/index.js";',
          "export function run(root) {",
          "  async function runOwnValidators(target) {",
          "    return validateFoo(target);",
          "  }",
          "  return runOwnValidators(root);",
          "}",
        ].join("\n"),
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateFoo")).toBe(true);
  });

  it("does not count a call inside a nested arrow the enclosing function never calls", () => {
    const graph = buildWiringGraph(
      entry(
        [
          "export function run(root) {",
          "  const runOwn = (target) => validateFoo(target);",
          "  return [];",
          "}",
        ].join("\n"),
      ),
      [BARREL],
    );
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("does not count a call inside an unused function with a union return type", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return [];\n}"), [
      module_(
        "/src/core/validators/shapes.ts",
        "export function unused(): { ok: boolean } | null {\n  return validateFoo(root);\n}",
      ),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("does not count a call inside an unused function with a generic object return type", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return [];\n}"), [
      module_(
        "/src/core/validators/shapes.ts",
        "export async function unused(): Promise<{ ok: boolean } | null> {\n  validateFoo(root);\n  return null;\n}",
      ),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(false);
  });

  it("counts a call inside a reachable function with a union return type", () => {
    const graph = buildWiringGraph(entry("export function run() {\n  return unused();\n}"), [
      module_(
        "/src/core/validators/shapes.ts",
        "export function unused(): { ok: boolean } | null {\n  return validateFoo(root);\n}",
      ),
    ]);
    expect(graph.isCalled("validateFoo")).toBe(true);
  });

  it("still resolves a call that carries no import edge at all", () => {
    const graph = buildWiringGraph(
      entry("export function run(root) {\n  return helper(root);\n}"),
      [
        module_(
          "/src/core/validators/helper.ts",
          "export function helper(root) {\n  return validateFoo(root);\n}",
        ),
      ],
    );
    expect(graph.isCalled("validateFoo")).toBe(true);
  });
});

describe("collectModuleBindings", () => {
  it("ignores type-only import and export edges", () => {
    const bindings = collectModuleBindings(
      ['import type { Issue } from "./types.js";', 'export type { Issue } from "./types.js";'].join(
        "\n",
      ),
    );
    expect(bindings.runtimeSpecifiers).toEqual([]);
  });

  it("ignores an edge whose named specifiers are all inline type-only", () => {
    const bindings = collectModuleBindings(
      [
        'import { type Issue } from "./dead.js";',
        'export { type Issue as Alias } from "./dead2.js";',
      ].join("\n"),
    );
    expect(bindings.runtimeSpecifiers).toEqual([]);
  });

  it("keeps an edge that mixes an inline type specifier with a value one", () => {
    const bindings = collectModuleBindings('import { type Issue, validateFoo } from "./foo.js";');
    expect(bindings.runtimeSpecifiers).toEqual(["./foo.js"]);
    expect(bindings.imports.get("validateFoo")?.imported).toBe("validateFoo");
  });

  it("keeps an edge whose only runtime binding sits outside the braces", () => {
    const bindings = collectModuleBindings('import fs, { type Stats } from "./fs.js";');
    expect(bindings.runtimeSpecifiers).toEqual(["./fs.js"]);
  });

  it("keeps an empty named clause, which still evaluates the module", () => {
    const bindings = collectModuleBindings('import {} from "./register.js";');
    expect(bindings.runtimeSpecifiers).toEqual(["./register.js"]);
  });

  it("ignores a specifier written in a comment or inside a template literal", () => {
    const bindings = collectModuleBindings(
      [
        '// import { a } from "./commented.js";',
        "const sample = `",
        'import { b } from "./templated.js";',
        "`;",
        'import { c } from "./real.js";',
      ].join("\n"),
    );
    expect(bindings.runtimeSpecifiers).toEqual(["./real.js"]);
  });

  it("keeps value imports, side-effect imports and re-export edges", () => {
    const bindings = collectModuleBindings(
      [
        'import { validateFoo as runFoo } from "./foo.js";',
        'import "./register.js";',
        'export { validateBar } from "./bar.js";',
      ].join("\n"),
    );
    expect(bindings.runtimeSpecifiers.sort()).toEqual(["./bar.js", "./foo.js", "./register.js"]);
    expect(bindings.imports.get("runFoo")).toEqual({
      specifier: "./foo.js",
      imported: "validateFoo",
    });
    expect(bindings.reexports.get("validateBar")).toEqual({
      specifier: "./bar.js",
      imported: "validateBar",
    });
  });

  it("does not mistake a declaration that starts a line for an import clause", () => {
    const bindings = collectModuleBindings(
      [
        "export interface Options {",
        "  root: string;",
        "}",
        'import { validateFoo } from "./foo.js";',
      ].join("\n"),
    );
    expect(bindings.runtimeSpecifiers).toEqual(["./foo.js"]);
    expect(bindings.imports.get("validateFoo")?.imported).toBe("validateFoo");
  });
});
