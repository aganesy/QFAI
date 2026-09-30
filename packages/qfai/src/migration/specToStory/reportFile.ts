import { lstat, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../../core/fs/errno.js";
import type { MigrationStepNumber } from "./harness.js";

/** The directory holding the report of every step run, relative to the project root. */
export const REPORT_DIR = ".qfai/evidence/migration-spec-to-story/report";

type Sink = { write(value: string): unknown };
type OutputSinks = { stdout: Sink; stderr: Sink };

/** Sinks that pass every write to `io` and remember what each stream received. */
export function captureOutput(io: OutputSinks): {
  io: OutputSinks;
  stdout(): string;
  stderr(): string;
} {
  let out = "";
  let err = "";
  return {
    io: {
      stdout: {
        write(value) {
          out += value;
          return io.stdout.write(value);
        },
      },
      stderr: {
        write(value) {
          err += value;
          return io.stderr.write(value);
        },
      },
    },
    stdout: () => out,
    stderr: () => err,
  };
}

async function nextNumber(directory: string, prefix: string): Promise<number> {
  const names = await readdir(directory).catch((error: unknown) => {
    if (isEnoent(error)) return [] as string[];
    throw error;
  });
  let highest = 0;
  for (const name of names) {
    if (!name.startsWith(prefix) || !name.endsWith(".md")) continue;
    const digits = name.slice(prefix.length, -".md".length);
    if (/^[0-9]{3}$/.test(digits)) highest = Math.max(highest, Number(digits));
  }
  return highest + 1;
}

/** The first directory below the root on the way to `directory` that is a symbolic link, if any. */
async function firstSymlink(root: string, directory: string): Promise<string | null> {
  let current = root;
  for (const part of path.relative(root, directory).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stats = await lstat(current).catch((error: unknown) => {
      if (isEnoent(error)) return null;
      throw error;
    });
    if (stats === null) return null;
    if (stats.isSymbolicLink()) return current;
  }
  return null;
}

/**
 * Keeps one run's report: what it printed on standard output, then on standard
 * error, then its exit code. The file is new and numbered after the step's
 * earlier ones, so no report is overwritten. A report directory reached through
 * a symbolic link is refused, and the refusal is returned as text.
 */
export async function writeReportFile(
  root: string,
  step: MigrationStepNumber,
  dryRun: boolean,
  printed: { stdout: string; stderr: string },
  code: number,
): Promise<string | null> {
  const directory = path.join(root, ...REPORT_DIR.split("/"), dryRun ? "dry-run" : "run");
  const prefix = `step-${String(step).padStart(2, "0")}-`;
  const link = await firstSymlink(root, directory);
  if (link !== null) return `The report was not written: ${link} is a symbolic link.\n`;
  await mkdir(directory, { recursive: true });
  const number = String(await nextNumber(directory, prefix)).padStart(3, "0");
  const text = `${printed.stdout}${printed.stderr}`;
  const separator = text === "" || text.endsWith("\n") ? "" : "\n";
  await writeFile(
    path.join(directory, `${prefix}${number}.md`),
    `${text}${separator}\nExit code: ${code}\n`,
    { flag: "wx" },
  );
  return null;
}
