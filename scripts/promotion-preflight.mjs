/**
 * The findings that become build failures at the next promotion release.
 *
 * A rule that ships inside a promotion window is reported at `warning` until
 * the release named in `RULE_PROMOTIONS`, and at `error` from then on. The
 * severity follows the version of the `qfai` that is running, so a pin is only
 * ever observed on the release where it takes effect — which is the release it
 * blocks. `verify:pack` validates a fresh sandbox with `--fail-on error`, so a
 * window that closes over a finding the sandbox produces turns that release's
 * own gate red.
 *
 * This reads the sandbox's findings and reports the ones a promotion is about
 * to escalate, so the failure lands on the change that introduces it.
 *
 * **No version comparison happens here.** A finding reported at `warning` whose
 * code carries a promotion is inside an open window by construction: that is
 * what `newRuleSeverity` returns for it, and it is the only thing that returns
 * it. Re-deciding the same question would be a second implementation of the
 * rule, free to disagree with the one the tool ran.
 */
import { readFile } from "node:fs/promises";

import ts from "typescript";

/** Where the promotion ledger lives, relative to the repository root. */
export const LEDGER_REL = "packages/qfai/src/core/sunset.ts";

/** The finding code an entry's doc comment names first, in backticks. */
const CODE_IN_DOC = /`(QFAI-[A-Z0-9-]+|[A-Z][A-Z0-9_]+)`/;

/** The leading block comment of `node`, or an empty string. */
function docCommentOf(node, source) {
  const text = source.getFullText();
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  return ranges.map((range) => text.slice(range.pos, range.end)).join("\n");
}

/**
 * `{ key, code, promoteAt }` for every entry of `RULE_PROMOTIONS`.
 *
 * Read from the declaration rather than from a copy: the ledger is the only
 * statement of which codes are inside a window, and a list maintained beside it
 * would be a second one. Parsed rather than imported because the ledger is
 * TypeScript, and the package does not re-export it — a gate that needed it
 * exported would widen the published surface to serve a build step.
 *
 * The code comes from the entry's own doc comment, which is where the ledger
 * states it and where `sunsetLedger.test.ts` already requires it to be. A
 * string field beside `promoteAt` would read, to every guard that scans a
 * module for code literals, as this file emitting all of them.
 */
export async function readRulePromotions(ledgerPath) {
  const source = ts.createSourceFile(
    ledgerPath,
    await readFile(ledgerPath, "utf-8"),
    ts.ScriptTarget.Latest,
    true,
  );

  let literal;
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "RULE_PROMOTIONS"
    ) {
      const initializer = ts.isAsExpression(node.initializer ?? node)
        ? node.initializer.expression
        : node.initializer;
      if (initializer !== undefined && ts.isObjectLiteralExpression(initializer)) {
        literal = initializer;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  if (literal === undefined) {
    throw new Error(
      `${LEDGER_REL}: no \`RULE_PROMOTIONS\` object literal. The promotion preflight reads the ` +
        "ledger itself rather than a copy of it, so it cannot proceed without one.",
    );
  }

  const entries = [];
  for (const property of literal.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isObjectLiteralExpression(property.initializer)) {
      continue;
    }
    const key = property.name.getText(source);
    const fields = {};
    for (const field of property.initializer.properties) {
      if (ts.isPropertyAssignment(field) && ts.isStringLiteral(field.initializer)) {
        fields[field.name.getText(source)] = field.initializer.text;
      }
    }
    const code = CODE_IN_DOC.exec(docCommentOf(property, source))?.[1];
    if (code === undefined || typeof fields.promoteAt !== "string") {
      throw new Error(
        `${LEDGER_REL}: \`RULE_PROMOTIONS.${key}\` states no code in its doc comment, or no ` +
          "`promoteAt`. Every entry carries both, so a finding can be followed to the window " +
          "that governs it.",
      );
    }
    entries.push({ key, code, promoteAt: fields.promoteAt });
  }
  return entries;
}

/**
 * The reported findings a promotion is about to turn into errors.
 *
 * Only `warning` findings qualify. One already at `error` is failing the gate
 * today and needs no forecast, and an `info` one carries no promotion.
 */
export function findingsAwaitingPromotion(issues, promotions) {
  const windows = new Map(promotions.map((entry) => [entry.code, entry]));
  return issues
    .filter((issue) => issue?.severity === "warning" && windows.has(issue.code))
    .map((issue) => ({
      code: issue.code,
      file: typeof issue.file === "string" && issue.file.length > 0 ? issue.file : "-",
      promoteAt: windows.get(issue.code).promoteAt,
      key: windows.get(issue.code).key,
    }));
}

/** What to print when the sandbox holds findings a promotion will escalate. */
export function formatAwaitingPromotion(pending) {
  const lines = pending
    .map((entry) => `  ${entry.code} ${entry.file} — error from ${entry.promoteAt} (${entry.key})`)
    .sort();
  return (
    `the sandbox holds ${String(pending.length)} finding(s) that become errors at a release ` +
    "this gate has to pass:\n" +
    `${lines.join("\n")}\n` +
    "Each is a warning today and a build failure once its window closes. Fix the condition, or " +
    "move the pin, before the release that closes it."
  );
}
