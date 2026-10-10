/**
 * Story-tree IDs that no open pull request has already taken.
 *
 * A new decision, business rule, acceptance criterion or example takes the next
 * number after the highest one in the tree. Read from the local checkout, that
 * number is the same for every branch cut from the same main, so pull requests
 * opened in parallel pick the same IDs and all but the first renumber after
 * merging main.
 *
 * - `next <scope>...` prints one ID per scope, in order, counted over main, the
 *   head of every open pull request and the working tree. A scope named twice
 *   gets two consecutive IDs.
 * - `check` names each ID this branch declares that main or another open pull
 *   request also declares. Two branches that picked their IDs before either was
 *   pushed are still caught, while renumbering costs one edit.
 *
 * Counting is the package's own allocator: what the story tree declares, plus
 * every ID a row of `decisions.md` names, so a retired ID is not handed out
 * again and an ID written only as an example in prose is not counted.
 *
 * Reading the trees costs one REST listing and one `git fetch`, however many
 * pull requests are open and however many scopes are asked for. The listing goes
 * through `gh-budget.mjs`, which keeps its reserve and reports the remaining
 * allowance on stderr, so stdout holds only the answer. A check during an unfinished
 * merge stops before fetching or comparing branch-owned identifiers.
 *
 * Usage:
 *   node scripts/story-ids.mjs next <scope>...
 *   node scripts/story-ids.mjs check
 *
 * Scopes: `DEC`, `OQ`, `BF`, `US-<flow>`, `AC-<flow>-<story>`,
 * `EX-<flow>-<story>`, `BR-<contract>`.
 *
 * Requires Node.js 22.18 or later, which runs the package's TypeScript
 * story-tree parser directly. On an older runtime it exits 2 before any call.
 *
 * Exit codes: 0 answered; 1 a collision was found, or the listing left the
 * budget below the reserve (the answer is still printed); 2 the arguments,
 * the runtime, `git` or `gh` could not be used, or `check` found an unfinished
 * merge; 3 a scope has no number left.
 */
/* global console, process */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { callAndReport, repoSlug } from "./gh-budget.mjs";

/** The repository root, from this file rather than from the caller's directory. */
const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");

/** The directory the story tree lives in. */
const SPEC_DIR = ".qfai/spec";

/** The branch pull requests merge into. */
const MAIN = "main";

// SIMPLIFIED: reads the 100 most recently updated open pull requests, one page.
// Lift when: a collision comes from an open pull request outside that page.
const PULLS_PER_PAGE = 100;

/** Blob contents across every open head can outgrow the default buffer. */
const MAX_OUTPUT_BYTES = 512 * 1024 * 1024;

/** The kind and parent a scope allocates under, or `undefined` for an unknown scope. */
export function parseScope(scope) {
  if (/^(?:DEC|OQ|BF)$/.test(scope)) return { kind: scope, parentId: undefined };
  const flow = /^US-(\d{4})$/.exec(scope);
  if (flow !== null) return { kind: "US", parentId: `BF-${flow[1]}` };
  const story = /^(AC|EX)-(\d{4}-\d{4})$/.exec(scope);
  if (story !== null) return { kind: story[1], parentId: `US-${story[2]}` };
  // A rule's parent is its contract; the allocator reads only the number.
  const contract = /^BR-(\d{4})$/.exec(scope);
  if (contract !== null) return { kind: "BR", parentId: `CLI-${contract[1]}` };
  return undefined;
}

/**
 * One ID per scope, each counted after the ones before it.
 *
 * `named` is a story-tree model shape, `{ declarations, decisions: { rows } }`,
 * and `allocate` is the package's `nextStoryTreeId`. Returns `undefined` when a
 * scope has no number left.
 */
export function allocateAll(scopes, named, allocate) {
  const declarations = [...named.declarations];
  const model = { declarations, decisions: named.decisions };
  const ids = [];
  for (const { kind, parentId } of scopes) {
    let id;
    try {
      id = allocate(model, kind, parentId);
    } catch (cause) {
      if (cause instanceof RangeError) return undefined;
      throw cause;
    }
    ids.push(id);
    declarations.push({ id, file: "" });
  }
  return ids;
}

