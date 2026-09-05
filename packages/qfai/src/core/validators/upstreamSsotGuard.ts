/**
 * Upstream SSOT modification detector (QFAI-DRIFT-001).
 *
 * `constitution/drift-protocol.md` states `Downstream skills must not patch
 * upstream SSOT directly.` as a non-negotiable constraint and puts contracts
 * inside the protected set — and nothing ever noticed when that was broken. A
 * rule that is mandatory, blocking and undetectable when broken will be broken
 * silently: the only reason a real project learned that six contract functions
 * had been edited downstream was that the agent volunteered the disclosure in
 * its commit messages.
 *
 * This runs in the `tdd` profile only. That profile is the completion gate
 * `qfai-implement` names, i.e. the downstream stage the rule binds. `/qfai-sdd`
 * is the *owner* of these files, so running the check on its own authoring runs
 * would flag every legitimate contract edit.
 *
 * The finding is waived by an approved Change Request that declares the changed
 * path in its `## Impact scope`, which is the sanctioned route — see
 * `#when-drift-is-detected`.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { getChangedFilesAgainstBase } from "../gitChanges.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";
import { maskNonSpecRegions } from "../specPackParsers.js";

/** Waivable as `QFAI-DRIFT-001`; `DRIFT-001` also resolves (`waivers.ts#resolveRuleKeys`). */
export const UPSTREAM_SSOT_EDIT_RULE_ID = "QFAI-DRIFT-001";

/** Where the protocol pins Change Request files. */
const DECISIONS_REL_DIR = ".qfai/decisions";

const CR_FILE_RE = /^CR-\d{8}-\d{4}.*\.md$/i;

/**
 * `- Status: `approved`` in a Change Request header, tolerant of the backticks
 * the template uses and of a trailing HTML comment.
 */
const CR_APPROVED_RE = /^\s*-\s*Status:\s*`?\s*approved\s*`?/im;

/**
 * The spec-pack filenames `#core-rule` protects, checked under
 * `paths.specsDir`. `_policies/**` is protected wholesale, so it is matched by
 * directory rather than by filename.
 */
const PROTECTED_SPEC_FILES = new Set([
  "01_Spec.md",
  "02_User-stories.md",
  "03_Acceptance-Criteria.md",
  "04_Business-Rules.md",
  "05_Examples.md",
  "06_Test-Cases.md",
  "07_Decisions.md",
  "08_Open-questions.md",
  "09_delta.md",
  "10_Plan.md",
  "11_Contracts.md",
]);

type ProtectedChange = {
  /** Repo-relative path of the changed file. */
  file: string;
  /** Which clause of `#core-rule` protects it, for the message. */
  kind: "contract" | "spec-pack";
};

function isUnder(file: string, relDir: string): boolean {
  const prefix = relDir.replace(/\\/g, "/").replace(/\/+$/, "");
  return prefix.length > 0 && file.startsWith(prefix + "/");
}

function classifyChange(
  file: string,
  contractsRelDir: string,
  specsRelDir: string,
): ProtectedChange | null {
  if (isUnder(file, contractsRelDir)) {
    return { file, kind: "contract" };
  }
  if (!isUnder(file, specsRelDir)) {
    return null;
  }
  const rest = file.slice(specsRelDir.replace(/\\/g, "/").replace(/\/+$/, "").length + 1);
  const parts = rest.split("/");
  // `_policies/**` is protected wholesale; a spec pack is protected by filename
  // so that a pack's own `tdd/test-list.md` — a downstream ledger — stays
  // editable downstream, which is the whole point of the ledger.
  if (parts[0] === "_policies") {
    return { file, kind: "spec-pack" };
  }
  const fileName = parts[parts.length - 1];
  if (fileName && parts.length === 2 && PROTECTED_SPEC_FILES.has(fileName)) {
    return { file, kind: "spec-pack" };
  }
  return null;
}

/** The `## Impact scope` heading, however it is cased or spaced. */
const IMPACT_SCOPE_HEADING_RE = /^[ \t]*##[ \t]+Impact[ \t]+scope[ \t]*$/gim;

/** Any `##` heading, which is where a scope section ends. */
const NEXT_H2_RE = /^[ \t]*##[ \t]+/m;

/**
 * A Change Request's `## Impact scope` section, or `""` when it has none.
 *
 * The section is the CR's declaration of what it covers, and a declaration is
 * what an exemption has to rest on. Reading the whole body instead let a
 * PROHIBITION grant permission — "DO NOT edit `<path>`" authorised that path —
 * and made the `## Reproduction` block that a defect-class CR is REQUIRED to
 * carry authorise the very edit it reports (#1121).
 */
function extractImpactScope(content: string): string {
  // Masked FIRST. A CR that documents the format inside a fenced sample —
  // which the template's instructional comments invite — would otherwise have
  // its EXAMPLE read as the authorisation, granting whatever path the example
  // names. `collectTriageSections` masks for the same reason and records the
  // Triage version of the bug; there an unmasked fence produced a false
  // positive, here it produces a false EXEMPTION, which is #1121's headline
  // re-opened by another route (#1139).
  const masked = maskNonSpecRegions(content);
  // EVERY section, not the first. Repeating an H2 on each re-run is an
  // established shape here — `QFAI-TRIAGE-008`'s own remedy tells authors that
  // "`## Triage` を複数置けば全セクションが検査されます" — and reading only the
  // first silently ignored a later declaration, reporting an edit that WAS
  // declared as undeclared.
  // `matchAll` rather than an `exec` loop: a module-level `/g` pattern carries
  // `lastIndex` between calls, and `matchAll` iterates without mutating it. An
  // `exec` loop needs an explicit reset to be safe, and that reset is
  // unreachable while the loop runs to `null` — untestable code guarding a
  // footgun. This has neither.
  const sections: string[] = [];
  for (const heading of masked.matchAll(IMPACT_SCOPE_HEADING_RE)) {
    const after = masked.slice(heading.index + heading[0].length);
    const next = NEXT_H2_RE.exec(after);
    sections.push(next === null ? after : after.slice(0, next.index));
  }
  // Belt and braces, and no row can distinguish it: `slice(0, next.index)` cuts
  // at the `^##` of the following heading, so every non-final section already
  // ends with the newline before it. Kept so the "a token cannot form across a
  // boundary" property does not silently depend on that slicing detail.
  return sections.join("\n");
}

