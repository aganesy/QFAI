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
 * The finding is waived by an approved Change Request that names the changed
 * path, which is the sanctioned route — see `#when-drift-is-detected`.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { getChangedFilesAgainstBase } from "../gitChanges.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

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

/**
 * Paths named by an **approved** Change Request.
 *
 * A CR is a plain Markdown document, so the match is textual: the path appears
 * somewhere in an approved CR's body. That is deliberately permissive — the
 * detector's job is to make an undisclosed edit visible, and an edit disclosed
 * in an approved CR is by definition disclosed. An `open` CR authorises
 * nothing, matching `references/change-request-reset.md`.
 */
async function readApprovedCrText(root: string): Promise<string> {
  const dir = path.join(root, DECISIONS_REL_DIR);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return "";
  }
  const bodies = await Promise.all(
    entries
      .filter((name) => CR_FILE_RE.test(name))
      .map(async (name) => {
        try {
          const content = await readFile(path.join(dir, name), "utf-8");
          return CR_APPROVED_RE.test(content) ? content : "";
        } catch {
          return "";
        }
      }),
  );
  return bodies.join("\n");
}

export async function validateUpstreamSsotGuard(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const baseBranch = config.baseBranch ?? "origin/main";
  // `null` = git could not answer (no base ref / not a repo). This guard only
  // ever accuses a change it can see, so an unanswerable diff is the same
  // no-op as an empty one here.
  const changedFiles = getChangedFilesAgainstBase(root, baseBranch);
  if (changedFiles === null || changedFiles.size === 0) {
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

  const approvedCrText = await readApprovedCrText(root);

  const issues: Issue[] = [];
  for (const change of protectedChanges) {
    if (approvedCrText.includes(change.file)) {
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
          "`.qfai/decisions/CR-YYYYMMDD-NNNN-<slug>.md` naming this path, and let the owner skill " +
          "apply the change after approval. If the edit is already approved, the approved CR must " +
          "name this path. Do not resolve this by reverting silently: the edit and the decision " +
          "both belong in the audit trail.",
      ),
    );
  }

  return issues;
}
