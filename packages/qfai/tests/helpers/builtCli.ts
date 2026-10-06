import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "../..");
const BUILD_COMMAND = "pnpm -C packages/qfai build";
const BUILD_INPUTS = ["package.json", "tsup.config.ts", "tsconfig.build.json"];

function newestSource(packageRoot: string): { file: string; mtimeMs: number } | undefined {
  const sourceDir = path.join(packageRoot, "src");
  const files = readdirSync(sourceDir, { recursive: true })
    .map((entry) => path.join(sourceDir, String(entry)))
    .filter((file) => file.endsWith(".ts"))
    .concat(BUILD_INPUTS.map((name) => path.join(packageRoot, name)));
  let newest: { file: string; mtimeMs: number } | undefined;
  for (const file of files) {
    const { mtimeMs } = statSync(file);
    if (newest === undefined || mtimeMs > newest.mtimeMs) {
      newest = { file, mtimeMs };
    }
  }
  return newest;
}

/**
 * Says why the built CLI cannot be trusted: it is missing, or a source file is newer than it.
 * Returns undefined when the build is current.
 */
export function describeBuiltCliProblem(
  cliPath: string,
  packageRoot: string = PACKAGE_ROOT,
): string | undefined {
  let builtAt: number;
  try {
    builtAt = statSync(cliPath).mtimeMs;
  } catch {
    return `The built CLI is missing (${cliPath}). Build it, then run the tests again: ${BUILD_COMMAND}`;
  }
  const newest = newestSource(packageRoot);
  if (newest !== undefined && newest.mtimeMs > builtAt) {
    return `The built CLI is older than ${path.relative(packageRoot, newest.file)} (${cliPath}). Rebuild it, then run the tests again: ${BUILD_COMMAND}`;
  }
  return undefined;
}

/** Fails the test file at load, once, naming the stale or missing build and the command that refreshes it. */
export function assertBuiltCliFresh(cliPath: string): void {
  const problem = describeBuiltCliProblem(cliPath);
  if (problem !== undefined) {
    throw new Error(problem);
  }
}
