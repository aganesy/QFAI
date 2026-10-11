/**
 * Merge the live origin default branch, reseal its pins and commit the complete merge.
 * Usage: pnpm branch:catchup [--push]
 * Refusals preserve the current merge and edits. Observations are not an atomic snapshot.
 */
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readBoundedText } from "./lib/bounded-read.mjs";

const OUTPUTS = [
  ".github/pinned-bytes.txt",
  ".github/required-status-contexts.json",
  ".github/workflows/ci.yml",
  ".github/lifecycle-manifests.txt",
];
const INPUTS = [
  "scripts/check-toolchain-action.sh",
  ".github/pinned-bytes.txt",
  ".github/lifecycle-manifests.txt",
  ".github/command-files.txt",
];
const WRITERS = ["scripts/pin-guard-bytes.mjs", "scripts/pin-verification-bodies.mjs"];
const MAX_BYTES = 64 * 1024 * 1024;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function refuse(message) {
  throw new Error(message);
}

function command(program, args, inherit = false) {
  const result = spawnSync(program, args, {
    cwd: root,
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    maxBuffer: MAX_BYTES,
  });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) refuse(`${program} stopped by ${result.signal}.`);
  return result;
}

function git(args, allowed = [0]) {
  const result = command("git", args);
  if (!allowed.includes(result.status)) {
    refuse(`git ${args[0]} failed: ${result.stderr?.toString("utf-8").trim() || result.status}`);
  }
  return result;
}

function text(args) {
  return git(args).stdout.toString("utf-8").trim();
}

function regularText(relative) {
  let current = root;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    const stats = lstatSync(current);
    if (stats.isSymbolicLink()) refuse(`${relative} has a linked path component.`);
  }
  if (lstatSync(current).nlink !== 1) refuse(`${relative} must have exactly one hard link.`);
  const value = readBoundedText(current, MAX_BYTES);
  if (value === undefined || value.includes("\uFFFD") || value.includes("\0")) {
    refuse(`${relative} is not readable bounded text.`);
  }
  return value;
}

function dependencies() {
  for (const relative of ["node_modules", "packages/qfai/node_modules"]) {
    const directory = path.join(root, relative);
    let stats;
    try {
      stats = lstatSync(directory);
    } catch {
      refuse(`Dependencies are not installed in this checkout (${relative}).`);
    }
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      refuse(`Dependencies must belong to this checkout (${relative}).`);
    }
  }
  const require = createRequire(
    pathToFileURL(path.join(root, "scripts/lib/require-installed.mjs")),
  );
  for (const specifier of ["prettier", "../../packages/qfai/node_modules/yaml"]) {
    let resolved;
    try {
      resolved = realpathSync(require.resolve(specifier));
    } catch {
      refuse(`Dependencies are not installed in this checkout (${specifier}).`);
    }
    const relative = path.relative(realpathSync(root), resolved);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      refuse(`Dependencies resolve outside this checkout (${specifier}).`);
    }
  }
}

function currentBranch() {
  const result = git(["symbolic-ref", "--quiet", "--short", "HEAD"], [0, 1]);
  if (result.status !== 0) refuse("Catch-up requires an attached branch.");
  return result.stdout.toString("utf-8").trim();
}

function upstream(branch) {
  const remote = git(["config", "--get", `branch.${branch}.remote`], [0, 1]);
  const merge = git(["config", "--get", `branch.${branch}.merge`], [0, 1]);
  if (
    remote.status !== 0 ||
    merge.status !== 0 ||
    remote.stdout.toString("utf-8").trim() !== "origin" ||
    merge.stdout.toString("utf-8").trim() !== `refs/heads/${branch}`
  ) {
    refuse("The upstream must be the same branch name on origin.");
  }
  text(["rev-parse", "--verify", "@{upstream}"]);
}

function mergeHead() {
  const result = git(["rev-parse", "--verify", "--quiet", "MERGE_HEAD"], [0, 1]);
  return result.status === 0 ? result.stdout.toString("utf-8").trim() : "";
}

function pendingOperation() {
  for (const name of [
    "MERGE_HEAD",
    "CHERRY_PICK_HEAD",
    "REVERT_HEAD",
    "rebase-merge",
    "rebase-apply",
    "sequencer",
    "BISECT_START",
  ]) {
    const absolute = path.resolve(root, text(["rev-parse", "--git-path", name]));
    if (existsSync(absolute)) refuse(`Finish the ongoing Git operation before catch-up (${name}).`);
  }
}

const outside = ["--", ".", ...OUTPUTS.map((relative) => `:(exclude)${relative}`)];

