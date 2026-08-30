import path from "node:path";
import { readFile, stat } from "node:fs/promises";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { hashDesignMd, isUnreplacedDesignMdSample, parseDesignMd } from "../design/designMd.js";
import type { DesignMd } from "../design/designMd.js";
import { DESIGN_MD_SHA_HEX_RE, readDesignMdLockSha } from "../design/designMdLock.js";
import { VISUAL_BROWSER_SURFACES, readValidatedClassification } from "../detection/surfaceType.js";
import type { UiBearingClassification } from "../detection/surfaceType.js";
import {
  ResolveActiveDiscussionPackError,
  findLatestDiscussionPackDir,
  resolveActiveDiscussionPack,
} from "../discussionPack.js";
import { resolveAllUiBearingSpecs } from "../prototyping/specResolution.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

// Root DESIGN.md is the brand SSOT for UI-bearing projects. The lock
// yaml carries its frozen sha256 so prototyping iteration / certify can
// detect drift between cycles.
const ROOT_DESIGN_MD_REL = "DESIGN.md";
const DESIGN_MD_LOCK_REL_BASENAME = "DESIGN.md.lock.yaml";

// Prototyping post-loop produces design-system.yaml (mirror of DESIGN.md
// tokens) and prototype-handoff.yaml.
const REQUIRED_PROTOTYPING_DESIGN_FILES = ["design-system.yaml", "prototype-handoff.yaml"] as const;

const REQUIRED_DESIGN_SYSTEM_CHECKLIST_KEYS = [
  "color",
  "typography",
  "spacing",
  "border_radius",
  "shadow",
  "dos_and_donts",
  "motion_rules",
] as const;

const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|none|placeholder|example|lorem|to be defined)$/i;

// Spec files carrying `Source: discussion-<ts>#<id>` provenance, per the
// shipped `/qfai-sdd` spec templates. The 17-digit timestamp is the pack
// directory name, so the template placeholder
// (`discussion-YYYYMMDDhhmmssSSS`) deliberately does not match.
const SPEC_PROVENANCE_FILES = ["02_User-stories.md", "03_Acceptance-Criteria.md"] as const;
const SPEC_PROVENANCE_PACK_RE = /\bdiscussion-\d{17}\b/g;

type DesignContractReadinessStage = "sdd" | "prototyping";
type SddDesignContractReadinessOptions = {
  enforceNoPrematurePrototypingContracts?: boolean;
};

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

type YamlReadResult =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "ok"; value: Record<string, unknown> };

export async function validateSddDesignContractReadiness(
  root: string,
  config: QfaiConfig,
  options: SddDesignContractReadinessOptions = {},
): Promise<Issue[]> {
  return validateDesignContractReadinessForStage(root, config, "sdd", {
    enforceNoPrematurePrototypingContracts: options.enforceNoPrematurePrototypingContracts ?? true,
  });
}

export async function validatePrototypingDesignContractReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  return validateDesignContractReadinessForStage(root, config, "prototyping");
}

async function validateDesignContractReadinessForStage(
  root: string,
  config: QfaiConfig,
  stage: DesignContractReadinessStage,
  options: SddDesignContractReadinessOptions = {},
): Promise<Issue[]> {
  const uiPattern = path.posix.join(
    path.join(root, config.paths.contractsDir, "ui").replace(/\\/g, "/"),
    "**/*.yaml",
  );
  const uiContracts = await fg(uiPattern, { absolute: true });
  const hasUiContracts = uiContracts.length > 0;
  // The project is UI-bearing as soon as a spec says so — `contracts/ui`
  // yaml is a later artifact, and Phase 0 freezes DESIGN.md in between.
  // Reuse `resolveAllUiBearingSpecs` rather than re-deriving the rule, so a
  // project cannot be UI-bearing for prototyping and non-UI for this gate.
  const uiBearingSpecs = await scanUiBearingSpecs(root, config);
  const uiBearing = hasUiContracts || (uiBearingSpecs.ok && uiBearingSpecs.specIds.length > 0);
  // `cli` is discussion UI-bearing but is NOT a visual-prototyping surface:
  // `/qfai-discussion` authors no root DESIGN.md for a cli-only pack and
  // `/qfai-prototyping` rejects `cli`, so the `visual.*` token tree has no
  // reader at all. Demanding the brand SSOT here would re-block a pack the
  // discussion skill deliberately exempted.
  //
  // `uiBearing` above is repo-wide, so the carve-out must be too: it is
  // withdrawn unless EVERY classification this repo's UI-bearing specs are
  // attributable to says `cli`. A spec-scoped run (`qfai validate --spec`)
  // filters findings afterwards and never widens this, so it cannot be more
  // permissive than the unscoped run either.
  const cliOnly = uiBearing && (await isCliOnlySurfaceProject(root, config, uiBearingSpecs));

  // The unreplaced-sample gate runs BEFORE the UI-contract gate below.
  // Every other check in this validator presupposes design contracts that
  // only exist once prototyping has started, but the sample gate has to
  // fire earlier than that: `qfai init` seeds the sample DESIGN.md on day
  // one, UI contracts are only authored later in SDD, and `/qfai-sdd`
  // Phase 0 freezes the file's sha256 in between. Gated behind
  // `uiContracts.length === 0` the gate could only ever report a freeze
  // that already happened.
  //
  // A cli-only project skips the gate outright rather than degrading it to a
  // warning: the carve-out says root DESIGN.md is not part of its contract at
  // all, so there is nothing for the seeded sample to be the wrong version
  // OF. A warning would still fail `validation.failOn: warning` /
  // `--fail-on warning` runs and its remediation would tell the user to
  // author a brand SSOT that no reader in this project consumes.
  const sampleIssues = cliOnly ? [] : await validateRootDesignMdSample(root, uiBearing);
  if (!hasUiContracts) {
    return sampleIssues;
  }

  const designDir = path.join(root, config.paths.contractsDir, "design");
  const issues: Issue[] = [...sampleIssues];

  // A cli-only project never freezes a brand SSOT, so neither the file
  // (DCON-030/033) nor its lock (DCON-031/032) can be required of it.
  const rootResult: RootDesignMdResult = cliOnly
    ? { issues: [], designMd: null, lockSha: null }
    : await validateRootDesignMdAndLock(root, designDir);
  issues.push(...rootResult.issues);

  if (stage === "prototyping") {
    for (const fileName of REQUIRED_PROTOTYPING_DESIGN_FILES) {
      const filePath = path.join(designDir, fileName);
      try {
        await readFile(filePath, "utf-8");
      } catch {
        issues.push(
          issue(
            "QFAI-DCON-001",
            `Missing prototyping design contract: ${fileName}.`,
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.requiredFile",
            undefined,
            "canonical",
            `UI-bearing prototyping completion requires design-system.yaml and prototype-handoff.yaml under \`${toPosixRelative(root, designDir)}/\` (mirror of DESIGN.md tokens / handoff facts).`,
          ),
        );
      }
    }
  }

  if (stage === "prototyping") {
    issues.push(...(await validateDesignSystem(root, config, rootResult.designMd)));
    issues.push(...(await validatePrototypeHandoff(root, config, rootResult.lockSha)));
  } else if (options.enforceNoPrematurePrototypingContracts ?? true) {
    issues.push(...(await validateNoPrematurePrototypingContracts(root, config)));
  }
  return issues;
}

