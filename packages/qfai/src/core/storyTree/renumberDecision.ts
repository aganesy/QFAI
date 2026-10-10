import { execFile } from "node:child_process";
import { lstat, readlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { readBoundedRegularFile } from "../../shared/boundedRead.js";
import { isStoryTreeId } from "./ids.js";
import { parseRecordTable } from "./tables.js";
import { buildStoryTreeModel, nextStoryTreeId } from "./tree.js";

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

function records(source: string, file: string) {
  const parsed = parseRecordTable(source, "decisions");
  if (parsed.errors.length)
    throw new Error(`Malformed or duplicate decisions in ${file}: ${parsed.errors.join("; ")}`);
  return parsed.rows;
}

async function fixedSpecTexts(
  root: string,
  sha: string,
  specs: string,
): Promise<Map<string, string>> {
  const listing = await git(root, ["ls-tree", "-r", "-z", sha, "--", specs]);
  const entries = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(listing);
  const files = new Map<string, string>();
  for (const entry of entries.split("\0").filter(Boolean)) {
    const match = /^[0-7]+ blob ([a-f0-9]+)\t(.+)$/.exec(entry);
    if (!match?.[1] || !match[2]) throw new Error(`The fixed story tree has a non-blob: ${specs}`);
    const file = match[2];
    if (!SUFFIXES.has(path.extname(file).toLowerCase())) continue;
    files.set(file, text(await git(root, ["cat-file", "blob", match[1]]), file));
  }
  return files;
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
  const root = (await git(path.resolve(options.root), ["rev-parse", "--show-toplevel"]))
    .toString()
    .trim();
  const specs = path
    .relative(root, path.resolve(options.root, options.specsDir))
    .split(path.sep)
    .join("/");
  if (specs === ".." || specs.startsWith("../") || path.isAbsolute(specs))
    throw new Error("The story tree must be inside the repository.");
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
  const headRows = records(text(headBytes, decisionFile), decisionFile);
  const ancestorRows = ancestorBytes
    ? records(text(ancestorBytes, decisionFile), decisionFile)
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
    if (ledger !== undefined) records(ledger, decisionFile);
    const model = buildStoryTreeModel(specTexts, { specsDir: specs });
    highest = Math.max(highest, Number(nextStoryTreeId(model, "DEC").slice(4)) - 1);
    for (const rule of model.rules) {
      for (const reference of rule.statement.matchAll(/(?<![A-Za-z0-9_-])DEC-(\d{4})(?![0-9-])/g))
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
  if (!changes.some((change) => change.file === decisionFile))
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
