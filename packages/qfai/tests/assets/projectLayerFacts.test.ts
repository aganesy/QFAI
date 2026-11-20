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
 * 1. A path citation must exist from the repository root, including table cells.
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
import { parse as parseYaml } from "yaml";

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
 * The run-created four are directories a clean checkout may not have.
 * `evidence/` holds tracked files, so the directory survives; `discussion/`,
 * `report/` and `review/` hold none, so each exists only where a run has
 * written it. All four are real parts of the layout and belong in a
 * description of it.
 */
const NOT_A_PATH = [
  /[<>*]/, // `spec-XXXX`'s siblings, `skills/*`, `<spec-id>`
  /[A-Z]{3,}/, // `spec-NNNN`, `API-*`
  /^\.qfai\/(?:discussion|report|evidence|review)\//,
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

  // The same class of claim, in the document a release operator reads. It said
  // a floor below the declared one, so a release taken on a Node the package
  // refuses to install on would have looked supported.
  it("states no Node floor in the release guide that disagrees with the declared one", async () => {
    const manifest: unknown = JSON.parse(
      await readFile(path.join(repoRoot, "package.json"), "utf-8"),
    );
    const engines = declaredNodeRange(manifest);
    expect(engines, "package.json declares no Node range").not.toBeUndefined();

    const guide = await readFile(path.join(repoRoot, "RELEASE.md"), "utf-8");
    const stated = [...withoutFencedBlocks(guide).matchAll(/>=\s*\d+(?:\.\d+)*/g)].map(([match]) =>
      match.replace(/\s+/g, ""),
    );

    expect(stated.length, "the release guide states no Node floor to check").toBeGreaterThan(0);
    expect(
      stated.filter((floor) => floor !== engines),
      `the declared Node range is ${String(engines)}`,
    ).toEqual([]);
  });

  // The publish job authenticates through OIDC, and the guide forbids a hand
  // publish. It still asked a manual releaser for an npm login, which sent
  // someone who can push the tag looking for a credential nothing uses.
  it("asks a release operator for no npm credentials the publish job does not use", async () => {
    // Parsed, so a comment that mentions the permission cannot stand in for it.
    const workflow: unknown = parseYaml(
      await readFile(path.join(repoRoot, ".github", "workflows", "release.yml"), "utf-8"),
    );
    expect(workflow, "the publish job no longer holds `id-token: write`").toMatchObject({
      jobs: { publish: { permissions: { "id-token": "write" } } },
    });

    // The whole guide, fenced blocks included: a shell block is where a command
    // is most likely to come back. A command counts in a code span or at the
    // start of a line, so prose saying no npm login is needed does not.
    const guide = await readFile(path.join(repoRoot, "RELEASE.md"), "utf-8");
    const askedFor = [
      ...guide.matchAll(/`npm (?:whoami|login)\b[^`]*`|^\s*npm (?:whoami|login)\b|NPM_TOKEN/gm),
    ].map(([match]) => match.trim());
    expect(askedFor).toEqual([]);
  });

  // `git tag vX.Y.Z` tags whatever the local checkout has as HEAD, and
  // `release.yml` only checks that the tag is somewhere on main, so a stale or
  // wrong checkout would publish a commit nobody approved.
  it("tags a release by the commit it names, never the local HEAD", async () => {
    const guide = await readFile(path.join(repoRoot, "RELEASE.md"), "utf-8");
    const creates = guide
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^`|`$/g, ""))
      .filter((line) => /^git tag\s/.test(line) && !/^git tag\s+-/.test(line));

    expect(creates.length, "the release guide shows no tag command to check").toBeGreaterThan(0);
    expect(
      creates.filter((line) => line.split(/\s+/).length < 4),
      "each tag command names the commit after the tag",
    ).toEqual([]);
  });

  // The host command lists under `.instruction/03_ai-agents/` were copied from
  // another project: `generate:graphql`, `apply:backend`, `test:e2e` and `seed`
  // are scripts this repository never had, and a root `pnpm test` runs nothing.
  // Each `pnpm <script>` they name must be a script of the package it runs in.
  it("names no pnpm script in a host command list that the package lacks", async () => {
    const scriptsOf = async (manifestPath: string): Promise<Set<string>> => {
      const manifest: unknown = JSON.parse(await readFile(manifestPath, "utf-8"));
      const scripts = isRecord(manifest) ? manifest["scripts"] : undefined;
      return new Set(isRecord(scripts) ? Object.keys(scripts) : []);
    };
    const rootScripts = await scriptsOf(path.join(repoRoot, "package.json"));
    const packageScripts = await scriptsOf(path.join(repoRoot, "packages", "qfai", "package.json"));

    const lists = await fg(".instruction/03_ai-agents/*/commands.md", {
      cwd: repoRoot,
      dot: true,
    });
    expect(lists.length, "no host command list to check").toBeGreaterThan(0);

    const unknown: string[] = [];
    for (const list of lists) {
      const text = await readFile(path.join(repoRoot, list), "utf-8");
      // A command is in a code span or follows a list label (`- Lint: pnpm lint`),
      // so prose such as "when pnpm is not on PATH" is not read as one.
      for (const [, scoped, script] of text.matchAll(
        /(?:`|: )(?:corepack )?pnpm (-C packages\/qfai )?([a-z][\w:-]*)/g,
      )) {
        const known = scoped ? packageScripts : rootScripts;
        if (script && !known.has(script)) unknown.push(`${list}: ${scoped ?? ""}${script}`);
      }
    }

    expect(unknown, "a listed command runs no script").toEqual([]);
  });
});
