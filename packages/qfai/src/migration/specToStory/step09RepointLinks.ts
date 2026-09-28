import { repairIntegrationWrappers } from "../../cli/commands/init.js";
import { MigrationInputError, type MigrationStep } from "./harness.js";

const WOULD_RELINK = "  would relink ";
const LEFT_ALONE = "  left alone ";
const MIGRATION_REPAIR = { includeMissing: true } as const;

function leftAlonePath(line: string): string {
  const end = line.indexOf(": ", LEFT_ALONE.length);
  return line.slice(LEFT_ALONE.length, end < 0 ? undefined : end);
}

export const step09: MigrationStep = {
  number: 9,
  writeSet: ["links"],
  sections: ["For a person"],
  async plan(context) {
    const targets: string[] = [];
    const forAPerson: string[] = [];
    const occupied = new Set<string>();
    const refusals: string[] = [];
    try {
      await repairIntegrationWrappers(
        context.root,
        true,
        (line) => {
          if (line.startsWith(WOULD_RELINK)) targets.push(line.slice(WOULD_RELINK.length));
          if (line.startsWith(LEFT_ALONE)) {
            occupied.add(leftAlonePath(line));
            forAPerson.push(line.trim());
          }
          if (
            line.includes("wrappers could not be inspected") ||
            line.startsWith("  could not relink ")
          )
            refusals.push(line.trim());
        },
        MIGRATION_REPAIR,
      );
    } catch (error) {
      if (error !== null && typeof error === "object" && "code" in error) {
        const detail = error instanceof Error ? error.message : "filesystem access failed";
        throw new MigrationInputError(`Cannot inspect integration wrappers: ${detail}`);
      }
      throw error;
    }
    if (refusals.length > 0) {
      throw new MigrationInputError(`Cannot repoint integration links: ${refusals.join("; ")}`);
    }
    const first = targets[0];
    if (first === undefined) return { operations: [], forAPerson };
    return {
      forAPerson,
      operations: [
        {
          kind: "delegate",
          target: first,
          targets,
          description: "repoint host integration link",
          apply: async () => {
            const failures: string[] = [];
            await repairIntegrationWrappers(
              context.root,
              false,
              (line) => {
                if (
                  line.includes("wrappers could not be inspected") ||
                  line.startsWith("  could not relink ")
                )
                  failures.push(line.trim());
                if (line.startsWith(LEFT_ALONE) && !occupied.has(leftAlonePath(line))) {
                  failures.push(line.trim());
                }
              },
              { ...MIGRATION_REPAIR, onlyRelative: new Set(targets) },
            );
            if (failures.length > 0) {
              throw new Error(`Integration link repair did not complete: ${failures.join("; ")}`);
            }
          },
        },
      ],
    };
  },
};