/**
 * Whether `scope` declares `file`.
 *
 * The repository-relative path is the canonical spelling, and the basename is
 * accepted because it is one of the two forms an author reaches for first —
 * the template's own `## Impact scope` asks for `Contracts: <CON-*>` and
 * `Schema: <paths>`, so "name it by file" is what the section invites. A
 * contract ID is NOT accepted: it names a declaration inside a file, not the
 * file, and resolving one would make the exemption depend on parsing every
 * contract. The remediation says which spellings work, because the previous
 * wording was satisfied by four and only one of them was (#1121).
 */
function scopeDeclares(scope: string, file: string): boolean {
  const base = file.slice(file.lastIndexOf("/") + 1);
  return scopeNames(scope, file) || scopeNames(scope, base);
}

/**
 * Whether `scope` names `token` as a whole token.
 *
 * `includes` is not enough for EITHER spelling: it is true for `<path>2` and
 * for `<path>.bak`, so a scope naming a neighbouring artifact authorised the
 * file it was named after. The trailing boundary rejects both — `(?![\w-])`
 * for a longer name, `(?!\.\w)` for a sibling extension — while still
 * accepting a filename at the end of a sentence, where the `.` is not followed
 * by a word character.
 */
function scopeNames(scope: string, token: string): boolean {
  if (token.length === 0) {
    return false;
  }
  const pattern = `(?:^|[^\\w./-])${escapeForRegExp(token)}(?![\\w-])(?!\\.\\w)`;
  return new RegExp(pattern, "m").test(scope);
}

/** Escapes `value` for literal use inside a `RegExp`. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The `## Impact scope` of every **approved** Change Request, one entry each.
 *
 * One entry per CR rather than one concatenated blob. That shape is structural
 * clarity, not the behaviour change: for a test of the form "does any scope
 * name this path", an array and a join answer alike. What closes the
 * repository-wide leak is the SECTION restriction above — an approved CR about
 * one spec can now exempt only what ITS OWN scope declares, so a path it quotes
 * in passing is no longer an authorisation (#1121).
 *
 * An `open` CR authorises nothing, matching
 * `references/change-request-reset.md`.
 */
async function readApprovedCrScopes(root: string): Promise<string[]> {
  const dir = path.join(root, DECISIONS_REL_DIR);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const scopes = await Promise.all(
    entries
      .filter((name) => CR_FILE_RE.test(name))
      .map(async (name) => {
        try {
          const content = await readFile(path.join(dir, name), "utf-8");
          return CR_APPROVED_RE.test(content) ? extractImpactScope(content) : "";
        } catch {
          // Unreadable is not approval. The detector's job is to make an
          // undisclosed edit visible, and a CR nobody can read discloses
          // nothing.
          return "";
        }
      }),
  );
  return scopes.filter((scope) => scope.trim().length > 0);
}

export async function validateUpstreamSsotGuard(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const baseBranch = config.baseBranch ?? "origin/main";
  const changedFiles = getChangedFilesAgainstBase(root, baseBranch);
  if (changedFiles.size === 0) {
    return [];
  }

  const contractsRelDir = config.paths.contractsDir;
  const specsRelDir = config.paths.specsDir;

  const protectedChanges: ProtectedChange[] = [];
  for (const file of changedFiles) {
    const classified = classifyChange(file, contractsRelDir, specsRelDir);
    if (classified) {
      protectedChanges.push(classified);
    }
  }
  if (protectedChanges.length === 0) {
    return [];
  }

  const approvedScopes = await readApprovedCrScopes(root);

  const issues: Issue[] = [];
  for (const change of protectedChanges) {
    if (approvedScopes.some((scope) => scopeDeclares(scope, change.file))) {
      continue;
    }
    const what =
      change.kind === "contract"
        ? "a contract owned by an earlier phase"
        : "a spec-pack SSOT artifact";
    issues.push(
      issue(
        UPSTREAM_SSOT_EDIT_RULE_ID,
        `Upstream SSOT modified on this branch without an approved Change Request: ${change.file} (${what}). ` +
          `Compared against ${baseBranch}.`,
        "error",
        change.file,
        "drift.upstreamSsotModified",
        undefined,
        "canonical",
        "Downstream phases must not patch upstream SSOT directly — see " +
          ".qfai/assistant/constitution/drift-protocol.md. STOP, raise a Change Request at " +
          "`.qfai/decisions/CR-YYYYMMDD-NNNN-<slug>.md` declaring this path under its " +
          "`## Impact scope`, and let the owner skill apply the change after approval. " +
          "If the edit is already approved, that CR's `## Impact scope` must name this path — " +
          `as the repository-relative path (\`${change.file}\`) or as the bare filename. ` +
          "A contract ID (`CON-DB-0022`) does not authorise a path, and a mention anywhere " +
          "outside `## Impact scope` — including the `## Reproduction` block — authorises " +
          "nothing. Do not resolve this by reverting silently: the edit and the decision " +
          "both belong in the audit trail.",
      ),
    );
  }

  return issues;
}