/**
 * Every spec that declares itself UI-bearing, by the same rule the prototyping
 * resolver uses: the `surface_type: ui-bearing` frontmatter marker, with a
 * matching UI contract as the fallback.
 *
 * A scan failure is reported as `{ ok: false }` rather than propagating:
 * crashing `qfai validate` over an unreadable spec directory would be a worse
 * outcome than the two conservative degradations its callers apply — the
 * UI-bearing question falls back to the UI contracts alone (DCON-034 as a
 * warning), and the cli carve-out is withdrawn because nothing can confirm
 * every UI-bearing spec is cli-only.
 */
type UiBearingSpecScan = { ok: true; specIds: string[] } | { ok: false };

async function scanUiBearingSpecs(root: string, config: QfaiConfig): Promise<UiBearingSpecScan> {
  try {
    return { ok: true, specIds: await resolveAllUiBearingSpecs(root, config) };
  } catch {
    return { ok: false };
  }
}

/**
 * Locate the discussion pack whose `01_Context.md` classification decides the
 * cli carve-out below.
 *
 * `/qfai-sdd` Phase 0 reads the **active** pack (the one
 * `qfai discussion use <id>` pinned into `.qfai/state.json#discussion.currentId`),
 * so this validator must select the same one: with several packs on disk, a
 * project whose active pack is `cli` while the newest is `web` would otherwise
 * be handed DCON-030/031 that Phase 0 never intends to satisfy — and the
 * inverse would silently drop both gates for a visual pack.
 *
 * Only `reason: "unset"` falls back to the newest pack. Never having run
 * `qfai discussion use` is the ordinary state of a single-pack project, and
 * every such project already relies on latest-pack selection.
 *
 * A `"corrupt"`, `"dangling"` or `"duplicate"` pointer does NOT fall back.
 * Those are broken runtime state that `resolveActiveDiscussionPack` reports as
 * recoverable errors precisely so nobody re-derives the answer from mtimes:
 * the project pinned a pack, and the pin no longer resolves (or
 * `.qfai/state.json` can no longer be read as a pointer at all). Inferring
 * "latest" there would hand the carve-out to a pack nothing selected — a
 * dangling pointer or an unparseable state file over a newest cli pack would
 * drop DCON-030/031 although no active classification exists. Return `null`
 * instead, which lands on the strict side (root DESIGN.md required) until
 * `qfai discussion use <id>` repairs the pointer.
 *
 * Any other failure (unreadable discussion root) yields `null` for the same
 * reason: it can only widen the requirement, never silently drop a gate.
 */
async function resolveClassificationPackDir(
  root: string,
  config: QfaiConfig,
): Promise<string | null> {
  try {
    return await resolveActiveDiscussionPack(root);
  } catch (error) {
    if (!(error instanceof ResolveActiveDiscussionPackError) || error.reason !== "unset") {
      return null;
    }
  }
  try {
    return await findLatestDiscussionPackDir(resolvePath(root, config, "discussionDir"));
  } catch {
    return null;
  }
}

/**
 * Discussion packs whose classification the cli carve-out must agree on.
 *
 * The carve-out suppresses repo-wide findings (DCON-030/031/034 are keyed on
 * the repo-wide `uiBearing`), so it cannot be decided by one pack. This
 * collects the union of:
 *
 *   1. the pack every UI-bearing spec's own provenance names — the
 *      `Source: discussion-<ts>#...` lines its `02_User-stories.md` /
 *      `03_Acceptance-Criteria.md` carry, the same per-spec attribution
 *      `qfai-implement/SKILL.md` uses to pick a spec's design inputs; and
 *   2. the active pack (`.qfai/state.json#discussion.currentId`), which
 *      `/qfai-sdd` Phase 0 reads and which is the only signal for a pack whose
 *      spec does not exist yet.
 *
 * Without (1), a repo holding both a web and a cli spec had DCON-030/031/034
 * suppressed for its web spec whenever the pointer happened to sit on the cli
 * pack — `uiBearing` is repo-wide while the old carve-out read the active pack
 * alone, so a stale pointer let the whole repo skip the brand SSOT. Without
 * (2), a freshly classified pack that has not produced its spec yet would be
 * invisible here.
 *
 * Returns `null` when the answer cannot be established — the spec scan failed,
 * the active pointer is corrupt / dangling / duplicate, or a spec names a pack
 * that is not on disk. `null` lands on the strict side: it can only widen the
 * requirement back to today's behaviour, never silently drop a gate.
 */
async function collectCarveOutPackDirs(
  root: string,
  config: QfaiConfig,
  uiBearingSpecs: UiBearingSpecScan,
): Promise<string[] | null> {
  if (!uiBearingSpecs.ok) {
    return null;
  }
  const activePackDir = await resolveClassificationPackDir(root, config);
  if (activePackDir === null) {
    return null;
  }
  const packDirs = new Set<string>([activePackDir]);

  const discussionRoot = resolvePath(root, config, "discussionDir");
  let specDirs: string[];
  try {
    specDirs = await resolveSpecDirs(root, config, uiBearingSpecs.specIds);
  } catch {
    return null;
  }
  for (const specDir of specDirs) {
    const provenance = await readSpecProvenancePackDirs(specDir, discussionRoot);
    if (provenance === null) {
      // The spec names a pack that is not on disk: its classification cannot
      // be confirmed, so the carve-out cannot be granted on its behalf.
      return null;
    }
    for (const packDir of provenance) {
      packDirs.add(packDir);
    }
  }
  return [...packDirs];
}

