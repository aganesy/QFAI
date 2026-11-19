/**
 * `qfai catalog components` and `qfai catalog design`: write the project's component catalogue
 * or its design catalogue, or with `--check` say whether the committed files are current.
 */
import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../core/config.js";
import {
  findUnsafeHostFileComponent,
  findUnsafeWrapperComponent,
} from "../../core/init/fsGuards.js";
import { error, info } from "../../core/logger.js";
import {
  COMPONENT_CATALOG_PATH,
  readCatalog,
  renderCatalog,
  sameCatalogText,
  scanComponents,
} from "../../core/uiux/componentCatalog.js";
import {
  DESIGN_THEME_PATH,
  DESIGN_TOKENS_PATH,
  countTokens,
  readDesignSource,
  readGenerated,
  renderDesignTokens,
  renderTheme,
  sameGeneratedText,
} from "../../core/uiux/designCatalog.js";
import type { UiPlainTextOptions } from "../../core/validators/uiPlainText.js";
import { EXIT_CODES } from "../lib/exitCodes.js";

export type CatalogComponentsOptions = {
  root: string;
  /** Compare with the committed file and write nothing. */
  check?: boolean;
  loadTypescript?: UiPlainTextOptions["loadTypescript"];
};

export async function runCatalogComponents(options: CatalogComponentsOptions): Promise<number> {
  const root = path.resolve(options.root);
  const { config } = await loadConfig(root);
  const scan = await scanComponents(
    root,
    config,
    options.loadTypescript ? { loadTypescript: options.loadTypescript } : {},
  );
  const target = COMPONENT_CATALOG_PATH.split(path.sep).join("/");
  if (!scan.readable) {
    error(
      `qfai catalog components: ${scan.unread} .tsx/.jsx file(s) cannot be read: the \`typescript\` package cannot be loaded from the project root. Install it as a dev dependency of the project.`,
    );
    return EXIT_CODES.findings;
  }
  const text = renderCatalog(scan.components);
  if (options.check) {
    const committed = await readCatalog(root);
    if (committed.state === "read" && sameCatalogText(committed.text, text)) {
      info(`${target} is up to date: ${scan.components.length} component(s).`);
      return EXIT_CODES.ok;
    }
    error(
      committed.state === "absent"
        ? `${target} does not exist. Run \`qfai catalog components\` and commit it.`
        : `${target} is out of date with the source. Run \`qfai catalog components\` and commit it.`,
    );
    return EXIT_CODES.findings;
  }
  const failure = await writeCatalog(root, text);
  if (failure !== null) {
    error(
      `qfai catalog components: could not write ${target}, so any existing catalogue is as it was: ${failure}`,
    );
    return EXIT_CODES.findings;
  }
  if (scan.files === 0) {
    info(`Wrote ${target}: 0 component(s); uiux.surfacePaths selects no .tsx or .jsx file.`);
    return EXIT_CODES.ok;
  }
  const files = new Set(scan.components.map((component) => component.file)).size;
  const unsourced = scan.components.filter((component) => component.source === undefined).length;
  info(
    `Wrote ${target}: ${scan.components.length} component(s) in ${files} file(s), ${unsourced} with no @source.`,
  );
  return EXIT_CODES.ok;
}

/**
 * Writes the component catalogue inside the project. Every directory on its path is checked
 * before and after it is created: a symbolic link (a junction included) or an entry that is not
 * a directory stops the write, as does a catalogue path that is a link or not a file, so nothing
 * is written outside the project and an existing catalogue is left as it was. The text goes to an
 * exclusively created temporary file in the checked directory, which is then renamed onto the
 * catalogue. Returns the failure's message, or null.
 */
async function writeCatalog(root: string, text: string): Promise<string | null> {
  const segments = COMPONENT_CATALOG_PATH.split(path.sep);
  const file = path.join(root, ...segments);
  let temporary: string | null = null;
  try {
    await assertInsideProject(root, segments);
    await mkdir(path.dirname(file), { recursive: true });
    await assertInsideProject(root, segments);
    const existing = await lstat(file).catch(() => null);
    if (existing !== null && !existing.isFile()) {
      throw new Error(`${segments.join("/")} is not a file.`);
    }
    temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
    const handle = await open(temporary, "wx");
    try {
      await handle.writeFile(text, "utf-8");
    } finally {
      await handle.close();
    }
    await rename(temporary, file);
    temporary = null;
    return null;
  } catch (caught) {
    const failure = messageOf(caught);
    if (temporary === null) return failure;
    // A failed cleanup is reported with the write's own failure, never in place of it.
    const left = path.relative(root, temporary).split(path.sep).join("/");
    return rm(temporary, { force: true }).then(
      () => failure,
      (cleanup: unknown) => `${failure} ${left} could not be removed: ${messageOf(cleanup)}`,
    );
  }
}

