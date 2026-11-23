/**
 * Warnings for a legacy pattern whose platform replacement is Baseline Widely available.
 *
 * A rule is admitted only when its replacement is Widely available in the web-features data, so
 * it is right under any browser-support target and this check never reads one. Each rule names
 * the web-features entry it was checked against:
 *
 * - `QFAI-LEGACY-001`: a script from another origin with no `integrity` attribute. Subresource
 *   Integrity (`subresource-integrity`) is Widely available since 2020-10-30.
 * - `QFAI-LEGACY-002`: error styling on `:invalid`, which matches before the user has
 *   interacted. `:user-invalid` (`user-pseudos`) is Widely available since 2026-05-02.
 * - `QFAI-LEGACY-003`: a hand-built modal in a project with no component catalogue installed.
 *   `<dialog>` (`dialog`) is Widely available since 2024-09-14. With a catalogue installed the
 *   hand-written widget warning of the component catalogue check covers it.
 *
 * It reads the `.css`, `.html`, `.tsx`, `.jsx`, `.vue` and `.svelte` files `uiux.surfacePaths`
 * selects. Ceiling: start tags and selectors are read lexically, not parsed; a value given
 * through an expression or a binding, CSS written in JavaScript, and a `//` comment in JSX are
 * not seen. Parsing each format lifts it.
 */

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { readCatalog } from "../uiux/componentCatalog.js";
import { isCatalogueInstalled } from "./componentCatalog.js";
import { SOURCE_EXTENSIONS, selectSurfaceFiles } from "./uiPlainText.js";
import { issue, readSafe } from "./utils.js";

const RULE = "uiux.legacyPatterns";
const EXTENSIONS: ReadonlySet<string> = new Set([...SOURCE_EXTENSIONS, ".css"]);
const JSX_EXTENSIONS: ReadonlySet<string> = new Set([".tsx", ".jsx"]);
const STYLE_HOST_EXTENSIONS: ReadonlySet<string> = new Set([".html", ".vue", ".svelte"]);

/** An attribute value: a literal string, an expression in `{}`, or none for a bare attribute. */
type AttributeValue =
  { kind: "literal"; text: string } | { kind: "expression"; text: string } | { kind: "bare" };

type StartTag = { name: string; offset: number; attributes: Map<string, AttributeValue> };

type Found = { offset: number; issue: (line: number) => Issue };

export async function validateLegacyPatterns(root: string, config: QfaiConfig): Promise<Issue[]> {
  const files = await selectSurfaceFiles(root, config.uiux?.surfacePaths ?? [], EXTENSIONS);
  if (files.length === 0) return [];
  const installed = isCatalogueInstalled(config, await readCatalog(root));
  const issues: Issue[] = [];
  for (const file of files) {
    const text = await readSafe(path.join(root, file));
    const found = findingsOf(file, text, installed);
    const lines = lineStarts(text);
    for (const item of found.sort((a, b) => a.offset - b.offset)) {
      issues.push(item.issue(lineAt(lines, item.offset)));
    }
  }
  return issues;
}

function findingsOf(file: string, text: string, catalogueInstalled: boolean): Found[] {
  const extension = path.extname(file);
  if (extension === ".css") return invalidFindings(file, blankBlockComments(text), 0);
  const jsx = JSX_EXTENSIONS.has(extension);
  const masked = blankBlockComments(blankHtmlComments(text));
  const found: Found[] = [];
  for (const tag of startTags(masked)) {
    const script = scriptFinding(file, tag, jsx);
    if (script) found.push(script);
    if (!catalogueInstalled) {
      const modal = modalFinding(file, tag);
      if (modal) found.push(modal);
    }
  }
  if (STYLE_HOST_EXTENSIONS.has(extension)) {
    for (const block of masked.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
      const css = block[1] ?? "";
      const start = block.index + block[0].indexOf(css);
      found.push(...invalidFindings(file, css, start));
    }
  }
  return found;
}