/** Absolute directories of the named spec ids, skipping ids with no directory. */
async function resolveSpecDirs(
  root: string,
  config: QfaiConfig,
  specIds: readonly string[],
): Promise<string[]> {
  if (specIds.length === 0) {
    return [];
  }
  const wanted = new Set(specIds);
  const entries = await collectSpecEntries(path.resolve(root, config.paths.specsDir));
  return entries.filter((entry) => wanted.has(entry.specNumber)).map((entry) => entry.dir);
}

/**
 * Discussion packs a spec attributes itself to, via the
 * `Source: discussion-<17-digit-timestamp>#...` provenance lines its
 * `02_User-stories.md` / `03_Acceptance-Criteria.md` carry (the shape the
 * shipped `/qfai-sdd` spec templates seed).
 *
 * Returns `[]` when the spec carries no provenance at all — that spec is then
 * covered by the active pointer, per `qfai-implement/SKILL.md`. Returns `null`
 * when a named pack is not a directory on disk, which the caller treats as
 * "cannot confirm" rather than "no constraint".
 */
async function readSpecProvenancePackDirs(
  specDir: string,
  discussionRoot: string,
): Promise<string[] | null> {
  const packIds = new Set<string>();
  for (const fileName of SPEC_PROVENANCE_FILES) {
    let body: string;
    try {
      body = await readFile(path.join(specDir, fileName), "utf-8");
    } catch {
      continue;
    }
    for (const match of body.matchAll(SPEC_PROVENANCE_PACK_RE)) {
      packIds.add(match[0]);
    }
  }
  const packDirs: string[] = [];
  for (const packId of packIds) {
    const packDir = path.join(discussionRoot, packId);
    try {
      if (!(await stat(packDir)).isDirectory()) {
        return null;
      }
    } catch {
      return null;
    }
    packDirs.push(packDir);
  }
  return packDirs;
}

/**
 * True when every classification the project's UI-bearing work is attributable
 * to says the only surface it ships is `cli` — `primary_surface: cli` with no
 * `web` / `mobile` / `desktop` / `mixed` entry in `secondary_surfaces`.
 *
 * `cli` is discussion UI-bearing, so it reaches every gate in this file, but
 * it is not a visual-prototyping surface: `/qfai-discussion` deliberately
 * authors no root DESIGN.md for such a pack and `/qfai-prototyping` rejects
 * `cli`, leaving the `visual.*` token tree with no reader. Without this the
 * DESIGN.md requirement the discussion skill dropped would simply reappear as
 * a hard `qfai validate --profile sdd` error.
 *
 * Each classification is read from a pack's `01_Context.md` via the strict
 * validated reader, so a malformed or contradictory block (which
 * `uix/classification.ts` reports separately) yields `null` and this returns
 * `false` — the strict brand-SSOT behaviour. Same for a project with no
 * discussion pack at all: absence of evidence is not evidence of `cli`, and
 * every pre-existing project must keep its gates.
 *
 * A filesystem failure degrades to `false` for the same reason: it can only
 * ever widen the requirement back to today's behaviour, never silently drop a
 * gate.
 */
async function isCliOnlySurfaceProject(
  root: string,
  config: QfaiConfig,
  uiBearingSpecs: UiBearingSpecScan,
): Promise<boolean> {
  const packDirs = await collectCarveOutPackDirs(root, config, uiBearingSpecs);
  if (packDirs === null || packDirs.length === 0) {
    return false;
  }
  for (const packDir of packDirs) {
    if (!(await isCliOnlyPack(packDir))) {
      return false;
    }
  }
  return true;
}

async function isCliOnlyPack(packDir: string): Promise<boolean> {
  let classification: UiBearingClassification | null = null;
  try {
    classification = await readValidatedClassification(packDir);
  } catch {
    return false;
  }
  if (classification === null || !classification.ui_bearing) {
    return false;
  }

  // `VISUAL_BROWSER_SURFACES` is the code SSOT for "this surface needs the
  // `visual.*` token tree". Judge the whole classified set, not
  // `primary_surface` alone: `primary_surface: cli` with
  // `secondary_surfaces: [web]` still ships a visual surface.
  const surfaces = [classification.primary_surface, ...classification.secondary_surfaces];
  if (surfaces.some((surface) => VISUAL_BROWSER_SURFACES.has(surface))) {
    return false;
  }
  return classification.primary_surface === "cli";
}

/**
 * Identity gate for root DESIGN.md (QFAI-DCON-034).
 *
 * DCON-030..033 are all content-agnostic: they verify that DESIGN.md
 * exists, parses and has not changed since the freeze — never that it was
 * authored by this project. `qfai init` seeds the shipped sample brand
 * into the project root, so an unreplaced sample satisfies every one of
 * them, gets sha256-frozen as the project's brand contract, and from then
 * on `/qfai-prototyping` enforces a fictional identity while swapping in
 * the real brand breaks the lock until it is refrozen.
 *
 * Severity scales with how far the project has committed to a brand
 * contract:
 *   - UI-bearing -> `error`. The project is on the path that runs Phase 0
 *     and freezes this file. UI-bearing is decided by the same rule the
 *     prototyping resolver uses — a `surface_type: ui-bearing` spec OR a
 *     `contracts/ui` yaml — not by the contracts alone, because the spec
 *     marker exists at Phase 0 while the contracts do not, and a gate that
 *     only fires after the contracts land can only report a freeze that
 *     already happened.
 *   - otherwise -> `warning`. Every `qfai init` seeds the sample,
 *     including into projects that never ship a UI and never freeze
 *     anything; turning that into a hard failure would break projects
 *     that never opted into the design surface at all. The warning still
 *     surfaces the condition from `qfai validate` on day one, which is
 *     what the shipped sample's own instructions promise.
 *
 * A missing DESIGN.md is not this gate's business (DCON-030 owns it, and
 * only for UI-bearing projects), so an unreadable file is silently
 * skipped.
 */
async function validateRootDesignMdSample(root: string, uiBearing: boolean): Promise<Issue[]> {
  let designMdText: string;
  try {
    designMdText = await readFile(path.join(root, ROOT_DESIGN_MD_REL), "utf-8");
  } catch {
    return [];
  }
  if (!isUnreplacedDesignMdSample(designMdText)) {
    return [];
  }
  return [
    issue(
      "QFAI-DCON-034",
      "Root DESIGN.md is still the qfai sample brand (unreplaced `qfai init` seed).",
      uiBearing ? "error" : "warning",
      ROOT_DESIGN_MD_REL,
      "designContractReadiness.rootDesignMdSample",
      undefined,
      "canonical",
      "Replace root DESIGN.md with this product's brand SSOT (run /qfai-discussion, which emits the draft, or author it from `.qfai/assistant/skills/qfai-prototyping/templates/DESIGN.md.sample`) and delete the sample marker comment if present. Do this BEFORE /qfai-sdd Phase 0 freezes its sha256.",
    ),
  ];
}