function messageOf(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}

/** Throws when a component of the catalogue path would lead a write outside the project. */
async function assertInsideProject(root: string, segments: readonly string[]): Promise<void> {
  const unsafe = await findUnsafeHostFileComponent(root, segments);
  if (unsafe === undefined) return;
  throw new Error(
    `${unsafe.relativePath} is ${unsafe.symlink ? "a symbolic link" : "not a directory"}.`,
  );
}

export type CatalogDesignOptions = {
  root: string;
  /** Compare with the committed files and write nothing. */
  check?: boolean;
};

/** Writes the token file and the Tailwind 4 theme from root `DESIGN.md`. */
export async function runCatalogDesign(options: CatalogDesignOptions): Promise<number> {
  const root = path.resolve(options.root);
  const source = await readDesignSource(root);
  if (source.state !== "read") {
    error(
      source.state === "absent"
        ? "qfai catalog design: DESIGN.md does not exist at the project root. Write it first; the design catalogue is derived from it."
        : `qfai catalog design: DESIGN.md does not parse: ${firstLine(source.message)}`,
    );
    return EXIT_CODES.findings;
  }
  const outputs = [
    { file: DESIGN_TOKENS_PATH, text: renderDesignTokens(source.design) },
    { file: DESIGN_THEME_PATH, text: renderTheme(source.design) },
  ];
  const targets = outputs.map((output) => output.file.split(path.sep).join("/"));
  if (options.check) {
    let stale = 0;
    for (const [index, output] of outputs.entries()) {
      const committed = await readGenerated(root, output.file);
      if (committed.state === "read" && sameGeneratedText(committed.text, output.text)) continue;
      stale += 1;
      error(
        committed.state === "absent"
          ? `${targets[index]} does not exist. Run \`qfai catalog design\` and commit it.`
          : `${targets[index]} is out of date with DESIGN.md. Run \`qfai catalog design\` and commit it.`,
      );
    }
    if (stale > 0) return EXIT_CODES.findings;
    info(`${targets.join(" and ")} are up to date with DESIGN.md.`);
    return EXIT_CODES.ok;
  }
  const failure = await writePair(root, outputs);
  if (failure !== null) {
    error(
      failure.restored
        ? `qfai catalog design: could not write the design catalogue, so both files are as they were: ${failure.message}`
        : `qfai catalog design: could not write the design catalogue, and could not put both files back: ${failure.message}`,
    );
    return EXIT_CODES.findings;
  }
  info(`Wrote ${targets.join(" and ")}: ${countTokens(source.design)} token(s) from DESIGN.md.`);
  return EXIT_CODES.ok;
}

/** One file of the design pair, and what this run has done to it so far. */
type PairEntry = {
  file: string;
  text: string;
  /** The staging file this run created and has not renamed into place yet. */
  staging: string | null;
  /** The device and inode of this run's staging file, which stay with it once it is in place. */
  identity: { dev: bigint; ino: bigint } | null;
  /** Whether this run renamed its staging file onto the target. */
  placed: boolean;
  /** Where this run moved the existing target, under a name of its own. */
  aside: string | null;
};

/**
 * Writes the token file and the theme as a pair, only inside the project. Both destinations are
 * checked before anything is written: each directory on their path, before and after it is
 * created, must not be a symbolic link (a junction included) or an entry that is not a directory,
 * and a target that exists must be a file or a link. Each text goes to a staging file this run
 * creates exclusively under a name of its own beside its target; then each existing target is
 * moved aside under a name of its own and the staging file renamed into place. When a step fails,
 * the run undoes only what it did: it removes a file it placed while that file is still the one it
 * placed, renames what it moved aside back, and removes its own staging files, so a file of
 * another run is never removed or overwritten. On success the moved-aside files are removed.
 * Returns null, or the failure's message and whether both files were put back as they were.
 */
async function writePair(
  root: string,
  outputs: readonly { file: string; text: string }[],
): Promise<{ message: string; restored: boolean } | null> {
  const entries: PairEntry[] = outputs.map((output) => ({
    file: path.join(root, output.file),
    text: output.text,
    staging: null,
    identity: null,
    placed: false,
    aside: null,
  }));
  const directories = [...new Set(outputs.map((output) => path.dirname(output.file)))];
  try {
    await assertDirectoriesInsideProject(root, directories);
    for (const entry of entries) {
      const found = await lstat(entry.file).catch(() => null);
      if (found !== null && !found.isFile() && !found.isSymbolicLink()) {
        throw new Error(`${relativeTo(root, entry.file)} is not a file.`);
      }
    }
    for (const directory of directories) {
      await mkdir(path.join(root, directory), { recursive: true });
    }
    await assertDirectoriesInsideProject(root, directories);
    for (const entry of entries) await stage(entry);
    for (const entry of entries) await place(entry);
  } catch (caught) {
    const left = await undoPair(root, entries);
    return { message: [messageOf(caught), ...left].join(" "), restored: left.length === 0 };
  }
  const asides = entries.flatMap((entry) => (entry.aside === null ? [] : [entry.aside]));
  await Promise.all(asides.map((aside) => rm(aside, { force: true })));
  return null;
}

