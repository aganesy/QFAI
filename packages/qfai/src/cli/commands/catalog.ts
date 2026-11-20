/**
 * `qfai catalog components` and `qfai catalog design`: write the project's component catalogue
 * or its design catalogue, or with `--check` say whether the committed files are current.
 */
import { randomUUID } from "node:crypto";
import type { BigIntStats, Stats } from "node:fs";
import { lstat, mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { type OwnerLockOptions, withOwnerLock } from "../../core/fs/ownerLock.js";
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
      failure.state === "restored"
        ? `qfai catalog design: could not write the design catalogue, so both files are as they were: ${failure.message}`
        : failure.state === "left"
          ? `qfai catalog design: could not write the design catalogue, and could not put both files back: ${failure.message}`
          : `qfai catalog design: wrote ${targets.join(" and ")}, but ${failure.message}`,
    );
    return EXIT_CODES.findings;
  }
  info(`Wrote ${targets.join(" and ")}: ${countTokens(source.design)} token(s) from DESIGN.md.`);
  return EXIT_CODES.ok;
}

/**
 * Why the pair write failed: `restored` when both files are as they were, `left` when the undo
 * could not put both back, and `written` when both are written but the lock was not released.
 */
type PairFailure = { message: string; state: "restored" | "left" | "written" };

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
 * and a target that exists must be a file or a link. Only a target that is not there counts as
 * absent: one whose metadata cannot be read stops the write, before or after anything is written,
 * so it is never overwritten unseen. Each text goes to a staging file this run
 * creates exclusively under a name of its own beside its target; then each existing target is
 * moved aside under a name of its own and the staging file renamed into place. When a step fails,
 * the run undoes only what it did: it removes a file it placed while that file is still the one it
 * placed, renames what it moved aside back, and removes its own staging files, so a file of
 * another run is never removed or overwritten. Staging, placing and undoing run while this run
 * holds the design catalogue lock, so two runs never place their files in turn and leave the
 * pair from two revisions of `DESIGN.md`; a run that finds the lock held writes nothing. On
 * success the moved-aside files are removed. Returns null, or the failure's message and whether
 * both files were put back as they were, could not be, or were written but the lock not released;
 * when they could not be, the message names each file left behind and each target that is as it
 * was.
 */
async function writePair(
  root: string,
  outputs: readonly { file: string; text: string }[],
): Promise<PairFailure | null> {
  const entries: PairEntry[] = outputs.map((output) => ({
    file: path.join(root, output.file),
    text: output.text,
    staging: null,
    identity: null,
    placed: false,
    aside: null,
  }));
  const directories = [...new Set(outputs.map((output) => path.dirname(output.file)))];
  // Set once the lock is held, so a failure to release it is told from one to take it.
  const held: { committed?: PairFailure | null } = {};
  let committed: PairFailure | null;
  try {
    await assertDirectoriesInsideProject(root, directories);
    for (const entry of entries) {
      const found = await inspect(entry.file);
      if (found !== null && !found.isFile() && !found.isSymbolicLink()) {
        throw new Error(`${relativeTo(root, entry.file)} is not a file.`);
      }
    }
    for (const directory of directories) {
      await mkdir(path.join(root, directory), { recursive: true });
    }
    await assertDirectoriesInsideProject(root, directories);
    committed = await withOwnerLock(path.join(root, DESIGN_LOCK_PATH), designLock(), async () => {
      held.committed = await commitPair(root, entries);
      return held.committed;
    });
  } catch (caught) {
    const failed = held.committed;
    if (failed === undefined) return { message: messageOf(caught), state: "restored" };
    // The pair was written or undone under the lock, but the lock was not released.
    if (failed !== null) {
      return { message: `${failed.message} ${messageOf(caught)}`, state: failed.state };
    }
    await removeAsides(entries);
    return { message: messageOf(caught), state: "written" };
  }
  if (committed !== null) return committed;
  await removeAsides(entries);
  return null;
}

/** Removes the files this run moved aside, once both of its files are in place. */
async function removeAsides(entries: readonly PairEntry[]): Promise<void> {
  const asides = entries.flatMap((entry) => (entry.aside === null ? [] : [entry.aside]));
  await Promise.all(asides.map((aside) => rm(aside, { force: true })));
}

/** The lock that lets one run at a time place or undo the pair, beside the two files. */
const DESIGN_LOCK_PATH = path.join(".qfai", "catalog", ".design.lock");

