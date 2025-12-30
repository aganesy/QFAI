import { readdir } from "node:fs/promises";
import path from "node:path";

const SPEC_DIR_RE = /^spec-\d{4}$/;

export type SpecEntry = {
  dir: string;
  specPath: string;
  deltaPath: string;
  scenarioPath: string;
};

export async function collectSpecEntries(
  specsRoot: string,
): Promise<SpecEntry[]> {
  const dirs = await listSpecDirs(specsRoot);
  const entries = dirs.map((dir) => ({
    dir,
    specPath: path.join(dir, "spec.md"),
    deltaPath: path.join(dir, "delta.md"),
    scenarioPath: path.join(dir, "scenario.md"),
  }));
  return entries.sort((a, b) => a.dir.localeCompare(b.dir));
}

async function listSpecDirs(specsRoot: string): Promise<string[]> {
  try {
    const items = await readdir(specsRoot, { withFileTypes: true });
    return items
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .filter((name) => SPEC_DIR_RE.test(name.toLowerCase()))
      .map((name) => path.join(specsRoot, name));
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as { code?: string }).code === "ENOENT";
}
