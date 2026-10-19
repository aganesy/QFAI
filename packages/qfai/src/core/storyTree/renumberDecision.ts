import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs, {
  lstat,
  mkdir,
  readlink,
  readdir,
  rmdir,
  unlink,
  writeFile,
  type FileHandle,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { readBoundedRegularFile } from "../../shared/boundedRead.js";
import { defaultConfig } from "../config.js";
import { isStoryTreeId } from "./ids.js";
import {
  classifyRecordRow,
  decisionPagePaths,
  diffRecordRows,
  parseDecisionRegister,
  type DecisionRegister,
} from "./tables.js";
import {
  buildStoryTreeModel,
  nextStoryTreeId,
  readStoryTreeModel,
  type StoryTreeModel,
} from "./tree.js";

const execute = promisify(execFile);
const MAX_BYTES = 16 * 1024 * 1024;
const SUFFIXES = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".sql",
]);

export type DecisionRenumberOptions = {
  root: string;
  specsDir: string;
  from: string;
  to: string;
  base: string;
};
export type DecisionRenumberPlan = {
  readonly root: string;
  readonly headSha: string;
  readonly baseSha: string;
  readonly ancestorSha: string;
  readonly baseRef: string;
  readonly from: string;
  readonly to: string;
  readonly changes: readonly {
    readonly file: string;
    readonly original: Buffer;
    readonly replacement: Buffer;
    readonly count: number;
  }[];
};
export type DecisionRenumberIO = {
  readFile?: (file: string) => Promise<Buffer>;
  writeFile?: (file: string, contents: Buffer) => Promise<void>;
};

async function git(
  root: string,
  args: string[],
  emptyAllowed = false,
  maxBuffer = MAX_BYTES + 1024 * 1024,
): Promise<Buffer> {
  try {
    const result = await execute("git", ["--literal-pathspecs", ...args], {
      cwd: root,
      encoding: "buffer",
      maxBuffer,
    });
    if (result.stderr.toString().includes("ambiguous")) throw new Error("Ambiguous Git ref.");
    return result.stdout;
  } catch (error) {
    if (
      emptyAllowed &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 1 &&
      "stderr" in error &&
      String(error.stderr) === ""
    )
      return Buffer.alloc(0);
    throw new Error(
      `Git could not resolve or read the local repository: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

async function commit(root: string, ref: string): Promise<string> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref))
    throw new Error("Base must name an unambiguous local ref.");
  const value = (await git(root, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]))
    .toString()
    .trim();
  if (!/^[a-f0-9]{40,64}$/.test(value)) throw new Error("Git ref did not resolve to one commit.");
  return value;
}

/**
 * The repository's top level and each directory as a repository-relative POSIX path; a directory
 * outside the repository is refused.
 */
async function repositoryPaths(
  projectRoot: string,
  directories: readonly string[],
): Promise<{ root: string; relative: string[] }> {
  const root = (await git(path.resolve(projectRoot), ["rev-parse", "--show-toplevel"]))
    .toString()
    .trim();
  const relative = directories.map((directory) => {
    const value = path
      .relative(root, path.resolve(projectRoot, directory))
      .split(path.sep)
      .join("/");
    if (value === ".." || value.startsWith("../") || path.isAbsolute(value))
      throw new Error("The story tree must be inside the repository.");
    return value;
  });
  return { root, relative };
}

function token(id: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_-])${id}(?![\\p{L}\\p{N}_-])`, "gu");
}

function text(bytes: Buffer, file: string): string {
  if (bytes.length > MAX_BYTES) throw new Error(`Candidate exceeds 16 MiB: ${file}`);
  try {
    const value = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    if (value.includes("\0")) throw new Error("binary content");
    return value;
  } catch {
    throw new Error(`Candidate is not UTF-8 text: ${file}`);
  }
}

async function blob(root: string, sha: string, file: string): Promise<Buffer | undefined> {
  const names = await git(root, ["ls-tree", "-z", sha, "--", file]);
  if (names.length === 0) return undefined;
  const match = /^[0-7]+ blob ([a-f0-9]+)\t/.exec(names.toString());
  if (!match?.[1]) throw new Error(`Candidate is not a tracked blob: ${file}`);
  return git(root, ["cat-file", "blob", match[1]]);
}

async function regular(root: string, file: string): Promise<void> {
  const relative = path.relative(root, path.resolve(root, file));
  if (
    relative === "" ||
    relative.startsWith(`..${path.sep}`) ||
    relative === ".." ||
    path.isAbsolute(relative)
  )
    throw new Error(`Candidate is outside the repository: ${file}`);
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    const stats = await lstat(current);
    if (stats.isSymbolicLink()) throw new Error(`Linked candidate path: ${file}`);
    if (current === path.resolve(root, file) && !stats.isFile())
      throw new Error(`Candidate is not a regular file: ${file}`);
    if (current === path.resolve(root, file) && stats.nlink > 1)
      throw new Error(`Hardlinked candidate path: ${file}`);
  }
}

async function original(root: string, file: string): Promise<Buffer> {
  await regular(root, file);
  const bytes = await readBoundedRegularFile(path.resolve(root, file), MAX_BYTES);
  if (bytes === undefined)
    throw new Error(`Candidate is unreadable, oversized or not regular: ${file}`);
  return bytes;
}

async function inspectLinkPointer(root: string, file: string, id: string): Promise<void> {
  let current = root;
  for (const part of file.split("/")) {
    current = path.join(current, part);
    const stats = await lstat(current).catch((failure: unknown) => {
      if (
        typeof failure === "object" &&
        failure !== null &&
        "code" in failure &&
        failure.code === "ENOENT"
      )
        return undefined;
      throw failure;
    });
    if (!stats) return;
    if (!stats.isSymbolicLink()) continue;
    const pointer = await readlink(current);
    if (token(id).test(pointer) || token(id).test(file))
      throw new Error(`Linked candidate path: ${file}`);
    return;
  }
}

