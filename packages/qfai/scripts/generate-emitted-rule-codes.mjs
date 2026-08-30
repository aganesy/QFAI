#!/usr/bin/env node
/**
 * Generator for `src/core/emittedRuleCodes.ts`.
 *
 * `.qfai/waivers.yml` names a rule by its finding `code`. The waiver engine used
 * to decide whether that code exists by looking at the findings the current run
 * produced, plus a hand-written table of nine entries. Every other code — the
 * overwhelming majority — read as an unknown rule on any run where it stayed
 * quiet, which is precisely the state a project reaches after it fixes the
 * defect the waiver was written for.
 *
 * This script replaces the hand-maintained half of that answer: it scans the
 * package source for every code a validate `Issue` can carry and writes them to
 * a generated module, so "does this rule exist?" is answered by the emitters
 * themselves rather than by whoever remembered to extend a list.
 *
 * Two emission shapes are recognised, matching how findings are constructed
 * across `src/`:
 *   - a call to an issue factory — the shared `issue(code, message, severity, …)`
 *     helper, or any local `function name(code: …): Issue`. Several validators
 *     build their findings through such a helper, and several name their rule
 *     through a constant rather than a literal (`issue(RULE_ID, …)`), so the
 *     first argument is resolved against every `const NAME = "…"` in the tree.
 *     Others carry the code on a record and hand it over as a property
 *     (`issue(finding.ruleId, …)`, `issue(input.missingCode, …)`,
 *     `issue(group.code, …)`), so a property access is resolved against the
 *     values that property is given in object literals **in the same file** —
 *     the file that spells `ruleId: "…"` is always the file that passes
 *     `finding.ruleId` on. Scanning only literals and identifiers dropped every
 *     code these validators emit.
 *   - an object literal carrying `code: "…"` **and** an `Issue`-only field
 *     (`category:` or `rule:`). The extra field is what keeps diagnostics of
 *     other shapes out: `GuardrailIssue` (`QFAI-GR-00N`, a `guardrails`-command
 *     type that `applyWaivers` never sees), `HandoffValidationIssue`, the
 *     render-evidence error record and the justification catalog all carry a
 *     `code` but none of them is a validate `Issue`, and a waiver naming one
 *     could never match a finding.
 *
 * Severity is captured only where every emission of a code spells it as the
 * literal `"error"`. Such a rule can never be waived (`QFAI-WAIVER-002`), so the
 * engine has to refuse it even on the runs where it stays quiet; anything less
 * certain — a severity read from a variable, or a code emitted at more than one
 * severity — is left to the run that actually produces the finding. Two shapes
 * are deliberately *not* read as severity evidence:
 *   - an object literal with no `severity:` field at all. `Issue.severity` is
 *     required, so such a literal is emission metadata on its way to a factory
 *     call (`{ code, rule, patterns, message }` in `layerCoverage`), not a
 *     finding; counting it as "severity unknown" would mask the `"error"` the
 *     factory call right below it does spell.
 *   - a code that a post-emission rewrite can hand to `applyWaivers` at a
 *     lower severity. Prototyping's exploration mode downgrades its relaxable
 *     codes error → warning before waivers are applied, so classifying them
 *     from the raw emitter would reject on a clean run the very waiver a run
 *     with the finding accepts.
 *
 * Invocation modes:
 *   - default        rewrite the output module in place.
 *   - `--check`      compare only; exit 1 when the committed module is stale.
 *   - `--src <dir>`  scan a different tree. Test hook.
 *   - `--out <file>` write (or compare) a different file. Test hook.
 *
 * Exit codes:
 *   0 — module written, or already in sync under `--check`.
 *   1 — `--check` found drift, or the output file could not be read/written.
 *   2 — invalid invocation.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { argv, exit, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, "..");
const DEFAULT_SRC_DIR = path.join(PACKAGE_ROOT, "src");
const DEFAULT_OUTPUT_FILE = path.join(DEFAULT_SRC_DIR, "core", "emittedRuleCodes.ts");
const OUTPUT_LABEL = "src/core/emittedRuleCodes.ts";

/**
 * The shape a rule id may take, kept identical to `RULE_ID_RE` in
 * `src/core/waivers.ts`. Anything a waiver could not name is not worth
 * registering, and the filter keeps interpolated or lowercase literals that
 * happen to sit in one of the two positions out of the generated module.
 */
const RULE_ID_RE = /^[A-Z][A-Z0-9]*(?:[-_][A-Z0-9]+)*$/;

/**
 * Prefix and suffix wrapping a sanitized string literal's index into the file's
 * literal table. Long enough that no real identifier collides with one.
 */
const LITERAL_PREFIX = "__qfaiLit";
const LITERAL_SUFFIX = "Lit__";

/** A sanitized string literal, capturing its index into the literal table. */
const LITERAL_TOKEN_RE = new RegExp(`^${LITERAL_PREFIX}(\\d+)${LITERAL_SUFFIX}$`);

