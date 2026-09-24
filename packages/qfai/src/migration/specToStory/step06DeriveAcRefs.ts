import { readIdMap } from "./idMap.js";
import { type MigrationOperation, type MigrationStep } from "./harness.js";
import {
  noReference,
  oldAcRefs,
  oldExRefs,
  readLegacyRows,
  readMigrationInput,
  repositoryRelative,
  storyExampleFile,
} from "./step05CasesToExamples.js";

export const step06: MigrationStep = {
  number: 6,
  writeSet: ["qfai", "specs"],
  sections: ["For a person"],
  async plan(context) {
    const map = await readIdMap(context.root);
    if (!map) return { operations: [] };
    const cases = await readLegacyRows(context, "06_Test-Cases.md");
    const criteriaByExample = new Map<string, Set<string>>();
    for (const row of cases) {
      const oldExample = row.cells["EX-Ref"] ?? "";
      if (noReference(oldExample)) continue;
      for (const reference of oldExRefs(oldExample)) {
        const mappedExample = map.ids[row.specId]?.[reference];
        if (!mappedExample) continue;
        const found = criteriaByExample.get(mappedExample) ?? new Set<string>();
        for (const criterion of oldAcRefs(row.cells["AC-Refs"] ?? "")) {
          const mapped = map.ids[row.specId]?.[criterion];
          if (mapped) found.add(mapped);
        }
        criteriaByExample.set(mappedExample, found);
      }
    }
    const changed = new Map<string, string>();
    for (const [example, criteria] of criteriaByExample) {
      if (criteria.size !== 1) continue;
      const file = storyExampleFile(context, example);
      const content = changed.get(file) ?? (await readMigrationInput(file));
      if (content === null) continue;
      const criterion = [...criteria][0] ?? "";
      const lines = content.split("\n");
      const rowIndex = lines.findIndex((line) =>
        new RegExp(`^\\|\\s*${example}\\s*\\|`).test(line),
      );
      if (rowIndex < 0) continue;
      const line = lines[rowIndex] ?? "";
      const updated = line.replace(
        new RegExp(`^(\\|\\s*${example}\\s*\\|)\\s*[^|]*\\|`),
        `$1 ${criterion} |`,
      );
      if (updated !== line) {
        lines[rowIndex] = updated;
        changed.set(file, lines.join("\n"));
      }
    }
    const operations: MigrationOperation[] = [...changed].map(([file, content]) => ({
      kind: "write",
      target: repositoryRelative(context.root, file),
      content,
    }));
    return { operations, forAPerson: [] };
  },
};