async function matchingFiles(root: string, id: string, sha?: string): Promise<string[]> {
  const output = await git(
    root,
    [
      "grep",
      "--no-textconv",
      "-l",
      "-z",
      "-E",
      ...(sha ? [] : ["--no-index", "--exclude-standard"]),
      "-e",
      `(^|[^[:alnum:]_-])${id}([^[:alnum:]_-]|$)`,
      ...(sha ? [sha] : []),
      "--",
      ...(sha ? [] : ["."]),
    ],
    true,
  );
  return output
    .toString()
    .split("\0")
    .filter(Boolean)
    .map((file) => (sha ? file.slice(sha.length + 1) : file.replace(/^\.\//, "")));
}

function records(files: ReadonlyMap<string, string>, file: string) {
  const parsed = parseDecisionRegister(files, file);
  if (!parsed.complete || parsed.table.errors.length)
    throw new Error(
      `Malformed or duplicate decisions in ${file}: ${[...parsed.table.errors, ...parsed.errors.map(({ message }) => message)].join("; ")}`,
    );
  return parsed.table.rows;
}

/**
 * The contents of the blobs, in order, from one `git cat-file --batch` process: each answer is
 * `<sha> blob <size>\n<bytes>\n`.
 */
async function blobContents(root: string, shas: readonly string[]): Promise<Buffer[]> {
  if (shas.length === 0) return [];
  const child = spawn("git", ["cat-file", "--batch"], { cwd: root });
  const output: Buffer[] = [];
  const failure: Buffer[] = [];
  child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => failure.push(chunk));
  const closed = new Promise<number | null>((resolve, reject) => {
    child.on("error", (failed) =>
      reject(
        new Error(`Git could not resolve or read the local repository: ${failed.message}`, {
          cause: failed,
        }),
      ),
    );
    child.on("close", resolve);
  });
  // A write error ends in the exit code checked below.
  child.stdin.on("error", () => undefined);
  child.stdin.end(shas.map((sha) => `${sha}\n`).join(""));
  const code = await closed;
  if (code !== 0)
    throw new Error(
      `Git could not read the fixed story tree: ${Buffer.concat(failure).toString().trim()}`,
    );
  const bytes = Buffer.concat(output);
  const blobs: Buffer[] = [];
  let offset = 0;
  for (const sha of shas) {
    const newline = bytes.indexOf(0x0a, offset);
    const header = /^([a-f0-9]+) blob (\d+)$/.exec(
      newline < 0 ? "" : bytes.subarray(offset, newline).toString(),
    );
    if (!header?.[2] || header[1] !== sha)
      throw new Error(`Git returned no blob for a fixed story-tree file: ${sha}`);
    const begin = newline + 1;
    const size = Number(header[2]);
    if (begin + size > bytes.length)
      throw new Error(`Git returned a truncated blob for a fixed story-tree file: ${sha}`);
    if (bytes[begin + size] !== 0x0a)
      throw new Error(`Git returned a malformed blob for a fixed story-tree file: ${sha}`);
    blobs.push(bytes.subarray(begin, begin + size));
    offset = begin + size + 1;
  }
  if (offset !== bytes.length)
    throw new Error("Git returned more output than the fixed story-tree files it was asked for.");
  return blobs;
}

/**
 * The text files under the story-tree directories at a fixed commit, read in a fixed number of Git
 * processes: one listing of the path components, one recursive listing and one batch read.
 *
 * Each file is capped at 16 MiB and the batch read holds every selected file in memory at once.
 * The per-file cap is the deliberate ceiling: no total is enforced, because a story tree holds
 * Markdown and contract files far below it; a tree whose total approaches the memory of the host
 * would need a streaming read instead.
 */
async function fixedSpecTexts(
  root: string,
  sha: string,
  specs: string,
  additional: readonly string[] = [],
): Promise<Map<string, string>> {
  const directories = [specs, ...additional];
  const components = new Set<string>();
  for (const directory of directories) {
    let component = "";
    for (const part of directory.split("/").filter(Boolean)) {
      component = component ? path.posix.join(component, part) : part;
      components.add(component);
    }
  }
  if (components.size > 0) {
    // With nested paths, Git lists an intermediate tree's children instead of the tree itself; a
    // component listed as an entry must be a tree, and one listed through its children is one.
    const listed = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      await git(root, ["ls-tree", "-z", sha, "--", ...components]),
    );
    for (const entry of listed.split("\0").filter(Boolean)) {
      const separator = entry.indexOf("\t");
      const name = entry.slice(separator + 1);
      if (components.has(name) && !/^040000 tree [a-f0-9]+$/.test(entry.slice(0, separator)))
        throw new Error(`Unsafe fixed story-tree directory: ${name}`);
    }
  }
  // An empty relative path is the repository root, which Git names `.`.
  const pathspecs = directories.map((directory) => directory || ".");
  const listing = await git(root, ["ls-tree", "-r", "-l", "-z", sha, "--", ...pathspecs]);
  const entries = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(listing);
  const decisionPages = `${path.posix.join(specs, "decisions")}/`;
  const wanted = new Map<string, string>();
  for (const entry of entries.split("\0").filter(Boolean)) {
    const match = /^([0-7]+) blob ([a-f0-9]+) +(\d+)\t(.+)$/.exec(entry);
    if (!match?.[1] || !match[2] || !match[3] || !match[4])
      throw new Error(
        `The fixed story tree has a non-blob: ${entry.slice(entry.indexOf("\t") + 1)}`,
      );
    const file = match[4];
    if (
      (file === path.posix.join(specs, "decisions.md") || file.startsWith(decisionPages)) &&
      !/^100[0-7]{3}$/.test(match[1])
    )
      throw new Error(`Linked decision path in fixed tree: ${file}`);
    if (!SUFFIXES.has(path.extname(file).toLowerCase()) && !file.startsWith(decisionPages))
      continue;
    if (Number(match[3]) > MAX_BYTES) throw new Error(`Candidate exceeds 16 MiB: ${file}`);
    wanted.set(file, match[2]);
  }
  const contents = await blobContents(root, [...wanted.values()]);
  const files = new Map<string, string>();
  for (const [index, file] of [...wanted.keys()].entries()) {
    const content = contents[index];
    if (content === undefined)
      throw new Error(`Git returned no blob for a fixed story-tree file: ${file}`);
    files.set(file, text(content, file));
  }
  return files;
}

/**
 * The story tree a local ref's commit holds, read from Git objects alone: no file in the working
 * tree is read or written, and no remote is asked.
 */
export async function readStoryTreeAtRef(options: {
  root: string;
  ref: string;
  specsDir: string;
  contractsDir: string;
}): Promise<{ sha: string; model: StoryTreeModel }> {
  const {
    root,
    relative: [specs = "", contracts = ""],
  } = await repositoryPaths(options.root, [options.specsDir, options.contractsDir]);
  const sha = await commit(root, options.ref);
  const contractsInside = specs === "" || contracts === specs || contracts.startsWith(`${specs}/`);
  const files = await fixedSpecTexts(root, sha, specs, contractsInside ? [] : [contracts]);
  return { sha, model: buildStoryTreeModel(files, { specsDir: specs, contractsDir: contracts }) };
}

/** Invocation-bound evidence supplied only after an independent receipt review and adoption. */
export type DecisionPageMigrationReceipt = {
  root: string;
  specsDir: string;
  baseRef: string;
  sourceBaselineSha: string;
  headSha: string;
  baseSha: string;
  ancestorSha: string;
  requestId: string;
  requestFirstThreeCellsSha256: string;
  historicalSource: { commit: string; path: string; sha256: string };
  occurrences: {
    originalOrdinal: number;
    originalPath: string;
    originalLine: number;
    raw: Buffer;
    destinationPath: string;
    destinationLine: number;
  }[];
  files: { file: string; original: Buffer | null; replacement: Buffer }[];
};
export type DecisionPageMigrationOptions = {
  root: string;
  specsDir: string;
  base: string;
  receipt: DecisionPageMigrationReceipt;
  adoptedReceiptSha256: string;
};
export type DecisionPageMigrationPlan = {
  root: string;
  specsDir: string;
  baseRef: string;
  receipt: DecisionPageMigrationReceipt;
  receiptSha256: string;
};
export type DecisionPageMigrationIO = {
  readFile?: (file: string) => Promise<Buffer>;
  writeFile?: (file: string, contents: Buffer) => Promise<void>;
  removeFile?: (file: string) => Promise<void>;
};

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function closedKeys(value: object, keys: readonly string[]): void {
  if (Object.keys(value).sort().join("\n") !== [...keys].sort().join("\n"))
    throw new Error("The adopted receipt has unknown or missing fields");
}

/** The externally adopted digest covers context as well as every input and replacement byte. */
function pageReceiptHash(receipt: DecisionPageMigrationReceipt): string {
  closedKeys(receipt, [
    "root",
    "specsDir",
    "baseRef",
    "sourceBaselineSha",
    "headSha",
    "baseSha",
    "ancestorSha",
    "requestId",
    "requestFirstThreeCellsSha256",
    "historicalSource",
    "occurrences",
    "files",
  ]);
  closedKeys(receipt.historicalSource, ["commit", "path", "sha256"]);
  const occurrences = receipt.occurrences.map((item) => {
    closedKeys(item, [
      "originalOrdinal",
      "originalPath",
      "originalLine",
      "raw",
      "destinationPath",
      "destinationLine",
    ]);
    if (!Buffer.isBuffer(item.raw)) throw new Error("Historical occurrence bytes are missing");
    return {
      originalOrdinal: item.originalOrdinal,
      originalPath: item.originalPath,
      originalLine: item.originalLine,
      raw: item.raw.toString("base64"),
      destinationPath: item.destinationPath,
      destinationLine: item.destinationLine,
    };
  });
  const files = receipt.files.map((file) => {
    closedKeys(file, ["file", "original", "replacement"]);
    if (
      (file.original !== null && !Buffer.isBuffer(file.original)) ||
      !Buffer.isBuffer(file.replacement)
    )
      throw new Error("Receipt file bytes are missing");
    return {
      file: file.file,
      original: file.original === null ? null : file.original.toString("base64"),
      replacement: file.replacement.toString("base64"),
    };
  });
  return sha256(
    JSON.stringify({
      root: receipt.root,
      specsDir: receipt.specsDir,
      baseRef: receipt.baseRef,
      sourceBaselineSha: receipt.sourceBaselineSha,
      headSha: receipt.headSha,
      baseSha: receipt.baseSha,
      ancestorSha: receipt.ancestorSha,
      requestId: receipt.requestId,
      requestFirstThreeCellsSha256: receipt.requestFirstThreeCellsSha256,
      historicalSource: {
        commit: receipt.historicalSource.commit,
        path: receipt.historicalSource.path,
        sha256: receipt.historicalSource.sha256,
      },
      occurrences,
      files,
    }),
  );
}

/** Copy every authority byte synchronously, before any caller-controlled await. */
function snapshotPageReceipt(input: DecisionPageMigrationReceipt): DecisionPageMigrationReceipt {
  const digest = pageReceiptHash(input);
  const receipt: DecisionPageMigrationReceipt = {
    root: input.root,
    specsDir: input.specsDir,
    baseRef: input.baseRef,
    sourceBaselineSha: input.sourceBaselineSha,
    headSha: input.headSha,
    baseSha: input.baseSha,
    ancestorSha: input.ancestorSha,
    requestId: input.requestId,
    requestFirstThreeCellsSha256: input.requestFirstThreeCellsSha256,
    historicalSource: {
      commit: input.historicalSource.commit,
      path: input.historicalSource.path,
      sha256: input.historicalSource.sha256,
    },
    occurrences: input.occurrences.map((item) => ({
      originalOrdinal: item.originalOrdinal,
      originalPath: item.originalPath,
      originalLine: item.originalLine,
      raw: Buffer.from(item.raw),
      destinationPath: item.destinationPath,
      destinationLine: item.destinationLine,
    })),
    files: input.files.map((file) => ({
      file: file.file,
      original: file.original === null ? null : Buffer.from(file.original),
      replacement: Buffer.from(file.replacement),
    })),
  };
  if (pageReceiptHash(receipt) !== digest)
    throw new Error("Receipt mutated while taking its local snapshot");
  return receipt;
}

function readableRegister(files: ReadonlyMap<string, string>, rootFile: string): DecisionRegister {
  const register = parseDecisionRegister(files, rootFile);
  // Duplicate diagnostics stay active. Moving every duplicate occurrence is permitted;
  // invalid cells or an incomplete inventory are not.
  const invalid = register.table.errors.filter(
    (error) => !/declares DEC-\d{4} more than once/.test(error),
  );
  if (!register.complete || invalid.length > 0)
    throw new Error(
      `Incomplete or invalid decision register: ${[...invalid, ...register.errors.map(({ message }) => message)].join("; ")}`,
    );
  return register;
}

async function absentDecisionPage(root: string, file: string): Promise<void> {
  const relative = path.relative(root, path.resolve(root, file));
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error(`Unsafe destination: ${file}`);
  let current = root;
  for (const [index, part] of relative.split(path.sep).entries()) {
    current = path.join(current, part);
    const stats = await lstat(current).catch((failure: unknown) => {
      if (failure instanceof Error && "code" in failure && failure.code === "ENOENT")
        return undefined;
      throw failure;
    });
    if (!stats) return;
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      if (index === relative.split(path.sep).length - 1)
        throw new Error(`Unexpected existing destination: ${file}`);
      throw new Error(`Linked or non-directory destination component: ${file}`);
    }
    if (index === relative.split(path.sep).length - 1)
      throw new Error(`Unexpected existing destination: ${file}`);
  }
}