function observe() {
  return {
    branch: currentBranch(),
    head: text(["rev-parse", "--verify", "HEAD"]),
    merge: mergeHead(),
    index: git(["ls-files", "--stage", "-z"]).stdout.toString("latin1"),
    conflicts: git(["ls-files", "--unmerged", "-z"]).stdout.toString("latin1"),
    status: git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]).stdout.toString(
      "latin1",
    ),
    outsideStatus: git([
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      ...outside,
    ]).stdout.toString("latin1"),
    outsideDiff: git(["diff", "--binary", "--no-ext-diff", ...outside]).stdout.toString("latin1"),
    files: OUTPUTS.map(regularText),
  };
}

function unchanged(expected) {
  const actual = observe();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    refuse(
      "Observed Git state or target bytes changed; catch-up stopped without discarding edits.",
    );
  }
}

function stableCore(before, after) {
  return ["branch", "head", "merge", "index", "conflicts", "outsideStatus", "outsideDiff"].every(
    (key) => before[key] === after[key],
  );
}

function conflictCandidates(source) {
  const lines = source.match(/[^\n]*(?:\n|$)/g)?.filter((line) => line !== "") ?? [];
  let left = "";
  let right = "";
  let state = "outside";
  let count = 0;
  for (const line of lines) {
    const marker = /^(<{7}|={7}|>{7}|\|{7})(?: |\r?$)/.exec(line.replace(/\n$/, ""));
    if (marker === null) {
      if (state === "outside" || state === "left") left += line;
      if (state === "outside" || state === "right") right += line;
      continue;
    }
    if (marker[1] === "<<<<<<<" && state === "outside") {
      state = "left";
      count += 1;
    } else if (marker[1] === "|||||||" && state === "left") {
      state = "base";
    } else if (marker[1] === "=======" && (state === "left" || state === "base")) {
      state = "right";
    } else if (marker[1] === ">>>>>>>" && state === "right") {
      state = "outside";
    } else {
      refuse("Malformed or ambiguous conflict markers.");
    }
  }
  if (state !== "outside" || count === 0) refuse("Malformed or missing conflict markers.");
  return [left, right];
}

function listShape(source) {
  const paths = new Set();
  const lines = source.match(/[^\n]*(?:\n|$)/g)?.filter((line) => line !== "") ?? [];
  const normalized = lines.map((line) => {
    if (/^\r?\n$/.test(line) || line.startsWith("#")) return line;
    const match = /^([0-9a-f]{64}) {2}([^\r\n]+)(?:\r?\n)?$/.exec(line);
    if (match === null || paths.has(match[2])) refuse("Malformed pinned-byte list.");
    paths.add(match[2]);
    return "0".repeat(64) + line.slice(64);
  });
  if (paths.size === 0) refuse("The pinned-byte list is empty.");
  return { paths: [...paths], normalized: normalized.join("") };
}

function canonicalJson(source) {
  const parsed = JSON.parse(source);
  let compact = "";
  let quoted = false;
  let escaped = false;
  for (const character of source) {
    if (quoted) {
      compact += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') {
      quoted = true;
      compact += character;
    } else if (!/[\t\n\r ]/.test(character)) {
      compact += character;
    }
  }
  if (compact !== JSON.stringify(parsed)) refuse("Duplicate keys or noncanonical JSON values.");
  return parsed;
}

function declarationShape(source, pinnedPaths) {
  const value = canonicalJson(source);
  if (!Array.isArray(value?.contexts) || value.contexts.length === 0) {
    refuse("Unknown status-context declaration structure.");
  }
  for (const context of value.contexts) {
    if (typeof context?.workflow !== "string" || typeof context?.job !== "string") {
      refuse("Unknown status-context identity.");
    }
    const verificationKeys = [
      ...(context.verificationSet ?? []),
      ...Object.keys(context.gatedVerifications ?? {}),
    ];
    for (const [field, length, keys] of [
      ["pinnedBytes", 64, pinnedPaths],
      ["verificationBodies", 16, verificationKeys],
    ]) {
      const map = context[field];
      if (map === null || typeof map !== "object" || Array.isArray(map)) {
        refuse(`Unknown ${field} map.`);
      }
      const expected = new Set(keys);
      if (
        Object.keys(map).length !== expected.size ||
        Object.keys(map).some((key) => !expected.has(key))
      ) {
        refuse(`Changed or unknown ${field} membership.`);
      }
      for (const key of Object.keys(map)) {
        if (typeof map[key] !== "string" || !new RegExp(`^[0-9a-f]{${length}}$`).test(map[key])) {
          refuse(`Malformed ${field} digest.`);
        }
        map[key] = "0".repeat(length);
      }
    }
  }
  return JSON.stringify(value);
}

