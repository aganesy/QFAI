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
import MarkdownIt from "markdown-it";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const LAYER = ".instruction/02_project";
const NODE_RANGE_CLAIM =
  /(?:\^|>=)\s*\d+(?:\.\d+){0,2}(?:\s*\|\|\s*(?:\^|>=)\s*\d+(?:\.\d+){0,2})*/g;

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

/** Options that select deletion, listing or verification. */
const NON_CREATING_TAG_FLAGS = new Set([
  "-d",
  "--delete",
  "-l",
  "--list",
  "-v",
  "--verify",
  "--contains",
  "--no-contains",
  "--merged",
  "--no-merged",
  "--with",
  "--without",
]);

/** Tag options that take an attached or separate value. */
const VALUE_TAKING_TAG_FLAGS = new Set([
  "--message",
  "--file",
  "--local-user",
  "--trailer",
  "--cleanup",
  "--points-at",
]);

/** Sorting and formatting do not switch a command with a tag operand into list mode. */
const TAG_LIST_MODIFIERS = new Set(["--sort", "--format"]);

const TAG_SWITCHES = new Set([
  "--annotate",
  "--edit",
  "--sign",
  "--no-sign",
  "--force",
  "--create-reflog",
  "--no-create-reflog",
  "--column",
  "--no-column",
  "--color",
  "--no-color",
  "--omit-empty",
  "--ignore-case",
  // Git supports these unsets without a value. Message and mode switches
  // such as --list opt out of negation in Git's option definitions.
  "--no-annotate",
  "--no-force",
  "--no-edit",
  "--no-ignore-case",
  "--no-omit-empty",
  "--no-file",
  "--no-cleanup",
  "--no-local-user",
  "--no-sort",
  "--no-format",
  "--no-points-at",
]);

// Include switches that do not consume a word when checking for ambiguous prefixes.
const LONG_TAG_FLAGS = [
  ...[...NON_CREATING_TAG_FLAGS].filter((flag) => flag.startsWith("--")),
  ...VALUE_TAKING_TAG_FLAGS,
  ...TAG_LIST_MODIFIERS,
  ...TAG_SWITCHES,
  "--help",
];

function canonicalLongTagFlag(flag: string): string {
  if (!flag.startsWith("--") || LONG_TAG_FLAGS.includes(flag)) return flag;
  const matches = LONG_TAG_FLAGS.filter((option) => option.startsWith(flag));
  return matches.length === 1 ? (matches[0] ?? flag) : flag;
}

/** Git parses the attached -n count as a signed base-0 integer with an optional scale. */
function tagAnnotationCount(count: string): number | undefined {
  if (count === "") return 1;
  const match = /^[ \t]*([+-]?)(0x[0-9a-f]+|0[0-7]*|[1-9]\d*)([kmg]?)$/i.exec(count);
  if (match === null) return undefined;
  const [, sign = "", digits = "", unit = ""] = match;
  const radix = digits.toLowerCase().startsWith("0x") ? 16 : digits.startsWith("0") ? 8 : 10;
  const scale = 1024 ** ["", "k", "m", "g"].indexOf(unit.toLowerCase());
  const value = Number.parseInt(digits, radix) * scale * (sign === "-" ? -1 : 1);
  return value >= -0x80000000 && value <= 0x7fffffff ? value : undefined;
}

function shortTagOption(
  arg: string,
):
  | "mode"
  | "separate-value"
  | "attached-value"
  | "annotation-count"
  | "annotation-unset"
  | undefined {
  // The first option that uses a value owns the rest of its word.
  const option = /^-[aesfi]*([dlvnmFu])(.*)$/.exec(arg);
  if (option === null) return undefined;
  switch (option[1]) {
    case "m":
    case "F":
    case "u":
      return option[2] === "" ? "separate-value" : "attached-value";
    case "n": {
      const count = tagAnnotationCount(option[2] ?? "");
      if (count === undefined) return undefined;
      return count === -1 ? "annotation-unset" : "annotation-count";
    }
    case "d":
    case "l":
    case "v":
      return "mode";
  }
  return undefined;
}

