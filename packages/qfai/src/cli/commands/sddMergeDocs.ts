import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { loadConfig, resolvePath } from "../../core/config.js";
import { error, info } from "../../core/logger.js";
import { EXIT_CODES } from "../lib/exitCodes.js";
import { mergeDocument } from "../../core/storyTree/sentenceMerge.js";
import { validateDocumentSchema } from "../../core/validators/documentSchema.js";

const execute = promisify(execFile);
const MAX_BUFFER = 64 * 1024 * 1024;
const DOCUMENT = /\.(?:md|ya?ml)$/u;
const CONFLICT_MARKER = /^<{7}(?: |$)/mu;

type Stages = { base?: string; ours?: string; theirs?: string };

/**
 * `qfai sdd merge-docs`: merges each story-tree document git reports as unmerged, from the base,
 * ours and theirs stages of the index, writes the result to the working file, and runs the
 * document-schema check on the documents it settled.
 *
 * @returns 0 when every document merged and conforms, 1 when one is left for a person, 2 when it could not run
 */
export async function runSddMergeDocsCommand(options: { root: string }): Promise<number> {
  const root = path.resolve(options.root);
  try {
    const loaded = await loadConfig(root);
    if (loaded.issues.length) throw new Error("Correct qfai.config.yaml before merging documents.");
    const scope = path.relative(root, resolvePath(root, loaded.config, "specsDir")) || ".";
    const unmerged = readUnmerged(await git(root, ["ls-files", "-u", "-z", "--", scope]));
    const label = scope.split(path.sep).join("/");
    if (unmerged.size === 0) {
      info(`qfai sdd merge-docs: no conflicted document under ${label}; nothing to merge.`);
      return EXIT_CODES.ok;
    }
    const settled: string[] = [];
    let left = 0;
    for (const [file, stages] of [...unmerged].sort(([a], [b]) => a.localeCompare(b))) {
      const outcome = await mergeOne(root, file, stages);
      info(`${file}: ${outcome.message}`);
      if (outcome.settled) settled.push(file);
      else left += 1;
    }
    const findings = (await validateDocumentSchema(root, loaded.config)).filter(
      (finding) => finding.file !== undefined && settled.includes(finding.file),
    );
    for (const finding of findings) info(`${finding.code} ${finding.message}`);
    info(
      `qfai sdd merge-docs: ${settled.length} document(s) without conflict markers, ${left} left with conflicts, ${findings.length} document-schema finding(s). Review the result, then stage it with git add.`,
    );
    return left > 0 || findings.length > 0 ? EXIT_CODES.findings : EXIT_CODES.ok;
  } catch (failure) {
    error(`qfai sdd merge-docs: ${failure instanceof Error ? failure.message : String(failure)}`);
    return EXIT_CODES.inputError;
  }
}

async function mergeOne(
  root: string,
  file: string,
  stages: Stages,
): Promise<{ settled: boolean; message: string }> {
  if (!DOCUMENT.test(file))
    return { settled: false, message: "left as is; it is not a Markdown or YAML document" };
  if (stages.ours === undefined || stages.theirs === undefined)
    return { settled: false, message: "left as is; one side deleted it" };
  const target = path.join(root, ...file.split("/"));
  const working = await readFile(target, "utf8").catch(() => "");
  if (!CONFLICT_MARKER.test(working))
    return { settled: true, message: "left as is; the working file holds no conflict markers" };
  const [base, ours, theirs] = await Promise.all(
    [stages.base, stages.ours, stages.theirs].map((sha) =>
      sha === undefined ? Promise.resolve("") : git(root, ["cat-file", "blob", sha]),
    ),
  );
  const merged = await mergeDocument(base ?? "", ours ?? "", theirs ?? "");
  if (merged === null)
    return { settled: false, message: "left as is; a line in it reads as a merge marker" };
  await writeFile(target, merged.text, "utf8");
  return merged.conflicts === 0
    ? { settled: true, message: "merged" }
    : { settled: false, message: `merged; ${merged.conflicts} conflict(s) left between markers` };
}

/** The index stages of each unmerged path, from `git ls-files -u -z`. */
function readUnmerged(output: string): Map<string, Stages> {
  const unmerged = new Map<string, Stages>();
  for (const entry of output.split("\0")) {
    const match = /^\d+ ([0-9a-f]+) ([123])\t(.+)$/su.exec(entry);
    if (!match?.[1] || !match[3]) continue;
    const stages = unmerged.get(match[3]) ?? {};
    if (match[2] === "1") stages.base = match[1];
    else if (match[2] === "2") stages.ours = match[1];
    else stages.theirs = match[1];
    unmerged.set(match[3], stages);
  }
  return unmerged;
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execute("git", args, { cwd, maxBuffer: MAX_BUFFER, encoding: "utf8" });
  return stdout;
}