type RootDesignMdResult = {
  issues: Issue[];
  // Parsed root DESIGN.md, when present and well-formed. Downstream
  // validators (validateDesignSystem mirror cross-check) need this.
  designMd: DesignMd | null;
  // Frozen sha256 from DESIGN.md.lock.yaml, when present and well-
  // formed. Downstream validators (validatePrototypeHandoff cross-
  // check) need this.
  lockSha: string | null;
};

async function validateRootDesignMdAndLock(
  root: string,
  designDir: string,
): Promise<RootDesignMdResult> {
  const issues: Issue[] = [];
  const designMdPath = path.join(root, ROOT_DESIGN_MD_REL);
  const lockPath = path.join(designDir, DESIGN_MD_LOCK_REL_BASENAME);

  let designMdText: string | null = null;
  try {
    designMdText = await readFile(designMdPath, "utf-8");
  } catch {
    issues.push(
      issue(
        "QFAI-DCON-030",
        "Missing root DESIGN.md (brand SSOT).",
        "error",
        ROOT_DESIGN_MD_REL,
        "designContractReadiness.rootDesignMd",
        undefined,
        "canonical",
        "Create root DESIGN.md from the project root with the canonical front-matter (see qfai-discussion / qfai-sdd skills).",
      ),
    );
  }

  let lockText: string | null = null;
  try {
    lockText = await readFile(lockPath, "utf-8");
  } catch {
    issues.push(
      issue(
        "QFAI-DCON-031",
        `Missing ${DESIGN_MD_LOCK_REL_BASENAME}.`,
        "error",
        toPosixRelative(root, lockPath),
        "designContractReadiness.designMdLock",
        undefined,
        "canonical",
        "Run /qfai-sdd Phase 0 to validate root DESIGN.md and freeze its sha256 into DESIGN.md.lock.yaml.",
      ),
    );
  }

  let lockSha: string | null = null;
  let designMd: DesignMd | null = null;

  // Parse DESIGN.md whenever it was readable, BEFORE the lock-gated
  // sha-comparison block. Pre-fix the parse was nested under
  // `designMdText !== null && lockText !== null`, so a UI-bearing
  // project in the common initial state (DESIGN.md authored but
  // malformed, lock not yet generated) saw only DCON-031 and missed
  // the DCON-033 parse error pointing at the file that needs
  // repair. DCON-030 covers missing-file; DCON-033 is the parse-
  // failure code so automated remediation can route the two failure
  // modes correctly: missing -> regenerate template, parse failure
  // -> repair existing file without losing user edits.
  if (designMdText !== null) {
    const parseResult = parseDesignMd(designMdText);
    if ("error" in parseResult) {
      issues.push(
        issue(
          "QFAI-DCON-033",
          `Root DESIGN.md failed to parse: ${parseResult.error.message}`,
          "error",
          ROOT_DESIGN_MD_REL,
          "designContractReadiness.rootDesignMdParse",
          undefined,
          "canonical",
          "Fix DESIGN.md front-matter so parseDesignMd succeeds (see qfai-prototyping/references/design-md-spec.md). Do NOT regenerate the template — that would discard user content.",
        ),
      );
    } else {
      designMd = parseResult.data;
    }
  }

  // Only attempt sha comparison when both files were readable. The
  // lock-extraction (`readDesignMdLockSha`) and the equality check
  // both require lockText, while the equality also requires
  // designMdText to compute a current sha. The DCON-031 "missing
  // designMdSha256" is a property of the lock file and is
  // independent of whether DESIGN.md parsed.
  if (lockText !== null) {
    lockSha = readDesignMdLockSha(lockText);
    if (lockSha === null) {
      issues.push(
        issue(
          "QFAI-DCON-031",
          `${DESIGN_MD_LOCK_REL_BASENAME} is missing 'designMdSha256'.`,
          "error",
          toPosixRelative(root, lockPath),
          "designContractReadiness.designMdLock",
          undefined,
          "canonical",
          "Re-run /qfai-sdd Phase 0 to regenerate DESIGN.md.lock.yaml with a current designMdSha256.",
        ),
      );
    } else if (designMdText !== null) {
      const currentSha = hashDesignMd(designMdText);
      if (currentSha !== lockSha) {
        issues.push(
          issue(
            "QFAI-DCON-032",
            "DESIGN.md sha256 does not match DESIGN.md.lock.yaml.",
            "error",
            ROOT_DESIGN_MD_REL,
            "designContractReadiness.designMdSha",
            undefined,
            "canonical",
            "DESIGN.md was edited after the freeze. Re-run /qfai-sdd Phase 0 (or restart prototyping) to refreeze.",
          ),
        );
      }
    }
  }

  return { issues, designMd, lockSha };
}

/**
 * True when `/qfai-prototyping` has demonstrably run in this project.
 *
 * `QFAI-DCON-019` guards against `/qfai-sdd` authoring prototyping outputs
 * early. Keyed on file existence alone it also fired on the same files after
 * prototyping legitimately produced them — where their *absence* is itself a
 * `QFAI-DCON-001` error — making the SDD stop condition permanently
 * unpassable for any UI-bearing project.
 */
async function hasPrototypingRun(root: string): Promise<boolean> {
  // Only artifacts /qfai-prototyping itself writes count. `DESIGN.md.lock.yaml`
  // is deliberately NOT a marker: /qfai-sdd Phase 0 freezes the lock for every
  // UI-bearing target before prototyping starts, so keying on it would make
  // this guard unreachable in exactly the runs it exists to police.
  const markers = [
    path.join(root, ".qfai", "evidence", "prototyping", "prototyping.json"),
    path.join(root, ".qfai", "evidence", "prototyping", "completion-certificate.json"),
  ];
  for (const marker of markers) {
    try {
      await readFile(marker, "utf-8");
      return true;
    } catch {
      // try the next marker
    }
  }
  return false;
}

