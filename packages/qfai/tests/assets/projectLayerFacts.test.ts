/**
 * The `.instruction/02_project/` layer describes this repository, and nothing
 * checked that the description was still true.
 *
 * These files are prose an agent is routed to by `AGENTS.md`. No validator
 * compared a path or a version written here against the thing it names, so the
 * engines floor moved twice and three directories were removed with none of
 * them failing. What an agent then read was a repository that no longer exists:
 * `.qfai/require/` as the requirements root, `docs/` at the repository root,
 * and a spec pack of `spec.md` / `delta.md` / `scenario.feature`.
 *
 * Two classes of claim are checkable, and they are the two that went wrong.
 *
 * 1. A repository-relative path the prose names must exist.
 * 2. A Node version stated as a floor must be the one `package.json` declares.
 *
 * The layer is free to go, and this goes quiet with it rather than blocking the
 * removal: an absent directory is no files to check.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const LAYER = ".instruction/02_project";

/**
 * A backticked repository-relative path: one that starts at a root-level entry
 * this repository has, so a directory name inside a sentence is read as a path
 * and an arbitrary phrase is not.
 *
 * `.github/` is deliberately absent from the prefixes. Its instruction files
 * are named in full and exist; what this pattern is for is the `.qfai/` and
 * source-tree claims, which are where the drift was.
 */
const PATH_CITATION =
  /`((?:\.qfai|\.agents|\.instruction|packages|scripts|tests|assets|src|docs)\/[^`\s]*)`/g;

/**
 * Path shapes that name a kind rather than a file: a placeholder to fill in, a
 * glob, or a directory a run creates. Checking these would report a project's
 * own naming convention as a missing file.
 *
 * The run-created three are the ones a clean checkout does not have. `report/`
 * and `evidence/` hold tracked files and the directory survives; `review/`
 * holds none, so it exists only where a review has run. All three are real
 * parts of the layout and belong in a description of it.
 */
const NOT_A_PATH = [
  /[<>*]/, // `spec-XXXX`'s siblings, `skills/*`, `<spec-id>`
  /[A-Z]{3,}/, // `spec-NNNN`, `CON-API-*`
  /^\.qfai\/(?:report|evidence|review)\//,
];

async function layerFiles(): Promise<string[]> {
  if (!existsSync(path.join(repoRoot, LAYER))) return [];
  return fg("*.md", { cwd: path.join(repoRoot, LAYER), absolute: false });
}

/**
 * A fenced block is a picture of a tree, drawn from whatever root its caption
 * names, so its lines are not citations from the repository root.
 */
function withoutFencedBlocks(markdown: string): string {
  return markdown.replace(/^```[\s\S]*?^```/gm, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `package.json#engines.node`, or `undefined` when the manifest declares none. */
function declaredNodeRange(manifest: unknown): string | undefined {
  if (!isRecord(manifest)) return undefined;
  const engines = manifest["engines"];
  if (!isRecord(engines)) return undefined;
  const node = engines["node"];
  return typeof node === "string" ? node : undefined;
}

function citedPaths(markdown: string): string[] {
  const cited = Array.from(
    withoutFencedBlocks(markdown).matchAll(PATH_CITATION),
    (m) => m[1] ?? "",
  );
  return cited.filter((cite) => !NOT_A_PATH.some((shape) => shape.test(cite)));
}

describe("the project layer describes the repository it is in", () => {
  it("names no repository path that does not exist", async () => {
    const missing: string[] = [];
    for (const name of await layerFiles()) {
      const text = await readFile(path.join(repoRoot, LAYER, name), "utf-8");
      for (const cite of citedPaths(text)) {
        if (!existsSync(path.join(repoRoot, cite))) missing.push(`${name}: ${cite}`);
      }
    }

    expect(missing, "a path named here resolves to nothing in this tree").toEqual([]);
  });

  // The floor is the one fact in this layer with a machine-readable source, and
  // it moved twice without either file noticing. A stated floor must match; a
  // file that points at `package.json#engines` instead states nothing to match.
  it("states no Node floor that disagrees with the declared one", async () => {
    const manifest: unknown = JSON.parse(
      await readFile(path.join(repoRoot, "package.json"), "utf-8"),
    );
    const engines = declaredNodeRange(manifest);
    expect(engines, "package.json declares no Node range").not.toBeUndefined();

    const disagreeing: string[] = [];
    for (const name of await layerFiles()) {
      const text = await readFile(path.join(repoRoot, LAYER, name), "utf-8");
      for (const [stated] of text.matchAll(/>=\s*\d+(?:\.\d+)*(?:\.\d+)?/g)) {
        if (stated.replace(/\s+/g, "") !== engines) disagreeing.push(`${name}: ${stated}`);
      }
    }

    expect(disagreeing, `the declared Node range is ${String(engines)}`).toEqual([]);
  });
});
