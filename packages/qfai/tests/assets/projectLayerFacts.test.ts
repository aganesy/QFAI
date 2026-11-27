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
  "-n",
  "--contains",
  "--no-contains",
  "--points-at",
  "--merged",
  "--no-merged",
]);

/** The tag creation options whose next word is their value. */
const VALUE_TAKING_TAG_FLAGS = new Set(["-m", "--message", "-F", "--file", "-u", "--local-user"]);

/** Sorting and formatting do not switch a command with a tag operand into list mode. */
const TAG_LIST_MODIFIERS = new Set(["--sort", "--format"]);

function isTagCreation(command: string): boolean {
  // Keep quoted words together so flag-like text in a tag message stays a value.
  const words = command.match(/(?:[^\s"'\\]|"(?:[^"\\]|\\.)*"|'[^']*'|\\.)+/g);
  const args = words?.slice(2) ?? [];
  let hasOperand = false;
  let hasListModifier = false;

  for (let index = 0; index < args.length; index++) {
    const word = args[index] ?? "";
    const arg = word.replace(
      /"((?:[^"\\]|\\.)*)"|'([^']*)'|\\(.)/g,
      (_, doubleQuoted: string | undefined, singleQuoted: string | undefined, escaped: string) =>
        doubleQuoted?.replace(/\\(["\\$`])/g, "$1") ?? singleQuoted ?? escaped,
    );
    if (arg === "--") {
      hasOperand ||= index + 1 < args.length;
      break;
    }

    const [flag = "", value] = arg.split("=", 2);
    if (NON_CREATING_TAG_FLAGS.has(flag) || /^-n\d+$/.test(flag)) return false;

    const listModifier = TAG_LIST_MODIFIERS.has(flag);
    hasListModifier ||= listModifier;
    const takesSeparateValue =
      (/^--/.test(flag) && VALUE_TAKING_TAG_FLAGS.has(flag) && value === undefined) ||
      /^-[aesfi]*[mFu]$/.test(arg);
    if ((listModifier && value === undefined) || takesSeparateValue) index++;
    if (!arg.startsWith("-")) hasOperand = true;
  }

  // A continued command may name the tag on its next physical line.
  return hasOperand || (args.length > 0 && (!hasListModifier || command.endsWith("\\")));
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
    .filter(isTagCreation)
    .map((part) => part.replace(/\\$/, "").trim());
}

/**
 * Whether a tag command names its commit: the last word is the `<SHA>`
 * placeholder or a full 40-hex SHA and is no flag's value, and no word is
 * `HEAD` or `@`. Without a commit, `git tag` tags whatever the checkout has as
 * HEAD.
 */
function namesItsCommit(command: string): boolean {
  const words = command.split(/\s+/);
  const last = words[words.length - 1] ?? "";
  const beforeLast = words[words.length - 2] ?? "";
  return (
    /^(?:<SHA>|[0-9a-f]{40})$/.test(last) &&
    !VALUE_TAKING_TAG_FLAGS.has(beforeLast) &&
    !words.some((word) => /^(?:HEAD|@)(?:[~^].*)?$/.test(word))
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
    const block = [...guide.matchAll(/^\s*```sh\n([\s\S]*?)^\s*```/gm)]
      .map(([, body]) => body ?? "")
      .find((body) => /^\s*corepack pnpm ci:gate:build$/m.test(body));
    expect(block, "no shell block runs corepack pnpm ci:gate:build").toBeDefined();
    expect(block, "the block runs verify:pack a second time").not.toMatch(/^\s*pnpm verify:pack$/m);
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
