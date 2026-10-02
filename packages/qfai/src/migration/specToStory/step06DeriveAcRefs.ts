import { readIdMap, type MigrationIdMap } from "./idMap.js";
import { type MigrationContext, type MigrationOperation, type MigrationStep } from "./harness.js";
import { readMigrationPlan } from "./step04RenumberIds.js";
import {
  noReference,
  oldAcRefs,
  oldExRefs,
  readLegacyRows,
  readMigrationInput,
  repositoryRelative,
  storyExampleFile,
} from "./step05CasesToExamples.js";

/** The criteria the citing test-case rows name for each mapped example, and its old ID. */
type CitedExamples = Map<string, { specId: string; oldId: string; criteria: Set<string> }>;

async function citedExamples(
  context: MigrationContext,
  map: MigrationIdMap,
): Promise<CitedExamples> {
  const cited: CitedExamples = new Map();
  for (const row of await readLegacyRows(context, "06_Test-Cases.md")) {
    const oldExample = row.cells["EX-Ref"] ?? "";
    if (noReference(oldExample)) continue;
    for (const reference of oldExRefs(oldExample)) {
      const mappedExample = map.ids[row.specId]?.[reference];
      if (!mappedExample) continue;
      const found = cited.get(mappedExample) ?? {
        specId: row.specId,
        oldId: reference,
        criteria: new Set<string>(),
      };
      for (const criterion of oldAcRefs(row.cells["AC-Refs"] ?? "")) {
        const mapped = map.ids[row.specId]?.[criterion];
        if (mapped) found.criteria.add(mapped);
      }
      cited.set(mappedExample, found);
    }
  }
  return cited;
}

export const step06: MigrationStep = {
  number: 6,
  writeSet: ["qfai", "specs"],
  sections: ["For a person"],
  async plan(context) {
    const map = await readIdMap(context.root);
    if (!map) return { operations: [] };
    const cited = await citedExamples(context, map);
    // The plan is read only for an example whose citing rows do not name one criterion.
    let entries: Promise<Map<string, string>> | null = null;
    const entryCriterion = (specId: string, oldId: string): Promise<string | undefined> => {
      entries ??= readMigrationPlan(context).then(
        (plan) => new Map(plan?.examples.map((entry) => [entry.id, entry.criterion])),
      );
      return entries.then((byExample) => {
        const criterion = byExample.get(oldId);
        return criterion === undefined ? undefined : map.ids[specId]?.[criterion];
      });
    };
    const changed = new Map<string, string>();
    for (const [example, { specId, oldId, criteria }] of cited) {
      const file = storyExampleFile(context, example);
      const content = changed.get(file) ?? (await readMigrationInput(file));
      if (content === null) continue;
      const lines = content.split("\n");
      const rowIndex = lines.findIndex((line) =>
        new RegExp(`^\\|\\s*${example}\\s*\\|`).test(line),
      );
      if (rowIndex < 0) continue;
      const line = lines[rowIndex] ?? "";
      const currentRef = line.split("|")[2]?.trim() ?? "";
      if (currentRef && currentRef !== "—" && currentRef !== "-") continue;
      const criterion =
        criteria.size === 1 ? [...criteria][0] : await entryCriterion(specId, oldId);
      if (criterion === undefined) continue;
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