/**
 * Each ID this branch adds that another head adds too, with the heads that do.
 *
 * `others` is a list of `{ label, ids }`, where `ids` are already only the ones
 * that head adds. Sorted, so the output is stable.
 */
export function collisions(mine, others) {
  const found = [];
  for (const id of [...mine].sort()) {
    const heads = others.filter((other) => other.ids.has(id)).map((other) => other.label);
    if (heads.length > 0) found.push({ id, heads });
  }
  return found;
}

/** Everything in `ids` that `base` does not hold. */
export function added(ids, base) {
  return new Set([...ids].filter((id) => !base.has(id)));
}

/**
 * The open pull requests that are not this branch, with the commit fetched for each.
 *
 * A head this branch already contains is this branch, pushed earlier, or a
 * branch it is stacked on; either way its IDs are this branch's own. Branch
 * names are not compared: a detached head, a branch pushed under another name
 * or a fork's branch of the same name would each be judged wrongly.
 */
export function otherHeads(pulls, fetched, isAncestorOfHead) {
  return pulls.flatMap((pull) => {
    const commit = fetched.get(pull.number);
    if (commit === undefined || isAncestorOfHead(commit)) return [];
    return [{ label: `#${String(pull.number)} (${pull.branch})`, commit }];
  });
}

/**
 * The open pull requests a listing names, as number and branch.
 *
 * `undefined` when the body is not a listing.
 */
export function pullsFrom(body) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) return undefined;
  return parsed.flatMap((pull) =>
    Number.isInteger(pull?.number) && typeof pull?.head?.ref === "string"
      ? [{ number: pull.number, branch: pull.head.ref }]
      : [],
  );
}

/**
 * The commit `git fetch` wrote for each pull request's head, from `FETCH_HEAD`.
 *
 * Read from the fetch rather than from the listing: a head pushed between the
 * two is the one that holds the IDs now.
 */
export function fetchedHeads(fetchHead) {
  const heads = new Map();
  for (const line of fetchHead.split(/\r?\n/)) {
    const match = /^([0-9a-f]{40,64})\t[^\t]*\t'refs\/pull\/(\d+)\/head'/.exec(line);
    if (match !== null) heads.set(Number(match[2]), match[1]);
  }
  return heads;
}

/** The blobs a `git cat-file --batch` output holds, keyed by object name. */
export function batchBlobs(output) {
  const blobs = new Map();
  let offset = 0;
  while (offset < output.length) {
    const lineEnd = output.indexOf(0x0a, offset);
    if (lineEnd < 0) break;
    const header = output.subarray(offset, lineEnd).toString("utf-8").split(" ");
    offset = lineEnd + 1;
    if (header[1] !== "blob") continue;
    const size = Number(header[2]);
    blobs.set(header[0], output.subarray(offset, offset + size).toString("utf-8"));
    offset += size + 1;
  }
  return blobs;
}

/** The files of the working tree or of a commit, and what each declares. */
class TreeReader {
  constructor(cwd, buildModel) {
    this.cwd = cwd;
    this.buildModel = buildModel;
    this.parsed = new Map();
  }

