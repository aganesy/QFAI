/**
 * `qfai catalog components` and `qfai catalog design`: write the project's component catalogue
 * or its design catalogue, or with `--check` say whether the committed files are current.
 */
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../core/config.js";
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
  type GeneratedRead,
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
  const file = path.join(root, COMPONENT_CATALOG_PATH);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text, "utf-8");
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
        : `qfai catalog design: DESIGN.md does not parse: ${source.message}`,
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
 * Writes the token file and the theme as a pair: each goes to a temporary file beside it, then
 * each is renamed into place. When a step fails, the temporary files are removed and a file
 * already renamed gets its earlier text back, so the pair is never left out of step. Returns the
 * failure's message, or null.
 */
async function writePair(
  root: string,
  outputs: readonly { file: string; text: string }[],
): Promise<string | null> {
  const files = outputs.map((output) => path.join(root, output.file));
  const temporaries = files.map((file) => `${file}.${process.pid}.tmp`);
  // A target that cannot be read, such as a directory in its place, has no text to put back; its
  // rename fails below and the pair is restored from the other file's earlier text.
  const earlier = await Promise.all(
    outputs.map((output) =>
      readGenerated(root, output.file).catch((): GeneratedRead => ({ state: "absent" })),
    ),
  );
  let renamed = 0;
  try {
    for (const [index, output] of outputs.entries()) {
      const temporary = temporaries[index] ?? "";
      await mkdir(path.dirname(temporary), { recursive: true });
      await writeFile(temporary, output.text, "utf-8");
    }
    for (const [index, file] of files.entries()) {
      await rename(temporaries[index] ?? "", file);
      renamed += 1;
    }
    return null;
  } catch (caught) {
    await Promise.all(temporaries.map((temporary) => rm(temporary, { force: true })));
    for (const [index, file] of files.slice(0, renamed).entries()) {
      const before = earlier[index];
      if (before?.state === "read") await writeFile(file, before.text, "utf-8");
      else await rm(file, { force: true });
    }
    return caught instanceof Error ? caught.message : String(caught);
  }
}