function workflowShape(source) {
  const opener = /^( *)sha256sum -c --quiet <<'PINNED_INPUTS'\r?$/gm;
  const matches = [...source.matchAll(opener)];
  if (matches.length !== 1) refuse("Unknown PINNED_INPUTS block.");
  const match = matches[0];
  const start = match.index + match[0].length;
  const tail = source.slice(start);
  const end = new RegExp(`^${match[1]}PINNED_INPUTS\\r?$`, "m").exec(tail);
  if (end === null) refuse("Missing PINNED_INPUTS terminator.");
  const block = tail.slice(0, end.index);
  const lines = block
    .replace(/^\r?\n/, "")
    .replace(/\r?\n$/, "")
    .split(/\r?\n/);
  if (lines.length !== INPUTS.length) refuse("Changed PINNED_INPUTS membership.");
  lines.forEach((line, index) => {
    if (!line.startsWith(match[1])) refuse("Unknown PINNED_INPUTS indentation.");
    const entry = /^([0-9a-f]{64}) {2}(.+)$/.exec(line.slice(match[1].length));
    if (entry === null || entry[2] !== INPUTS[index])
      refuse("Changed PINNED_INPUTS target or digest.");
  });
  return (
    source.slice(0, start) + block.replace(/[0-9a-f]{64}/g, "0".repeat(64)) + tail.slice(end.index)
  );
}

function resolutions(observation) {
  const paths = [
    ...new Set(
      observation.conflicts
        .split("\0")
        .filter(Boolean)
        .map((entry) => entry.slice(entry.indexOf("\t") + 1)),
    ),
  ];
  for (const relative of paths) {
    if (!OUTPUTS.slice(0, 3).includes(relative))
      refuse(`Manual conflict resolution required: ${relative}`);
    const entries = observation.conflicts
      .split("\0")
      .filter((entry) => entry.endsWith(`\t${relative}`));
    if (entries.length !== 3 || entries.some((entry) => !/^100644 [0-9a-f]+ [123]\t/.test(entry))) {
      refuse(`Unsupported conflict type: ${relative}`);
    }
  }
  const candidates = new Map(
    paths.map((relative) => [
      relative,
      conflictCandidates(observation.files[OUTPUTS.indexOf(relative)]),
    ]),
  );
  const listCandidates = candidates.get(OUTPUTS[0]) ?? [observation.files[0], observation.files[0]];
  const lists = listCandidates.map(listShape);
  if (lists[0].normalized !== lists[1].normalized)
    refuse("Pinned-byte membership, order or comments changed.");
  for (const [relative, pair] of candidates) {
    let shapes;
    if (relative === OUTPUTS[0]) shapes = lists.map((list) => list.normalized);
    else if (relative === OUTPUTS[1]) {
      // Git may merge semantic edits outside the remaining digest conflicts.
      const versions = [2, 3].map((stage) => {
        const source = git(["show", `:${stage}:${relative}`]).stdout.toString("utf-8");
        if (source.includes("\uFFFD") || source.includes("\0"))
          refuse(`${relative} has an unreadable merge side.`);
        return declarationShape(source, lists[0].paths);
      });
      if (versions[0] !== versions[1])
        refuse(`Non-digest conflict requires manual resolution: ${relative}`);
      shapes = pair.map((source) => declarationShape(source, lists[0].paths));
    } else shapes = pair.map(workflowShape);
    if (shapes[0] !== shapes[1])
      refuse(`Non-digest conflict requires manual resolution: ${relative}`);
  }
  return [...candidates].map(([relative, pair]) => ({ relative, replacement: pair[0] }));
}

function indexOutside(index) {
  return index
    .split("\0")
    .filter((entry) => !OUTPUTS.includes(entry.slice(entry.indexOf("\t") + 1)))
    .join("\0");
}

