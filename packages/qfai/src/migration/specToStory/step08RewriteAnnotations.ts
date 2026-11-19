import { createTestLayerRoots, resolveTestKind } from "../../core/atddTraceability.js";
import { collectFilesByGlobs } from "../../core/fs.js";
import { normalizeGlobs } from "../../core/traceability.js";
import { commentSpanTest } from "./annotationComments.js";
import { oldContractIds, readIdMap } from "./idMap.js";
import { MigrationInputError, type MigrationOperation, type MigrationStep } from "./harness.js";
import { readMigrationInput, repositoryRelative } from "./step05CasesToExamples.js";

/** A legacy case or story annotation (groups 1 and 2), or a legacy contract annotation (group 3). */
const ANNOTATION =
  /\bQFAI:(?:SPEC-(\d{4}):([A-Z]+-\d{4}(?:-\d{4})?)(?![\d-])|(CON-(?:API|DB|UI)-\d+)(?![\w-]))/g;
const DEFERRAL = /\bx-qfai-status:\s*(?:planned|external)\b/g;
const FILE_LIMIT = 200_000;

function lineItems(content: string, pattern: RegExp, file: string, root: string): string[] {
  const items: string[] = [];
  content.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(pattern))
      items.push(`${repositoryRelative(root, file)}:${index + 1}: ${match[0]}`);
  });
  return items;
}

/** What a person does with a test-case annotation that stays in a file of the E2E layer. */
function e2eExampleItem(example: string): string {
  return `maps to ${example}, and an example annotation is not allowed in the E2E layer; annotate ${example} in a test outside the E2E layer, or add a decisions.md row whose Content is "Test exception: ${example}" and whose Approach holds the reason; then delete this annotation`;
}

export const step08: MigrationStep = {
  number: 8,
  writeSet: ["test-annotations"],
  sections: ["For a person", "Annotations kept"],
  async plan(context) {
    const map = await readIdMap(context.root);
    if (!map) return { operations: [] };
    const globs = normalizeGlobs(context.config.validation.traceability.testFileGlobs);
    let selected: Awaited<ReturnType<typeof collectFilesByGlobs>>;
    try {
      selected = await collectFilesByGlobs(context.root, {
        globs,
        ignore: normalizeGlobs(context.config.validation.traceability.testFileExcludeGlobs),
        limit: FILE_LIMIT,
      });
    } catch (error) {
      throw new MigrationInputError(`Cannot select test files: ${String(error)}`);
    }
    if (selected.truncated)
      throw new MigrationInputError(`Test selection exceeds ${FILE_LIMIT} files`);
    const roots = createTestLayerRoots(context.root, context.config);
    const contractIds = oldContractIds(map.contracts);
    const forAPerson: string[] = [];
    const annotationsKept: string[] = [];
    const operations: MigrationOperation[] = [];
    const annotationTargets = selected.files.map((file) => repositoryRelative(context.root, file));
    for (const file of selected.files.sort()) {
      const original = await readMigrationInput(file);
      if (original === null)
        throw new MigrationInputError(`Cannot read selected test file ${file}`);
      const isE2e = resolveTestKind(file, roots) === "e2e";
      const inComment = commentSpanTest(original);
      let lineStart = 0;
      const changedLines = original.split("\n").map((line, index) => {
        const location = `${repositoryRelative(context.root, file)}:${index + 1}`;
        const offset = lineStart;
        lineStart += line.length + 1;
        for (const match of line.matchAll(DEFERRAL))
          annotationsKept.push(`${location}: ${match[0]}`);
        const contract = (whole: string, oldId: string): string => {
          const mapped = contractIds[oldId];
          if (mapped) return `QFAI:${mapped}`;
          forAPerson.push(`${location}: ${whole}: no contract declares ${oldId}`);
          return whole;
        };
        const legacy = (whole: string, packNumber: string, oldId: string): string => {
          if (oldId.startsWith("US-") && !isE2e) {
            annotationsKept.push(`${location}: ${whole}`);
            return whole;
          }
          const mapped = map.ids[`spec-${packNumber}`]?.[oldId];
          if (oldId.startsWith("TC-") && mapped?.startsWith("EX-")) {
            if (!isE2e) return `QFAI:${mapped}`;
            forAPerson.push(`${location}: ${whole}: ${e2eExampleItem(mapped)}`);
            return whole;
          }
          if (oldId.startsWith("US-") && isE2e && mapped?.startsWith("US-"))
            return `QFAI:BF-${mapped.slice(3, 7)}`;
          forAPerson.push(`${location}: ${whole}: no usable ID mapping`);
          return whole;
        };
        let rewritten = "";
        let copied = 0;
        for (const match of line.matchAll(ANNOTATION)) {
          const [whole, packNumber, oldId, contractId] = match;
          // The same token in a string literal is test data: rewriting it changes what the test checks.
          if (!inComment(offset + match.index, whole.length)) continue;
          const replacement = contractId
            ? contract(whole, contractId)
            : legacy(whole, packNumber ?? "", oldId ?? "");
          rewritten += line.slice(copied, match.index) + replacement;
          copied = match.index + whole.length;
        }
        return rewritten + line.slice(copied);
      });
      const updated = changedLines.join("\n");
      if (updated !== original)
        operations.push({
          kind: "write",
          target: repositoryRelative(context.root, file),
          content: updated,
        });
    }
    let specificationFiles: Awaited<ReturnType<typeof collectFilesByGlobs>>;
    try {
      specificationFiles = await collectFilesByGlobs(context.specsDir, {
        globs: ["**/*.md"],
        limit: FILE_LIMIT,
      });
    } catch (error) {
      throw new MigrationInputError(`Cannot select specification files: ${String(error)}`);
    }
    if (specificationFiles.truncated)
      throw new MigrationInputError(`Specification scan exceeds ${FILE_LIMIT} files`);
    for (const file of specificationFiles.files.sort()) {
      const content = await readMigrationInput(file);
      if (content === null) continue;
      annotationsKept.push(...lineItems(content, DEFERRAL, file, context.root));
    }
    return { operations, annotationTargets, forAPerson, annotationsKept };
  },
};