async function validateNoPrematurePrototypingContracts(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  // Prototyping has run: these files are its required outputs, not premature.
  if (await hasPrototypingRun(root)) {
    return [];
  }

  const designDir = path.join(root, config.paths.contractsDir, "design");
  const issues: Issue[] = [];
  for (const fileName of REQUIRED_PROTOTYPING_DESIGN_FILES) {
    const filePath = path.join(designDir, fileName);
    try {
      await readFile(filePath, "utf-8");
      issues.push(
        issue(
          "QFAI-DCON-019",
          `${fileName} must be produced by /qfai-prototyping, not /qfai-sdd. No prototyping evidence was found, so this file appears to have been authored early.`,
          "warning",
          toPosixRelative(root, filePath),
          "designContractReadiness.prematurePrototypingContract",
          undefined,
          "change",
          "Run /qfai-prototyping to produce this file, or delete it if it was authored by mistake.",
        ),
      );
    } catch {
      // missing is expected before prototyping
    }
  }
  return issues;
}

async function validateDesignSystem(
  root: string,
  config: QfaiConfig,
  rootDesignMd: DesignMd | null,
): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "design-system.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-009",
            "design-system.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.designSystemDocument",
          ),
        ]
      : [];
  }

  const issues: Issue[] = [];
  const filePathRel = toPosixRelative(root, filePath);

  // Post-1.8.9 design-system.yaml is a deterministic mirror of the
  // root DESIGN.md tokens (see
  // `qfai-prototyping/references/handoff.md#outputs`):
  //   visual.colors / visual.typography / visual.radius / visual.shadow
  //   (visual.spacing optional). Accept either the new mirror shape OR
  //   the legacy `checklist.{color,typography,...}` shape so projects
  //   that have not yet regenerated their design-system.yaml still
  //   pass. The mirror form takes precedence — its presence is enough.
  const visual = parsed.value.visual;
  const isMirrorShape = isRecord(visual) && isRecord(visual.colors) && isRecord(visual.typography);
  if (isMirrorShape) {
    // Shape gate: top-level mirror keys must be non-empty records.
    // visual.spacing is optional in DESIGN.md and is excluded from the
    // required list deliberately.
    const REQUIRED_MIRROR_KEYS = ["colors", "typography", "radius", "shadow"] as const;
    let shapeOk = true;
    for (const key of REQUIRED_MIRROR_KEYS) {
      const value = visual[key];
      if (!isRecord(value) || Object.keys(value).length === 0) {
        issues.push(
          issue(
            "QFAI-DCON-005",
            `design-system.yaml mirror is missing or empty 'visual.${key}'.`,
            "error",
            filePathRel,
            "designContractReadiness.designSystemMirror",
          ),
        );
        shapeOk = false;
      }
    }
    // Value gate: mirror sub-key values must equal the corresponding
    // DESIGN.md tokens. The handoff contract describes this file as a
    // "verbatim mirror" — without a value cross-check, an operator
    // could hand-author a mirror with stale or fabricated tokens that
    // disagrees with DESIGN.md, and downstream `/qfai-implement` would
    // be bound to the wrong identity. The DESIGN.md.lock sha chain
    // anchors DESIGN.md content but does not verify this mirror file
    // against it. Skip when the parsed root DesignMd is unavailable
    // (DCON-030/033 already raised) or shape failed (no point
    // surfacing a value diff on top of a shape error).
    if (shapeOk && rootDesignMd !== null) {
      issues.push(...crossCheckMirrorValues(visual, rootDesignMd, filePathRel));
    }
    return issues;
  }

  // Legacy checklist shape — kept so existing projects keep validating
  // until they regenerate their design-system.yaml from the new mirror.
  const checklist = parsed.value.checklist;
  for (const key of REQUIRED_DESIGN_SYSTEM_CHECKLIST_KEYS) {
    if (
      !(checklist && typeof checklist === "object" && key in (checklist as Record<string, unknown>))
    ) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml is missing checklist key '${key}' (or rewrite as a DESIGN.md token mirror with visual.colors / visual.typography / visual.radius / visual.shadow).`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemChecklist",
        ),
      );
    }
  }

  const hasComponentToneChecklistKey =
    checklist &&
    typeof checklist === "object" &&
    "component_tone" in (checklist as Record<string, unknown>);
  const hasComponentGuidanceAlias =
    hasMeaningfulContractContent(parsed.value.component_tone) ||
    hasMeaningfulContractContent(parsed.value.component_semantics) ||
    hasMeaningfulContractContent(parsed.value.content_tone);
  if (!hasComponentToneChecklistKey && !hasComponentGuidanceAlias) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        "design-system.yaml is missing component guidance (expected checklist.component_tone, component_tone/component_semantics/content_tone, or rewrite as a DESIGN.md token mirror).",
        "error",
        filePathRel,
        "designContractReadiness.designSystemChecklist",
      ),
    );
  }

  return issues;
}

async function validatePrototypeHandoff(
  root: string,
  config: QfaiConfig,
  lockSha: string | null,
): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "prototype-handoff.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-012",
            "prototype-handoff.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.prototypeHandoffDocument",
          ),
        ]
      : [];
  }

  // Required fields match the rewritten handoff contract documented in
  // `.qfai/assistant/skills/qfai-prototyping/references/handoff.md`:
  // `finalIterIndex` (number ≥ 0), plus the string fields
  // `finalArtifact`, `designMdPath`, `designMdSha256`,
  // `designSystemMirror`, `implementationNotes`. The legacy fields
  // (`sourcePrototypeRefs`, `surfaceProfiles`, `screens`, `visualDna`,
  // `implementationHandoff`) were retired together with the multi-
  // option exploration → preserve/adapt/copy split when DESIGN.md
  // became the brand SSOT and the loop became single-thread.
  const issues: Issue[] = [];
  const filePathRel = toPosixRelative(root, filePath);
  // Distinguish missing vs invalid-type/value so the operator gets a
  // diagnostic that points at the actual problem. `Principle of Least
  // Astonishment`: an operator who DID write the field should not be
  // told it is "missing".
  const hasFinalIterIndex = "finalIterIndex" in parsed.value;
  const finalIterIndex = parsed.value.finalIterIndex;
  if (!hasFinalIterIndex) {
    issues.push(
      issue(
        "QFAI-DCON-013",
        "prototype-handoff.yaml is missing required field 'finalIterIndex' (expected a non-negative integer).",
        "error",
        filePathRel,
        "designContractReadiness.prototypeHandoffField",
      ),
    );
  } else if (
    typeof finalIterIndex !== "number" ||
    !Number.isInteger(finalIterIndex) ||
    finalIterIndex < 0
  ) {
    issues.push(
      issue(
        "QFAI-DCON-013",
        `prototype-handoff.yaml field 'finalIterIndex' must be a non-negative integer (got ${describeValueForDiagnostic(finalIterIndex)}).`,
        "error",
        filePathRel,
        "designContractReadiness.prototypeHandoffField",
      ),
    );
  }
  // Require each remaining field to be a non-empty string. The earlier
  // helper `validateRequiredStringArrayKeys` accepted arrays / records
  // as "meaningful content", so a handoff that authored
  // `finalArtifact: { uri: "..." }` or
  // `designSystemMirror: ["a.yaml", "b.yaml"]` would silently pass —
  // but downstream consumers (`/qfai-implement`, certify, ref-integrity)
  // require scalar string paths. Enforce the scalar contract here.
  for (const key of [
    "finalArtifact",
    "designMdPath",
    "designMdSha256",
    "designSystemMirror",
    "implementationNotes",
  ] as const) {
    if (!(key in parsed.value)) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml is missing required field '${key}'.`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
        ),
      );
      continue;
    }
    const value = parsed.value[key];
    if (typeof value !== "string") {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml field '${key}' must be a non-empty string (got ${typeof value}).`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
        ),
      );
      continue;
    }
    const normalized = value.trim();
    if (normalized.length === 0 || PLACEHOLDER_RE.test(normalized)) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml field '${key}' must be a non-empty string.`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
        ),
      );
    }
  }

  // Cross-check designMdPath / designMdSha256 against the root
  // DESIGN.md identity. Without this, a handoff yaml that points at an
  // alternate file or freezes a stale sha can pass `qfai validate`
  // while silently binding downstream `/qfai-implement` to a DESIGN.md
  // identity that diverges from the frozen root lock. Skip when the
  // upstream string-field gate already reported a problem (avoid
  // double-flagging the same root cause):
  //   - missing / non-string values are caught by the string-field
  //     loop above;
  //   - `tbd` / `todo` / `n/a` / `none` / `placeholder` / `example` /
  //     `lorem` / `to be defined` placeholder values are also caught
  //     by the string-field loop's `PLACEHOLDER_RE` check, so the
  //     skip predicate explicitly excludes them here too. Without
  //     the placeholder skip, an operator who left
  //     `designMdPath: TBD` would see two DCON-013 entries for the
  //     same fix (replace TBD with the real path).
  const designMdPath = parsed.value.designMdPath;
  if (
    typeof designMdPath === "string" &&
    designMdPath.trim().length > 0 &&
    !PLACEHOLDER_RE.test(designMdPath.trim())
  ) {
    // The handoff contract pins the brand SSOT to the repo root
    // DESIGN.md. Accept either the bare basename or `./DESIGN.md`,
    // normalize separators so Windows-authored handoffs are not
    // rejected, and anchor on the basename equality.
    const normalized = designMdPath.trim().replace(/\\/g, "/").replace(/^\.\//, "");
    if (normalized !== ROOT_DESIGN_MD_REL) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml field 'designMdPath' must be '${ROOT_DESIGN_MD_REL}' (the brand SSOT at repo root); got '${designMdPath}'.`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
          undefined,
          "canonical",
          "Set `designMdPath: DESIGN.md` so downstream `/qfai-implement` binds to the repo-root brand SSOT.",
        ),
      );
    }
  }
  const designMdSha = parsed.value.designMdSha256;
  if (
    typeof designMdSha === "string" &&
    designMdSha.trim().length > 0 &&
    !PLACEHOLDER_RE.test(designMdSha.trim())
  ) {
    const lower = designMdSha.trim().toLowerCase();
    if (!DESIGN_MD_SHA_HEX_RE.test(lower)) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml field 'designMdSha256' must be a 64-char lowercase hex sha256; got '${designMdSha}'.`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
          undefined,
          "canonical",
          "Copy the `designMdSha256` value from `.qfai/contracts/design/DESIGN.md.lock.yaml`.",
        ),
      );
    } else if (lockSha !== null && lower !== lockSha) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml field 'designMdSha256' (${lower}) does not match DESIGN.md.lock.yaml#designMdSha256 (${lockSha}).`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
          undefined,
          "canonical",
          "Re-run `qfai prototyping certify` (or refreeze the DESIGN.md lock) so the handoff sha matches the frozen root lock.",
        ),
      );
    }
  }

  return issues;
}

