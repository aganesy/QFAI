/**
 * Unit tests for the wiring-guard text primitives.
 *
 * These pin the three shapes that used to satisfy the old raw-text guard
 * without any code calling anything: a doc comment, a string literal and a
 * barrel re-export. Each of them must read as "not invoked" here, or the
 * meta-test in `validators-are-wired.test.ts` goes back to being green for
 * validators nothing calls.
 */
import { describe, expect, it } from "vitest";

import {
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
