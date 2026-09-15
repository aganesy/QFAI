/**
 * The runner projects as the workspace declares them, read as text.
 *
 * Two gates ask the same question of that file — which globs a project
 * collects, and how many test files each names — and a second parser beside the
 * first is two answers to one question: they differed already, one throwing on
 * a glob shape it could not read where the other passed it over.
 *
 * `vitest.workspace.ts` carries the two shapes this depends on, and says so in
 * its own comment: every project's `name` is a string literal, and its
 * `include` follows the name.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKSPACE = path.join(PACKAGE_ROOT, "vitest.workspace.ts");

/**
 * A capture group the pattern declares, or a throw.
 *
 * An absent group is a pattern that no longer matches what the caller reads,
 * which is a defect in the check rather than a value to compare.
 */
function group(match: RegExpMatchArray | RegExpExecArray, index: number): string {
  const value = match[index];
  if (value === undefined) {
    throw new Error(`the pattern matched without capture group ${index}`);
  }
  return value;
}

/**
 * Every include glob in the workspace, paired with the project that declares it.
 *
 * Regions are cut at `name:` boundaries because `include:` always follows the
 * name inside a project block. A project with no include list, or with an empty
 * one, throws rather than being skipped — silently skipping is how a declaration
 * escapes the very check this helper feeds.
 */
export function declaredIncludeGlobs(): { project: string; glob: string }[] {
  const source = readFileSync(WORKSPACE, "utf-8");
  const marks: { name: string; from: number }[] = [];
  const nameRe = /name:\s*"([^"]+)"/g;
  for (let m = nameRe.exec(source); m !== null; m = nameRe.exec(source)) {
    marks.push({ name: group(m, 1), from: m.index + group(m, 0).length });
  }
  if (marks.length === 0) {
    throw new Error("vitest.workspace.ts declares no project names");
  }

  const out: { project: string; glob: string }[] = [];
  for (const [i, mark] of marks.entries()) {
    const end = marks[i + 1]?.from ?? source.length;
    const region = source.slice(mark.from, end);
    const open = region.indexOf("include: [");
    if (open < 0) {
      throw new Error(`project ${mark.name} declares no include list`);
    }
    const close = region.indexOf("]", open);
    if (close < 0) {
      throw new Error(`project ${mark.name} has an unterminated include list`);
    }
    const globs = [...region.slice(open, close).matchAll(/"([^"]+)"/g)].map((g) => group(g, 1));
    if (globs.length === 0) {
      throw new Error(`project ${mark.name} declares an empty include list`);
    }
    for (const glob of globs) {
      out.push({ project: mark.name, glob });
    }
  }
  return out;
}

// The shape every declared glob has, asserted rather than assumed.
//
// `testFileCount` reduces a glob to "walk the literal directory prefix and count
// files ending in `.test.ts`". That reduction is only valid for globs of this exact
// shape, so the shape is a claim of its own — otherwise a glob selecting some other
// suffix would be counted wrongly and then reported as populated.
export const GLOB_SHAPE = /^([A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*)\/\*\*\/\*\.test\.ts$/;

export function testFileCount(glob: string): number {
  const m = GLOB_SHAPE.exec(glob);
  if (m === null) {
    throw new Error(`glob ${glob} is not of the shape testFileCount can count`);
  }
  const root = path.join(PACKAGE_ROOT, group(m, 1));
  if (!existsSync(root)) {
    return 0;
  }
  let found = 0;
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".test.ts")) {
        found += 1;
      }
    }
  };
  walk(root);
  return found;
}