async function pageReceiptRefs(
  root: string,
  baseRef: string,
  receipt: DecisionPageMigrationReceipt,
): Promise<void> {
  if (
    (await commit(root, "HEAD")) !== receipt.headSha ||
    (await commit(root, baseRef)) !== receipt.baseSha
  )
    throw new Error("Stale receipt: HEAD or base changed");
  const ancestors = (await git(root, ["merge-base", "--all", receipt.headSha, receipt.baseSha]))
    .toString()
    .trim()
    .split(/\s+/);
  if (ancestors.length !== 1 || ancestors[0] !== receipt.ancestorSha)
    throw new Error("The receipt requires its exact unique common ancestor");
}

/** Validates this closed four-path operation without writing or inventing review approval. */
export async function buildDecisionPageMigrationPlan(
  input: DecisionPageMigrationOptions,
): Promise<DecisionPageMigrationPlan> {
  const options: DecisionPageMigrationOptions = {
    root: input.root,
    specsDir: input.specsDir,
    base: input.base,
    adoptedReceiptSha256: input.adoptedReceiptSha256,
    receipt: snapshotPageReceipt(input.receipt),
  };
  const { receipt } = options;
  const digest = pageReceiptHash(receipt);
  if (
    !/^[a-f0-9]{64}$/.test(options.adoptedReceiptSha256) ||
    digest !== options.adoptedReceiptSha256
  )
    throw new Error("An explicit independently adopted receipt SHA-256 is required");
  const root = path.resolve(options.root);
  const specsDir = path
    .relative(root, path.resolve(root, options.specsDir))
    .split(path.sep)
    .join("/");
  if (
    specsDir === ".." ||
    specsDir.startsWith("../") ||
    path.isAbsolute(specsDir) ||
    receipt.root !== root ||
    receipt.specsDir !== specsDir ||
    receipt.baseRef !== options.base
  )
    throw new Error("The receipt context does not match this repository operation");
  const rootFile = path.posix.join(specsDir, "decisions.md");
  const pages = [1, 2, 3].map((number) =>
    path.posix.join(specsDir, "decisions", `page-${String(number).padStart(4, "0")}.md`),
  );
  if (receipt.files.map(({ file }) => file).join("\n") !== [...pages, rootFile].join("\n"))
    throw new Error("The receipt requires exactly its three historical pages followed by the root");
  if (receipt.historicalSource.path !== rootFile || !isStoryTreeId(receipt.requestId, "DEC"))
    throw new Error("Invalid historical source or execution request");
  await regular(root, rootFile);
  await pageReceiptRefs(root, options.base, receipt);
  for (const revision of [receipt.sourceBaselineSha, receipt.historicalSource.commit]) {
    if ((await commit(root, revision)) !== revision)
      throw new Error("Receipt source must name a fixed commit");
    await git(root, ["merge-base", "--is-ancestor", revision, receipt.headSha]);
  }
  const directory = path.join(root, specsDir, "decisions");
  const existingDirectory = await lstat(directory).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  });
  if (existingDirectory)
    throw new Error("The separately adopted new decision-directory destination must be absent");
  const originals = new Map<string, string>();
  const replacements = new Map<string, string>();
  for (const file of receipt.files) {
    replacements.set(file.file, text(file.replacement, file.file));
    const committed = await blob(root, receipt.headSha, file.file);
    if (file.file === rootFile) {
      if (
        !file.original ||
        !committed ||
        !committed.equals(file.original) ||
        !(await original(root, file.file)).equals(file.original)
      )
        throw new Error(`Stale or missing source bytes: ${file.file}`);
      originals.set(file.file, text(file.original, file.file));
    } else {
      if (file.original !== null || committed !== undefined)
        throw new Error(`Destination must be absent: ${file.file}`);
      await absentDecisionPage(root, file.file);
    }
    if (
      (await git(root, ["diff", "--cached", "--name-only", receipt.headSha, "--", file.file]))
        .length
    )
      throw new Error(`Stale receipt index: ${file.file}`);
  }
  const current = readableRegister(originals, rootFile);
  const working = await readStoryTreeModel(root, {
    ...defaultConfig,
    paths: {
      ...defaultConfig.paths,
      specsDir,
      contractsDir: path.posix.join(specsDir, "03_contract"),
    },
  });
  if (
    !working.decisionRegisterComplete ||
    working.decisionOccurrences.map(({ raw }) => raw).join("") !==
      current.occurrences.map(({ raw }) => raw).join("")
  )
    throw new Error("The complete working register is unreadable or stale");
  const proposed = readableRegister(replacements, rootFile);
  if (proposed.errors.length > 0)
    throw new Error(
      "Every proposed physical decision document must remain within 500 inclusive lines",
    );
  const rootReplacement = replacements.get(rootFile);
  if (
    rootReplacement === undefined ||
    decisionPagePaths(rootReplacement).paths.join("\n") !==
      pages.map((page) => path.posix.relative(specsDir, page)).join("\n")
  )
    throw new Error(
      "Replacement root must list exactly the three direct historical pages in order",
    );
  const baseline = readableRegister(
    await fixedSpecTexts(root, receipt.sourceBaselineSha, specsDir),
    rootFile,
  );
  const difference = diffRecordRows(baseline.table, current.table, "decisions");
  if (difference.removed.length > 0 || difference.rewritten.length > 0)
    throw new Error("Inherited first-three decision cells changed");
  const requestRows = current.table.rows.filter(({ id }) => id === receipt.requestId);
  const request = requestRows[0];
  if (
    requestRows.length !== 1 ||
    !request ||
    sha256(JSON.stringify([request.id, request.content, request.approach])) !==
      receipt.requestFirstThreeCellsSha256
  )
    throw new Error("Execution request immutable cells do not match the adopted receipt");
  const classified = classifyRecordRow(request);
  const authorityAtBase = readableRegister(
    await fixedSpecTexts(root, receipt.ancestorSha, specsDir),
    rootFile,
  ).table.rows.filter(({ id }) => id === request.id);
  const inheritedRequest = authorityAtBase[0];
  const authorisesBranch =
    request.status === "WIP" || inheritedRequest === undefined || inheritedRequest.status === "WIP";
  if (
    classified.kind !== "change-request" ||
    !classified.inForce ||
    !authorisesBranch ||
    authorityAtBase.length > 1 ||
    authorityAtBase.some(
      (row) =>
        row.status === "DONE" ||
        row.content !== request.content ||
        row.approach !== request.approach,
    )
  )
    throw new Error("No in-force immutable execution request authorizes this operation");
  const currentBase = readableRegister(
    await fixedSpecTexts(root, receipt.baseSha, specsDir),
    rootFile,
  );
  const baseRequests = currentBase.table.rows.filter(({ id }) => id === request.id);
  if (
    baseRequests.length > 1 ||
    baseRequests.some(
      (row) =>
        row.status === "DONE" ||
        row.content !== request.content ||
        row.approach !== request.approach,
    )
  )
    throw new Error("Current base already consumed or changed the immutable execution request");
  if (!receipt.files.every(({ file }) => classified.refs.includes(file)))
    throw new Error("Execution request does not name every exact physical path");
  const historicalBytes = await blob(root, receipt.historicalSource.commit, rootFile);
  if (!historicalBytes || sha256(historicalBytes) !== receipt.historicalSource.sha256)
    throw new Error("Historical source bytes do not match the adopted receipt");
  const historical = readableRegister(
    new Map([[rootFile, text(historicalBytes, rootFile)]]),
    rootFile,
  );
  if (
    receipt.occurrences.length !== historical.occurrences.length ||
    historical.occurrences.length === 0
  )
    throw new Error("Historical occurrence map is incomplete");
  for (const [index, source] of historical.occurrences.entries()) {
    const item = receipt.occurrences[index];
    const before = current.occurrences[index];
    const after = proposed.occurrences[index];
    if (
      !item ||
      !before ||
      !after ||
      item.originalOrdinal !== index + 1 ||
      item.originalPath !== rootFile ||
      item.originalLine !== source.origin.actualRow ||
      !item.raw.equals(Buffer.from(source.raw)) ||
      before.raw !== source.raw ||
      after.raw !== source.raw ||
      !pages.includes(item.destinationPath) ||
      item.destinationPath !== after.origin.path ||
      item.destinationLine !== after.origin.actualRow
    )
      throw new Error("Historical raw occurrence, ending, order or destination changed");
  }
  if (current.occurrences.length !== proposed.occurrences.length)
    throw new Error("The complete logical register lost or gained an occurrence");
  for (const [index, occurrence] of current.occurrences.entries()) {
    const after = proposed.occurrences[index];
    if (
      !after ||
      after.raw !== occurrence.raw ||
      (index >= historical.occurrences.length && after.origin.path !== rootFile)
    )
      throw new Error("Original root-tail bytes or Status changed through relocation");
  }
  await pageReceiptRefs(root, options.base, receipt);
  return { root, specsDir, baseRef: options.base, receipt, receiptSha256: digest };
}

