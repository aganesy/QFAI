import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { parseHeadings } from "../parse/markdown.js";
import { collectSpecEntries } from "../specLayout.js";
import { maskNonSpecRegions } from "../specPackParsers.js";
import { newRuleSeverity, RULE_PROMOTIONS } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { issue } from "./utils.js";

/**
 * `validation.require.specSections` — the required-heading gate.
 *
 * The key ships empty, so a project that never sets it sees no finding. Once an
 * operator opts in (`qfai-configure` writes it only on an explicit request for
 * strict required headings), every spec pack has to carry each listed heading —
 * otherwise the list is a claim in a version-controlled file that nothing
 * enforces.
 */
export async function validateSpecSections(root: string, config: QfaiConfig): Promise<Issue[]> {
  const { sections: required, invalid } = normalizeRequired(config.validation.require.specSections);
  // Both codes run a promotion window (`RULE_PROMOTIONS`, docs/design-principles
  // P7): the gate is new, so a project that set `specSections` while nothing
  // read it meets every pack it was never checked against at once. Shipping
  // that straight at `error` would turn an upgrade into a latched gate.
  //
  // `resolveToolVersion` resolves rather than rejects — a read failure returns
  // `"unknown"`, which the comparator reads as inside the window, so an
  // unreadable version can never be what escalates this into a build failure.
  const specSectionsPromotion = RULE_PROMOTIONS.specSectionsRequiredHeadings.promoteAt;
  const specSectionsSeverity = newRuleSeverity(await resolveToolVersion(), specSectionsPromotion);
  const windowNote =
    specSectionsSeverity === "warning"
      ? ` ${specSectionsPromotion} リリースまでは warning、それ以降は error として報告されます。`
      : "";
  // Report the unusable entries first, and report them even when nothing
  // usable is left: `specSections: ["##"]` reads as an explicit strict gate
  // yet normalizes to nothing, so staying silent would present a
  // mis-configured gate as a satisfied one.
  const issues: Issue[] =
    invalid.length > 0 ? [invalidSectionsIssue(invalid, specSectionsSeverity, windowNote)] : [];
  if (required.length === 0) {
    return issues;
  }

  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  if (entries.length === 0) {
    return issues;
  }

  // A layered spec keeps Objective / Constraints / Glossary in the shared
  // `_policies` pack, so a heading that lives there satisfies every spec that
  // depends on it. Read once rather than per spec.
  //
  // Only a layered spec earns that exemption. A `spec-pack` or `legacy` pack
  // owns its own Objective / Glossary / Constraints files, and the required-file
  // gates likewise only consult `_policies` for layered entries
  // (`collectMissingLayeredSharedRequiredFiles` returns early otherwise). During
  // a migration the two layouts coexist under one `specs/`, so honouring
  // `_policies` for every entry would let a legacy pack that lost its own
  // heading pass here while the file gate still calls it incomplete.
  const sharedDirs = new Set(
    entries.filter((entry) => entry.layout === "layered").map((entry) => entry.sharedDir),
  );
  const sharedHeadings = new Set<string>();
  for (const sharedDir of sharedDirs) {
    for (const heading of await collectPackHeadings(sharedDir)) {
      sharedHeadings.add(heading);
    }
  }

  for (const entry of entries) {
    const present = await collectPackHeadings(entry.dir);
    const shared = entry.layout === "layered" ? sharedHeadings : EMPTY_HEADINGS;
    const missing = required.filter(
      (section) => !present.has(section.key) && !shared.has(section.key),
    );
    if (missing.length === 0) {
      continue;
    }
    issues.push(missingSectionsIssue(entry.dir, missing, specSectionsSeverity, windowNote));
  }
  return issues;
}

/** Stand-in for "this layout has no shared pack", so the filter stays one shape. */
const EMPTY_HEADINGS: ReadonlySet<string> = new Set<string>();

type RequiredSection = {
  /** The heading as the operator wrote it in `qfai.config.yaml`. */
  label: string;
  /** The comparison form: `#` markers stripped, collapsed, lower-cased. */
  key: string;
};

/**
 * The severity both codes carry, resolved once from
 * `RULE_PROMOTIONS.specSectionsRequiredHeadings`. Threaded in rather than
 * recomputed here so the two findings cannot drift apart, and so the pin —
 * not a literal beside the `issue(...)` call — is what decides them.
 */
type SpecSectionsSeverity = "warning" | "error";