/** A `const NAME = "value"` binding, matched against sanitized text. */
const STRING_CONST_RE = new RegExp(
  `\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*(?::[^=;\\n]+)?=\\s*(${LITERAL_PREFIX}\\d+${LITERAL_SUFFIX})`,
  "g",
);

/**
 * A `const NAME = <cond> ? "a" : "b"` binding — one name, several codes.
 *
 * `designFidelity.ts` picks between `QFAI-FID-010` and `QFAI-FID-011` this way
 * and hands the result to `issue()`, so an identifier-only resolver saw neither
 * code and a waiver naming them was dropped on any run where the rule stayed
 * quiet. Every literal in the initializer counts: `RULE_ID_RE` filters what is
 * not a rule id, so over-reading a branch costs nothing.
 */
const CONDITIONAL_CONST_RE =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;\n]+)?=\s*([^;\n]*\?[^;\n]*:[^;\n]*)/g;

/** Every string-literal placeholder inside one expression. */
const LITERAL_TOKEN_ALL_RE = new RegExp(`${LITERAL_PREFIX}(\\d+)${LITERAL_SUFFIX}`, "g");

/**
 * The shared `issue()` helper: `issue(code, message, severity, …)`.
 *
 * Seeded rather than discovered so the scan does not depend on
 * `src/core/validators/utils.ts` being inside the tree it was pointed at.
 */
const CORE_ISSUE_FACTORY = ["issue", { severityArg: 2, fixedSeverity: null }];

/**
 * `issue(code, message, severity, file, rule, …)` — the argument a finding
 * carries as its `rule`.
 *
 * A waiver may name either spelling, and several rules publish an alias no
 * `code` literal ever yields: `tddList.ts` emits `TDDLIST-003` and
 * `TDDLIST-004` only here. Collecting them keeps a waiver written against the
 * documented spelling out of `QFAI-WAIVER-004` on a run where the rule stays
 * quiet. Only the shared helper is read — a local factory's parameter order is
 * its own — and `RULE_ID_RE` discards the `category.subcategory` strings this
 * argument usually carries.
 */
const CORE_ISSUE_RULE_ARG = 4;

/**
 * A local factory: `function name(code: …` whose return type is `Issue`.
 *
 * Two validators build their findings through such a helper rather than through
 * `issue()`, so a scan that knew only `issue()` would drop every code they emit.
 */
const ISSUE_FACTORY_RE = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(\s*code\s*:/g;

/** The `Issue` return annotation that marks a factory, just past its `)`. */
const ISSUE_RETURN_RE = /^\s*:\s*(?:Promise\s*<\s*)?Issue\b/;

/** A `severity` parameter, in a sanitized parameter slice. */
const SEVERITY_PARAM_RE = /^\s*severity\s*[?:]/;

/** A factory whose severity cannot be read statically. */
const UNKNOWN_FACTORY = { severityArg: null, fixedSeverity: null };

/** An object literal's `code:` field, in sanitized text. */
const CODE_FIELD_RE = /\bcode\s*:\s*([^\s,;}]+)/g;

/**
 * Any `name: value` field, in sanitized text. Used to learn what strings a
 * property is given, so a code handed on as `record.property` resolves.
 */
const ANY_FIELD_RE = /\b([A-Za-z_$][\w$]*)\s*:\s*([^\s,;{}()[\]]+)/g;

/** A property access, capturing the property name a value was read from. */
const PROPERTY_ACCESS_RE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\.([A-Za-z_$][\w$]*)$/;

/** Fields only a validate `Issue` carries among the `code`-bearing shapes. */
const ISSUE_ONLY_FIELD_RE = /\b(?:category|rule)\s*:/;

/** An object literal's `severity:` field, in sanitized text. */
const SEVERITY_FIELD_RE = /\bseverity\s*:\s*([^\s,;}]+)/;

/** {@link SEVERITY_FIELD_RE}, for sweeping a factory body for every spelling. */
const SEVERITY_FIELD_ALL_RE = /\bseverity\s*:\s*([^\s,;}]+)/g;

/**
 * Constants naming the codes a post-emission rewrite lowers below `error`
 * before `applyWaivers` sees them.
 *
 * `src/core/prototyping/mode.ts` is the SSOT for that list at runtime;
 * `runPrototypingValidators` applies it to the whole prototyping profile, so
 * under `mode: exploration` these codes reach the waiver engine as `warning`
 * however their emitter spelled them. Classifying them error-only from the
 * emitter would make the same waiver file active on the run that produces the
 * (relaxed) finding and rejected on the clean run — the exact inversion this
 * module exists to remove. Seeded by name for the same reason
 * {@link CORE_ISSUE_FACTORY} is: the scan must not depend on the module being
 * inside the tree it was pointed at.
 */
const RELAXED_CODE_LIST_NAMES = new Set(["EXPLORATION_RELAXABLE_CODES"]);

