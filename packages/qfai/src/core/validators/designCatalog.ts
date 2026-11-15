/**
 * Warnings the committed design catalogue supports.
 *
 * A project that has not run `qfai catalog design` has neither the token file nor the theme, and
 * nothing here is asked of it. Once either exists, a token file or theme that no longer matches
 * root `DESIGN.md`, and a hex colour in UI source that matches no token, are each a warning.
 * A `DESIGN.md` that does not parse is reported by the root `DESIGN.md` parse check, so nothing
 * here compares against it.
 */

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import {
  DESIGN_THEME_PATH,
  DESIGN_TOKENS_PATH,
  ROOT_DESIGN_MD,
  findRawHexes,
  readDesignSource,
  readGenerated,
  renderDesignTokens,
  renderTheme,
  sameGeneratedText,
  tokenHexes,
} from "../uiux/designCatalog.js";
import type { Issue } from "../types.js";
import { selectSurfaceFiles } from "./uiPlainText.js";
import { issue, readSafe } from "./utils.js";

const RULE = "uiux.designCatalog";
const REGENERATE = "Run `qfai catalog design` and commit the files it writes.";

export async function validateDesignCatalog(root: string, config: QfaiConfig): Promise<Issue[]> {
  const tokens = await readGenerated(root, DESIGN_TOKENS_PATH);
  const theme = await readGenerated(root, DESIGN_THEME_PATH);
  if (tokens.state === "absent" && theme.state === "absent") return [];
  const source = await readDesignSource(root);
  if (source.state === "invalid") return [];
  const outputs = [
    { code: "QFAI-DCAT-001", file: DESIGN_TOKENS_PATH, read: tokens, render: renderDesignTokens },
    { code: "QFAI-DCAT-002", file: DESIGN_THEME_PATH, read: theme, render: renderTheme },
  ];
  const issues: Issue[] = [];
  for (const output of outputs) {
    const file = output.file.split(path.sep).join("/");
    let message: string | null = null;
    if (source.state === "absent") {
      if (output.read.state === "read") {
        message = `${file} has no ${ROOT_DESIGN_MD} at the project root to come from.`;
      }
    } else if (output.read.state === "absent") {
      message = `${file} does not exist beside the other design catalogue file.`;
    } else if (!sameGeneratedText(output.read.text, output.render(source.design))) {
      message = `${file} is out of date with ${ROOT_DESIGN_MD}.`;
    }
    if (message === null) continue;
    issues.push(
      issue(output.code, message, "warning", file, RULE, undefined, "canonical", REGENERATE),
    );
  }
  if (source.state !== "read") return issues;
  const known = tokenHexes(source.design);
  for (const file of await selectSurfaceFiles(root, config.uiux?.surfacePaths ?? [])) {
    for (const raw of findRawHexes(await readSafe(path.join(root, file)))) {
      if (known.has(raw.hex)) continue;
      issues.push(
        issue(
          "QFAI-DCAT-003",
          `The colour \`${raw.written}\` matches no token in ${ROOT_DESIGN_MD}.`,
          "warning",
          file,
          RULE,
          undefined,
          "canonical",
          "Use a variable from `.qfai/catalog/theme.css` in place of the hex value. A colour the brand lacks is a DESIGN.md decision, not a literal in the source.",
          { loc: { line: raw.line } },
        ),
      );
    }
  }
  return issues;
}