/**
 * Cross-check `design-system.yaml` mirror values against the parsed
 * root DESIGN.md tokens. Returns one DCON-005 per diverging key. The
 * mirror is contractually a verbatim copy, so any token mismatch means
 * downstream `/qfai-implement` would be bound to the wrong design
 * identity even if the lock-sha chain is internally consistent.
 *
 * Sub-keys checked:
 *   - visual.colors.{12 keys}
 *   - visual.typography.{family_sans, family_display, family_mono}
 *   - visual.radius.{sm, md, lg, full}
 *   - visual.shadow.{sm, md, lg}
 *
 * `visual.spacing` and the optional typography sub-keys (scale,
 * weight) are deliberately not cross-checked because they are
 * optional in DESIGN.md. Adding them here would require carrying
 * the raw DESIGN.md object; the canonical DesignMd type already
 * loses the raw spacing scale shape.
 */
function crossCheckMirrorValues(
  visual: Record<string, unknown>,
  rootDesignMd: DesignMd,
  filePathRel: string,
): Issue[] {
  const issues: Issue[] = [];
  const compare = (
    section: "colors" | "typography" | "radius" | "shadow",
    expected: Record<string, string>,
    // Keys handled by dedicated helpers (e.g. typography.scale /
    // typography.weight live one level deeper and have non-string
    // values; they are cross-checked by `crossCheckTypographyScale`
    // / `crossCheckTypographyWeight` separately). The reverse loop
    // skips them so they are not flagged as "fabricated keys" here.
    optionalKeys: ReadonlySet<string> = new Set(),
  ): void => {
    const mirror = visual[section];
    if (!isRecord(mirror)) return;
    // DESIGN.md -> mirror direction: every DESIGN.md token must be
    // present in the mirror with the matching value.
    for (const [key, expectedValue] of Object.entries(expected)) {
      if (!(key in mirror)) {
        issues.push(
          issue(
            "QFAI-DCON-005",
            `design-system.yaml mirror is missing 'visual.${section}.${key}' (DESIGN.md token: '${expectedValue}').`,
            "error",
            filePathRel,
            "designContractReadiness.designSystemMirror",
          ),
        );
        continue;
      }
      const actual = mirror[key];
      if (typeof actual !== "string" || actual !== expectedValue) {
        issues.push(
          issue(
            "QFAI-DCON-005",
            `design-system.yaml mirror 'visual.${section}.${key}' diverges from DESIGN.md (mirror=${JSON.stringify(actual)}, DESIGN.md='${expectedValue}').`,
            "error",
            filePathRel,
            "designContractReadiness.designSystemMirror",
            undefined,
            "canonical",
            "The mirror is contractually a verbatim copy of DESIGN.md tokens; re-run `qfai prototyping certify` (or regenerate design-system.yaml) so values match.",
          ),
        );
      }
    }
    // mirror -> DESIGN.md direction: extra keys not in DESIGN.md are
    // also a contract violation (the mirror is a verbatim copy, so
    // the key sets must be set-equal). Without this, a hand-authored
    // mirror with `visual.colors.fabricated_token: "#FF00FF"` would
    // pass certify and travel to `/qfai-implement` as validated
    // content. The handoff contract is "verbatim mirror" -> the key
    // sets must match in both directions.
    //
    // `optionalKeys` lists keys handled by a separate helper (e.g.
    // typography.scale / typography.weight) — they are legitimate
    // mirror sub-keys per `qfai-prototyping/references/handoff.md`
    // and must NOT surface as fabricated here.
    for (const key of Object.keys(mirror)) {
      if (!(key in expected) && !optionalKeys.has(key)) {
        issues.push(
          issue(
            "QFAI-DCON-005",
            `design-system.yaml mirror 'visual.${section}.${key}' is not a DESIGN.md token; the mirror must be a verbatim copy of DESIGN.md (no fabricated keys).`,
            "error",
            filePathRel,
            "designContractReadiness.designSystemMirror",
            undefined,
            "canonical",
            "Remove the fabricated key, or add it to root DESIGN.md and refreeze the lock.",
          ),
        );
      }
    }
  };
  compare("colors", rootDesignMd.visual.colors);
  compare(
    "typography",
    {
      family_sans: rootDesignMd.visual.typography.family_sans,
      family_display: rootDesignMd.visual.typography.family_display,
      family_mono: rootDesignMd.visual.typography.family_mono,
    },
    // typography.scale / typography.weight are nested optional
    // tokens with non-string values, handled by dedicated helpers
    // below. Whitelist them in the bidir-loop's reverse direction
    // so a legitimate mirror that includes them does not surface
    // as "fabricated keys".
    new Set(["scale", "weight"]),
  );
  compare("radius", rootDesignMd.visual.radius);
  compare("shadow", rootDesignMd.visual.shadow);

  // Optional DESIGN.md tokens. Per `qfai-prototyping/references/handoff.md`,
  // the mirror copies these verbatim WHEN PRESENT in DESIGN.md, and
  // omits them otherwise. The contract is two-state: "absent in
  // mirror" or "verbatim copy". A third state — "authored only in
  // mirror" — is a contract violation (it would let
  // `/qfai-implement` bind to validated mirror content that has no
  // anchor in the brand SSOT).
  //
  // For each optional section we therefore branch:
  //   - DESIGN.md authored it -> cross-check values + key-set
  //   - DESIGN.md did NOT author it -> mirror MUST also omit it,
  //     else surface DCON-005 ("not a DESIGN.md token")
  const dmTypography = rootDesignMd.visual.typography;
  if (dmTypography.scale !== undefined) {
    crossCheckTypographyScale(visual, dmTypography.scale, filePathRel, issues);
  } else {
    rejectMirrorOnlyTypographySubKey(visual, "scale", filePathRel, issues);
  }
  if (dmTypography.weight !== undefined) {
    crossCheckTypographyWeight(visual, dmTypography.weight, filePathRel, issues);
  } else {
    rejectMirrorOnlyTypographySubKey(visual, "weight", filePathRel, issues);
  }
  const dmSpacing = rootDesignMd.visual.spacing;
  if (dmSpacing !== undefined) {
    crossCheckSpacing(visual, dmSpacing, filePathRel, issues);
  } else {
    rejectMirrorOnlySpacing(visual, filePathRel, issues);
  }
  return issues;
}