/** A `const NAME = [` array binding, matched against sanitized text. */
const ARRAY_CONST_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;\n]+)?=\s*\[/g;

/**
 * Replace every string literal, template literal and comment with an opaque
 * placeholder so the remaining text can be scanned by bracket balance alone.
 *
 * String literals become an opaque token resolvable through the returned
 * `literals` array. Template literals and comments become blanks: no rule id is
 * ever spelled as one, and blanking them removes the `${…}` braces and the
 * stray brackets in prose that would otherwise unbalance the scan.
 *
 * @param {string} text
 * @returns {{ sanitized: string, literals: string[] }}
 */
function sanitizeSource(text) {
  const literals = [];
  let out = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") {
        out += " ";
        index += 1;
      }
      continue;
    }
    if (char === "/" && next === "*") {
      const end = text.indexOf("*/", index + 2);
      const stop = end === -1 ? text.length : end + 2;
      for (; index < stop; index += 1) {
        out += text[index] === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      const scanned = scanQuoted(text, index, char);
      if (scanned) {
        literals.push(scanned.value);
        out += `${LITERAL_PREFIX}${literals.length - 1}${LITERAL_SUFFIX}`;
        index = scanned.end;
        continue;
      }
      out += " ";
      index += 1;
      continue;
    }
    if (char === "`") {
      const end = scanTemplate(text, index);
      for (; index < end; index += 1) {
        out += text[index] === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (char === "/" && startsRegExp(out)) {
      const end = scanRegExp(text, index);
      for (; index < end; index += 1) {
        out += text[index] === "\n" ? "\n" : " ";
      }
      continue;
    }
    out += char;
    index += 1;
  }
  return { sanitized: out, literals };
}

/**
 * @param {string} text
 * @param {number} start index of the opening quote.
 * @param {string} quote
 * @returns {{ value: string, end: number } | null} `null` when unterminated.
 */
function scanQuoted(text, start, quote) {
  let value = "";
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      value += text[index + 1] ?? "";
      index += 2;
      continue;
    }
    if (char === quote) {
      return { value, end: index + 1 };
    }
    if (char === "\n") {
      return null;
    }
    value += char;
    index += 1;
  }
  return null;
}

/**
 * @param {string} text
 * @param {number} start index of the opening backtick.
 * @returns {number} index just past the closing backtick.
 */
function scanTemplate(text, start) {
  let index = start + 1;
  let depth = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "$" && text[index + 1] === "{") {
      depth += 1;
      index += 2;
      continue;
    }
    if (char === "}" && depth > 0) {
      depth -= 1;
      index += 1;
      continue;
    }
    if (char === "`") {
      if (depth === 0) {
        return index + 1;
      }
      index = scanTemplate(text, index);
      continue;
    }
    index += 1;
  }
  return text.length;
}

/**
 * Whether a `/` at the end of `emitted` opens a regular expression rather than
 * a division. The usual heuristic: a regex may only follow an operator, an
 * opening bracket, or nothing at all.
 *
 * @param {string} emitted sanitized text produced so far.
 * @returns {boolean}
 */
function startsRegExp(emitted) {
  const trimmed = emitted.replace(/\s+$/, "");
  if (trimmed.length === 0) {
    return true;
  }
  const last = trimmed[trimmed.length - 1];
  if ("(,=:[!&|?{};+-*%~^<>".includes(last)) {
    return true;
  }
  return /\b(?:return|typeof|case|in|of|do|else|yield|await|new|delete|void)$/.test(trimmed);
}

/**
 * @param {string} text
 * @param {number} start index of the opening slash.
 * @returns {number} index just past the closing slash and its flags.
 */
function scanRegExp(text, start) {
  let index = start + 1;
  let inClass = false;
  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "\n") {
      return start + 1;
    }
    if (char === "[") {
      inClass = true;
    } else if (char === "]") {
      inClass = false;
    } else if (char === "/" && !inClass) {
      index += 1;
      while (index < text.length && /[a-z]/.test(text[index])) {
        index += 1;
      }
      return index;
    }
    index += 1;
  }
  return text.length;
}

/**
 * Resolve one sanitized argument or field value to a string.
 *
 * @param {string} raw sanitized source slice.
 * @param {ReadonlyArray<string>} literals
 * @param {ReadonlyMap<string, ReadonlySet<string>>} constants identifier bindings.
 * @returns {string[]} every string this expression can be.
 */
function resolveValue(raw, literals, constants) {
  const trimmed = raw.trim();
  const token = LITERAL_TOKEN_RE.exec(trimmed);
  if (token) {
    const literal = literals[Number(token[1])];
    return literal === undefined ? [] : [literal];
  }
  const bound = constants.get(trimmed);
  return bound ? [...bound] : [];
}

