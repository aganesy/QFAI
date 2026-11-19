/**
 * `qfai catalog components` and `qfai catalog design`: write the project's component catalogue
 * or its design catalogue, or with `--check` say whether the committed files are current.
 */
import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../core/config.js";
import { findUnsafeHostFileComponent } from "../../core/init/fsGuards.js";
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
    if (temporary !== null) await rm(temporary, { force: true });
    return caught instanceof Error ? caught.message : String(caught);
  }
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
      `qfai catalog design: could not write the design catalogue, so both files are as they were: ${failure}`,
    );
    return EXIT_CODES.findings;
  }
  info(`Wrote ${targets.join(" and ")}: ${countTokens(source.design)} token(s) from DESIGN.md.`);
  return EXIT_CODES.ok;
}

/**
 * Writes the token file and the theme as a pair. Each is written to a temporary file beside it;
 * then each existing file is moved aside by rename and the temporary file renamed into place.
 * When a step fails, every file placed is removed and every file moved aside is renamed back, so
 * the pair, its links and modes included, is as it was. On success the moved-aside files are
 * removed. A target that exists but is not a file or a link, such as a directory, stops the
 * command before anything is written. Returns the failure's message, or null.
 */
async function writePair(
  root: string,
  outputs: readonly { file: string; text: string }[],
): Promise<string | null> {
  const files = outputs.map((output) => path.join(root, output.file));
  const temporaries = files.map((file) => `${file}.${process.pid}.tmp`);
  const asides = files.map((file) => `${file}.${process.pid}.old`);
  const movedAside: number[] = [];
  const placed: number[] = [];
  try {
    for (const file of files) {
      const found = await lstat(file).catch(() => null);
      if (found !== null && !found.isFile() && !found.isSymbolicLink()) {
        throw new Error(`${file} is not a file.`);
      }
    }
    for (const [index, output] of outputs.entries()) {
      const temporary = temporaries[index] ?? "";
      await mkdir(path.dirname(temporary), { recursive: true });
      await writeFile(temporary, output.text, "utf-8");
    }
    for (const [index, file] of files.entries()) {
      if ((await lstat(file).catch(() => null)) !== null) {
        await rename(file, asides[index] ?? "");
        movedAside.push(index);
      }
      await rename(temporaries[index] ?? "", file);
      placed.push(index);
    }
  } catch (caught) {
    await restorePair(files, temporaries, asides, placed, movedAside);
    return caught instanceof Error ? caught.message : String(caught);
  }
  await Promise.all(movedAside.map((index) => rm(asides[index] ?? "", { force: true })));
  return null;
}

/** Puts the pair back after a failed write: placed files out, moved-aside files back, temporaries gone. */
async function restorePair(
  files: readonly string[],
  temporaries: readonly string[],
  asides: readonly string[],
  placed: readonly number[],
  movedAside: readonly number[],
): Promise<void> {
  for (const index of placed) await rm(files[index] ?? "", { force: true });
  for (const index of movedAside) await rename(asides[index] ?? "", files[index] ?? "");
  for (const temporary of temporaries) {
    const found = await lstat(temporary).catch(() => null);
    if (found?.isFile()) await rm(temporary, { force: true });
  }
}

/**
 * The first line of a message, without the `:` that introduces a YAML error's code frame, so the
 * frame does not spread over the terminal.
 */
function firstLine(message: string): string {
  return (message.split(/\r?\n/, 1)[0] ?? message).replace(/:\s*$/, "");
}
