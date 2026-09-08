/**
 * How many messages the operator-message allowlist still records.
 *
 * `cliMessageLanguage.test.ts` holds that number against a literal, so a
 * translation lowers it and an addition raises it, and either way a reviewer is
 * shown the line. The list itself is compared against the sources entry by
 * entry; the count is the one thing a correct-looking edit cannot satisfy on
 * its own.
 *
 * The count is derived here rather than in the tool that writes it, for the
 * same reason the e2e callsite derivation is its own module: the guard and the
 * pin have to agree by construction. Two implementations of one measurement can
 * disagree, and then the guard measures the tool instead of the tree.
 *
 * The list is TypeScript, and the floor this repository supports is older than
 * Node's type stripping, so the module is parsed rather than imported. It is a
 * plain object literal of string arrays, which is what makes the parse a count
 * of elements rather than an interpretation.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

/** Where the allowlist lives, relative to the repository root. */
export const ALLOWLIST_REL = "packages/qfai/tests/unit/cliMessageLanguage.allowlist.ts";

/** Where the count is pinned, relative to the repository root. */
export const GUARD_REL = "packages/qfai/tests/unit/cliMessageLanguage.test.ts";

/** The exported name the allowlist module binds its list to. */
const EXPORTED_NAME = "SRC_JAPANESE_ALLOWLIST";

/** The pinned literal, captured so a re-pin rewrites the number and nothing else. */
export const COUNT_PIN = /(const ALLOWLISTED_MESSAGE_COUNT = )(\d+)(;)/;

/**
 * The number of entries the allowlist records, counted from the module itself.
 *
 * @param root the repository root
 */
export async function deriveAllowlistCount(root) {
  const allowlistPath = path.join(root, ...ALLOWLIST_REL.split("/"));
  const source = ts.createSourceFile(
    allowlistPath,
    await readFile(allowlistPath, "utf-8"),
    ts.ScriptTarget.Latest,
    true,
  );

  let literal;
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === EXPORTED_NAME
    ) {
      // The list carries a type annotation today. `as const` and `satisfies`
      // are the wrappers a list of this shape attracts, and neither changes
      // what it records.
      let initializer = node.initializer;
      while (
        initializer !== undefined &&
        (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer))
      ) {
        initializer = initializer.expression;
      }
      if (initializer !== undefined && ts.isObjectLiteralExpression(initializer)) {
        literal = initializer;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  if (literal === undefined) {
    throw new Error(
      `${ALLOWLIST_REL}: no \`${EXPORTED_NAME}\` object literal. The count is read off the list ` +
        "itself rather than a copy of it, so it cannot be derived without one.",
    );
  }

  let total = 0;
  for (const property of literal.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    if (!ts.isArrayLiteralExpression(property.initializer)) {
      // A file's entries are a list of lines. Anything else is a shape this
      // cannot count, and counting it as nothing would report a lower number
      // than the tree holds — which reads as progress.
      throw new Error(
        `${ALLOWLIST_REL}: \`${property.name.getText(source)}\` is not an array of lines. ` +
          "Every entry is one file's remaining messages, and a shape this cannot read would be " +
          "counted as none.",
      );
    }
    for (const element of property.initializer.elements) {
      if (ts.isSpreadElement(element)) {
        // A spread stands for however many lines its source holds, and that
        // count is not in this file. Reading it as one element writes a pin
        // below what the guard will measure at run time, so the command the
        // guard names would leave the suite failing. Refusing is the only
        // answer that cannot write a wrong number.
        throw new Error(
          `${ALLOWLIST_REL}: \`${property.name.getText(source)}\` spreads ` +
            `\`${element.expression.getText(source)}\`, and the count is read off the list ` +
            "itself. Write the lines it stands for, or count them somewhere this can read.",
        );
      }
      total += 1;
    }
  }
  return total;
}

/** The number the guard currently pins, read from its source. */
export async function recordedAllowlistCount(root) {
  const guardPath = path.join(root, ...GUARD_REL.split("/"));
  const match = COUNT_PIN.exec(await readFile(guardPath, "utf-8"));
  if (match?.[2] === undefined) {
    throw new Error(
      `${GUARD_REL}: no \`ALLOWLISTED_MESSAGE_COUNT\` literal. That line is the pin, so a guard ` +
        "without one holds the list to nothing.",
    );
  }
  return Number(match[2]);
}

/**
 * Why a re-pin must not be written, or `null` when it may be.
 *
 * Translating a message lowers the number, and so does a merge whose parents
 * each counted a smaller list than the two hold together. Raising it is the one
 * thing the guard exists to make visible: a branch that adds a Japanese message
 * and its allowlist entry satisfies every other assertion beside it, and a
 * re-pin that writes any measurement would carry it past this one too.
 *
 * A merge taking entries the base added does legitimately raise it, so this is
 * a refusal the caller can lift rather than a prohibition. What the lifting
 * buys is that the raise is a deliberate step and a reviewed line.
 */
export function rePinRefusal({ measured, recorded, allowIncrease }) {
  if (measured <= recorded || allowIncrease) {
    return null;
  }
  return (
    `${ALLOWLIST_REL} holds ${String(measured - recorded)} more entries than ${GUARD_REL} pins, so ` +
    "this writes nothing. The list records what is left to translate and is expected to shrink; " +
    "raising the pin is what lets a new Japanese message pass with its own allowlist entry. " +
    "Translate the messages the added entries name and delete them. Pass `--allow-increase` only " +
    "when the entries came from merging the base, and say so where the raised line is reviewed."
  );
}