type OwnedPageWrite = {
  file: DecisionPageMigrationReceipt["files"][number];
  handle: FileHandle;
  dev: bigint;
  ino: bigint;
  /** Last exact state proved by our completed writes, never an observed competitor state. */
  expected: Buffer;
};

/** Writes through the opened inode, retaining exact progress if a later write fails. */
async function writeOwnedPage(state: OwnedPageWrite, replacement: Buffer): Promise<void> {
  const initial = state.expected;
  const writeBytes = Buffer.from(replacement);
  let offset = 0;
  while (offset < replacement.length) {
    const { bytesWritten } = await state.handle.write(
      writeBytes,
      offset,
      writeBytes.length - offset,
      offset,
    );
    if (bytesWritten <= 0) throw new Error("Owned write made no progress");
    offset += bytesWritten;
    const proved = Buffer.alloc(Math.max(initial.length, offset));
    initial.copy(proved);
    replacement.copy(proved, 0, 0, offset);
    state.expected = proved;
  }
  await state.handle.truncate(replacement.length);
  state.expected = Buffer.from(replacement);
}

/** Applies only the externally adopted bytes; a mutable or fabricated plan grants no authority. */
export async function applyDecisionPageMigrationPlan(
  input: DecisionPageMigrationPlan,
  adoptedReceiptSha256: string,
  io: DecisionPageMigrationIO = {},
): Promise<void> {
  closedKeys(input, ["root", "specsDir", "baseRef", "receipt", "receiptSha256"]);
  const plan: DecisionPageMigrationPlan = {
    root: input.root,
    specsDir: input.specsDir,
    baseRef: input.baseRef,
    receiptSha256: input.receiptSha256,
    receipt: snapshotPageReceipt(input.receipt),
  };
  const readHook = io.readFile;
  const writeHook = io.writeFile;
  const removeHook = io.removeFile;
  if (plan.receiptSha256 !== adoptedReceiptSha256)
    throw new Error("Plan does not match the externally adopted receipt");
  await buildDecisionPageMigrationPlan({
    root: plan.root,
    specsDir: plan.specsDir,
    base: plan.baseRef,
    receipt: plan.receipt,
    adoptedReceiptSha256,
  });
  const read = async (file: string): Promise<Buffer> => {
    const bytes = readHook
      ? await readHook(file)
      : await original(plan.root, path.relative(plan.root, file));
    if (!Buffer.isBuffer(bytes)) throw new Error("The read callback did not return file bytes");
    return Buffer.from(bytes);
  };
  const directory = path.join(plan.root, plan.specsDir, "decisions");
  const owned: OwnedPageWrite[] = [];
  const handles: { handle: FileHandle; file: string }[] = [];
  const indeterminate: string[] = [];
  let ownedDirectory: { dev: bigint; ino: bigint } | undefined;
  let failureToReport: Error | undefined;
  const sameOwnedInode = async (state: OwnedPageWrite): Promise<void> => {
    const target = path.resolve(plan.root, state.file.file);
    await regular(plan.root, state.file.file);
    const stats = await lstat(target, { bigint: true });
    const handleStats = await state.handle.stat({ bigint: true });
    if (
      stats.dev !== state.dev ||
      stats.ino !== state.ino ||
      handleStats.dev !== state.dev ||
      handleStats.ino !== state.ino
    )
      throw new Error(`Concurrent candidate inode replacement: ${state.file.file}`);
  };
  const check = async () => {
    if (
      pageReceiptHash(plan.receipt) !== adoptedReceiptSha256 ||
      plan.root !== plan.receipt.root ||
      plan.specsDir !== plan.receipt.specsDir ||
      plan.baseRef !== plan.receipt.baseRef
    )
      throw new Error("Stale adopted receipt context");
    await pageReceiptRefs(plan.root, plan.baseRef, plan.receipt);
    if (ownedDirectory) {
      const stats = await lstat(directory, { bigint: true });
      if (
        !stats.isDirectory() ||
        stats.isSymbolicLink() ||
        stats.dev !== ownedDirectory.dev ||
        stats.ino !== ownedDirectory.ino
      )
        throw new Error("Concurrent decision-directory replacement");
      const expected = new Set(
        owned
          .filter(({ file }) => file.original === null)
          .map(({ file }) => path.basename(file.file)),
      );
      if ((await readdir(directory)).some((file) => !expected.has(file)))
        throw new Error("Unexpected concurrent decision-directory entry");
    }
    for (const file of plan.receipt.files) {
      const state = owned.find((candidate) => candidate.file === file);
      const expected = state ? file.replacement : file.original;
      if (expected === null) await absentDecisionPage(plan.root, file.file);
      else {
        if (state) await sameOwnedInode(state);
        else await regular(plan.root, file.file);
        if (!(await read(path.resolve(plan.root, file.file))).equals(expected))
          throw new Error(`Stale candidate bytes: ${file.file}`);
      }
      if (
        (
          await git(plan.root, [
            "diff",
            "--cached",
            "--name-only",
            plan.receipt.headSha,
            "--",
            file.file,
          ])
        ).length
      )
        throw new Error(`Stale candidate index: ${file.file}`);
    }
  };
  await check();
  try {
    await mkdir(directory);
    const stats = await lstat(directory, { bigint: true });
    ownedDirectory = { dev: stats.dev, ino: stats.ino };
    for (const file of plan.receipt.files) {
      await check();
      const target = path.resolve(plan.root, file.file);
      // EEXIST grants no ownership and never enters the rollback set.
      const handle = await fs.open(target, file.original === null ? "wx" : "r+");
      handles.push({ handle, file: file.file });
      indeterminate.push(file.file);
      const handleStats = await handle.stat({ bigint: true });
      const state: OwnedPageWrite = {
        file,
        handle,
        dev: handleStats.dev,
        ino: handleStats.ino,
        expected: file.original === null ? Buffer.alloc(0) : Buffer.from(file.original),
      };
      owned.push(state);
      indeterminate.pop();
      await sameOwnedInode(state);
      if (!(await read(target)).equals(state.expected))
        throw new Error(`Concurrent change after opening candidate: ${file.file}`);
      if (writeHook) {
        await writeHook(target, Buffer.from(file.replacement));
        state.expected = Buffer.from(file.replacement);
      } else await writeOwnedPage(state, file.replacement);
    }
    await check();
  } catch (failure) {
    const unrestored = [...indeterminate];
    for (const state of [...owned].reverse()) {
      const { file } = state;
      try {
        const target = path.resolve(plan.root, file.file);
        if (file.original === null && ownedDirectory) {
          const directoryStats = await lstat(directory, { bigint: true });
          if (
            directoryStats.dev !== ownedDirectory.dev ||
            directoryStats.ino !== ownedDirectory.ino ||
            directoryStats.isSymbolicLink()
          )
            throw new Error("Concurrent destination-directory replacement", { cause: failure });
        }
        await sameOwnedInode(state);
        const bytes = await read(target);
        if (file.original !== null && bytes.equals(file.original)) continue;
        if (!bytes.equals(file.replacement) && !bytes.equals(state.expected)) {
          unrestored.push(file.file);
          continue;
        }
        await sameOwnedInode(state);
        if (file.original === null) {
          if (removeHook) await removeHook(target);
          else await unlink(target);
        } else if (writeHook) await writeHook(target, Buffer.from(file.original));
        else await writeOwnedPage(state, file.original);
      } catch {
        unrestored.push(file.file);
      }
    }
    if (ownedDirectory) {
      try {
        const stats = await lstat(directory, { bigint: true });
        if (
          stats.dev === ownedDirectory.dev &&
          stats.ino === ownedDirectory.ino &&
          !stats.isSymbolicLink() &&
          (await readdir(directory)).length === 0
        )
          await rmdir(directory);
      } catch {
        unrestored.push(path.relative(plan.root, directory));
      }
    }
    failureToReport = new Error(
      `Apply failed: ${failure instanceof Error ? failure.message : String(failure)}; ${unrestored.length ? `unrestored paths: ${unrestored.join(", ")}` : "owned replacement bytes restored"}`,
      { cause: failure },
    );
  } finally {
    for (const { handle, file } of handles) {
      try {
        await handle.close();
      } catch (failure) {
        failureToReport = new Error(
          `${failureToReport?.message ?? "Applied bytes but closing an owned handle failed"}; close failure for ${file}: ${failure instanceof Error ? failure.message : String(failure)}`,
          { cause: failureToReport ?? failure },
        );
      }
    }
  }
  if (failureToReport) throw failureToReport;
}