  git(args, input) {
    return execFileSync("git", args, {
      cwd: this.cwd,
      input,
      maxBuffer: MAX_OUTPUT_BYTES,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
  }

  text(args) {
    return this.git(args).toString("utf-8");
  }

  /** What one file declares, and the decision rows it holds. */
  parse(file, text) {
    const model = this.buildModel(new Map([[file, text]]));
    return {
      ids: model.declarations.map(({ id }) => id),
      rows: model.decisions?.rows ?? [],
    };
  }

  /**
   * Each file under the story tree at `commit`. A file is parsed once per path
   * and content, however many heads carry it: most heads share most files.
   */
  atCommit(commit) {
    const entries = this.text(["ls-tree", "-r", "-z", "--full-name", commit, "--", SPEC_DIR])
      .split("\0")
      .flatMap((entry) => {
        const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/s.exec(entry);
        if (match === null) return [];
        const [, blob, file] = match;
        return [{ key: `${blob} ${file}`, blob, file }];
      });
    const missing = entries.filter(({ key }) => !this.parsed.has(key));
    if (missing.length > 0) {
      const blobs = [...new Set(missing.map(({ blob }) => blob))];
      const texts = batchBlobs(this.git(["cat-file", "--batch"], `${blobs.join("\n")}\n`));
      for (const { key, blob, file } of missing) {
        this.parsed.set(key, this.parse(file, texts.get(blob) ?? ""));
      }
    }
    return entries.map(({ key }) => this.parsed.get(key));
  }

  /** Each file under the story tree in the working tree, untracked ones included. */
  inWorkingTree() {
    const files = this.text([
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      SPEC_DIR,
    ])
      .split("\0")
      .filter(Boolean);
    return [...new Set(files)].flatMap((file) => {
      let text;
      try {
        text = readFileSync(path.join(this.cwd, file), "utf-8");
      } catch {
        return [];
      }
      return [this.parse(file, text)];
    });
  }
}

/** Declarations and decision rows over several trees, each row once. */
function combine(trees) {
  const ids = new Set();
  const rows = new Map();
  for (const files of trees) {
    for (const file of files) {
      for (const id of file.ids) ids.add(id);
      for (const row of file.rows) rows.set(`${row.content}\n${row.approach}`, row);
    }
  }
  return {
    declarations: [...ids].map((id) => ({ id, file: "" })),
    decisions: { rows: [...rows.values()] },
  };
}

function declared(files) {
  return new Set(files.flatMap((file) => file.ids));
}

/** Fetches main and every listed head; returns main's ref and each head's commit. */
function fetchHeads(reader, pulls) {
  reader.git([
    "fetch",
    "--quiet",
    "--no-tags",
    "--write-fetch-head",
    "origin",
    `+refs/heads/${MAIN}:refs/remotes/origin/${MAIN}`,
    ...pulls.map((pull) => `refs/pull/${String(pull.number)}/head`),
  ]);
  const fetchHead = readFileSync(
    path.resolve(reader.cwd, reader.text(["rev-parse", "--git-path", "FETCH_HEAD"]).trim()),
    "utf-8",
  );
  return { main: `refs/remotes/origin/${MAIN}`, pulls: fetchedHeads(fetchHead) };
}

function nextCommand(reader, scopes, pulls, allocate) {
  const heads = fetchHeads(reader, pulls);
  const trees = [reader.atCommit(heads.main), reader.inWorkingTree()];
  for (const commit of heads.pulls.values()) trees.push(reader.atCommit(commit));
  const ids = allocateAll(scopes, combine(trees), allocate);
  if (ids === undefined) {
    console.error("A scope has no number left.");
    return 3;
  }
  for (const id of ids) console.log(id);
  return 0;
}

function checkCommand(reader, pulls) {
  try {
    reader.git(["rev-parse", "--verify", "--quiet", "MERGE_HEAD"]);
    console.error("Finish the merge before checking branch-owned identifiers.");
    return 2;
  } catch (cause) {
    if (cause?.status !== 1) throw cause;
  }
  const heads = fetchHeads(reader, pulls);
  const base = declared(reader.atCommit(reader.text(["merge-base", "HEAD", heads.main]).trim()));
  const mine = added(declared(reader.inWorkingTree()), base);
  const isAncestorOfHead = (commit) => {
    try {
      reader.git(["merge-base", "--is-ancestor", commit, "HEAD"]);
      return true;
    } catch (cause) {
      if (cause?.status === 1) return false;
      throw cause;
    }
  };
  const others = [
    { label: MAIN, ids: added(declared(reader.atCommit(heads.main)), base) },
    ...otherHeads(pulls, heads.pulls, isAncestorOfHead).map(({ label, commit }) => ({
      label,
      ids: added(declared(reader.atCommit(commit)), base),
    })),
  ];
  const found = collisions(mine, others);
  if (found.length === 0) {
    console.log(`No ID this branch adds is taken elsewhere (${String(mine.size)} checked).`);
    return 0;
  }
  for (const { id, heads: where } of found) {
    console.log(`${id} is also added by ${where.join(", ")}`);
  }
  console.error("Renumber these with `node scripts/story-ids.mjs next <scope>`.");
  return 1;
}

/**
 * The open pull requests, from one REST call through `gh-budget.mjs`.
 *
 * Returns the exit code the call left and the listing, which is present even
 * when the call left the budget below the reserve.
 */
function listOpenPulls(cwd) {
  let slug;
  try {
    slug = repoSlug(
      execFileSync("git", ["remote", "get-url", "origin"], { cwd, encoding: "utf-8" }),
    );
  } catch {
    slug = undefined;
  }
  if (slug === undefined) {
    console.error("The `origin` remote does not name a GitHub repository.");
    return { code: 2, pulls: undefined };
  }
  let pulls;
  const code = callAndReport(
    `repos/${slug}/pulls?state=open&sort=updated&direction=desc&per_page=${String(PULLS_PER_PAGE)}`,
    (body) => {
      pulls = pullsFrom(body);
      if (pulls !== undefined) return 0;
      console.error("The response body is not a pull request listing.");
      return 2;
    },
    console.error,
  );
  return { code, pulls };
}

const USAGE = [
  "Usage:",
  "  node scripts/story-ids.mjs next <scope>...",
  "  node scripts/story-ids.mjs check",
  "check: finish any pending merge first; an unfinished merge exits 2.",
  "Scopes: DEC, OQ, BF, US-<flow>, AC-<flow>-<story>, EX-<flow>-<story>, BR-<contract>",
].join("\n");

/** The package's story-tree parser, which is TypeScript. */
function loadStoryTree() {
  return import("../packages/qfai/src/core/storyTree/tree.ts");
}

/**
 * Runs one command. `options.cwd` is the repository to read, and
 * `options.list` and `options.loadTree` replace the REST listing and the
 * parser; all three exist for the tests.
 */
export async function run(argv, options = {}) {
  const [command, ...rest] = argv;
  const scopes = rest.map(parseScope);
  const valid =
    (command === "next" && scopes.length > 0 && scopes.every((scope) => scope !== undefined)) ||
    (command === "check" && rest.length === 0);
  if (!valid) {
    console.error(USAGE);
    return 2;
  }

  // Loaded before the listing, so a runtime that cannot run it spends no call.
  let tree;
  try {
    tree = await (options.loadTree ?? loadStoryTree)();
  } catch (cause) {
    console.error(`The story-tree parser did not load: ${String(cause?.message ?? cause)}`);
    console.error("This tool needs Node.js 22.18 or later and the installed dependencies.");
    return 2;
  }
  const { buildStoryTreeModel, nextStoryTreeId } = tree;

  const cwd = options.cwd ?? ROOT;
  const { code: listed, pulls } = (options.list ?? listOpenPulls)(cwd);
  if (pulls === undefined) return listed;

  const reader = new TreeReader(cwd, buildStoryTreeModel);
  let code;
  try {
    code =
      command === "next"
        ? nextCommand(reader, scopes, pulls, nextStoryTreeId)
        : checkCommand(reader, pulls);
  } catch (cause) {
    const stderr = cause?.stderr === undefined ? "" : String(cause.stderr).trim();
    console.error(stderr === "" ? String(cause?.message ?? cause) : stderr);
    return 2;
  }
  return code === 0 ? listed : code;
}

// `pathToFileURL`, not `file://` + the path: see `scriptEntryGuard.test.ts`.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // The story-tree parser is TypeScript that imports its siblings as `./x.js`.
  register("./lib/ts-specifier-hook.mjs", import.meta.url);
  process.exitCode = await run(process.argv.slice(2));
}
