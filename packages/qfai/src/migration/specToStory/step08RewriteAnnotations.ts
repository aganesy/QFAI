import { createTestLayerRoots, resolveTestKind } from "../../core/atddTraceability.js";
import { collectFilesByGlobs } from "../../core/fs.js";
import { readIdMap } from "./idMap.js";
import { MigrationInputError, type MigrationOperation, type MigrationStep } from "./harness.js";
import { readMigrationInput, repositoryRelative } from "./step05CasesToExamples.js";

const LEGACY_ANNOTATION = /\bQFAI:SPEC-(\d{4}):([A-Z]+-\d{4}(?:-\d{4})?)(?![\d-])/g;
const CONTRACT_ANNOTATION = /\bQFAI:CON-[A-Za-z0-9:-]+/g;
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

export const step08: MigrationStep = {
  number: 8,
  writeSet: ["test-annotations"],
  sections: ["For a person", "Annotations kept"],
  async plan(context) {
    const map = await readIdMap(context.root);
    if (!map) return { operations: [] };
    const globs = context.config.validation.traceability.testFileGlobs;
    let selected: Awaited<ReturnType<typeof collectFilesByGlobs>>;
    try {
      selected = await collectFilesByGlobs(context.root, {
        globs,
        ignore: context.config.validation.traceability.testFileExcludeGlobs,
        limit: FILE_LIMIT,
      });
    } catch (error) {
      throw new MigrationInputError(`Cannot select test files: ${String(error)}`);
    }
    if (selected.truncated)
      throw new MigrationInputError(`Test selection exceeds ${FILE_LIMIT} files`);
    const roots = createTestLayerRoots(context.root, context.config);
    const forAPerson: string[] = [];
    const annotationsKept: string[] = [];
    const operations: MigrationOperation[] = [];
    const annotationTargets = selected.files.map((file) => repositoryRelative(context.root, file));
    for (const file of selected.files.sort()) {
      const original = await readMigrationInput(file);
      if (original === null)
        throw new MigrationInputError(`Cannot read selected test file ${file}`);
      const isE2e = resolveTestKind(file, roots) === "e2e";
      const changedLines = original.split("\n").map((line, index) => {
        const location = `${repositoryRelative(context.root, file)}:${index + 1}`;
        for (const match of line.matchAll(CONTRACT_ANNOTATION))
          annotationsKept.push(`${location}: ${match[0]}`);
        for (const match of line.matchAll(DEFERRAL))
          annotationsKept.push(`${location}: ${match[0]}`);
        return line.replace(LEGACY_ANNOTATION, (whole, packNumber: string, oldId: string) => {
          if (oldId.startsWith("US-") && !isE2e) {
            annotationsKept.push(`${location}: ${whole}`);
            return whole;
          }
          const mapped = map.ids[`spec-${packNumber}`]?.[oldId];
          if (oldId.startsWith("TC-") && mapped?.startsWith("EX-")) return `QFAI:${mapped}`;
          if (oldId.startsWith("US-") && isE2e && mapped?.startsWith("US-"))
            return `QFAI:BF-${mapped.slice(3, 7)}`;
          forAPerson.push(`${location}: ${whole}: no usable ID mapping`);
          return whole;
        });
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