/**
 * Resolve the expression a code was named through.
 *
 * Beyond {@link resolveValue}'s literal and identifier, a property access
 * resolves to every string that property is given in an object literal in the
 * same file. Several validators carry the code on a record and hand it to the
 * factory that way — `issue(finding.ruleId, …)` in `designAudit`,
 * `issue(input.missingCode, …)` in `orphanProhibition`, `issue(group.code, …)`
 * in `layerCoverage` — and each of them builds those records in the file that
 * passes them on, so the same file always holds the answer.
 *
 * Same-file is also what keeps the resolution honest: widening it to the whole
 * tree would let any `code:` field anywhere — `GuardrailIssue`'s included —
 * answer for every `x.code` argument in `src/`.
 *
 * @param {string} raw sanitized source slice.
 * @param {{ literals: string[], properties: ReadonlyMap<string, ReadonlySet<string>> }} source
 * @param {ReadonlyMap<string, ReadonlySet<string>>} constants
 * @returns {string[]} every string this expression can be.
 */
function resolveCodeExpression(raw, source, constants) {
  const direct = resolveValue(raw, source.literals, constants);
  if (direct.length > 0) {
    return direct;
  }
  const access = PROPERTY_ACCESS_RE.exec(raw.trim());
  if (access) {
    const bound = source.properties.get(access[1]);
    return bound ? [...bound] : [];
  }
  // A conditional or coalescing expression handed straight to the factory:
  // take every literal branch. `RULE_ID_RE` discards whatever is not a code.
  return literalsIn(raw, source.literals);
}

/**
 * Every string literal an expression contains, in source order.
 *
 * @param {string} raw sanitized expression.
 * @param {readonly string[]} literals
 * @returns {string[]}
 */
function literalsIn(raw, literals) {
  const found = [];
  for (const token of raw.matchAll(LITERAL_TOKEN_ALL_RE)) {
    const value = literals[Number(token[1])];
    if (value !== undefined) {
      found.push(value);
    }
  }
  return found;
}

/**
 * Every string a property is given in an object literal in one file.
 *
 * @param {{ sanitized: string, literals: string[] }} source
 * @param {ReadonlyMap<string, ReadonlySet<string>>} constants
 * @returns {Map<string, Set<string>>}
 */
function collectPropertyValues(source, constants) {
  const properties = new Map();
  for (const found of source.sanitized.matchAll(ANY_FIELD_RE)) {
    const [, name, value] = found;
    const resolved = resolveValue(value, source.literals, constants);
    if (resolved.length === 0) {
      continue;
    }
    let bound = properties.get(name);
    if (!bound) {
      bound = new Set();
      properties.set(name, bound);
    }
    for (const one of resolved) {
      bound.add(one);
    }
  }
  return properties;
}

/**
 * Every code a post-emission rewrite can lower below `error`.
 *
 * Read out of the {@link RELAXED_CODE_LIST_NAMES} array constants, which are
 * the runtime SSOT for that relaxation.
 *
 * @param {ReadonlyArray<{ sanitized: string, literals: string[] }>} sources
 * @returns {Set<string>}
 */
function collectDowngradedCodes(sources) {
  const codes = new Set();
  for (const source of sources) {
    ARRAY_CONST_RE.lastIndex = 0;
    let match = ARRAY_CONST_RE.exec(source.sanitized);
    while (match) {
      if (RELAXED_CODE_LIST_NAMES.has(match[1])) {
        // The `[` the match ends on, not the first `[` after it: a
        // `readonly string[]` annotation sits between the two.
        const members = splitCallArguments(source.sanitized, match.index + match[0].length - 1);
        for (const member of members ? members.args : []) {
          for (const value of resolveValue(member, source.literals, new Map())) {
            codes.add(value);
          }
        }
      }
      match = ARRAY_CONST_RE.exec(source.sanitized);
    }
  }
  return codes;
}

/**
 * Split a sanitized argument list into top-level arguments.
 *
 * @param {string} sanitized
 * @param {number} openParen index of `(`.
 * @returns {{ args: string[], end: number } | null} the top-level arguments and
 *   the index of the closing `)`, or `null` when the list is unbalanced.
 */
function splitCallArguments(sanitized, openParen) {
  const args = [];
  let depth = 0;
  let current = "";
  for (let index = openParen; index < sanitized.length; index += 1) {
    const char = sanitized[index];
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
      if (depth === 1) {
        continue;
      }
    } else if (char === ")" || char === "]" || char === "}") {
      depth -= 1;
      if (depth === 0) {
        args.push(current);
        return { args, end: index };
      }
    } else if (char === "," && depth === 1) {
      args.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  return null;
}

/**
 * The `{ … }` block starting at or after `position`, as a sanitized slice.
 *
 * @param {string} sanitized
 * @param {number} position
 * @returns {string | null}
 */
function blockAt(sanitized, position) {
  const start = sanitized.indexOf("{", position);
  if (start === -1) {
    return null;
  }
  let depth = 0;
  for (let index = start; index < sanitized.length; index += 1) {
    const char = sanitized[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return sanitized.slice(start, index + 1);
      }
    }
  }
  return null;
}

/**
 * The object literal enclosing `position`, as a sanitized slice.
 *
 * @param {string} sanitized
 * @param {number} position
 * @returns {string | null}
 */