function missingSectionsIssue(
  specDir: string,
  missing: RequiredSection[],
  specSectionsSeverity: SpecSectionsSeverity,
  windowNote: string,
): Issue {
  const labels = missing.map((section) => section.label);
  return issue(
    "QFAI-SPECSECTION-001",
    `spec pack に必須見出しがありません: ${labels.join(", ")}.${windowNote}`,
    specSectionsSeverity,
    specDir,
    "validation.require.specSections",
    labels,
    "canonical",
    "`qfai.config.yaml` の `validation.require.specSections` が要求する見出しを spec pack のいずれかの Markdown に追加するか、要求しない見出しを設定から外してください。",
  );
}

/** An entry of `specSections` that names no heading, kept verbatim for the message. */
function invalidSectionsIssue(
  invalid: readonly string[],
  specSectionsSeverity: SpecSectionsSeverity,
  windowNote: string,
): Issue {
  const shown = invalid.map((raw) => JSON.stringify(raw));
  return issue(
    "QFAI-SPECSECTION-002",
    `\`validation.require.specSections\` に見出し名にならない要素があります: ${shown.join(", ")}.${windowNote}`,
    specSectionsSeverity,
    "qfai.config.yaml",
    "validation.require.specSections",
    shown,
    "canonical",
    "`##` だけ / 空白だけの要素は比較できる見出し名を持たないため、設定にあるのにどの spec も検査されません。`qfai.config.yaml` の `validation.require.specSections` から取り除くか、`Risks` のような実際の見出し名に直してください。",
  );
}

type NormalizedRequired = {
  sections: RequiredSection[];
  /** Entries whose comparison form is empty — a silently dead gate otherwise. */
  invalid: string[];
};

/**
 * Splits the configured list into usable sections and unusable entries, keeping
 * the operator's spelling for the message. A heading may be configured with or
 * without its `##` markers; duplicates collapse.
 *
 * An entry that normalizes to nothing (`"##"`, `"   "`) is NOT dropped
 * silently: it is returned as `invalid` so the caller can report the
 * mis-configuration. Dropping it would turn `specSections: ["##"]` into a
 * gate that is configured yet evaluates nothing.
 */
function normalizeRequired(sections: readonly string[]): NormalizedRequired {
  const seen = new Set<string>();
  const normalized: RequiredSection[] = [];
  const invalid: string[] = [];
  for (const raw of sections) {
    const label = raw.trim();
    const key = headingKey(label);
    if (key.length === 0) {
      invalid.push(raw);
      continue;
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push({ label, key });
  }
  return { sections: normalized, invalid };
}

/**
 * The comparison form of a heading.
 *
 * The trailing `#` run of `## Risks ##` is an ATX *closing sequence* — the
 * heading's text is `Risks`, so it has to compare equal to a configured
 * `Risks`. A closing sequence needs the preceding space (CommonMark), so
 * `## Risks##` keeps its markers and stays a different heading.
 */
function headingKey(title: string): string {
  return title
    .replace(/^#{1,6}\s*/, "")
    .replace(/\s+#+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Every heading of a pack's own Markdown files.
 *
 * Top level only: `tdd/` and other sub-directories hold execution ledgers, not
 * the spec definition, so a heading there must not satisfy the gate.
 *
 * Fenced samples, HTML comments and raw HTML blocks are blanked first
 * (`maskNonSpecRegions`). These documents illustrate their own format, so a
 * template inside a ` ```markdown ` fence — or inside a `<pre>` block, where
 * Markdown is not parsed at all — routinely carries the very headings the gate
 * requires; counting one would let a spec that never wrote the section satisfy
 * a strict required-heading list.
 */
async function collectPackHeadings(dir: string): Promise<Set<string>> {
  const headings = new Set<string>();
  for (const file of await listMarkdownFiles(dir)) {
    const text = await readSafe(file);
    if (text.length === 0) {
      continue;
    }
    for (const heading of parseHeadings(maskNonSpecRegions(text))) {
      headings.add(headingKey(heading.title));
    }
  }
  return headings;
}

/**
 * Top-level `.md` entries of a pack, symlinks included.
 *
 * A `Dirent` describes the LINK, not its target, so `isFile()` is false for
 * every symlink — and the required-file gate already accepts a link that
 * resolves to a regular file (`listExistingNames` in `specLayout.ts`). Skipping
 * them here would make one pack complete for the file gate yet missing its
 * headings for this one.
 */
async function listMarkdownFiles(dir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }
    const filePath = path.join(dir, entry.name);
    if (entry.isFile()) {
      files.push(filePath);
      continue;
    }
    if (entry.isSymbolicLink() && (await resolvesToFile(filePath))) {
      files.push(filePath);
    }
  }
  return files;
}

async function resolvesToFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}