/** Throws when a directory on the path to a design file would lead a write outside the project. */
async function assertDirectoriesInsideProject(
  root: string,
  directories: readonly string[],
): Promise<void> {
  for (const directory of directories) {
    const unsafe = await findUnsafeWrapperComponent(root, directory.split(path.sep).join("/"));
    if (unsafe === undefined) continue;
    throw new Error(
      `${unsafe.relativePath} is ${unsafe.symlink ? "a symbolic link" : "not a directory"}.`,
    );
  }
}

/** A name of this run's own beside `file`, such as `.theme.css.<uuid>.tmp`. */
function ownSibling(file: string, suffix: string): string {
  return path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.${suffix}`);
}

/** Writes the entry's text to a staging file created exclusively, so no other file is reused. */
async function stage(entry: PairEntry): Promise<void> {
  const staging = ownSibling(entry.file, "tmp");
  const handle = await open(staging, "wx");
  entry.staging = staging;
  try {
    await handle.writeFile(entry.text, "utf-8");
    const stats = await handle.stat({ bigint: true });
    entry.identity = { dev: stats.dev, ino: stats.ino };
  } finally {
    await handle.close();
  }
}

/** Moves an existing target aside, then renames the staging file onto the target. */
async function place(entry: PairEntry): Promise<void> {
  if ((await lstat(entry.file).catch(() => null)) !== null) {
    const aside = ownSibling(entry.file, "old");
    await rename(entry.file, aside);
    entry.aside = aside;
  }
  if (entry.staging === null) throw new Error(`${entry.file} has no staging file.`);
  await rename(entry.staging, entry.file);
  entry.staging = null;
  entry.placed = true;
}

/**
 * Undoes what this run did to the pair after a failed write and returns a sentence for each step
 * that could not be undone. A placed file that another run has since replaced is left in place,
 * as is one whose file system gives no inode number to tell the two apart, and the moved-aside
 * file is then kept under its own name rather than renamed over it.
 */
async function undoPair(root: string, entries: readonly PairEntry[]): Promise<string[]> {
  const left: string[] = [];
  const attempt = (what: string, step: () => Promise<void>): Promise<void> =>
    step().catch((caught: unknown) => {
      left.push(`${what}: ${messageOf(caught)}`);
    });
  for (const entry of entries) {
    const target = relativeTo(root, entry.file);
    const owner = entry.placed ? await ownerOf(entry) : "other";
    if (owner === "this run") {
      await attempt(`${target} could not be removed`, () => rm(entry.file, { force: true }));
    } else if (owner === "unknown") {
      left.push(
        `${target} was left in place: the file system gives no inode number, so it cannot be told apart from another run's file.`,
      );
    }
    const aside = entry.aside;
    if (aside !== null) {
      await attempt(`${relativeTo(root, aside)} still holds the earlier ${target}`, async () => {
        if ((await lstat(entry.file).catch(() => null)) !== null) {
          throw new Error(`another file is at ${target}.`);
        }
        await rename(aside, entry.file);
      });
    }
    const staging = entry.staging;
    if (staging !== null) {
      await attempt(`${relativeTo(root, staging)} could not be removed`, () =>
        rm(staging, { force: true }),
      );
    }
  }
  return left;
}

/**
 * Whether the entry's target is still the file this run placed there, another file or none, or
 * cannot be told: a volume that gives no inode number reports 0 for every file.
 */
async function ownerOf(entry: PairEntry): Promise<"this run" | "other" | "unknown"> {
  const found = await lstat(entry.file, { bigint: true }).catch(() => null);
  if (found === null) return "other";
  if (entry.identity === null || entry.identity.ino === 0n || found.ino === 0n) return "unknown";
  return found.dev === entry.identity.dev && found.ino === entry.identity.ino
    ? "this run"
    : "other";
}

function relativeTo(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

/**
 * The first line of a message, without the `:` that introduces a YAML error's code frame, so the
 * frame does not spread over the terminal.
 */
function firstLine(message: string): string {
  return (message.split(/\r?\n/, 1)[0] ?? message).replace(/:\s*$/, "");
}