function enclosingObjectLiteral(sanitized, position) {
  let depth = 0;
  let start = -1;
  for (let index = position; index >= 0; index -= 1) {
    const char = sanitized[index];
    if (char === "}") {
      depth += 1;
    } else if (char === "{") {
      if (depth === 0) {
        start = index;
        break;
      }
      depth -= 1;
    }
  }
  if (start === -1) {
    return null;
  }
  depth = 0;
  for (let index = start; index < sanitized.length; index += 1) {
    const char = sanitized[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return sanitized.slice(start, index + 1);
      }
    }
  }
  return null;
}

/**
 * Record one emission of `code` at `severity`.
 *
 * @param {Map<string, { severities: Set<string | null> }>} sink
 * @param {string} code
 * @param {string | null | undefined} severity `null` when this site spells a
 *   severity this scan cannot read; `undefined` when the site carries no
 *   severity at all and therefore says nothing about the rule's severity.
 */
function recordEmission(sink, code, severity) {
  if (!RULE_ID_RE.test(code)) {
    return;
  }
  let entry = sink.get(code);
  if (!entry) {
    entry = { severities: new Set() };
    sink.set(code, entry);
  }
  if (severity !== undefined) {
    entry.severities.add(severity);
  }
}

/**
 * Collect every module-level `const NAME = "value"` binding under `srcDir`.
 *
 * A name may be bound in more than one module; every binding is kept, because
 * the scanner cannot tell which one an `issue(NAME, …)` call resolved through
 * and registering a code that exists is harmless where dropping one is not.
 *
 * @param {ReadonlyArray<{ file: string, sanitized: string, literals: string[] }>} sources
 * @returns {Map<string, Set<string>>}
 */
function collectStringConstants(sources) {
  const constants = new Map();
  for (const source of sources) {
    for (const found of source.sanitized.matchAll(STRING_CONST_RE)) {
      const [, name, token] = found;
      const [value] = resolveValue(token, source.literals, constants);
      if (value === undefined) {
        continue;
      }
      let bound = constants.get(name);
      if (!bound) {
        bound = new Set();
        constants.set(name, bound);
      }
      bound.add(value);
    }
    for (const found of source.sanitized.matchAll(CONDITIONAL_CONST_RE)) {
      const [, name, initializer] = found;
      const values = literalsIn(initializer ?? "", source.literals);
      if (values.length === 0) {
        continue;
      }
      let bound = constants.get(name);
      if (!bound) {
        bound = new Set();
        constants.set(name, bound);
      }
      for (const value of values) {
        bound.add(value);
      }
    }
  }
  return constants;
}

/**
 * Collect every code a validate `Issue` can carry under `srcDir`.
 *
 * @param {string} srcDir directory to walk; every `.ts` file below it is read.
 * @param {string} outputFile skipped while scanning — it holds the codes as
 *   plain array members, but skipping it keeps the generator idempotent no
 *   matter how the module is later reformatted.
 * @returns {Promise<{ codes: string[], errorOnly: string[], aliases: string[] }>} sorted,
 *   de-duplicated. `aliases` holds the ids that only ever reach a finding as
 *   `Issue.rule`, so a code that is also emitted as a `code` never appears there.
 */
async function collectEmittedRuleCodes(srcDir, outputFile) {
  const skip = path.resolve(outputFile);
  const sources = [];
  for (const file of await listTypeScriptFiles(srcDir)) {
    if (path.resolve(file) === skip || isPostWaiverSource(file)) {
      continue;
    }
    let raw;
    try {
      raw = await readFile(file, "utf-8");
    } catch (error) {
      throw new Error(`failed to read ${file}: ${toMessage(error)}`);
    }
    const { sanitized, literals } = sanitizeSource(raw);
    sources.push({ file, raw, sanitized, literals });
  }

  const constants = collectStringConstants(sources);
  const factories = collectIssueFactories(sources);
  const downgraded = collectDowngradedCodes(sources);
  /** @type {Map<string, { severities: Set<string | null> }>} */
  const emissions = new Map();
  /** @type {Set<string>} */
  const aliasSet = new Set();
  for (const source of sources) {
    const resolvable = { ...source, properties: collectPropertyValues(source, constants) };
    scanFactoryCalls(resolvable, factories, constants, emissions, aliasSet);
    scanIssueObjectLiterals(resolvable, constants, emissions);
  }

  const codes = [...emissions.keys()].sort((a, b) => a.localeCompare(b, "en"));
  const errorOnly = codes.filter((code) => {
    if (downgraded.has(code)) {
      return false;
    }
    const severities = emissions.get(code)?.severities;
    return Boolean(severities && severities.size === 1 && severities.has("error"));
  });
  const aliases = [...aliasSet]
    .filter((alias) => !emissions.has(alias))
    .sort((a, b) => a.localeCompare(b, "en"));
  return { codes, errorOnly, aliases };
}

/**
 * True for a file whose findings are appended after `applyWaivers` has run.
 *
 * `applyWaivers` is called inside `core/validate.ts`, so anything `src/cli/`
 * pushes onto the result — `D-DEPRECATED-PATH`, `QFAI-PROFILE-001` — can never
 * be suppressed by a waiver. Registering them as known let a waiver that
 * cannot possibly match be reported as `active`, which is the same lie
 * `QFAI-WAIVER-004` exists to prevent, pointing the other way.
 *
 * @param {string} file
 * @returns {boolean}
 */
