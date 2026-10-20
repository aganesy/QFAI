import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { loadConfig, resolvePath } from "../../core/config.js";
import { error, info } from "../../core/logger.js";
import { isGitConflictOutput, mergeDocument } from "../../core/storyTree/sentenceMerge.js";
import { validateDocumentSchema } from "../../core/validators/documentSchema.js";
import { EXIT_CODES } from "../lib/exitCodes.js";

const execute = promisify(execFile);
const MAX_BUFFER = 64 * 1024 * 1024;
const DOCUMENT = /\.(?:md|ya?ml)$/u;
/** An opening or closing marker; either one left behind means the file is not resolved. */
const CONFLICT_MARKER = /^(?:<{7,}|>{7,})(?: |\r?$)/mu;
const OWN_MARKER = /^(?:<<<<<<< ours|>>>>>>> theirs)\r?$/mu;
const REGULAR_FILE = new Set(["100644", "100755"]);
const SCHEMA_VIOLATION = "QFAI-DOCSCHEMA-001";

type Stage = { mode: string; sha: string };
type Stages = { base?: Stage; ours?: Stage; theirs?: Stage };
type Outcome = { kind: "merged" | "unchanged" | "left"; message: string };

/**
 * `qfai sdd merge-docs`: merges each story-tree document git reports as unmerged, from the base,
 * ours and theirs stages of the index, writes the result to the working file, and runs the
 * document-schema check on the documents it merged or found already without conflict markers.
 *
 * @returns 0 when every document merged and conforms, 1 when one is left for a person or the
 *   check finds or cannot run, 2 when the command could not run
 */
export async function runSddMergeDocsCommand(options: { root: string }): Promise<number> {
  const root = path.resolve(options.root);
  try {
    const loaded = await loadConfig(root);
    if (loaded.issues.length) throw new Error("Correct qfai.config.yaml before merging documents.");
    const scope = path.relative(root, resolvePath(root, loaded.config, "specsDir")) || ".";
    const unmerged = readUnmerged(await gitText(root, ["ls-files", "-u", "-z", "--", scope]));
    const label = scope.split(path.sep).join("/");
    if (unmerged.size === 0) {
      info(`qfai sdd merge-docs: no conflicted document under ${label}; nothing to merge.`);
      return EXIT_CODES.ok;
    }
    const checked: string[] = [];
    const counts = { merged: 0, unchanged: 0, left: 0 };
    for (const [file, stages] of [...unmerged].sort(([a], [b]) => a.localeCompare(b))) {
      const outcome = await mergeOne(root, file, stages);
      info(`${file}: ${outcome.message}`);
      counts[outcome.kind] += 1;
      if (outcome.kind !== "left") checked.push(file);
    }
    const issues = (await validateDocumentSchema(root, loaded.config)).filter(
      (finding) =>
        finding.code !== SCHEMA_VIOLATION ||
        (finding.file !== undefined && checked.includes(finding.file)),
    );
    for (const finding of issues) info(`${finding.code} ${finding.message}`);
    const notRun = issues.some((finding) => finding.code !== SCHEMA_VIOLATION);
    info(
      `qfai sdd merge-docs: ${counts.merged} merged, ${counts.unchanged} already without conflict markers, ${counts.left} left for a person; document-schema check: ${notRun ? "did not run" : `${issues.length} finding(s)`}. Review the result, then stage it with git add.`,
    );
    return counts.left > 0 || issues.length > 0 ? EXIT_CODES.findings : EXIT_CODES.ok;
  } catch (failure) {
    error(`qfai sdd merge-docs: ${failure instanceof Error ? failure.message : String(failure)}`);
    return EXIT_CODES.inputError;
  }
}

async function mergeOne(root: string, file: string, stages: Stages): Promise<Outcome> {
  const left = (reason: string): Outcome => ({ kind: "left", message: `left as is; ${reason}` });
  if (!DOCUMENT.test(file)) return left("it is not a Markdown or YAML document");
  if (stages.ours === undefined || stages.theirs === undefined) return left("one side deleted it");
  const present = [stages.base, stages.ours, stages.theirs].filter((stage) => stage !== undefined);
  if (present.some((stage) => !REGULAR_FILE.has(stage.mode)))
    return left("it is not a regular file");
  const target = path.join(root, ...file.split("/"));
  let working: string;
  try {
    working = await readFile(target, "utf8");
  } catch (failure) {
    return left(
      `the working file could not be read: ${failure instanceof Error ? failure.message : String(failure)}`,
    );
  }
  if (!CONFLICT_MARKER.test(working))
    return { kind: "unchanged", message: "left as is; the working file holds no conflict markers" };
  if (OWN_MARKER.test(working))
    return left("it holds the markers of an earlier merge-docs run; resolve it by hand");
  const texts = await Promise.all(
    [stages.base, stages.ours, stages.theirs].map((stage) =>
      stage === undefined ? Promise.resolve("") : readBlob(root, stage.sha),
    ),
  );
  const [base = "", ours = "", theirs = ""] = texts;
  if (texts.some((text) => text === null)) return left("it is not UTF-8 text");
  if (!(await isGitConflictOutput(working, base ?? "", ours ?? "", theirs ?? "")))
    return left(
      "the working file does not match Git's conflict output for its stages (a hand edit or a non-default conflict style)",
    );
  const merged = await mergeDocument(base ?? "", ours ?? "", theirs ?? "");
  if (merged === null) return left("a line in it reads as a merge marker");
  await writeFile(target, merged.text, "utf8");
  return merged.conflicts === 0
    ? { kind: "merged", message: "merged" }
    : left(`merged around ${merged.conflicts} conflict(s), left between markers`);
}

/** The index stages of each unmerged path, from `git ls-files -u -z`. */
function readUnmerged(output: string): Map<string, Stages> {
  const unmerged = new Map<string, Stages>();
  for (const entry of output.split("\0")) {
    const match = /^(\d+) ([0-9a-f]+) ([123])\t(.+)$/su.exec(entry);
    if (!match?.[1] || !match[2] || !match[4]) continue;
    const stage = { mode: match[1], sha: match[2] };
    const stages = unmerged.get(match[4]) ?? {};
    if (match[3] === "1") stages.base = stage;
    else if (match[3] === "2") stages.ours = stage;
    else stages.theirs = stage;
    unmerged.set(match[4], stages);
  }
  return unmerged;
}

/** A blob as text, or null when it is not valid UTF-8. */
async function readBlob(cwd: string, sha: string): Promise<string | null> {
  const { stdout } = await execute("git", ["cat-file", "blob", sha], {
    cwd,
    maxBuffer: MAX_BUFFER,
    encoding: "buffer",
  });
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(stdout);
  } catch {
    return null;
  }
}

async function gitText(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execute("git", args, { cwd, maxBuffer: MAX_BUFFER, encoding: "utf8" });
  return stdout;
}
