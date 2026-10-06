import path from "node:path";
import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { isUnreplacedDesignMdSample, parseDesignMd } from "../design/designMd.js";
import { readUiContractInventory } from "../prototyping/specResolution.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

// Root DESIGN.md is the brand SSOT for UI-bearing projects.
const ROOT_DESIGN_MD_REL = "DESIGN.md";

/**
 * Whether the root DESIGN.md parses — and nothing else.
 *
 * Split out so a malformed file is reported where it is read. `--profile
 * discussion` runs validators over discussion packs, mermaid, visuals, research
 * summaries and review artifacts — none of them DESIGN.md — and
 * `QFAI-DCON-033` reached a run only through the sdd or prototyping readiness
 * gates, so a malformed file surfaced a review round later, under a different
 * skill, with the earlier gate having passed.
 *
 * The parse half only. The readiness validator also requires UI contracts,
 * which belong to later stages, so this is a separate entry point rather than
 * a flag on the existing one.
 *
 * Silent when the file is absent: `QFAI-DCON-030` owns missing-file, and
 * `/qfai-sdd` is where the file gets written.
 */
export async function validateRootDesignMdParse(root: string): Promise<Issue[]> {
  let text: string;
  try {
    text = await readFile(path.join(root, ROOT_DESIGN_MD_REL), "utf-8");
  } catch {
    // Absent or unreadable: `QFAI-DCON-030` owns missing-file, and a discussion
    // run happens before the file necessarily exists. Reporting either here
    // would put a second finding on one state, or a finding on a project that
    // has not reached this artifact yet.
    return [];
  }
  const parsed = parseDesignMd(text);
  return "error" in parsed ? [rootDesignMdParseIssue(parsed.error.message)] : [];
}

/**
 * The `QFAI-DCON-033` finding, built in one place.
 *
 * Two callers emit it — the readiness gate and the discussion-profile parse
 * check — and a finding whose message, rule or remedy differed between them
 * would send automated remediation down two paths for one defect.
 *
 * The parse error's own message is passed through verbatim because it already
 * names what to fix: `rejectUnknownKeys` produces
 * `Unknown '<section>' key '<k>'. Allowed: <list>.`, so the allowed set reaches
 * the operator without opening the spec.
 */
function rootDesignMdParseIssue(detail: string): Issue {
  return issue(
    "QFAI-DCON-033",
    `Root DESIGN.md failed to parse: ${detail}`,
    "error",
    ROOT_DESIGN_MD_REL,
    "designContractReadiness.rootDesignMdParse",
    undefined,
    "canonical",
    "Fix DESIGN.md front-matter so parseDesignMd succeeds (see qfai-prototyping/references/design-md-spec.md). Do NOT regenerate the template — that would discard user content.",
  );
}

/**
 * Root `DESIGN.md` readiness, the same check for the sdd and prototyping
 * profiles: the unreplaced sample, and for a UI-bearing project the file's
 * presence and parse.
 */
export async function validateDesignContractReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const uiBearing = (await readUiContractInventory(root, config)).some((entry) => entry.hasScreens);

  // The unreplaced-sample gate runs first. Every other check runs only for a
  // UI-bearing project, known once SDD has authored UI contracts; the sample
  // gate has to fire earlier than that, because the sample can be copied in
  // at any point.
  //
  // A cli-only project skips the gate outright rather than degrading it to a
  // warning: the carve-out says root DESIGN.md is not part of its contract at
  // all, so there is nothing for the seeded sample to be the wrong version
  // OF. A warning would still fail `validation.failOn: warning` /
  // `--fail-on warning` runs and its remediation would tell the user to
  // author a brand SSOT that no reader in this project consumes.
  const sampleIssues = await validateRootDesignMdSample(root, uiBearing);
  if (!uiBearing) {
    return sampleIssues;
  }

  // A cli-only project has no brand SSOT, so the file (DCON-030/033) cannot
  // be required of it.
  return [...sampleIssues, ...(await validateRootDesignMd(root))];
}

/**
 * Identity gate for root DESIGN.md (QFAI-DCON-034).
 *
 * DCON-030 and DCON-033 are content-agnostic: they verify that DESIGN.md
 * exists and parses — never that it was authored by this project. So an
 * unreplaced sample satisfies both of them, and a prototyping loop would
 * run against a fictional identity.
 *
 * A project holds the sample because someone put it there: copied from
 * `.qfai/assistant/skill/qfai-prototyping/templates/DESIGN.md.sample` as a
 * starting point, or seeded by a release back when `qfai init` wrote one.
 * Init writes none now — `/qfai-sdd` authors it, and only for a
 * visual-prototyping surface — so this gate no longer reports a file the
 * tool itself had just written.
 *
 * Severity scales with how far the project has committed to a brand
 * contract:
 *   - UI-bearing -> `error`. The project is on the path that prototypes
 *     against this file.
 *   - otherwise -> `warning`. A project that ships no UI prototypes nothing,
 *     so the sample costs it nothing yet; a hard failure would stop a
 *     project that never opted into the design surface at all. The warning
 *     still names the file, which is what the sample's own instructions
 *     promise a reader.
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
      "Root DESIGN.md is still the qfai sample brand (unreplaced sample).",
      uiBearing ? "error" : "warning",
      ROOT_DESIGN_MD_REL,
      "designContractReadiness.rootDesignMdSample",
      undefined,
      "canonical",
      "Replace root DESIGN.md with this product's brand SSOT (run /qfai-sdd, whose `common-design-md` step authors it from the design direction the discussion pack recorded, or author it from `.qfai/assistant/skill/qfai-prototyping/templates/DESIGN.md.sample`) and delete the sample marker comment if present. /qfai-sdd refuses to build on a sample.",
    ),
  ];
}

/**
 * QFAI-DCON-030 for a missing root DESIGN.md, and QFAI-DCON-033 for one
 * that does not parse. The two are separate codes so automated remediation
 * can route them: missing -> author the file, parse failure -> repair the
 * existing file without losing user edits.
 */
async function validateRootDesignMd(root: string): Promise<Issue[]> {
  let designMdText: string;
  try {
    designMdText = await readFile(path.join(root, ROOT_DESIGN_MD_REL), "utf-8");
  } catch {
    return [
      issue(
        "QFAI-DCON-030",
        "Missing root DESIGN.md (brand SSOT).",
        "error",
        ROOT_DESIGN_MD_REL,
        "designContractReadiness.rootDesignMd",
        undefined,
        "canonical",
        "Create root DESIGN.md at the project root with the canonical front-matter, or run /qfai-sdd, whose `common-design-md` step authors it (see the qfai-sdd skill).",
      ),
    ];
  }
  const parseResult = parseDesignMd(designMdText);
  return "error" in parseResult ? [rootDesignMdParseIssue(parseResult.error.message)] : [];
}