function isPostWaiverSource(file) {
  return path.resolve(file).split(path.sep).includes("cli");
}

/**
 * Every function that turns a code into an `Issue`: the shared `issue()` helper
 * plus each local `function name(code: …): Issue` declared under the tree.
 *
 * A factory that takes its severity as a parameter reports the argument index
 * to read it from; one that hard-codes a single severity in its body reports
 * that instead. Anything less definite leaves severity unknown, which keeps the
 * code out of {@link renderEmittedRuleCodesModule}'s error-only list.
 *
 * @param {ReadonlyArray<{ sanitized: string, literals: string[] }>} sources
 * @returns {Map<string, { severityArg: number | null, fixedSeverity: string | null }>}
 */
function collectIssueFactories(sources) {
  const factories = new Map([CORE_ISSUE_FACTORY]);
  for (const source of sources) {
    ISSUE_FACTORY_RE.lastIndex = 0;
    let match = ISSUE_FACTORY_RE.exec(source.sanitized);
    while (match) {
      const name = match[1];
      const open = source.sanitized.indexOf("(", match.index);
      const params = open === -1 ? null : splitCallArguments(source.sanitized, open);
      if (name !== CORE_ISSUE_FACTORY[0] && params) {
        const tail = source.sanitized.slice(params.end + 1, params.end + 40);
        if (ISSUE_RETURN_RE.test(tail)) {
          const described = describeFactory(source, params);
          const existing = factories.get(name);
          // Two modules may declare same-named local helpers. Their codes are
          // still worth collecting, but reading a severity out of an argument
          // position one of them does not use would be a guess, so a conflict
          // demotes the name to "severity unknown".
          factories.set(
            name,
            existing && !sameFactory(existing, described) ? UNKNOWN_FACTORY : described,
          );
        }
      }
      match = ISSUE_FACTORY_RE.exec(source.sanitized);
    }
  }
  return factories;
}

/**
 * @param {{ severityArg: number | null, fixedSeverity: string | null }} left
 * @param {{ severityArg: number | null, fixedSeverity: string | null }} right
 * @returns {boolean}
 */
function sameFactory(left, right) {
  return left.severityArg === right.severityArg && left.fixedSeverity === right.fixedSeverity;
}

/**
 * @param {{ sanitized: string, literals: string[] }} source
 * @param {{ args: string[], end: number }} params
 * @returns {{ severityArg: number | null, fixedSeverity: string | null }}
 */
function describeFactory(source, params) {
  const severityArg = params.args.findIndex((param) => SEVERITY_PARAM_RE.test(param));
  if (severityArg !== -1) {
    return { severityArg, fixedSeverity: null };
  }
  const body = blockAt(source.sanitized, params.end + 1);
  const spelled = new Set();
  for (const found of body ? body.matchAll(SEVERITY_FIELD_ALL_RE) : []) {
    for (const value of resolveValue(found[1], source.literals, new Map())) {
      spelled.add(value);
    }
  }
  return { severityArg: null, fixedSeverity: spelled.size === 1 ? [...spelled][0] : null };
}

/**
 * @param {{ sanitized: string, literals: string[], properties: ReadonlyMap<string, ReadonlySet<string>> }} source
 * @param {ReadonlyMap<string, { severityArg: number | null, fixedSeverity: string | null }>} factories
 * @param {ReadonlyMap<string, ReadonlySet<string>>} constants
 * @param {Map<string, { severities: Set<string | null> }>} emissions
 */
function scanFactoryCalls(source, factories, constants, emissions, aliases) {
  for (const [name, factory] of factories) {
    const pattern = new RegExp(`\\b${name}\\(`, "g");
    let match = pattern.exec(source.sanitized);
    while (match) {
      const call = splitCallArguments(source.sanitized, match.index + match[0].length - 1);
      if (call && call.args.length > 0) {
        for (const [code, severity] of callEmissions(source, factory, call.args, constants)) {
          recordEmission(emissions, code, severity);
        }
        if (aliases && name === CORE_ISSUE_FACTORY[0]) {
          const raw = call.args[CORE_ISSUE_RULE_ARG];
          if (raw !== undefined) {
            for (const alias of resolveCodeExpression(raw, source, constants)) {
              if (RULE_ID_RE.test(alias)) {
                aliases.add(alias);
              }
            }
          }
        }
      }
      match = pattern.exec(source.sanitized);
    }
  }
}

/**
 * Split a top-level `cond ? whenTrue : whenFalse` expression.
 *
 * Only the outermost conditional is split, and only where the `?` and its `:`
 * both sit at bracket depth 0; a nested conditional stays inside the branch
 * text, which {@link literalsIn} still reads in full. `?.` and `??` are skipped
 * so an optional chain in the condition does not open a branch.
 *
 * @param {string} raw sanitized expression.
 * @returns {{ condition: string, whenTrue: string, whenFalse: string } | null}
 */
