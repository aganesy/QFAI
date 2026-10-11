import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  writeFile,
  readlink,
  stat,
  mkdir,
  realpath,
  symlink,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import fg from "fast-glob";

import { runControlledProfile } from "./controlledProfile.js";
export { removeBaselineSource } from "./controlledProfile.js";

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

export const PROFILE_BASELINE_HEAD = "4f80c8bd4dd902cb9d1cb95bfca30d6f0abe5eb6";
const BASELINE_BLOB = "0242ade2ae0d1a3e4f451899a9bf02dcfb13ad1b";
const BEFORE_CONDITION =
  "    const counted = new Set(parseCountedExampleAnnotations(file.content, file.file));\n";
const AFTER_CONDITION = `    const counted = new Set(
      profile === "tdd" && countsForExample(file) && annotations.EX.length > 0
        ? parseCountedExampleAnnotations(file.content, file.file)
        : [],
    );
`;
const ACCEPTED_BLOB = "f4213c1eb7e40e57bf11fa12cbd6796c2e8c216b";
const PUBLIC_REPOSITORY = "https://github.com/aganesy/QFAI.git";
const baselineSidecar = (control: string) => path.join(control, "baseline-source");
const OPTIMIZED_MODULE = "packages/qfai/src/core/validators/storyTreeObligations.ts";
const SOURCE_SCOPE = [
  "packages/qfai/src",
  "packages/qfai/assets",
  "packages/qfai/package.json",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "tsconfig.base.json",
  "packages/qfai/tsconfig.json",
  "packages/qfai/tsconfig.build.json",
  "packages/qfai/tsup.config.ts",
];

type SourceEntry = { file: string; blob: string; mode: string };

export function requireOptimizationOnly(files: readonly string[]): void {
  if (files.length !== 1 || files[0] !== OPTIMIZED_MODULE)
    throw new Error("The comparison requires only the accepted validator source change");
}

async function gitText(cwd: string, ...args: string[]): Promise<string> {
  return (await execFile("git", args, { cwd, maxBuffer: 16 * 1024 * 1024, windowsHide: true }))
    .stdout;
}

export async function nativeRepositoryReceipt(root: string) {
  const head = (await gitText(root, "rev-parse", "HEAD")).trim();
  const index = await gitText(root, "ls-files", "--stage", "-z");
  const status = await gitText(root, "status", "--porcelain=v1", "--untracked-files=no");
  if (status !== "") throw new Error("Tracked inputs or the index changed before comparison");
  return { head, indexSha256: sha256(index), trackedStatus: status };
}

export function sourceTreeEntries(tree: string): SourceEntry[] {
  const entries = tree
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(line);
      const file = match?.[3];
      if (
        !match?.[1] ||
        !match[2] ||
        !file ||
        /[\\:\0]/.test(file) ||
        path.posix.isAbsolute(file) ||
        file.split("/").some((part) => ["", ".", ".."].includes(part))
      )
        throw new Error("The archive contains an unsupported source entry");
      return { mode: match[1], blob: match[2], file };
    });
  if (entries.length === 0 || new Set(entries.map((entry) => entry.file)).size !== entries.length)
    throw new Error("The implementation tree is empty or has duplicate entries");
  return entries;
}