function readTagCommand(command: string): {
  creates: boolean;
  operands: string[];
  optionsKnown: boolean;
} {
  // Keep quoted words together so flag-like text in a tag message stays a value.
  const words = command.match(/(?:[^\s"'\\]|"(?:[^"\\]|\\.)*"|'[^']*'|\\.)+/g);
  const args = (words?.slice(2) ?? []).map((word) =>
    word.replace(
      /"((?:[^"\\]|\\.)*)"|'([^']*)'|\\(.)/g,
      (_, doubleQuoted: string | undefined, singleQuoted: string | undefined, escaped: string) =>
        doubleQuoted?.replace(/\\(["\\$`])/g, "$1") ?? singleQuoted ?? escaped,
    ),
  );
  let operands: string[] = [];
  let hasListModifier = false;
  let hasPointsAtFilter = false;
  let hasAnnotationCount = false;
  let optionsKnown = true;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index] ?? "";
    if (arg === "--") {
      operands = operands.concat(args.slice(index + 1));
      break;
    }
    if (!arg.startsWith("-")) {
      operands.push(arg);
      continue;
    }

    const [name = "", value] = arg.split("=", 2);
    const flag = canonicalLongTagFlag(name);
    const shortOption = shortTagOption(arg);
    if (NON_CREATING_TAG_FLAGS.has(flag) || shortOption === "mode") {
      // An earlier unknown option may consume this apparent mode switch.
      return { creates: !optionsKnown, operands: [], optionsKnown };
    }
    // Git checks the final count after parsing the options.
    if (shortOption === "annotation-count" || shortOption === "annotation-unset") {
      hasAnnotationCount = shortOption === "annotation-count";
      hasListModifier ||= shortOption === "annotation-unset";
      continue;
    }

    const clearsPointsAt = flag === "--no-points-at" && value === undefined;
    // Git lets a later unset clear the points-at filter before choosing tag mode.
    if (flag === "--points-at" || clearsPointsAt) hasPointsAtFilter = !clearsPointsAt;

    const listModifier = TAG_LIST_MODIFIERS.has(flag);
    const resetsListFormatting =
      value === undefined && (flag === "--no-sort" || flag === "--no-format");
    hasListModifier ||= listModifier || clearsPointsAt || resetsListFormatting;
    const longWithValue = listModifier || VALUE_TAKING_TAG_FLAGS.has(flag);
    const knownSwitch =
      TAG_SWITCHES.has(flag) && (value === undefined || !flag.startsWith("--no-"));
    const takesSeparateValue =
      (longWithValue && value === undefined) || shortOption === "separate-value";
    if (takesSeparateValue) {
      index++;
      // A final --points-at without a value uses HEAD in Git.
      if (index === args.length && flag !== "--points-at") optionsKnown = false;
    } else if (
      !longWithValue &&
      !knownSwitch &&
      shortOption !== "attached-value" &&
      !/^-[aesfi]+$/.test(arg)
    ) {
      optionsKnown = false;
    }
  }

  // A continued command may clear the count or name the tag on its next line.
  const continued = command.endsWith("\\");
  const creates =
    !optionsKnown ||
    (!hasPointsAtFilter &&
      (!hasAnnotationCount || continued) &&
      (operands.length > 0 || (args.length > 0 && (!hasListModifier || continued))));
  return { creates, operands, optionsKnown };
}

function splitShellCommands(line: string): string[] {
  const parts: string[] = [];
  // The capture group identifies quoted or escaped text to leave in the command.
  const tokens = /("(?:[^"\\]|\\.)*"|'[^']*'|\\.)|(^|\s)#|#|&&|\|\||;|\|/g;
  let start = 0;
  for (const token of line.matchAll(tokens)) {
    if (token[1] !== undefined) continue;
    if (token[2] !== undefined || (token[0] === "#" && token.index === start)) {
      parts.push(line.slice(start, token.index));
      return parts;
    }
    if (token[0] === "#") continue;
    parts.push(line.slice(start, token.index));
    start = token.index + token[0].length;
  }
  parts.push(line.slice(start));
  return parts;
}

/** Potential tag creation commands in shell input, checked one command at a time. */
function tagCreations(shell: string): string[] {
  return shell
    .split(/\r?\n/)
    .flatMap(splitShellCommands)
    .map((part) => part.trim())
    .filter((part) => /^git\s+tag(?:\s|$)/.test(part))
    .filter((part) => readTagCommand(part).creates)
    .map((part) => part.replace(/\\$/, "").trim());
}

/**
 * The second positional operand names the commit. The guide requires the
 * `<SHA>` placeholder or a full 40-hex SHA there.
 */
function namesItsCommit(command: string): boolean {
  const { creates, operands, optionsKnown } = readTagCommand(command);
  return (
    creates &&
    optionsKnown &&
    operands.length === 2 &&
    /^(?:<SHA>|[0-9a-f]{40})$/.test(operands[1] ?? "")
  );
}

const releaseMarkdown = new MarkdownIt("commonmark");

function releaseShellBlocks(tokens: ReturnType<typeof releaseMarkdown.parse>): string[] {
  return tokens
    .filter(
      ({ type, info }) => type === "fence" && /^(?:sh|bash|shell)(?:[ \t]|$)/.test(info.trim()),
    )
    .map(({ content }) => content);
}

function releaseTagCreations(guide: string): string[] {
  const tokens = releaseMarkdown.parse(guide, {});
  const inlineCommands = tokens
    .flatMap(({ children }) => children ?? [])
    .filter(({ type }) => type === "code_inline")
    .map(({ content }) => content);
  return [...releaseShellBlocks(tokens), ...inlineCommands].flatMap(tagCreations);
}

function releaseTaggingStatements(guide: string): string[] {
  const statements = releaseShellBlocks(releaseMarkdown.parse(guide, {}))
    .map((body) => body.replace(/&&[ \t]*\r?\n\s*/g, "&& "))
    .flatMap((body) => body.split(/\r?\n/))
    .map((line) => line.trim());
  return statements.filter((statement) => tagCreations(statement).length > 0);
}

function releaseBuildBlock(guide: string): string | undefined {
  return releaseShellBlocks(releaseMarkdown.parse(guide, {})).find((body) =>
    /^\s*corepack pnpm ci:gate:build$/m.test(body),
  );
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

  // Both guides told an agent to start an investigation with MCP and named
  // Serena for impact analysis, while the graph exploration rule chooses the
  // project graph CLIs first. Each guide now defers to that rule.
  it("sends exploration to the graph exploration rule before any MCP server", async () => {
    const rule = ".agents/rules/graph-exploration.md";
    const undeferring: string[] = [];
    for (const name of ["mcp.md", "orchestrator.md"]) {
      const text = await readFile(path.join(repoRoot, LAYER, name), "utf-8");
      if (!citedPaths(text).includes(rule)) undeferring.push(name);
    }

    expect(undeferring, `each guide cites ${rule}`).toEqual([]);
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
      for (const [stated] of text.matchAll(NODE_RANGE_CLAIM)) {
        if (stated.replace(/\s+/g, "") !== engines?.replace(/\s+/g, "")) {
          disagreeing.push(`${name}: ${stated}`);
        }
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
    const stated = [...withoutFencedBlocks(guide).matchAll(NODE_RANGE_CLAIM)].map(
      ([match]) => match,
    );

    expect(stated.length, "the release guide states no Node floor to check").toBeGreaterThan(0);
    expect(
      stated.filter((range) => range.replace(/\s+/g, "") !== engines?.replace(/\s+/g, "")),
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
    const creates = releaseTagCreations(guide);

    expect(creates.length, "the release guide shows no tag command to check").toBeGreaterThan(0);
    expect(
      creates.filter((command) => !namesItsCommit(command)),
      "each tag command names the commit after the tag",
    ).toEqual([]);
  });

  // The check above is only as strict as the reading behind it. Each sample
  // here is a way the step could be edited back into tagging HEAD.
  it("reads every way of tagging HEAD as a tag command that names no commit", () => {
    const tagsHead = [
      '```sh\ngit tag -a vX.Y.Z -m "Release X.Y.Z"\n```',
      "```sh\ngit tag vX.Y.Z HEAD\n```",
      "Then run `git tag vX.Y.Z` to tag it.",
      "```sh\ngit fetch origin main && git tag vX.Y.Z\n```",
      "```sh\ngit tag vX.Y.Z -m <SHA>\n```",
      "```sh\ngit tag vX.Y.Z -am <SHA>\n```",
      "```sh\ngit tag vX.Y.Z --mess <SHA>\n```",
    ];
    for (const sample of tagsHead) {
      const creates = releaseTagCreations(sample);
      expect(creates.length, sample).toBe(1);
      expect(creates.filter((command) => !namesItsCommit(command)).length, sample).toBe(1);
    }

    expect(
      releaseTagCreations("Delete it with `git tag -d vX.Y.Z`, or list with `git tag -l`."),
    ).toEqual([]);
    const chained = releaseTagCreations("```sh\n  git tag vX.Y.Z <SHA> &&\n```\n");
    expect(chained).toEqual(["git tag vX.Y.Z <SHA>"]);
    expect(chained.every((command) => namesItsCommit(command))).toBe(true);
    expect(namesItsCommit(`git tag vX.Y.Z ${"a".repeat(40)}`)).toBe(true);
  });

  it("checks the tag's commit independently of a quoted message", () => {
    expect(namesItsCommit('git tag -m "See HEAD for details" vX.Y.Z <SHA>')).toBe(true);
    expect(namesItsCommit('git tag -am "See HEAD for details" vX.Y.Z <SHA>')).toBe(true);
    expect(namesItsCommit("git tag -aml vX.Y.Z <SHA>")).toBe(true);
    expect(namesItsCommit('git tag --mess "See HEAD for details" vX.Y.Z <SHA>')).toBe(true);
    expect(namesItsCommit("git tag vX.Y.Z <SHA> --message 'Compare HEAD and @'")).toBe(true);
    expect(namesItsCommit('git tag -- vX.Y.Z "<SHA>"')).toBe(true);
    expect(namesItsCommit('git tag -m "A release note" vX.Y.Z HEAD')).toBe(false);
    expect(namesItsCommit("git tag vX.Y.Z @")).toBe(false);
    expect(namesItsCommit('git tag -m "See HEAD for details" vX.Y.Z')).toBe(false);
    expect(namesItsCommit("git tag vX.Y.Z -m <SHA>")).toBe(false);
    expect(namesItsCommit("git tag vX.Y.Z --mess <SHA> --force")).toBe(false);
    expect(namesItsCommit("git tag vX.Y.Z <SHA> --message")).toBe(false);
    expect(
      namesItsCommit('git tag -m Release --trailer "Change-Id: X" --cleanup verbatim vX.Y.Z <SHA>'),
    ).toBe(true);
  });

  it.each(["--no-annotate", "--no-edit", "--no-file", "--no-sort"])(
    "checks an explicit commit after the valid tag unset %s",
    (option) => {
      const command = `git tag ${option} vX.Y.Z <SHA>`;
      expect(tagCreations(command)).toEqual([command]);
      expect(namesItsCommit(command)).toBe(true);
    },
  );

  it.each([
    "--no-message",
    "--no-trailer",
    "--no-list",
    "--no-unknown",
    "--no-file=unused",
    "--no-edit=",
    "--no-points-at=<SHA>",
  ])("holds the commit check for an invalid tag unset %s", (option) => {
    const command = `git tag ${option} vX.Y.Z <SHA>`;
    expect(tagCreations(command)).toEqual([command]);
    expect(namesItsCommit(command)).toBe(false);
  });

  it("uses the last points-at filter when checking tag creation", () => {
    const implicit = "git tag --points-at=HEAD --no-points-at vX.Y.Z";
    expect(tagCreations(implicit)).toEqual([implicit]);
    expect(namesItsCommit(implicit)).toBe(false);

    const explicit = "git tag --points-at HEAD --no-points-at vX.Y.Z <SHA>";
    expect(tagCreations(explicit)).toEqual([explicit]);
    expect(namesItsCommit(explicit)).toBe(true);

    expect(tagCreations("git tag --no-points-at --points-at HEAD vX.Y.Z")).toEqual([]);
    expect(tagCreations("git tag --no-points-at")).toEqual([]);
    expect(tagCreations("git tag --points-at")).toEqual([]);
    expect(tagCreations("git tag --no-points-at --points-at")).toEqual([]);
    expect(tagCreations("git tag --points-at HEAD --no-points-at --list vX.Y.Z")).toEqual([]);

    const unknown = "git tag --no-unknown --points-at HEAD --no-points-at --list vX.Y.Z";
    expect(tagCreations(unknown)).toEqual([unknown]);
    expect(namesItsCommit(unknown)).toBe(false);
  });

  it.each(["--no-sort", "--no-format"])("lists tags with %s and no tag operand", (option) => {
    expect(tagCreations(`git tag ${option}`)).toEqual([]);

    const implicit = `git tag ${option} vX.Y.Z`;
    expect(tagCreations(implicit)).toEqual([implicit]);
    expect(namesItsCommit(implicit)).toBe(false);

    const explicit = `${implicit} <SHA>`;
    expect(tagCreations(explicit)).toEqual([explicit]);
    expect(namesItsCommit(explicit)).toBe(true);
  });

  it.each(["git tag vX.Y.Z --me --contains", "git tag --me --sort vX.Y.Z"])(
    "checks the commit even when an unknown option may consume a flag in %s",
    (command) => {
      const creations = tagCreations(command);
      expect(creations).toEqual([command]);
      expect(creations.filter(namesItsCommit)).toEqual([]);
    },
  );

  it("checks release tag commits only in shell fences and inline commands", () => {
    const fenced = "git tag vX.Y.Z <SHA>";
    const inline = "git tag vA.B.C <SHA>";
    const guide = [
      "````markdown",
      "```sh",
      "git tag illustrative HEAD",
      "```",
      "Literal: `git tag another-example HEAD`",
      "````",
      "",
      "```text",
      "git tag sample-output HEAD",
      "```",
      "",
      "~~~shell",
      fenced,
      "~~~",
      "",
      `Use \`git fetch origin main && ${inline}\`.`,
    ].join("\n");

    const commands = releaseTagCreations(guide);
    expect(commands).toEqual([fenced, inline]);
    expect(commands.every(namesItsCommit)).toBe(true);
  });

  it("ignores listing options when identifying tag creation commands", () => {
    const listings = [
      "git tag -n",
      "git tag -n3",
      "git tag -ln3",
      "git tag --contains <SHA>",
      "git tag --no-contains <SHA>",
      "git tag --points-at=<SHA>",
      "git tag --merged <SHA>",
      "git tag --no-merged=<SHA>",
      "git tag --sort=version:refname",
      'git tag --format="%(refname)"',
    ];
    const creations = [
      "git tag vX.Y.Z <SHA>",
      "git tag --sort version:refname vX.Y.Z <SHA>",
      'git tag --format="%(refname)" vX.Y.Z',
      'git tag -m "See --contains usage" vX.Y.Z <SHA>',
      "git tag -m --contains vX.Y.Z <SHA>",
      "git tag -am --contains vX.Y.Z",
      "git tag --mess --contains vX.Y.Z",
      "git tag -aml vX.Y.Z",
      "git tag -iam --contains vX.Y.Z",
      'git tag "--message" --contains vX.Y.Z',
      "git tag --format='%(refname)' -m 'release; candidate | notes' vX.Y.Z",
      'git tag --format="%(refname)" -m "prepare && ship" vX.Y.Z',
      "git tag --format='%(refname)' -m prepare\\;ship vX.Y.Z",
    ];
    const guide = ["```sh", ...listings, ...creations, "```"].join("\n");
    expect(releaseTagCreations(guide)).toEqual(creations);
    expect(tagCreations("git tag vX.Y.Z # --contains; git tag --format=unused")).toEqual([
      "git tag vX.Y.Z",
    ]);
    expect(tagCreations('git tag --format="%(refname)" \\\n  vX.Y.Z')).toEqual([
      'git tag --format="%(refname)"',
    ]);
  });

  it("only expands an unambiguous long tag option", () => {
    expect(canonicalLongTagFlag("--mess")).toBe("--message");
    expect(canonicalLongTagFlag("--me")).toBe("--me");
    expect(canonicalLongTagFlag("--l")).toBe("--l");
  });

  it.each(["1k", "2M", "1g", "+2K", "0x10k", "010", "0"])(
    "treats grouped -n%s as listing",
    (count) => {
      expect(tagCreations(`git tag -in${count} example`)).toEqual([]);
    },
  );

  it("keeps the final annotation count and the message option's attached value", () => {
    const creation = "git tag -in1k -n-1 vX.Y.Z <SHA>";
    const message = "git tag -imn1k vX.Y.Z <SHA>";
    const invalid = "git tag -in2g vX.Y.Z <SHA>";

    expect(tagCreations(creation)).toEqual([creation]);
    expect(namesItsCommit(creation)).toBe(true);
    expect(tagCreations("git tag -in-1 -n1k example")).toEqual([]);
    expect(tagCreations("git tag -lin1k -n-1 example")).toEqual([]);
    expect(tagCreations("git tag -n-1")).toEqual([]);
    expect(tagCreations(message)).toEqual([message]);
    expect(namesItsCommit(message)).toBe(true);
    expect(tagCreations(invalid)).toEqual([invalid]);
    expect(namesItsCommit(invalid)).toBe(false);
  });

  it("keeps an annotation count in scope when a continuation can clear it", () => {
    const firstLine = "git tag -in1k";
    const command = [firstLine + " \\", "  -n-1 vX.Y.Z"].join("\n");
    const candidates = tagCreations(command);
    expect(candidates).toEqual([firstLine]);
    expect(candidates.filter(namesItsCommit)).toEqual([]);
  });

  // Pasted as separate lines, the block tagged even when the ancestry check
  // failed, because a failing line does not stop the next one. Chained with
  // `&&`, the tag is created only after every check before it passed.
  it("creates the release tag only after its checks pass", async () => {
    const guide = await readFile(path.join(repoRoot, "RELEASE.md"), "utf-8");
    const tagging = releaseTaggingStatements(guide);

    expect(tagging.length, "the release guide shows one tag command in a shell block").toBe(1);
    const steps = (tagging[0] ?? "").split("&&").map((step) => step.trim());
    const at = (pattern: RegExp): number => steps.findIndex((step) => pattern.test(step));
    const tag = at(/^git\s+tag\s/);
    expect(steps.slice(0, tag).join(" "), "a check is joined by ; or ||").not.toMatch(/;|\|\|/);
    expect(
      at(/^git merge-base --is-ancestor <SHA> origin\/main$/),
      "the ancestry check",
    ).toBeGreaterThanOrEqual(0);
    expect(at(/^git merge-base --is-ancestor\b/)).toBeLessThan(tag);
    expect(
      at(/^git show <SHA>:packages\/qfai\/package\.json \| grep -F '"version": "X\.Y\.Z"'$/),
      "the version check",
    ).toBeGreaterThanOrEqual(0);
    expect(at(/^git show <SHA>:/)).toBeLessThan(tag);

    // An unmerged pull request has no merge commit, and `--jq` prints `null`.
    expect(guide, "the guide says to stop when there is no merge commit").toMatch(
      /prints nothing or `null`[^.]*\bstop here\b/,
    );
  });

  it.each(["sh", "bash", "shell", "bash  "])(
    "reads ordered release tag statements from %s fences",
    (shell) => {
      const check = "git merge-base --is-ancestor <SHA> origin/main";
      const tag = "git tag vX.Y.Z <SHA>";
      const guide = ["```" + shell, check + " &&", "  " + tag, "```"].join("\n");
      expect(releaseTaggingStatements(guide)).toEqual([check + " && " + tag]);
    },
  );

  it("ignores tag examples in fences for other languages", () => {
    const guide = "```powershell\ngit tag vX.Y.Z <SHA>\n```";
    expect(releaseTaggingStatements(guide)).toEqual([]);
  });

  it.each(["~~~", "````"])("reads shell statements in %s fences", (fence) => {
    const check = "git merge-base --is-ancestor <SHA> origin/main";
    const tag = "git tag vX.Y.Z <SHA>";
    const guide = [fence + "sh", check + " &&", "  " + tag, fence].join("\n");
    expect(releaseTaggingStatements(guide)).toEqual([check + " && " + tag]);
  });

  it("ignores literal shell examples until the enclosing Markdown fence closes", () => {
    const example = "git tag illustrative HEAD";
    const tag = "git tag vX.Y.Z <SHA>";
    const guide = ["````markdown", "```sh", example, "```", "~~~~", "`````", "~~~sh", tag, "~~~~"];
    expect(releaseTaggingStatements(guide.join("\n"))).toEqual([tag]);
  });

  // npm installs into the nearest directory holding a `package.json`. The smoke
  // check made a fixed `tmp/` directory inside the checkout and initialised no
  // package there, so the install landed in the repository root, and a second
  // run inherited the first run's files.
  it("runs the release smoke install in a new temporary package", async () => {
    const guide = await readFile(path.join(repoRoot, "RELEASE.md"), "utf-8");
    const start = guide.indexOf("## Final check after the release");
    expect(start, "the release guide has no final check to read").toBeGreaterThanOrEqual(0);
    const rest = guide.slice(start + 1);
    const next = rest.search(/^## /m);
    const smoke = next < 0 ? rest : rest.slice(0, next);

    expect(smoke, "the Unix steps make a new temporary directory").toMatch(/\bmktemp -d\b/);
    expect(smoke, "the PowerShell steps make one under the temp path").toMatch(/GetTempPath\(\)/);
    expect(smoke, "a directory inside the checkout").not.toMatch(/\btmp\/qfai-release-smoke\b/);

    const inits = [...smoke.matchAll(/^npm init -y$/gm)].map((match) => match.index);
    const install = smoke.search(/^npm i -D qfai@/m);
    expect(inits.length, "each shell's steps initialise their own package").toBe(2);
    expect(install, "the guide shows no smoke install to check").toBeGreaterThanOrEqual(0);
    expect(
      inits.every((at) => at < install),
      "the package exists before the install",
    ).toBe(true);
  });

  // Run with bare `node`, the build-warning check starts a `pnpm` executable on
  // PATH, which misses the `pnpm.cmd` shim on Windows. The `ci:gate:build`
  // script hands it the running pnpm and runs `verify:pack` as well, so the
  // release guide calls the script and lists no second pack check beside it.
  it("runs the release build check through the ci:gate:build script", async () => {
    const manifest: unknown = JSON.parse(
      await readFile(path.join(repoRoot, "package.json"), "utf-8"),
    );
    const scripts = isRecord(manifest) ? manifest["scripts"] : undefined;
    const gate = isRecord(scripts) ? scripts["ci:gate:build"] : undefined;
    expect(gate, "ci:gate:build no longer runs both checks").toEqual(
      expect.stringMatching(/check-build-warnings\.mjs[\s\S]*verify:pack/),
    );

    const guide = await readFile(path.join(repoRoot, "RELEASE.md"), "utf-8");
    expect(guide, "the guide runs the build check with bare node").not.toMatch(
      /^\s*node (?:\.\/)?scripts\/check-build-warnings\.mjs/m,
    );
    const block = releaseBuildBlock(guide);
    expect(block, "no shell block runs corepack pnpm ci:gate:build").toBeDefined();
    expect(block, "the block runs verify:pack a second time").not.toMatch(/^\s*pnpm verify:pack$/m);
  });

  it.each([
    ["sh", "\n"],
    ["bash", "\n"],
    ["shell", "\n"],
    ["sh", "\r\n"],
    ["bash", "\r\n"],
    ["shell", "\r\n"],
  ])(
    "finds the build command and its neighboring lines in a %s fence with %j",
    (shell, newline) => {
      const build = "corepack pnpm ci:gate:build";
      const duplicate = "pnpm verify:pack";
      const guide = ["```" + shell, build, duplicate, "```"].join(newline);
      const block = releaseBuildBlock(guide);
      expect(block).toBeDefined();
      expect(block).toContain(build);
      expect(block).toMatch(/^\s*pnpm verify:pack$/m);
    },
  );

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