function conditionalBranches(raw) {
  let depth = 0;
  let question = -1;
  let nested = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      depth -= 1;
    } else if (depth !== 0) {
      continue;
    } else if (char === "?") {
      if (raw[index + 1] === "." || raw[index + 1] === "?") {
        index += 1;
      } else if (question === -1) {
        question = index;
      } else {
        nested += 1;
      }
    } else if (char === ":" && question !== -1) {
      if (nested > 0) {
        nested -= 1;
        continue;
      }
      return {
        condition: raw.slice(0, question).trim(),
        whenTrue: raw.slice(question + 1, index),
        whenFalse: raw.slice(index + 1),
      };
    }
  }
  return null;
}

/**
 * Every `(code, severity)` pair one factory call can produce.
 *
 * A call that picks both its code and its severity off the same condition —
 * `issue(declaresForm ? "QFAI-REVIEW-007" : "QFAI-REVIEW-009", …, declaresForm
 * ? "error" : "warning", …)` in `reviewArtifacts.ts` — is read branch by
 * branch, so each code keeps the severity it is actually raised at. Pairing
 * them off the cross-product instead would leave every such code's severity
 * unknown and drop it from {@link renderEmittedRuleCodesModule}'s error-only
 * list, weakening `QFAI-WAIVER-002` for a rule that only ever fails hard.
 *
 * @param {{ sanitized: string, literals: string[], properties: ReadonlyMap<string, ReadonlySet<string>> }} source
 * @param {{ severityArg: number | null, fixedSeverity: string | null }} factory
 * @param {readonly string[]} args
 * @param {ReadonlyMap<string, ReadonlySet<string>>} constants
 * @returns {Array<[string, string | null]>}
 */
function callEmissions(source, factory, args, constants) {
  const codeArg = args[0] ?? "";
  const severityArg = factory.severityArg === null ? undefined : args[factory.severityArg];
  const codeBranches = severityArg === undefined ? null : conditionalBranches(codeArg);
  const severityBranches = codeBranches === null ? null : conditionalBranches(severityArg ?? "");
  if (codeBranches && severityBranches && codeBranches.condition === severityBranches.condition) {
    /** @type {Array<[string, string | null]>} */
    const paired = [];
    for (const side of /** @type {const} */ (["whenTrue", "whenFalse"])) {
      const resolved = resolveValue(severityBranches[side], source.literals, constants);
      const severity = resolved.length === 1 ? (resolved[0] ?? null) : null;
      for (const code of resolveCodeExpression(codeBranches[side], source, constants)) {
        paired.push([code, severity]);
      }
    }
    if (paired.length > 0) {
      return paired;
    }
  }
  const severity = callSeverity(source, factory, args, constants);
  return resolveCodeExpression(codeArg, source, constants).map((code) => [code, severity]);
}

/**
 * @param {{ literals: string[] }} source
 * @param {{ severityArg: number | null, fixedSeverity: string | null }} factory
 * @param {readonly string[]} args
 * @param {ReadonlyMap<string, ReadonlySet<string>>} constants
 * @returns {string | null}
 */
function callSeverity(source, factory, args, constants) {
  if (factory.severityArg === null) {
    return factory.fixedSeverity;
  }
  const raw = args[factory.severityArg];
  if (raw === undefined) {
    return null;
  }
  const resolved = resolveValue(raw, source.literals, constants);
  return resolved.length === 1 ? resolved[0] : null;
}

/**
 * @param {{ sanitized: string, literals: string[], properties: ReadonlyMap<string, ReadonlySet<string>> }} source
 * @param {ReadonlyMap<string, ReadonlySet<string>>} constants
 * @param {Map<string, { severities: Set<string | null> }>} emissions
 */
function scanIssueObjectLiterals(source, constants, emissions) {
  CODE_FIELD_RE.lastIndex = 0;
  let match = CODE_FIELD_RE.exec(source.sanitized);
  while (match) {
    const literal = enclosingObjectLiteral(source.sanitized, match.index);
    if (literal && ISSUE_ONLY_FIELD_RE.test(literal)) {
      const codes = resolveCodeExpression(match[1], source, constants);
      for (const code of codes) {
        recordEmission(emissions, code, objectLiteralSeverity(source, literal, constants));
      }
    }
    match = CODE_FIELD_RE.exec(source.sanitized);
  }
}

/**
 * The severity an object literal claims for its code.
 *
 * `undefined` — no evidence — when the literal has no `severity:` field at all.
 * `Issue.severity` is required, so such a literal is not a finding but the
 * metadata a factory call is about to turn into one (`{ code, rule, patterns,
 * message }` in `layerCoverage`, whose `issue(group.code, …, "error")` is the
 * real emission). Reading it as "severity unknown" would drop the code out of
 * the error-only list on the strength of a record that never reaches
 * `applyWaivers`.
 *
 * @param {{ literals: string[] }} source
 * @param {string} literal sanitized object-literal slice.
 * @param {ReadonlyMap<string, ReadonlySet<string>>} constants
 * @returns {string | null | undefined}
 */
