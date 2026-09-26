import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import ts from "typescript";

import {
  validateStoryTreeContractReferences,
  validateStoryTreeCoverageDepth,
  validateStoryTreeDrift,
  validateStoryTreeObligations,
  validateStoryTreeStructure,
} from "../../src/core/validators/index.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const validators = [
  { name: "validateStoryTreeStructure", module: "storyTreeStructure.js", profiles: ["sdd"] },
  {
    name: "validateStoryTreeContractReferences",
    module: "contractReferences.js",
    profiles: ["sdd"],
  },
  {
    name: "validateStoryTreeObligations",
    module: "storyTreeObligations.js",
    profiles: ["atdd", "tdd"],
  },
  {
    name: "validateStoryTreeCoverageDepth",
    module: "storyTreeCoverageDepth.js",
    profiles: ["atdd"],
  },
  { name: "validateStoryTreeDrift", module: "upstreamSsotGuard.js", profiles: ["tdd", "drift"] },
] as const;

async function source(relative: string): Promise<ts.SourceFile> {
  const body = await readFile(path.join(repoRoot, "packages/qfai/src/core", relative), "utf8");
  return ts.createSourceFile(relative, body, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function exportedNames(file: ts.SourceFile, module: string): string[] {
  return file.statements
    .filter(ts.isExportDeclaration)
    .filter(
      (entry) =>
        entry.moduleSpecifier &&
        ts.isStringLiteral(entry.moduleSpecifier) &&
        entry.moduleSpecifier.text === module,
    )
    .flatMap((entry) =>
      entry.exportClause && ts.isNamedExports(entry.exportClause)
        ? entry.exportClause.elements.map((item) => item.name.text)
        : [],
    );
}

function importedNames(file: ts.SourceFile, module: string): string[] {
  return file.statements
    .filter(ts.isImportDeclaration)
    .filter(
      (entry) => ts.isStringLiteral(entry.moduleSpecifier) && entry.moduleSpecifier.text === module,
    )
    .flatMap((entry) => {
      const bindings = entry.importClause?.namedBindings;
      return bindings && ts.isNamedImports(bindings)
        ? bindings.elements.map((item) => item.name.text)
        : [];
    });
}

function descendants<T extends ts.Node>(
  node: ts.Node,
  predicate: (candidate: ts.Node) => candidate is T,
): T[] {
  const found: T[] = [];
  function visit(current: ts.Node): void {
    if (predicate(current)) found.push(current);
    ts.forEachChild(current, visit);
  }
  visit(node);
  return found;
}

function calledNames(node: ts.Node): string[] {
  return descendants(node, ts.isCallExpression)
    .filter((call) => ts.isIdentifier(call.expression))
    .map((call) => call.expression.getText());
}

function profileBody(pipeline: ts.SourceFile, profile: string): ts.Node {
  const runner = pipeline.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === "runStoryProfileValidators",
  );
  if (!runner?.body) throw new Error("Missing story-tree profile runner");
  if (profile === "drift") {
    const clause = descendants(runner.body, ts.isCaseClause).find(
      (entry) => ts.isStringLiteral(entry.expression) && entry.expression.text === profile,
    );
    if (!clause) throw new Error("Missing drift profile clause");
    return clause;
  }
  const declaration = descendants(runner.body, ts.isVariableDeclaration).find(
    (entry) => ts.isIdentifier(entry.name) && entry.name.text === profile,
  );
  if (!declaration?.initializer) throw new Error(`Missing ${profile} profile body`);
  return declaration.initializer;
}

describe("BF-0001 story-tree validator registration", () => {
  it("exports, directly imports and invokes every current validator in its owning profile", async () => {
    // QFAI:EX-0001-0155-01
    const barrel = await source("validators/index.ts");
    const pipeline = await source("validate.ts");
    expect(
      [
        validateStoryTreeStructure,
        validateStoryTreeContractReferences,
        validateStoryTreeObligations,
        validateStoryTreeCoverageDepth,
        validateStoryTreeDrift,
      ].every((value) => typeof value === "function"),
    ).toBe(true);
    for (const validator of validators) {
      expect(exportedNames(barrel, `./${validator.module}`)).toContain(validator.name);
      expect(importedNames(pipeline, `./validators/${validator.module}`)).toContain(validator.name);
      for (const profile of validator.profiles) {
        expect(calledNames(profileBody(pipeline, profile))).toContain(validator.name);
      }
    }
    const runner = pipeline.statements.find(
      (node): node is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(node) && node.name?.text === "runStoryProfileValidators",
    );
    if (!runner?.body) throw new Error("Missing story-tree profile runner");
    const clauses = descendants(runner.body, ts.isCaseClause);
    expect(
      clauses.some(
        (entry) => ts.isStringLiteral(entry.expression) && entry.expression.text === "full",
      ),
    ).toBe(true);
    expect(
      clauses.some(
        (entry) => ts.isStringLiteral(entry.expression) && entry.expression.text === "verify",
      ),
    ).toBe(true);
    const composite = clauses.find(
      (entry) => ts.isStringLiteral(entry.expression) && entry.expression.text === "full",
    );
    if (!composite) throw new Error("Missing full profile clause");
    expect(calledNames(composite)).toEqual(expect.arrayContaining(["sdd", "atdd", "tdd"]));
  });
});
