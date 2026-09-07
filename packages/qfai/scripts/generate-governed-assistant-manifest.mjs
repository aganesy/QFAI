#!/usr/bin/env node
/**
 * Generator for `src/core/governedAssistantManifest.ts`.
 *
 * `buildShippedAssistantHashes` used to learn which governed files a release
 * ships by walking the installed `assets/init/.qfai/assistant/` tree. That
 * answer cannot tell "this release withdrew the rule" apart from "this install
 * lost the file": a path missing from an incomplete extraction simply never
 * appears in the walk, and `qfai init --force` then reads the project's own
 * healthy copy as a rule the release retired — and deletes it.
 *
 * The enumeration is therefore frozen at package-build time and compiled into
 * `dist/`, which no partial extraction of `assets/` can shorten. A path this
 * module names but the install does not carry is an incomplete install, and
 * `buildShippedAssistantHashes` fails closed on it; a path the install carries
 * but this module does not name is a rule the release genuinely withdrew.
 *
 * Usage:
 *   node scripts/generate-governed-assistant-manifest.mjs [options]
 *
 *   --check          compare only; exit 1 when the committed module is stale.
 *   --assets <dir>   root of the assistant tree to enumerate
 *                    (default: `assets/init/.qfai/assistant`).
 *   --out <file>     module to write
 *                    (default: `src/core/governedAssistantManifest.ts`).
 *
 * Exit codes:
 *   0 — module written, or already in sync under `--check`.
 *   1 — `--check` found drift, or the output file could not be read/written.
 *   2 — bad arguments.
 */
import { readdir } from "node:fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { argv, exit, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const DEFAULT_ASSETS_DIR = path.join(PACKAGE_ROOT, "assets", "init", ".qfai", "assistant");
const DEFAULT_OUTPUT_FILE = path.join(PACKAGE_ROOT, "src", "core", "governedAssistantManifest.ts");
const OUTPUT_LABEL = "src/core/governedAssistantManifest.ts";

/**
 * Kept in step with `GOVERNED_ASSISTANT_LAYERS` in
 * `src/core/assistantAssetProvenance.ts`; the scripts test slice pins them
 * together so this list cannot quietly fall behind that one.
 */
const GOVERNED_LAYERS = ["constitution", "catalog"];

/**
 * The same names `collectGovernedAssistantFiles` treats as housekeeping rather
 * than policy. A manifest that named one would have `qfai init` demand a file
 * the copy never writes.
 */
const UNGOVERNED_BASENAMES = new Set([
  ".gitkeep",
  ".gitignore",
  ".gitattributes",
  ".npmignore",
  ".DS_Store",
  ".assets.lock.json",
]);

const LOCAL_OVERLAY_PATTERN = /\.local\.md$/i;
const STAGING_BASENAME_PATTERN =
  /^\.qfai-staging-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/i;

/**
 * @param {string} basename
 * @returns {boolean}
 */
function isGovernedBasename(basename) {
  return (
    !UNGOVERNED_BASENAMES.has(basename) &&
    !LOCAL_OVERLAY_PATTERN.test(basename) &&
    !STAGING_BASENAME_PATTERN.test(basename)
  );
}

/**
 * @param {string} directory
 * @param {string} prefix
 * @param {string[]} found
 * @returns {Promise<void>}
 */
async function collectUnder(directory, prefix, found) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      await collectUnder(path.join(directory, entry.name), relative, found);
      continue;
    }
    if (!entry.isFile() || !isGovernedBasename(entry.name)) {
      continue;
    }
    found.push(relative);
  }
}

/**
 * @param {string} assetsDir
 * @returns {Promise<string[]>}
 */
async function collectGovernedFiles(assetsDir) {
  /** @type {string[]} */
  const found = [];
  for (const layer of GOVERNED_LAYERS) {
    await collectUnder(path.join(assetsDir, layer), layer, found);
  }
  return found.sort((a, b) => a.localeCompare(b));
}

/**
 * @param {readonly string[]} files
 * @returns {string}
 */
function renderModule(files) {
  const entries = files.map((file) => `  ${JSON.stringify(file)},`).join("\n");
  return `/**
 * Every governed assistant file this release ships, as a POSIX path relative
 * to \`.qfai/assistant/\`.
 *
 * GENERATED FILE — do not edit by hand. Run \`npm run generate:governed-manifest\`
 * from \`packages/qfai\` to refresh it; the scripts test slice fails on drift.
 *
 * The list is compiled rather than discovered so that a shipped rule which is
 * missing from an install is distinguishable from one the release withdrew.
 * Enumerating the installed \`assets/\` tree could not tell those apart: an
 * absent file simply did not appear, and \`qfai init --force\` retires — deletes
 * — every recorded path the shipped set omits, so a truncated package took the
 * project's own healthy copy with it.
 */
export const SHIPPED_GOVERNED_ASSISTANT_FILES: readonly string[] = [
${entries}
];
`;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function toMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * @param {readonly string[]} args
 * @returns {{ checkOnly: boolean, assetsDir: string, outputFile: string } | { error: string }}
 */
function parseArgs(args) {
  let checkOnly = false;
  let assetsDir = DEFAULT_ASSETS_DIR;
  let outputFile = DEFAULT_OUTPUT_FILE;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--check") {
      checkOnly = true;
      continue;
    }
    if (arg === "--assets" || arg === "--out") {
      const value = args[index + 1];
      if (!value) {
        return { error: `${arg} requires a path` };
      }
      if (arg === "--assets") {
        assetsDir = path.resolve(value);
      } else {
        outputFile = path.resolve(value);
      }
      index += 1;
      continue;
    }
    return { error: `unknown argument: ${arg}` };
  }
  return { checkOnly, assetsDir, outputFile };
}

async function main() {
  const parsed = parseArgs(argv.slice(2));
  if ("error" in parsed) {
    stderr.write(`${parsed.error}\n`);
    return 2;
  }

  let files;
  try {
    files = await collectGovernedFiles(parsed.assetsDir);
  } catch (error) {
    stderr.write(`cannot enumerate ${parsed.assetsDir}: ${toMessage(error)}\n`);
    return 1;
  }
  const rendered = renderModule(files);

  if (parsed.checkOnly) {
    let current;
    try {
      current = await readFile(parsed.outputFile, "utf-8");
    } catch (error) {
      stderr.write(`cannot read ${parsed.outputFile}: ${toMessage(error)}\n`);
      return 1;
    }
    if (current.replace(/\r\n/g, "\n") !== rendered) {
      stderr.write(`${OUTPUT_LABEL} is stale. Run \`npm run generate:governed-manifest\`.\n`);
      return 1;
    }
    stdout.write(`${OUTPUT_LABEL} is in sync (${String(files.length)} files).\n`);
    return 0;
  }

  try {
    await writeFile(parsed.outputFile, rendered, "utf-8");
  } catch (error) {
    stderr.write(`cannot write ${parsed.outputFile}: ${toMessage(error)}\n`);
    return 1;
  }
  stdout.write(`wrote ${OUTPUT_LABEL} (${String(files.length)} files).\n`);
  return 0;
}

main()
  .then((code) => exit(code))
  .catch((error) => {
    stderr.write(`generate-governed-assistant-manifest failed: ${toMessage(error)}\n`);
    exit(1);
  });