function objectLiteralSeverity(source, literal, constants) {
  const found = SEVERITY_FIELD_RE.exec(literal);
  if (!found) {
    return undefined;
  }
  const severities = resolveValue(found[1], source.literals, constants);
  return severities.length === 1 ? severities[0] : null;
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listTypeScriptFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    throw new Error(`failed to list ${dir}: ${toMessage(error)}`);
  }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Render the generated module. Formatting matches Prettier's output for this
 * shape so `prettier --check` stays green on a freshly generated file.
 *
 * @param {readonly string[]} codes
 * @param {readonly string[]} errorOnly
 * @param {readonly string[]} aliases
 * @returns {string}
 */
function renderEmittedRuleCodesModule(codes, errorOnly, aliases) {
  const list = (values) =>
    values.length === 0 ? "" : `\n${values.map((value) => `  "${value}",`).join("\n")}\n`;
  return `/**
 * Every code a validate \`Issue\` from this package can carry.
 *
 * GENERATED FILE — do not edit by hand. Run \`npm run generate:rule-codes\`
 * from \`packages/qfai\` to refresh it; the scripts test slice fails on drift.
 *
 * The waiver engine reads this to tell a mistyped rule id apart from a real
 * rule that simply did not fire on this run. Without it, a waiver kept on file
 * after its defect was fixed is reported as naming a rule that does not exist.
 */
export const EMITTED_RULE_CODES: readonly string[] = [${list(codes)}];

/**
 * The subset every emitter raises at \`error\`.
 *
 * A waiver may only target \`warning\` / \`info\` findings, so these have to be
 * refused (\`QFAI-WAIVER-002\`) even on the runs where the rule stays quiet and
 * no observed severity is available. A code emitted at more than one severity,
 * or at a severity read from a variable, is deliberately absent: only the run
 * that produces the finding can judge those.
 */
export const ERROR_ONLY_RULE_CODES: readonly string[] = [${list(errorOnly)}];

/**
 * Rule ids that only ever reach a finding through \`Issue.rule\`.
 *
 * Some emitters key the finding on a broad \`code\` and narrow it with a
 * per-defect \`rule\` — \`tddList.ts\` raises one code but tags each finding
 * \`TDDLIST-003\` / \`TDDLIST-004\`. A waiver may name either, so the ids that
 * never appear as a \`code\` are listed here rather than folded into
 * {@link EMITTED_RULE_CODES}: they are waivable, but they are not codes.
 */
export const RULE_ID_ALIASES: readonly string[] = [${list(aliases)}];
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
 * @returns {{ checkOnly: boolean, srcDir: string, outputFile: string } | { error: string }}
 */
function parseArgs(args) {
  let checkOnly = false;
  let srcDir = DEFAULT_SRC_DIR;
  let outputFile = DEFAULT_OUTPUT_FILE;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--check") {
      checkOnly = true;
      continue;
    }
    if (arg === "--src" || arg === "--out") {
      const value = args[index + 1];
      if (!value) {
        return { error: `${arg} requires a path` };
      }
      if (arg === "--src") {
        srcDir = path.resolve(value);
      } else {
        outputFile = path.resolve(value);
      }
      index += 1;
      continue;
    }
    return { error: `unknown argument: ${arg}` };
  }
  return { checkOnly, srcDir, outputFile };
}

async function main() {
  const parsed = parseArgs(argv.slice(2));
  if ("error" in parsed) {
    stderr.write(`${parsed.error}\n`);
    return 2;
  }

  const { codes, errorOnly, aliases } = await collectEmittedRuleCodes(
    parsed.srcDir,
    parsed.outputFile,
  );
  const rendered = renderEmittedRuleCodesModule(codes, errorOnly, aliases);

  if (parsed.checkOnly) {
    let current;
    try {
      current = await readFile(parsed.outputFile, "utf-8");
    } catch (error) {
      stderr.write(`cannot read ${parsed.outputFile}: ${toMessage(error)}\n`);
      return 1;
    }
    if (current.replace(/\r\n/g, "\n") !== rendered) {
      stderr.write(`${OUTPUT_LABEL} is stale. Run \`npm run generate:rule-codes\`.\n`);
      return 1;
    }
    stdout.write(`${OUTPUT_LABEL} is in sync (${codes.length} codes).\n`);
    return 0;
  }

  try {
    await writeFile(parsed.outputFile, rendered, "utf-8");
  } catch (error) {
    stderr.write(`cannot write ${parsed.outputFile}: ${toMessage(error)}\n`);
    return 1;
  }
  stdout.write(`wrote ${OUTPUT_LABEL} (${codes.length} codes).\n`);
  return 0;
}

main()
  .then((code) => exit(code))
  .catch((error) => {
    stderr.write(`generate-emitted-rule-codes failed: ${toMessage(error)}\n`);
    exit(1);
  });