/**
 * When DESIGN.md does NOT author `typography.scale` / `typography.weight`,
 * the mirror MUST also omit it. This helper enforces that
 * "DESIGN.md absent + mirror present" is rejected as DCON-005, so a
 * hand-authored mirror cannot fabricate optional sections.
 */
function rejectMirrorOnlyTypographySubKey(
  visual: Record<string, unknown>,
  subKey: "scale" | "weight",
  filePathRel: string,
  issues: Issue[],
): void {
  const typo = visual.typography;
  if (!isRecord(typo)) return;
  if (subKey in typo) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        `design-system.yaml mirror authors 'visual.typography.${subKey}' but DESIGN.md does not. The mirror is contractually a verbatim copy of DESIGN.md (no fabricated sections).`,
        "error",
        filePathRel,
        "designContractReadiness.designSystemMirror",
        undefined,
        "canonical",
        `Remove 'visual.typography.${subKey}' from design-system.yaml, or author it in root DESIGN.md and refreeze the lock.`,
      ),
    );
  }
}

/**
 * When DESIGN.md does NOT author `visual.spacing`, the mirror MUST
 * also omit the entire spacing block. Symmetric counterpart of
 * `crossCheckSpacing`.
 */
function rejectMirrorOnlySpacing(
  visual: Record<string, unknown>,
  filePathRel: string,
  issues: Issue[],
): void {
  if ("spacing" in visual) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        "design-system.yaml mirror authors 'visual.spacing' but DESIGN.md does not. The mirror is contractually a verbatim copy of DESIGN.md (no fabricated sections).",
        "error",
        filePathRel,
        "designContractReadiness.designSystemMirror",
        undefined,
        "canonical",
        "Remove 'visual.spacing' from design-system.yaml, or author it in root DESIGN.md and refreeze the lock.",
      ),
    );
  }
}

// `compare` above walks top-level `visual[<section>]` records and
// applies a string-equality contract. Nested optional tokens
// (`visual.typography.scale`, `visual.typography.weight`,
// `visual.spacing`) need dedicated helpers because they live one
// level deeper and `weight`/`spacing.scale` carry non-string values.