/** A `<script>` whose literal `src` is on another origin and that carries no `integrity`. */
function scriptFinding(file: string, tag: StartTag, jsx: boolean): Found | null {
  if ((jsx ? tag.name : tag.name.toLowerCase()) !== "script") return null;
  const src = tag.attributes.get("src");
  if (src?.kind !== "literal" || !/^(?:https?:)?\/\//i.test(src.text.trim())) return null;
  if (tag.attributes.has("integrity")) return null;
  return {
    offset: tag.offset,
    issue: (line) =>
      issue(
        "QFAI-LEGACY-001",
        `The script \`${src.text.trim()}\` loads from another origin with no \`integrity\` attribute.`,
        "warning",
        file,
        RULE,
        undefined,
        "canonical",
        'Add `integrity` with the hash of the exact file and `crossorigin="anonymous"`, or serve the script from the project\'s own origin. Subresource Integrity is Baseline Widely available.',
        { loc: { line } },
      ),
  };
}

/** A native element other than `<dialog>` carrying `role="dialog"` or a modal `aria-modal`. */
function modalFinding(file: string, tag: StartTag): Found | null {
  if (!/^[a-z][a-z0-9]*$/.test(tag.name) || tag.name === "dialog") return null;
  const markup: string[] = [];
  const role = tag.attributes.get("role");
  if (role?.kind === "literal" && role.text.trim().split(/\s+/).includes("dialog")) {
    markup.push('`role="dialog"`');
  }
  const modal = tag.attributes.get("aria-modal");
  if (modal && !(modal.kind !== "bare" && modal.text.trim() === "false")) {
    markup.push("`aria-modal`");
  }
  if (markup.length === 0) return null;
  return {
    offset: tag.offset,
    issue: (line) =>
      issue(
        "QFAI-LEGACY-003",
        `A hand-built modal carrying ${markup.join(" and ")} in a project with no component catalogue installed.`,
        "warning",
        file,
        RULE,
        undefined,
        "canonical",
        "Use the native `<dialog>` element, opened with `showModal()`: it brings the top layer, focus handling and Escape to close, and is Baseline Widely available.",
        { loc: { line } },
      ),
  };
}

/**
 * Each `:invalid` in a selector of `css`, whose offset in the file is `base`: outside the
 * parentheses of a functional pseudo-class and outside a compound on `form` or `fieldset`.
 */
function invalidFindings(file: string, css: string, base: number): Found[] {
  const found: Found[] = [];
  for (const match of css.matchAll(/:invalid(?![\w-])/g)) {
    const at = match.index;
    if (css[at - 1] === ":") continue;
    const after = /[{;}]/.exec(css.slice(at));
    if (after?.[0] !== "{") continue;
    const selectorStart =
      Math.max(css.lastIndexOf("{", at), css.lastIndexOf("}", at), css.lastIndexOf(";", at)) + 1;
    const before = css.slice(selectorStart, at);
    if (parenthesisDepth(before) > 0) continue;
    const compound = `${/[^\s,>+~]*$/.exec(before)?.[0] ?? ""}:invalid`;
    const type = /^&?([a-zA-Z][\w-]*)/.exec(compound)?.[1]?.toLowerCase();
    if (type === "form" || type === "fieldset") continue;
    found.push({
      offset: base + at,
      issue: (line) =>
        issue(
          "QFAI-LEGACY-002",
          `\`${compound}\` styles \`:invalid\`, which matches a field before the user has interacted with it.`,
          "warning",
          file,
          RULE,
          undefined,
          "canonical",
          "Use `:user-invalid`, which matches only after the user has interacted with the field. It is Baseline Widely available.",
          { loc: { line } },
        ),
    });
  }
  return found;
}

function parenthesisDepth(text: string): number {
  let depth = 0;
  for (const char of text) {
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
  }
  return depth;
}

const ATTRIBUTE_VALUE = String.raw`"[^"]*"|'[^']*'|\{[^{}]*\}|[^\s"'<>={}\x60]+`;
const ATTRIBUTE = String.raw`(?:[^\s"'<>=/{}]+(?:\s*=\s*(?:${ATTRIBUTE_VALUE}))?|\{[^{}]*\})`;
const START_TAG = new RegExp(String.raw`<([A-Za-z][\w.:-]*)((?:\s+${ATTRIBUTE})*)\s*\/?>`, "g");
const ATTRIBUTE_PART = new RegExp(
  String.raw`([^\s"'<>=/{}]+)(?:\s*=\s*(${ATTRIBUTE_VALUE}))?|\{[^{}]*\}`,
  "g",
);

/** The start tags of a markup or JSX source, with their attributes by lower-case name. */
function startTags(source: string): StartTag[] {
  const tags: StartTag[] = [];
  for (const match of source.matchAll(START_TAG)) {
    const attributes = new Map<string, AttributeValue>();
    for (const part of (match[2] ?? "").matchAll(ATTRIBUTE_PART)) {
      const name = part[1];
      if (!name) continue;
      attributes.set(name.toLowerCase(), attributeValue(part[2]));
    }
    tags.push({ name: match[1] ?? "", offset: match.index, attributes });
  }
  return tags;
}

function attributeValue(raw: string | undefined): AttributeValue {
  if (raw === undefined) return { kind: "bare" };
  if (raw.startsWith('"') || raw.startsWith("'"))
    return { kind: "literal", text: raw.slice(1, -1) };
  if (!raw.startsWith("{")) return { kind: "literal", text: raw };
  const inner = raw.slice(1, -1).trim();
  const quoted = /^(["'`])([^"'`]*)\1$/.exec(inner);
  if (quoted) return { kind: "literal", text: quoted[2] ?? "" };
  return { kind: "expression", text: inner };
}

/** Blanks `<!-- -->` comments one character for one, keeping line breaks. */
function blankHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, blank);
}

/** Blanks `/* *\/` comments one character for one, keeping line breaks. */
function blankBlockComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, blank);
}

function blank(span: string): string {
  return span.replace(/[^\n]/g, " ");
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let index = text.indexOf("\n"); index !== -1; index = text.indexOf("\n", index + 1)) {
    starts.push(index + 1);
  }
  return starts;
}

function lineAt(starts: readonly number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if ((starts[mid] ?? 0) <= offset) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}