export async function buildDecisionRenumberPlan(
  options: DecisionRenumberOptions,
): Promise<DecisionRenumberPlan> {
  if (
    !isStoryTreeId(options.from, "DEC") ||
    !isStoryTreeId(options.to, "DEC") ||
    options.from === options.to
  )
    throw new Error("--from and --to require distinct four-digit DEC IDs.");
  const {
    root,
    relative: [specs = ""],
  } = await repositoryPaths(options.root, [options.specsDir]);
  const decisionFile = path.posix.join(specs, "decisions.md");
  const headSha = await commit(root, "HEAD");
  const baseSha = await commit(root, options.base);
  const ancestors = (await git(root, ["merge-base", "--all", headSha, baseSha]))
    .toString()
    .trim()
    .split(/\s+/);
  if (ancestors.length !== 1 || !ancestors[0])
    throw new Error("A unique common ancestor is required.");
  const ancestorSha = ancestors[0];
  const tree = (await git(root, ["ls-tree", "-r", "-z", headSha])).toString().split("\0");
  for (const entry of tree) {
    const link = /^120000 blob ([a-f0-9]+)\t(.+)$/.exec(entry);
    if (!link?.[1] || !link[2]) continue;
    const target = (await git(root, ["cat-file", "blob", link[1]])).toString();
    if (token(options.from).test(target) || token(options.from).test(link[2]))
      throw new Error(`Linked candidate path: ${link[2]}`);
    await inspectLinkPointer(root, link[2], options.from);
  }
  const untracked = (await git(root, ["ls-files", "-z", "--others", "--exclude-standard"]))
    .toString()
    .split("\0")
    .filter(Boolean);
  for (const file of untracked) await inspectLinkPointer(root, file, options.from);
  const headBytes = await blob(root, headSha, decisionFile);
  const ancestorBytes = await blob(root, ancestorSha, decisionFile);
  if (!headBytes) throw new Error("The current story tree has no decisions.md.");
  const headTexts = await fixedSpecTexts(root, headSha, specs);
  const headRows = records(headTexts, decisionFile);
  const ancestorTexts = await fixedSpecTexts(root, ancestorSha, specs);
  const ancestorRows =
    ancestorBytes ||
    [...ancestorTexts.keys()].some((file) =>
      file.startsWith(`${path.posix.join(specs, "decisions")}/`),
    )
      ? records(ancestorTexts, decisionFile)
      : [];
  if (headRows.filter((row) => row.id === options.from).length !== 1)
    throw new Error("The source must be one unique current DEC row.");
  if (ancestorRows.some((row) => row.id === options.from))
    throw new Error("The source DEC is inherited from the common ancestor.");
  for (const row of ancestorRows) {
    const inherited = headRows.find((current) => current.id === row.id);
    if (!inherited || inherited.content !== row.content || inherited.approach !== row.approach)
      throw new Error(`Inherited decision cells changed: ${row.id}`);
  }
  let highest = 0;
  for (const sha of [headSha, baseSha]) {
    const specTexts = await fixedSpecTexts(root, sha, specs);
    for (const [file, source] of specTexts) {
      if (token(options.to).test(source))
        throw new Error(
          `Destination ${options.to} is already used in the fixed story tree: ${file}`,
        );
    }
    const ledger = specTexts.get(decisionFile);
    if (ledger !== undefined) records(specTexts, decisionFile);
    const model = buildStoryTreeModel(specTexts, { specsDir: specs });
    highest = Math.max(highest, Number(nextStoryTreeId(model, "DEC").slice(4)) - 1);
    for (const rule of model.rules) {
      for (const reference of rule.statement.matchAll(
        /(?<![\p{L}\p{N}_-])DEC-(\d{4})(?![\p{L}\p{N}_-])/gu,
      ))
        highest = Math.max(highest, Number(reference[1]));
    }
    for (const row of model.decisions?.rows ?? []) {
      const successor = /^(?:PARTLY )?SUPERSEDED \(by DEC-(\d{4})\)$/.exec(row.status);
      if (successor) highest = Math.max(highest, Number(successor[1]));
    }
  }
  if (Number(options.to.slice(4)) <= highest)
    throw new Error(
      `Destination ${options.to} must be unused and above the highest DEC number (${String(highest).padStart(4, "0")}).`,
    );
  const tracked = new Set((await git(root, ["ls-files", "-z", "--cached"])).toString().split("\0"));
  const inheritedFiles = await matchingFiles(root, options.from, ancestorSha);
  const files = [
    ...new Set([
      decisionFile,
      ...inheritedFiles,
      ...(await matchingFiles(root, options.from, headSha)),
      ...(await matchingFiles(root, options.from)),
    ]),
  ].sort();
  const inheritedLines = new Set<string>();
  for (const file of inheritedFiles) {
    const bytes = await blob(root, ancestorSha, file);
    if (!bytes) continue;
    for (const line of text(bytes, file).split(/\r?\n/))
      if (token(options.from).test(line)) inheritedLines.add(line);
  }
  const changes: DecisionRenumberPlan["changes"][number][] = [];
  for (const file of files) {
    const committed = await blob(root, headSha, file);
    const bytes = await original(root, file);
    const source = text(bytes, file);
    if (!token(options.from).test(source)) {
      if (inheritedFiles.includes(file))
        throw new Error(`Ambiguous or moved inherited reference: ${file}`);
      continue;
    }
    if (!tracked.has(file) || !committed) throw new Error(`Untracked candidate: ${file}`);
    if (!SUFFIXES.has(path.extname(file).toLowerCase()))
      throw new Error(`Unsupported candidate suffix: ${file}`);
    if (
      source.replace(/\r\n/g, "\n") !== text(committed, file).replace(/\r\n/g, "\n") ||
      (
        await git(root, [
          "diff",
          "--no-ext-diff",
          "--no-textconv",
          "--name-only",
          headSha,
          "--",
          file,
        ])
      ).length
    )
      throw new Error(`Dirty candidate: ${file}`);
    const diff = (
      await git(
        root,
        [
          "diff",
          "--no-ext-diff",
          "--no-textconv",
          "--no-renames",
          "--unified=0",
          ancestorSha,
          headSha,
          "--",
          file,
        ],
        false,
        2 * MAX_BYTES + 1024 * 1024,
      )
    ).toString();
    if (/^(?:Binary files |GIT binary patch)/m.test(diff))
      throw new Error(`Ambiguous reference ownership in a binary Git diff: ${file}`);
    const added = new Set<number>();
    for (const line of diff.split("\n")) {
      const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (hunk) for (let n = 0; n < Number(hunk[2] ?? 1); n++) added.add(Number(hunk[1]) + n);
      else if (
        line.startsWith("-") &&
        !line.startsWith("---") &&
        token(options.from).test(line.slice(1))
      )
        throw new Error(`Ambiguous or moved inherited reference: ${file}`);
    }
    let count = 0;
    const replacement = source
      .split(/(?<=\n)/)
      .map((line, index) => {
        if (!added.has(index + 1) || !token(options.from).test(line)) return line;
        if (inheritedLines.has(line.replace(/\r?\n$/, "")))
          throw new Error(`Ambiguous duplicate reference: ${file}`);
        return line.replace(token(options.from), () => {
          count++;
          return options.to;
        });
      })
      .join("");
    if (count)
      changes.push({ file, original: bytes, replacement: Buffer.from(replacement, "utf8"), count });
  }
  const sourceFile = parseDecisionRegister(headTexts, decisionFile).occurrences.find(
    ({ row }) => row.id === options.from,
  )?.origin.path;
  if (!changes.some((change) => change.file === sourceFile))
    throw new Error("The branch-added decision row could not be identified safely.");
  return {
    root,
    headSha,
    baseSha,
    ancestorSha,
    baseRef: options.base,
    from: options.from,
    to: options.to,
    changes,
  };
}