export async function pairedImplementation(
  root: string,
  control: string,
  baseline = PROFILE_BASELINE_HEAD,
  record: (phase: string) => Promise<void> = () => Promise.resolve(),
) {
  try {
    if (baseline !== PROFILE_BASELINE_HEAD)
      throw new Error("The baseline must be the pinned full Git SHA");
    const receipt = await nativeRepositoryReceipt(root);
    const origin = (await gitText(root, "remote", "get-url", "origin")).trim();
    if (![PUBLIC_REPOSITORY, "https://github.com/aganesy/QFAI"].includes(origin))
      throw new Error(
        "The baseline requires the known public HTTPS repository without credentials",
      );
    const sidecar = baselineSidecar(control);
    const relative = path.relative(root, sidecar);
    if (relative === "" || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)))
      throw new Error("The baseline sidecar must be outside the validation target");
    await mkdir(sidecar);
    const objectStore = path.join(sidecar, ".objects");
    await record("baseline-source-fetch");
    const options = {
      cwd: control,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      windowsHide: true,
    };
    await execFile("git", ["init", "--bare", objectStore], options);
    await execFile(
      "git",
      [
        "-C",
        objectStore,
        "-c",
        "credential.helper=",
        "fetch",
        "--depth=1",
        "--no-tags",
        PUBLIC_REPOSITORY,
        baseline,
      ],
      options,
    );
    const fetched = (await gitText(objectStore, "rev-parse", "FETCH_HEAD^{commit}")).trim();
    if (fetched !== baseline)
      throw new Error("The fetched commit differs from the pinned baseline");
    await record("baseline-source-tree");
    const currentTree = await gitText(
      root,
      "ls-tree",
      "-r",
      "-z",
      receipt.head,
      "--",
      ...SOURCE_SCOPE,
    );
    const currentEntries = sourceTreeEntries(currentTree);
    const targetTree = await gitText(
      objectStore,
      "ls-tree",
      "-z",
      baseline,
      "--",
      OPTIMIZED_MODULE,
    );
    const priorEntry = sourceTreeEntries(targetTree)[0];
    const currentEntry = currentEntries.find((entry) => entry.file === OPTIMIZED_MODULE);
    if (
      !priorEntry ||
      !currentEntry ||
      priorEntry.file !== OPTIMIZED_MODULE ||
      priorEntry.blob !== BASELINE_BLOB ||
      currentEntry.blob !== ACCEPTED_BLOB ||
      priorEntry.mode !== currentEntry.mode
    )
      throw new Error("The validator pair differs from the accepted blobs or mode");
    const priorText = await gitText(objectStore, "show", `${baseline}:${OPTIMIZED_MODULE}`);
    const currentText = await gitText(root, "show", `${receipt.head}:${OPTIMIZED_MODULE}`);
    if (currentText !== priorText.replace(BEFORE_CONDITION, AFTER_CONDITION))
      throw new Error("The source pair differs beyond the accepted parser condition");
    const entries = currentEntries.map((entry) =>
      entry.file === OPTIMIZED_MODULE ? priorEntry : entry,
    );
    const changed = entries
      .filter((entry, index) => JSON.stringify(entry) !== JSON.stringify(currentEntries[index]))
      .map((entry) => entry.file);
    requireOptimizationOnly(changed);
    return {
      baseline,
      fetched,
      current: receipt.head,
      acceptedModule: OPTIMIZED_MODULE,
      acceptedBlob: ACCEPTED_BLOB,
      priorBlob: BASELINE_BLOB,
      currentBlob: currentEntry.blob,
      conditionDelta: { before: BEFORE_CONDITION, after: AFTER_CONDITION },
      baselineMeaning:
        "Composite: current CI source/assets/package/dependencies with only the actual prior validator Git blob.",
      changed,
      ancestry: "Not proved by the shallow fixed-SHA object fetch; comparison uses exact trees.",
      publicRepository: PUBLIC_REPOSITORY,
      objectStore,
      nativeByteMeaning:
        "The archive proves canonical Git origin. Common loaded source/assets use identical current native bytes; the prior target uses actual canonical Git blob bytes. Native EOL differences are recorded separately.",
      priorValidatorTreeSha256: sha256(targetTree),
      currentTreeSha256: sha256(currentTree),
      sourceScope: SOURCE_SCOPE,
      entries,
      currentEntries,
      receipt,
    };
  } catch (error: unknown) {
    throw new Error("The baseline source could not be verified", { cause: error });
  }
}

