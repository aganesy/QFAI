import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { buildStoryTreeModel, type StoryTreeModel } from "./tree.js";

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

async function git(root: string, args: string[]): Promise<Buffer> {
  try {
    const result = await execute("git", ["--literal-pathspecs", ...args], {
      cwd: root,
      encoding: "buffer",
      maxBuffer: MAX_BYTES + 1024 * 1024,
    });
    if (result.stderr.toString().includes("ambiguous")) throw new Error("Ambiguous Git ref.");
    return result.stdout;
  } catch (error) {
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
