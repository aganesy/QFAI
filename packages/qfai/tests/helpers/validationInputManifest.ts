import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readlink, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import fg from "fast-glob";

import { runControlledProfile } from "./controlledProfile.js";

import { loadConfig, resolvePath } from "../../src/core/config.js";
import { collectFilesByGlobs } from "../../src/core/fs.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS, normalizeGlobs } from "../../src/core/traceability.js";
import {
  collectHtmlMockBlocks,
  mockMarkdownGlobs,
} from "../../src/core/validators/htmlMockBlocks.js";

const execFile = promisify(execFileCallback);
const sha256 = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

export async function validationInputManifest(root: string) {
  const { config } = await loadConfig(root);
  const { stdout } = await execFile("git", ["ls-files", "--cached", "-z"], {
    cwd: root,
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = resolvePath(root, config, "outDir");
  const validateJson = path.resolve(root, config.output.validateJsonPath);
  const profileJson = path.join(
    path.dirname(validateJson),
    `${path.basename(validateJson, path.extname(validateJson))}-full${path.extname(validateJson)}`,
  );
  const isOutput = (file: string) =>
    file === output ||
    file.startsWith(`${output}${path.sep}`) ||
    file === validateJson ||
    file === profileJson;
  const tracked = stdout
    .split("\0")
    .filter(Boolean)
    .map((file) => path.resolve(root, file));
  const scan = await collectFilesByGlobs(root, {
    globs: normalizeGlobs(config.validation.traceability.testFileGlobs),
    ignore: [
      ...DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
      ...normalizeGlobs(config.validation.traceability.testFileExcludeGlobs),
    ],
  });
  if (scan.truncated)
    throw new Error(`The test input manifest exceeded its ${scan.limit}-file limit`);
  const story = (
    await fg("**/*", {
      cwd: resolvePath(root, config, "specsDir"),
      absolute: true,
      dot: true,
    })
  ).map((file) => path.resolve(file));
  const htmlMarkdown = (await fg(mockMarkdownGlobs(root, config), { absolute: true })).map((file) =>
    path.resolve(file),
  );
  const surfaces = (
    await fg(
      (
        ["specsDir", "contractsDir", "discussionDir", "skillsDir", "srcDir", "testsDir"] as const
      ).map((key) => path.posix.join(resolvePath(root, config, key).replace(/\\/g, "/"), "**/*")),
      { absolute: true, dot: true },
    )
  ).map((file) => path.resolve(file));
  const assistant = (
    await fg(".qfai/**/*", {
      cwd: root,
      absolute: true,
      dot: true,
      ignore: [
        path.posix.join(output.replace(/\\/g, "/"), "**"),
        validateJson.replace(/\\/g, "/"),
        profileJson.replace(/\\/g, "/"),
      ],
    })
  ).map((file) => path.resolve(file));
  const files = [
    ...new Set([
      ...tracked,
      ...scan.files.map((file) => path.resolve(file)),
      ...story,
      ...htmlMarkdown,
      ...surfaces,
      ...assistant,
    ]),
  ]
    .filter((file) => !isOutput(file))
    .sort();
  const entries: Array<{
    path: string;
    kind: string;
    bytes: number;
    sha256: string;
    target?: string;
  }> = [];
  const contents = new Map<string, Buffer>();
  for (const file of files) {
    const own = await lstat(file);
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (own.isSymbolicLink()) {
      const target = await readlink(file);
      const bytes = (await stat(file)).isFile() ? await readFile(file) : Buffer.alloc(0);
      contents.set(file, bytes);
      entries.push({
        path: relative,
        kind: "symlink",
        bytes: bytes.length,
        sha256: sha256(Buffer.concat([Buffer.from(target), Buffer.from("\0"), bytes])),
        target,
      });
      continue;
    }
    if (!own.isFile()) throw new Error(`Non-file validation input: ${relative}`);
    const bytes = await readFile(file);
    contents.set(file, bytes);
    entries.push({ path: relative, kind: "file", bytes: bytes.length, sha256: sha256(bytes) });
  }
  const inputBytes = (file: string) => {
    const bytes = contents.get(path.resolve(file));
    if (bytes === undefined)
      throw new Error(`Missing manifested input: ${path.relative(root, file)}`);
    return bytes;
  };
  const summarize = (selected: string[]) => ({
    files: selected.length,
    bytes: selected.reduce((sum, file) => sum + inputBytes(file).length, 0),
  });
  const htmlBlocks = htmlMarkdown.flatMap((file) =>
    collectHtmlMockBlocks(inputBytes(file).toString("utf8")),
  );
  return {
    digest: sha256(JSON.stringify(entries)),
    corpusMeaning:
      "Tracked checkout files plus actual configured validation surfaces and .qfai inputs. Only declared validation outputs are excluded. Native bytes and symlink targets are recorded.",
    entries,
    excludedOutputs: [
      path.relative(root, output),
      path.relative(root, validateJson),
      path.relative(root, profileJson),
    ],
    counts: {
      corpus: {
        files: entries.length,
        bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
      },
      storyInputs: summarize(story),
      htmlMarkdownInputs: summarize(htmlMarkdown),
      htmlBlocks: {
        blocks: htmlBlocks.length,
        bytes: htmlBlocks.reduce((sum, block) => sum + Buffer.byteLength(block.html), 0),
      },
      testScanInputs: summarize(scan.files),
    },
    testScan: {
      globs: config.validation.traceability.testFileGlobs,
      excludes: config.validation.traceability.testFileExcludeGlobs,
      matchedFileCount: scan.matchedFileCount,
      truncated: scan.truncated,
    },
  };
}

/** One fresh process; the controller owns and bounds its complete process tree. */
export async function coldValidationCli(
  cli: string,
  root: string,
  timeout: number,
  ownGroup = true,
) {
  const result = await runControlledProfile(
    process.execPath,
    [cli, "validate", "--profile", "full", "--fail-on", "error", "--format", "text"],
    { cwd: root, timeoutMs: timeout, ownGroup },
  );
  return { ...result, actualCode: result.code, code: result.timedOut ? null : result.code };
}