/** Check canonical archive bytes or common native sources, recording both hashes without normalization. */
export async function archivedSourceReceipt(
  sidecar: string,
  entries: readonly SourceEntry[],
  nativeRoot?: string,
) {
  const native = [];
  for (const entry of entries) {
    const file = path.join(sidecar, entry.file);
    const own = await lstat(file);
    if (!own.isFile() || own.isSymbolicLink() || own.nlink !== 1)
      throw new Error(`Unsupported archived implementation file: ${entry.file}`);
    const bytes = await readFile(file);
    const blob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    if (
      nativeRoot !== undefined &&
      !(entry.file === OPTIMIZED_MODULE && entry.blob === BASELINE_BLOB)
    ) {
      if (!bytes.equals(await readFile(path.join(nativeRoot, entry.file))))
        throw new Error(`Common native source bytes changed: ${entry.file}`);
    } else if (blob !== entry.blob) throw new Error(`Archived Git blob changed: ${entry.file}`);
    native.push({
      file: entry.file,
      blob: entry.blob,
      nativeBlob: blob,
      nativeMode: own.mode,
      bytes: bytes.length,
      nativeSha256: sha256(bytes),
    });
  }
  return { files: native.length, digest: sha256(JSON.stringify(native)), entries: native };
}

export async function prepareBaselineSource(
  root: string,
  control: string,
  implementation: Awaited<ReturnType<typeof pairedImplementation>>,
) {
  const sidecar = baselineSidecar(control);
  const archive = path.join(sidecar, "source.tar");
  await gitText(
    root,
    "archive",
    "--format=tar",
    `--output=${archive}`,
    implementation.current,
    "--",
    ...SOURCE_SCOPE,
  );
  await execFile("tar", ["-xf", archive, "-C", sidecar], { cwd: control });
  const archiveSha256 = sha256(await readFile(archive));
  const canonicalArchive = await archivedSourceReceipt(sidecar, implementation.currentEntries);
  const currentNative = await archivedSourceReceipt(root, implementation.currentEntries, root);
  for (const entry of implementation.currentEntries) {
    if (entry.file !== OPTIMIZED_MODULE)
      await writeFile(path.join(sidecar, entry.file), await readFile(path.join(root, entry.file)));
  }
  const prior = await execFile("git", ["show", `${implementation.baseline}:${OPTIMIZED_MODULE}`], {
    cwd: implementation.objectStore,
    encoding: "buffer",
  });
  await writeFile(path.join(sidecar, OPTIMIZED_MODULE), prior.stdout);
  const native = await archivedSourceReceipt(sidecar, implementation.entries, root);
  const common = (receipt: typeof native) =>
    receipt.entries.filter((entry) => entry.file !== OPTIMIZED_MODULE);
  if (JSON.stringify(common(currentNative)) !== JSON.stringify(common(native)))
    throw new Error("The composite common sources differ from the current native snapshot");
  const packageDir = path.join(sidecar, "packages", "qfai");
  const dependencies = await realpath(path.join(root, "packages", "qfai", "node_modules"));
  const dependencyLink = path.join(packageDir, "node_modules");
  const rootDependencyLink = path.join(sidecar, "node_modules");
  const rootDependencies = await realpath(path.join(root, "node_modules"));
  const linkKind = process.platform === "win32" ? "junction" : "dir";
  await symlink(dependencies, dependencyLink, linkKind);
  await symlink(rootDependencies, rootDependencyLink, linkKind);
  if ((await realpath(dependencyLink)) !== dependencies)
    throw new Error("The baseline dependency link resolved to another installation");
  const module = await realpath(path.join(packageDir, "src", "core", "validate.ts"));
  if ((await realpath(rootDependencyLink)) !== rootDependencies)
    throw new Error("The baseline root dependency link resolved to another installation");
  return {
    sidecar,
    module,
    dependencies,
    rootDependencies,
    dependencyLink,
    rootDependencyLink,
    archiveSha256,
    canonicalArchive,
    currentNative,
    native,
  };
}
