/**
 * A `data-qfai` marker a UI contract declares is on some screen.
 *
 * The traceability that exists runs one way: a test may only name a marker the
 * contract declares. That catches a test typo and cannot catch a missing
 * element, because a screen element nobody built is also an element no test
 * names — the acceptance test is written against what is on the screen, so the
 * absent element appears on neither side of the check.
 *
 * So a contract can declare an element, mark it `required`, and have it
 * rendered by nothing, with every profile green — including an element that is
 * a capability's only surface.
 *
 * ## What counts as declared
 *
 * A `data-qfai` value written literally in the contract. The canonical marker
 * is `CONTRACT_ID:ELEMENT_ID` and a project may derive one per element, but
 * deriving the set here would report every element of every contract in a
 * project that never adopted the convention. Reading what the contract writes
 * makes the rule opt-in by construction: a contract that names no marker is
 * asked for nothing.
 *
 * ## What counts as rendered
 *
 * The marker string appearing anywhere under `paths.srcDir`. Not the attribute
 * written literally: a framework that renders it through a variable, a map or
 * a generated component would fail that test while the element is on the
 * screen, and every marker in such a project would be reported at once. What no
 * framework can do is render a marker whose text is nowhere in its own source,
 * so the presence of the string is the question with an answer.
 *
 * The direction it errs in follows from that. A marker named in a comment or a
 * fixture reads as rendered, which is silence — and silence is what the rule
 * costs least when it is wrong.
 *
 * `required: true` is named in the message rather than reported separately: the
 * absence is the same absence, and the flag says how much it matters.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectUiContractFiles } from "../discovery.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { issue } from "./utils.js";

/** Waivable as `QFAI-CONTRACT-037`. */
export const UI_MARKER_NOT_RENDERED_RULE_ID = "QFAI-CONTRACT-037";

/**
 * A `data-qfai` attribute value, quoted or bare.
 *
 * The contract writes the marker inside a selector (`[data-qfai='order-form']`)
 * or as the attribute itself, and either shape may leave the value unquoted: a
 * CSS attribute selector and an HTML attribute both allow a bare value when it
 * is an identifier.
 *
 * Requiring quotes made `[data-qfai=order-form]` declare nothing, and nothing
 * said so. A contract that names no marker is asked for nothing, which is the
 * rule's opt-in, so a contract whose only marker was written bare read as
 * having opted out: the element went unchecked and there was no finding to
 * tell anyone.
 *
 * A bare value ends at whitespace or at whatever closes what it sits in — `]`
 * for a selector, `>` for a tag, `,` or `}` in flow syntax. A value is taken as
 * written: the rule reports what the contract declared and does not interpret
 * it. Only the contract side is read this way — see the module note on what
 * counts as rendered.
 */
const MARKER_RE = /data-qfai\s*=\s*(?:(['"])([^'"]+)\1|([^\s'"\]>,}]+))/g;

/** The extensions a marker can be written in on the implementation side. */
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte", ".html"];

/** Every `data-qfai` value a text carries, in the order it writes them. */
function markersIn(text: string): string[] {
  // Group 2 is the quoted body, group 3 the bare one; exactly one is set.
  return [...text.matchAll(MARKER_RE)]
    .map((match) => match[2] ?? match[3] ?? "")
    .filter((v) => v.length > 0);
}

/**
 * Whether the contract marks the element a marker names as required.
 *
 * The canonical marker is `CONTRACT_ID:ELEMENT_ID`, so the element is looked up
 * by the half after the colon. A marker in any other shape names no element
 * this can find, and the answer is then "not stated" rather than "not
 * required" — the message says which.
 */
function requiredElementIds(text: string): Set<string> {
  const required = new Set<string>();
  // Read line by line rather than by parsing the document: `elements[]` sits at
  // a different depth per contract, and a `required: true` under an element's
  // `id:` is the only shape this needs. A parse would also fail the whole file
  // on a contract another rule already reports as unparseable.
  let currentId: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const id = /^\s*-?\s*id:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/.exec(line);
    if (id?.[1] !== undefined) {
      currentId = id[1];
      continue;
    }
    if (currentId !== null && /^\s*required:\s*true\s*$/.test(line)) {
      required.add(currentId);
      currentId = null;
    }
  }
  return required;
}

/** The element half of a canonical `CONTRACT_ID:ELEMENT_ID` marker. */
function elementIdOf(marker: string): string | null {
  const parts = marker.split(":");
  return parts.length === 2 ? (parts[1] ?? null) : null;
}

export async function validateUiMarkerPresence(root: string, config: QfaiConfig): Promise<Issue[]> {
  const uiRoot = path.join(resolvePath(root, config, "contractsDir"), "ui");
  const contractFiles = await collectUiContractFiles(uiRoot);
  if (contractFiles.length === 0) {
    return [];
  }

  const declared = new Map<string, { file: string; required: boolean }>();
  for (const file of contractFiles) {
    const text = await readSafe(file);
    const required = requiredElementIds(text);
    for (const marker of markersIn(text)) {
      if (declared.has(marker)) {
        continue;
      }
      const elementId = elementIdOf(marker);
      declared.set(marker, {
        file: path.relative(root, file).split(path.sep).join("/"),
        required: elementId !== null && required.has(elementId),
      });
    }
  }
  if (declared.size === 0) {
    return [];
  }

  const srcRoot = resolvePath(root, config, "srcDir");
  const rendered = new Set<string>();
  for (const file of await collectSourceFiles(srcRoot)) {
    const text = await readSafe(file);
    for (const marker of declared.keys()) {
      if (text.includes(marker)) {
        rendered.add(marker);
      }
    }
  }

  const promotion = RULE_PROMOTIONS.uiMarkerNotRendered.promoteAt;
  const severity = newRuleSeverity(await resolveToolVersion(), promotion);
  const windowNote =
    severity === "warning" ? ` Reported as a warning until ${promotion}, then an error.` : "";
  const srcRel = path.relative(root, srcRoot).split(path.sep).join("/") || ".";
  const issues: Issue[] = [];
  for (const [marker, where] of [...declared].sort(([a], [b]) => a.localeCompare(b))) {
    if (rendered.has(marker)) {
      continue;
    }
    issues.push(
      issue(
        UI_MARKER_NOT_RENDERED_RULE_ID,
        `UI contract marker \`${marker}\` is declared${where.required ? " and marked `required: true`" : ""} but no file under \`${srcRel}\` mentions it.${windowNote}`,
        severity,
        where.file,
        "contracts.uiMarkerPresence",
        undefined,
        "canonical",
        `Render the element the marker names, or drop the marker from the contract. A project whose source tree lives elsewhere sets \`paths.srcDir\` to it.`,
      ),
    );
  }
  return issues;
}

/**
 * Every source file under `srcRoot`, by extension.
 *
 * A directory this cannot read contributes nothing rather than failing the run.
 * The answer then errs towards reporting a marker as unrendered, which names a
 * file the operator can look at, rather than towards silence.
 */
async function collectSourceFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      files.push(...(await collectSourceFiles(full)));
    } else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

/** A file this rule cannot read contributes nothing rather than failing the run. */
async function readSafe(file: string): Promise<string> {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
}