export function main(args = process.argv.slice(2)) {
  try {
    if (args.length > 1 || (args.length === 1 && args[0] !== "--push")) {
      refuse("Usage: pnpm branch:catchup [--push]");
    }
    if (realpathSync(text(["rev-parse", "--show-toplevel"])) !== realpathSync(root)) {
      refuse("Run catch-up from its own repository checkout.");
    }
    pendingOperation();
    const branch = currentBranch();
    upstream(branch);
    if (git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]).stdout.length !== 0) {
      refuse("Catch-up requires a clean worktree, index and untracked set.");
    }
    dependencies();
    let accepted = observe();
    const advertised = text(["ls-remote", "--symref", "origin", "HEAD"]);
    const advertisedLines = advertised.split(/\r?\n/);
    const symbolic = advertisedLines.filter((line) => line.startsWith("ref: "));
    const remoteDefault = /^ref: refs\/heads\/(.+)\tHEAD$/.exec(symbolic[0] ?? "")?.[1];
    if (
      symbolic.length !== 1 ||
      remoteDefault === undefined ||
      advertisedLines.filter((line) => /^(?:[0-9a-f]{40}|[0-9a-f]{64})\tHEAD$/.test(line))
        .length !== 1
    )
      refuse("Cannot resolve the live origin default branch.");
    git(["check-ref-format", `refs/heads/${remoteDefault}`]);
    if (branch === remoteDefault) refuse("Catch-up cannot run on the remote default branch.");
    unchanged(accepted);
    git(["fetch", "origin", `refs/heads/${remoteDefault}:refs/remotes/origin/${remoteDefault}`]);
    unchanged(accepted);
    const fetched = text([
      "rev-parse",
      "--verify",
      `refs/remotes/origin/${remoteDefault}^{commit}`,
    ]);
    unchanged(accepted);
    const merged = git(["merge", "--no-commit", "--no-ff", fetched], [0, 1]);
    const mergedState = observe();
    if (mergedState.branch !== branch || mergedState.head !== accepted.head)
      refuse("The branch or HEAD changed during merge.");
    if (mergedState.merge === "") {
      if (merged.status !== 0 || JSON.stringify(mergedState) !== JSON.stringify(accepted))
        refuse("Merge did not complete as expected.");
    } else {
      if (mergedState.merge !== fetched) refuse("The pending merge changed unexpectedly.");
      accepted = mergedState;
      const planned = resolutions(accepted);
      for (const { relative, replacement } of planned) {
        unchanged(accepted);
        writeFileSync(path.join(root, relative), replacement, "utf-8");
        const after = observe();
        const changed = OUTPUTS.indexOf(relative);
        if (
          !stableCore(accepted, after) ||
          after.files.some(
            (value, index) => value !== (index === changed ? replacement : accepted.files[index]),
          )
        ) {
          refuse("Unexpected state change during conflict resolution; merge retained.");
        }
        accepted = after;
      }
      for (const writer of WRITERS) {
        unchanged(accepted);
        dependencies();
        unchanged(accepted);
        let result;
        try {
          result = command(process.execPath, [path.join(root, writer)], true);
        } catch (cause) {
          refuse(
            `${writer} failed; partial changes and merge retained: ${cause instanceof Error ? cause.message : String(cause)}`,
          );
        }
        if (result.status !== 0) refuse(`${writer} failed; partial changes and merge retained.`);
        const after = observe();
        if (!stableCore(accepted, after))
          refuse(`${writer} changed unexpected state; merge retained.`);
        accepted = after;
      }
      unchanged(accepted);
      git(["add", "--", ...OUTPUTS]);
      const staged = observe();
      if (
        staged.branch !== accepted.branch ||
        staged.head !== accepted.head ||
        staged.merge !== accepted.merge ||
        staged.conflicts !== "" ||
        indexOutside(staged.index) !== indexOutside(accepted.index) ||
        staged.outsideStatus !== accepted.outsideStatus ||
        staged.outsideDiff !== accepted.outsideDiff ||
        JSON.stringify(staged.files) !== JSON.stringify(accepted.files)
      ) {
        refuse("Unexpected state change while staging; merge retained.");
      }
      accepted = staged;
      unchanged(accepted);
      const changes = git(["diff", "--cached", "--quiet"], [0, 1]);
      if (changes.status !== 0) {
        unchanged(accepted);
        git(["commit", "-m", "Merge origin default branch and reseal CI pins"]);
        const completed = observe();
        const parents = text(["rev-list", "--parents", "-n", "1", completed.head]).split(" ");
        if (
          completed.branch !== branch ||
          completed.merge !== "" ||
          completed.index !== accepted.index ||
          completed.status !== "" ||
          JSON.stringify(completed.files) !== JSON.stringify(accepted.files) ||
          parents.length !== 3 ||
          parents[1] !== accepted.head ||
          parents[2] !== fetched
        ) {
          refuse("Unexpected state after commit; completed state retained without push.");
        }
        accepted = completed;
      } else {
        refuse("The pending merge has no staged changes; no empty commit was created.");
      }
    }
    if (args[0] === "--push") {
      unchanged(accepted);
      upstream(branch);
      unchanged(accepted);
      let pushed;
      try {
        pushed = command("git", ["push", "origin", `HEAD:refs/heads/${branch}`], true);
      } catch (cause) {
        refuse(
          `Push failed; HEAD is retained. Retry: pnpm branch:catchup --push (${cause instanceof Error ? cause.message : String(cause)})`,
        );
      }
      if (pushed.status !== 0)
        refuse("Push failed; HEAD is retained. Retry: pnpm branch:catchup --push");
    }
    process.stdout.write("Branch catch-up completed.\n");
    return 0;
  } catch (cause) {
    process.stderr.write(
      `branch:catchup: ${cause instanceof Error ? cause.message : String(cause)}\n`,
    );
    return 1;
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  process.exitCode = main();
}