export async function applyDecisionRenumberPlan(
  plan: DecisionRenumberPlan,
  io: DecisionRenumberIO = {},
): Promise<void> {
  const read = io.readFile ?? ((file) => original(plan.root, path.relative(plan.root, file)));
  const write = io.writeFile ?? writeFile;
  const checkRefs = async () => {
    if (
      (await commit(plan.root, "HEAD")) !== plan.headSha ||
      (await commit(plan.root, plan.baseRef)) !== plan.baseSha
    )
      throw new Error("Stale plan: HEAD or base changed.");
  };
  const checkOriginal = async (change: DecisionRenumberPlan["changes"][number]) => {
    await regular(plan.root, change.file);
    if (!(await read(path.resolve(plan.root, change.file))).equals(change.original))
      throw new Error(`Stale candidate bytes: ${change.file}`);
    if (
      (await git(plan.root, ["diff", "--cached", "--name-only", plan.headSha, "--", change.file]))
        .length
    )
      throw new Error(`Stale candidate index: ${change.file}`);
  };
  await checkRefs();
  for (const change of plan.changes) await checkOriginal(change);
  const attempted: DecisionRenumberPlan["changes"][number][] = [];
  try {
    for (const change of plan.changes) {
      await checkRefs();
      await checkOriginal(change);
      attempted.push(change);
      await write(path.resolve(plan.root, change.file), change.replacement);
    }
  } catch (failure) {
    const unrestored: string[] = [];
    for (const change of attempted.reverse()) {
      try {
        await regular(plan.root, change.file);
        const file = path.resolve(plan.root, change.file);
        const current = await read(file);
        if (current.equals(change.original)) continue;
        if (!current.equals(change.replacement)) {
          unrestored.push(change.file);
          continue;
        }
        await write(file, change.original);
      } catch {
        unrestored.push(change.file);
      }
    }
    throw new Error(
      `Apply failed: ${failure instanceof Error ? failure.message : String(failure)}${unrestored.length ? `; unrestored paths: ${unrestored.join(", ")}` : "; earlier writes restored"}`,
      { cause: failure },
    );
  }
}