function crossCheckTypographyScale(
  visual: Record<string, unknown>,
  expected: Record<string, string>,
  filePathRel: string,
  issues: Issue[],
): void {
  const typo = visual.typography;
  if (!isRecord(typo)) return;
  const mirror = typo.scale;
  if (!isRecord(mirror)) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        `design-system.yaml mirror is missing 'visual.typography.scale' (DESIGN.md authored ${Object.keys(expected).length} scale tokens).`,
        "error",
        filePathRel,
        "designContractReadiness.designSystemMirror",
      ),
    );
    return;
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!(key in mirror)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror is missing 'visual.typography.scale.${key}' (DESIGN.md token: '${expectedValue}').`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
      continue;
    }
    const actual = mirror[key];
    if (typeof actual !== "string" || actual !== expectedValue) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.typography.scale.${key}' diverges from DESIGN.md (mirror=${JSON.stringify(actual)}, DESIGN.md='${expectedValue}').`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
  for (const key of Object.keys(mirror)) {
    if (!(key in expected)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.typography.scale.${key}' is not a DESIGN.md token; the mirror must be a verbatim copy.`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
}

function crossCheckTypographyWeight(
  visual: Record<string, unknown>,
  expected: Record<string, number>,
  filePathRel: string,
  issues: Issue[],
): void {
  // typography.weight is Record<string, number>. The dedicated helper
  // is needed because `compare` above is typed for string values.
  const typo = visual.typography;
  if (!isRecord(typo)) return;
  const mirror = typo.weight;
  if (!isRecord(mirror)) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        `design-system.yaml mirror is missing 'visual.typography.weight' (DESIGN.md authored ${Object.keys(expected).length} weight tokens).`,
        "error",
        filePathRel,
        "designContractReadiness.designSystemMirror",
      ),
    );
    return;
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!(key in mirror)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror is missing 'visual.typography.weight.${key}' (DESIGN.md token: ${expectedValue}).`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
      continue;
    }
    const actual = mirror[key];
    if (typeof actual !== "number" || actual !== expectedValue) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.typography.weight.${key}' diverges from DESIGN.md (mirror=${JSON.stringify(actual)}, DESIGN.md=${expectedValue}).`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
  for (const key of Object.keys(mirror)) {
    if (!(key in expected)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.typography.weight.${key}' is not a DESIGN.md token; the mirror must be a verbatim copy.`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
}

function crossCheckSpacing(
  visual: Record<string, unknown>,
  expected: NonNullable<DesignMd["visual"]["spacing"]>,
  filePathRel: string,
  issues: Issue[],
): void {
  // spacing has heterogeneous types: `base` is string, `scale` is
  // number[]. Walk each sub-key independently rather than re-using
  // `compare` (which assumes a Record-of-strings shape).
  const mirror = visual.spacing;
  if (!isRecord(mirror)) {
    // DESIGN.md authored spacing tokens but the mirror omitted the
    // entire spacing block — surface as a single missing-section
    // message rather than per-key noise.
    issues.push(
      issue(
        "QFAI-DCON-005",
        "design-system.yaml mirror is missing 'visual.spacing' (DESIGN.md authored spacing tokens that must be copied verbatim).",
        "error",
        filePathRel,
        "designContractReadiness.designSystemMirror",
      ),
    );
    return;
  }
  if (expected.base !== undefined) {
    if (!("base" in mirror)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror is missing 'visual.spacing.base' (DESIGN.md token: '${expected.base}').`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    } else if (mirror.base !== expected.base) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.spacing.base' diverges from DESIGN.md (mirror=${JSON.stringify(mirror.base)}, DESIGN.md='${expected.base}').`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
  if (expected.scale !== undefined) {
    if (!("scale" in mirror)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror is missing 'visual.spacing.scale' (DESIGN.md token: ${JSON.stringify(expected.scale)}).`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    } else {
      const mirrorScale = mirror.scale;
      const expectedScale = expected.scale;
      if (
        !Array.isArray(mirrorScale) ||
        mirrorScale.length !== expectedScale.length ||
        !expectedScale.every((v, i) => mirrorScale[i] === v)
      ) {
        issues.push(
          issue(
            "QFAI-DCON-005",
            `design-system.yaml mirror 'visual.spacing.scale' diverges from DESIGN.md (mirror=${JSON.stringify(mirrorScale)}, DESIGN.md=${JSON.stringify(expectedScale)}).`,
            "error",
            filePathRel,
            "designContractReadiness.designSystemMirror",
          ),
        );
      }
    }
  }
  // Reverse direction: extra mirror keys. Reject both (a) keys outside
  // the schema-defined `{base, scale}` set AND (b) schema-allowed keys
  // that DESIGN.md did not author. Without (b), an author can extend
  // `visual.spacing` in design-system.yaml with `scale` even when
  // DESIGN.md only authored `base` — a verbatim-copy violation that
  // pre-fix slipped through because the previous check only enforced
  // (a). See codex 89xl.
  const SCHEMA_SPACING_KEYS = new Set(["base", "scale"]);
  for (const key of Object.keys(mirror)) {
    if (!SCHEMA_SPACING_KEYS.has(key)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.spacing.${key}' is not a DESIGN.md token; the mirror must be a verbatim copy.`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
      continue;
    }
    // Schema-allowed key: still must have been authored in DESIGN.md.
    const expectedValue = (expected as Record<string, unknown>)[key];
    if (expectedValue === undefined) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror authors 'visual.spacing.${key}' but DESIGN.md does not. The mirror is contractually a verbatim copy of DESIGN.md (no fabricated sub-keys).`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
}

/**
 * Format a value for inclusion in a diagnostic message. Primitives
 * (`null`, `number`, `string`, `boolean`) are JSON-serialized for
 * literal preservation; non-primitives (arrays / objects) collapse to
 * `<typeof>` so a misnested YAML directive like `{ foo: 1 }` does not
 * spew an opaque JSON blob into the operator-facing error.
 */
function describeValueForDiagnostic(value: unknown): string {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "<array>";
  return `<${typeof value}>`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasMeaningfulContractContent(value: unknown, depth = 0): boolean {
  if (depth > 8) {
    return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 && !PLACEHOLDER_RE.test(normalized);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasMeaningfulContractContent(entry, depth + 1));
  }
  if (isRecord(value)) {
    return Object.values(value).some((entry) => hasMeaningfulContractContent(entry, depth + 1));
  }
  return false;
}

async function readYaml(filePath: string): Promise<YamlReadResult> {
  try {
    const parsed: unknown = parseYaml(await readFile(filePath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { kind: "invalid" };
    }
    return { kind: "ok", value: parsed as Record<string, unknown> };
  } catch {
    try {
      await readFile(filePath, "utf-8");
      return { kind: "invalid" };
    } catch {
      return { kind: "missing" };
    }
  }
}