function designLock(): OwnerLockOptions {
  const lock = DESIGN_LOCK_PATH.split(path.sep).join("/");
  return {
    kind: "design-catalog-lock",
    maxBytes: 4096,
    invalid: () => new Error(`${lock} is not a plain file.`),
    refused: (active) =>
      new Error(
        active
          ? `another run of qfai catalog design is writing it and holds ${lock}. Run the command again once that run finishes.`
          : `${lock} is held by no running qfai catalog design. Remove it once no run is writing the catalogue, then run the command again.`,
      ),
    changed: () => new Error(`${lock} no longer holds this run's record, so it was left in place.`),
  };
}

/**
 * Stages both files and renames them into place, or undoes what this run did when a step fails.
 * Runs while this run holds the design catalogue lock, so another run's files never mix with
 * these and its undo never meets them.
 */
async function commitPair(root: string, entries: PairEntry[]): Promise<PairFailure | null> {
  try {
    for (const entry of entries) await stage(entry);
    for (const entry of entries) await place(entry);
    return null;
  } catch (caught) {
    const undo = await undoPair(root, entries);
    if (undo.left.length === 0) return { message: messageOf(caught), state: "restored" };
    const kept =
      undo.restored.length === 0
        ? []
        : [
            `${undo.restored.join(" and ")} ${undo.restored.length === 1 ? "is as it was" : "are as they were"}.`,
          ];
    return { message: [messageOf(caught), ...undo.left, ...kept].join(" "), state: "left" };
  }
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
  if ((await inspect(entry.file)) !== null) {
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
 * Undoes what this run did to the pair after a failed write. Returns a sentence for each step
 * that could not be undone, and each target that is as it was. A placed file that another run has
 * since replaced is left in place, as is one whose file system gives no inode number to tell the
 * two apart or that cannot be inspected, and the moved-aside file is then kept under its own name
 * rather than renamed over it.
 */
async function undoPair(
  root: string,
  entries: readonly PairEntry[],
): Promise<{ left: string[]; restored: string[] }> {
  const left: string[] = [];
  const restored: string[] = [];
  for (const entry of entries) {
    const target = relativeTo(root, entry.file);
    let intact = true;
    const attempt = (what: string, step: () => Promise<void>): Promise<void> =>
      step().catch((caught: unknown) => {
        intact = false;
        left.push(`${what}: ${messageOf(caught)}`);
      });
    let owner: "this run" | "other" | "unknown" | "uninspected" = "other";
    if (entry.placed) {
      owner = await ownerOf(entry).catch((caught: unknown): "uninspected" => {
        left.push(
          `${target} was left in place, as it could not be inspected: ${messageOf(caught)}`,
        );
        return "uninspected";
      });
    }
    if (owner === "this run") {
      await attempt(`${target} could not be removed`, () => rm(entry.file, { force: true }));
    } else if (owner === "unknown") {
      left.push(
        `${target} was left in place: the file system gives no inode number, so it cannot be told apart from another run's file.`,
      );
    }
    if (owner === "unknown" || owner === "uninspected") intact = false;
    const aside = entry.aside;
    if (aside !== null) {
      await attempt(`${relativeTo(root, aside)} still holds the earlier ${target}`, async () => {
        if ((await inspect(entry.file)) !== null) {
          throw new Error(`another file is at ${target}.`);
        }
        await rename(aside, entry.file);
      });
    }
    // A staging file left behind is reported, but the target is as it was all the same.
    const staging = entry.staging;
    if (staging !== null) {
      await rm(staging, { force: true }).catch((caught: unknown) => {
        left.push(`${relativeTo(root, staging)} could not be removed: ${messageOf(caught)}`);
      });
    }
    if (intact) restored.push(target);
  }
  return { left, restored };
}

/** The entry's metadata, or null when nothing is there; any other failure to read it throws. */
async function inspect(file: string): Promise<Stats | null> {
  try {
    return await lstat(file);
  } catch (caught) {
    if (isEnoent(caught)) return null;
    throw caught;
  }
}

/**
 * Whether the entry's target is still the file this run placed there, another file or none, or
 * cannot be told: a volume that gives no inode number reports 0 for every file. Throws when the
 * target cannot be inspected.
 */
async function ownerOf(entry: PairEntry): Promise<"this run" | "other" | "unknown"> {
  let found: BigIntStats;
  try {
    found = await lstat(entry.file, { bigint: true });
  } catch (caught) {
    if (isEnoent(caught)) return "other";
    throw caught;
  }
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
