/**
 * The `mode` a UI contract's `prototype` mapping declares.
 *
 * `prototype` is authoring metadata: `mockPaths` names the flows a review has
 * to walk, and `markers` states the selector convention that review inspects
 * by. No command branches on `mode`, so a value outside the vocabulary breaks
 * no run — it tells whoever reads the contract that the prototype is something
 * it is not, and nothing anywhere says otherwise.
 *
 * That is the case a check answers and a runtime cannot. A contract read by
 * people is worth having only while its words mean one thing, and a key with a
 * one-value vocabulary is where a typo survives longest, because there is
 * nothing to fail.
 *
 * ## What is asked, and of whom
 *
 * Only a contract that writes `mode` under a top-level `prototype` is asked
 * anything, and only a value the vocabulary does not hold is reported. A
 * contract with no `prototype`, or one whose mode is `interactive`, is silent.
 * The rule is opt-in the same way the marker rule is: what the contract wrote
 * is the whole subject.
 *
 * An empty `mode:` is left alone. That is a slot nobody has filled yet, which
 * is a drafting state rather than a wrong claim, and this rule is about wrong
 * claims.
 *
 * ## Severity
 *
 * A warning, with no promotion behind it. The other UI contract rule reaches
 * `error` because it reports an element that nothing renders, which is missing
 * behavior. This one reports a misleading word in a document. Failing a build
 * over it would cost more than the confusion does.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectUiContractFiles } from "../discovery.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/** Waivable as `QFAI-CONTRACT-038`. */
export const UI_PROTOTYPE_MODE_RULE_ID = "QFAI-CONTRACT-038";

/** The modes the tooling and the shipped template know. */
export const PROTOTYPE_MODES = ["interactive"] as const;

/**
 * The `mode` value a text declares under its top-level `prototype`, if any.
 *
 * Read line by line rather than by parsing the document. `prototype` sits at
 * the top level by definition, so its block is the run of indented lines after
 * it, and a parse would fail the whole file on a contract another rule already
 * reports as unparseable.
 *
 * `mode` is taken only at the block's own child indent, so a `mode` nested
 * deeper — inside a `mockPaths` or `markers` entry — is a different key and is
 * not read as this one.
 */
function prototypeModeIn(text: string): string | null {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^prototype:\s*(#.*)?$/.test(line));
  if (start === -1) {
    return null;
  }

  let childIndent: number | null = null;
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "") {
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (indent === 0) {
      break;
    }
    if (childIndent === null) {
      childIndent = indent;
    }
    if (indent !== childIndent) {
      continue;
    }
    const mode = /^\s*mode:\s*(.*)$/.exec(line);
    if (mode) {
      return unquote(stripComment(mode[1] ?? ""));
    }
  }
  return null;
}

/** A trailing YAML comment, which needs whitespace before its `#`. */
function stripComment(value: string): string {
  return value.replace(/\s+#.*$/, "").trim();
}

/** The value inside matching quotes, or the value as written. */
function unquote(value: string): string {
  const quoted = /^(['"])(.*)\1$/.exec(value);
  return quoted?.[2] ?? value;
}

export async function validateUiPrototypeMode(root: string, config: QfaiConfig): Promise<Issue[]> {
  const uiRoot = path.join(resolvePath(root, config, "contractsDir"), "ui");
  const contractFiles = await collectUiContractFiles(uiRoot);
  if (contractFiles.length === 0) {
    return [];
  }

  const known: ReadonlySet<string> = new Set(PROTOTYPE_MODES);
  const vocabulary = PROTOTYPE_MODES.map((mode) => `\`${mode}\``).join(", ");
  const issues: Issue[] = [];
  for (const file of contractFiles.slice().sort()) {
    const mode = prototypeModeIn(await readSafe(file));
    if (mode === null || mode === "" || known.has(mode)) {
      continue;
    }
    issues.push(
      issue(
        UI_PROTOTYPE_MODE_RULE_ID,
        `UI contract declares \`prototype.mode: ${mode}\`, which is not a mode this tooling knows. The vocabulary is ${vocabulary}.`,
        "warning",
        path.relative(root, file).split(path.sep).join("/"),
        "contracts.uiPrototypeMode",
        undefined,
        "canonical",
        `Set \`prototype.mode\` to ${vocabulary}, or drop the key. Nothing branches on the value, so one outside the vocabulary misleads whoever reads the contract and changes no run.`,
      ),
    );
  }
  return issues;
}

/** A file this rule cannot read contributes nothing rather than failing the run. */
async function readSafe(file: string): Promise<string> {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
}
