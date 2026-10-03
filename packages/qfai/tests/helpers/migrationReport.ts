import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The directory every migration step writes its report files under, relative to the project
 * root and with forward slashes. A report file is not part of any tree a step is said to leave
 * unchanged, so a tree hash or a changed-file set leaves this directory out.
 */
export const MIGRATION_REPORT_DIR = ".qfai/evidence/migration-spec-to-story/report";

/** Whether a project-relative path (either separator) is the report directory or lies inside it. */
export function isMigrationReportPath(relative: string): boolean {
  const normalized = relative.replaceAll("\\", "/").replace(/^\.\//, "");
  return normalized === MIGRATION_REPORT_DIR || normalized.startsWith(`${MIGRATION_REPORT_DIR}/`);
}

/** The report files of one kind, `dry-run` or `run`, in name order, project-relative. */
export async function migrationReportFiles(
  root: string,
  kind: "dry-run" | "run",
  step?: number,
): Promise<string[]> {
  const directory = path.join(root, ...MIGRATION_REPORT_DIR.split("/"), kind);
  const names = await readdir(directory).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  });
  const prefix = step === undefined ? "step-" : `step-${String(step).padStart(2, "0")}-`;
  return names
    .filter((name) => name.startsWith(prefix) && name.endsWith(".md"))
    .sort()
    .map((name) => `${MIGRATION_REPORT_DIR}/${kind}/${name}`);
}

/** The text of one report file, given its project-relative path. */
export async function readMigrationReport(root: string, relative: string): Promise<string> {
  return await readFile(path.join(root, ...relative.split("/")), "utf8");
}

/**
 * Whether a project-relative directory only exists to hold the report directory: `.qfai`,
 * `.qfai/evidence` and `.qfai/evidence/migration-spec-to-story`. A hash that also covers directory
 * names leaves these out, because the first report file creates them on a project that had none.
 */
export function isMigrationReportAncestor(relative: string): boolean {
  const normalized = relative.replaceAll("\\", "/").replace(/^\.\//, "");
  return (
    normalized === ".qfai" ||
    normalized === ".qfai/evidence" ||
    normalized === ".qfai/evidence/migration-spec-to-story"
  );
}
