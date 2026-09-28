import path from "node:path";
import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { isUnreplacedDesignMdSample, parseDesignMd } from "../design/designMd.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import { PROTOTYPING_JSON_REL } from "../prototyping/paths.js";
import { readUiContractInventory } from "../prototyping/specResolution.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

// Root DESIGN.md is the brand SSOT for UI-bearing projects.
const ROOT_DESIGN_MD_REL = "DESIGN.md";

const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|none|placeholder|example|lorem|to be defined)$/i;

type DesignContractReadinessStage = "sdd" | "prototyping";

export async function validateSddDesignContractReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  return validateDesignContractReadinessForStage(root, config, "sdd");
}

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

export async function validatePrototypingDesignContractReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  return validateDesignContractReadinessForStage(root, config, "prototyping");
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

async function validateDesignContractReadinessForStage(
  root: string,
  config: QfaiConfig,
  stage: DesignContractReadinessStage,
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
  const issues: Issue[] = [...sampleIssues, ...(await validateRootDesignMd(root))];

  if (stage === "prototyping") {
    issues.push(...(await validatePrototypeHandoff(root, config)));
  }
  return issues;
}

/**
 * Identity gate for root DESIGN.md (QFAI-DCON-034).
 *
 * DCON-030 and DCON-033 are content-agnostic: they verify that DESIGN.md
 * exists and parses — never that it was authored by this project. So an
 * unreplaced sample satisfies both of them, and a prototyping loop would
 * record its hash and enforce a fictional identity.
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

/**
 * `handoff` in `prototyping.json`: what the prototyping loop hands to
 * `/qfai-implement` — where the final prototype is, what realises each screen
 * region, and prose notes.
 *
 * Silent when `prototyping.json` is absent or is not a JSON object: the
 * prototyping evidence gates own that file, and a run with no local
 * prototyping record has no handoff to check.
 */
async function validatePrototypeHandoff(root: string, config: QfaiConfig): Promise<Issue[]> {
  const record = await readJsonObject(path.join(root, PROTOTYPING_JSON_REL));
  if (record === undefined) return [];
  const handoff = record.handoff;
  if (!isRecord(handoff)) {
    return [
      issue(
        "QFAI-DCON-012",
        `prototyping.json field 'handoff' must be an object (got ${describeValueForDiagnostic(handoff)}).`,
        "error",
        PROTOTYPING_JSON_REL,
        "designContractReadiness.prototypeHandoffDocument",
      ),
    ];
  }

  const issues: Issue[] = [];
  // Each field is a non-empty string: downstream consumers
  // (`/qfai-implement`, ref-integrity) read a scalar path and prose. An
  // operator who wrote the field is told what is wrong with it, not that it
  // is missing.
  for (const key of ["finalArtifact", "implementationNotes"] as const) {
    if (!(key in handoff)) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototyping.json#handoff is missing required field '${key}'.`,
          "error",
          PROTOTYPING_JSON_REL,
          "designContractReadiness.prototypeHandoffField",
        ),
      );
      continue;
    }
    const value = handoff[key];
    if (typeof value !== "string") {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototyping.json#handoff field '${key}' must be a non-empty string (got ${typeof value}).`,
          "error",
          PROTOTYPING_JSON_REL,
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
          `prototyping.json#handoff field '${key}' must be a non-empty string.`,
          "error",
          PROTOTYPING_JSON_REL,
          "designContractReadiness.prototypeHandoffField",
        ),
      );
    }
  }

  // The screens a row may name are the ones the UI contracts declare, read
  // where the prototyping loop reads them.
  const declaredScreens = new Set(
    (await readUiContractScreenContracts(root, config.paths.contractsDir)).map(
      (screen) => screen.screenId,
    ),
  );
  issues.push(...procurementIssues(handoff, PROTOTYPING_JSON_REL, declaredScreens));

  return issues;
}

/**
 * The cells each `procurement` row carries, by list.
 *
 * `procured` says what realises a region so the implementer installs rather
 * than reconstructs. `authored` says what was written instead, and why: the
 * procurement ladder's last rung is the only one that has to explain itself,
 * and a row with no reason is what an unexplained rung looks like once it
 * reaches the handoff.
 */
const PROCUREMENT_ROW_CELLS: Readonly<Record<string, readonly string[]>> = {
  procured: ["screen", "region", "item"],
  authored: ["screen", "region", "why"],
  "drawn-from-project": ["screen"],
};

/**
 * The list that says a screen needed nothing.
 *
 * Its rows name a screen and no region, because there is no region to name:
 * the claim is about the whole screen. An empty `procured` would not say it —
 * that reads as "nothing was found", which is a different answer from "nothing
 * was needed" — and omitting the screen says least of all, which is the state
 * this list exists to remove.
 */
const DRAWN_FROM_PROJECT = "drawn-from-project";

/**
 * The values the shipped handoff example writes in a `procurement` row.
 *
 * Named literally rather than matched by shape. A cell in these columns is
 * free text — a component is named `<DataTable>` and invoked
 * `<DataTable density="compact">` — so any pattern wide enough to cover the
 * example's phrases covers a component somebody chose, and a row that was
 * written is reported.
 *
 * A test holds this set against the block the shipped file carries, so a
 * placeholder reworded there is a failing test rather than a value nothing
 * recognises.
 */
export const PROCUREMENT_PLACEHOLDERS: ReadonlySet<string> = new Set([
  "<screen id>",
  "<what part of the screen>",
  "<catalogue item, or the project component it already had>",
  "<what was looked for and did not serve>",
]);

/**
 * The words a cell carries when nobody has decided yet, beyond
 * {@link PLACEHOLDER_RE}'s. `tba` and `fixme` are the two an author reaches for
 * where `tbd` and `todo` would do, and `xxx` is the marker left where a value
 * belongs.
 */
const UNDECIDED_WORD = /^(?:tba|fixme|xxx|\?+)$/i;

/**
 * A cell's text with the decoration around it removed: a code span, a quoted
 * string, the brackets a template uses.
 *
 * A placeholder is written as often with decoration as without —
 * `` `TBD` ``, `"TODO"`, `[tbd]` — and read whole, each of those is a value
 * nothing recognises, so the row passed carrying nothing to act on.
 */
function undecorated(value: string): string {
  let text = value.trim();
  for (;;) {
    const stripped = text
      .replace(/^[`"'*_[({]+/, "")
      .replace(/[`"'*_\])}]+$/, "")
      .replace(/[.;!]+$/, "")
      .trim();
    if (stripped === text) return text;
    text = stripped;
  }
}

/**
 * Whether a cell holds something a later reader can act on.
 *
 * The decoration is removed first, and a value that opens with a placeholder
 * and a colon — `TODO: choose a component` — is one too: it names the decision
 * rather than making it, which is the state this check exists to report.
 */
function cellIsWritten(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Angle brackets are not stripped and no shape rule reads them: a component is
  // named that way — `<DataTable density="compact">` — so the template's own
  // phrases are the set below and nothing wider. The set is read against the
  // undecorated text as well, since a shipped phrase is quoted and punctuated
  // like any other placeholder.
  const bare = undecorated(trimmed);
  if (PLACEHOLDER_RE.test(bare) || UNDECIDED_WORD.test(bare)) return false;
  const opener = /^([^\s:]+)\s*:/.exec(bare)?.[1] ?? "";
  if (opener !== "" && (PLACEHOLDER_RE.test(opener) || UNDECIDED_WORD.test(opener))) return false;
  return ![trimmed, bare].some((form) => PROCUREMENT_PLACEHOLDERS.has(form.toLowerCase()));
}

/**
 * The finding for a screen the manifest answers nothing about.
 *
 * Separate from the shape findings because the repair is different: nothing in
 * the file is malformed, and what it owes is a row saying which of the two
 * cases the screen is in.
 */
function missingProcurement(filePathRel: string, screens: readonly string[], what: string): Issue {
  return issue(
    "QFAI-DCON-013",
    `prototyping.json#handoff ${what}, and this target's UI contracts declare screens. An ` +
      `implementer cannot tell a screen that needed nothing from one the loop recorded nothing ` +
      `for, and reading the second as the first rebuilds by hand what the loop had procured.`,
    "error",
    filePathRel,
    "designContractReadiness.prototypeHandoffProcurement",
    undefined,
    "canonical",
    `Give ${screens.map((screen) => `'${screen}'`).join(", ")} a row in ` +
      "`handoff.procurement` in prototyping.json: under `procured` or `authored` for a region it needed, or under " +
      "`drawn-from-project` where the screen was drawn entirely from what the project already had.",
  );
}

/**
 * Shape findings for `prototyping.json#handoff.procurement`.
 *
 * The key itself is optional: the handoff contract lets a screen drawn
 * entirely from what the project already had omit both lists, so an absent
 * `procurement` is not reported here. What is reported is a present one a
 * reader cannot act on. `/qfai-implement` installs what this names rather than
 * rebuilding it, so a row with no `item` names nothing to install, and a row
 * with no `why` satisfies the reviewer's last-resort criterion on its face
 * while recording none of what that criterion asks for. A row's `screen` has to
 * be one a UI contract declares, or neither consumer can locate the region.
 */
function procurementIssues(
  handoff: Record<string, unknown>,
  filePathRel: string,
  declaredScreens: ReadonlySet<string>,
): Issue[] {
  // A target with no UI contract has no screen list to hold a manifest to, and
  // the readiness gate already reports that project. Everywhere else the key is
  // required: an absent `procurement` could mean every screen was drawn from
  // what the project already had, or that the loop recorded nothing, and an
  // implementer reading the second as the first rebuilds by hand what the loop
  // had procured.
  if (!("procurement" in handoff)) {
    if (declaredScreens.size === 0) return [];
    return [
      missingProcurement(filePathRel, [...declaredScreens].sort(), "field 'procurement' is absent"),
    ];
  }
  const procurement = handoff.procurement;
  const report = (message: string): Issue =>
    issue(
      "QFAI-DCON-013",
      `prototyping.json#handoff ${message}`,
      "error",
      filePathRel,
      "designContractReadiness.prototypeHandoffProcurement",
      undefined,
      "canonical",
      "Repair `handoff.procurement` in prototyping.json: it is a mapping of a `procured` and an " +
        "`authored` list, each row naming one screen region and what realises it — `screen`, " +
        "`region`, `item` for a procured region and `screen`, `region`, `why` for an authored " +
        "one, with one row per region across both lists.",
    );
  if (!isRecord(procurement)) {
    return [
      report(
        `field 'procurement' must be a mapping carrying 'procured' and 'authored' lists (got ${describeValueForDiagnostic(procurement)}).`,
      ),
    ];
  }

  const issues: Issue[] = [];
  /**
   * Where each screen region was realised, and the pairs realised twice.
   *
   * One realisation per region: the contract says each region names what
   * realises it, singular. Two rows for one region tell the implementer to
   * install and to author the same part, so the pairs are collected across both
   * lists rather than judged a row at a time.
   */
  const realised = new Map<string, string>();
  const duplicates: { key: string; first: string; second: string }[] = [];
  /** Screens claimed to have needed nothing, and screens with a row that needed something. */
  const drawnFromProject = new Map<string, string>();
  const needed = new Map<string, string>();
  // A closed key set, as `prototyping/handoff.ts` keeps for the schema beside
  // this one: "closed schema; protects against schema drift and typos". A
  // misspelling leaves both contract names absent, which is a manifest that
  // exposes nothing to either consumer while reading as one that does.
  const unknown = Object.keys(procurement).filter(
    (key) => !Object.hasOwn(PROCUREMENT_ROW_CELLS, key),
  );
  if (unknown.length > 0) {
    issues.push(
      report(
        `field 'procurement' carries ${unknown.map((key) => `'${key}'`).join(", ")}, which ` +
          `nothing reads. The lists are 'procured' and 'authored'.`,
      ),
    );
  }
  for (const [list, cells] of Object.entries(PROCUREMENT_ROW_CELLS)) {
    // An own key. `key in` reaches the prototype, where `constructor` and
    // `toString` answer to a name the contract never defined and hold a
    // function rather than a list.
    if (!Object.hasOwn(procurement, list)) continue;
    const rows = procurement[list];
    // A list declared and left empty is present rather than omitted: `procured:`
    // with nothing under it parses as `null`, and a declaration saying nothing
    // is the shape this reports. It is the distinction the key itself carries
    // one level up.
    if (!Array.isArray(rows)) {
      issues.push(
        report(
          `field 'procurement.${list}' must be a list (got ${describeValueForDiagnostic(rows)}).`,
        ),
      );
      continue;
    }
    rows.forEach((row: unknown, index) => {
      const where = `procurement.${list}[${index}]`;
      const missing = isRecord(row) ? cells.filter((cell) => !cellIsWritten(row[cell])) : cells;
      if (missing.length === 0 && isRecord(row)) {
        const screen = String(row.screen).trim();
        if (list === DRAWN_FROM_PROJECT) drawnFromProject.set(screen, where);
        else needed.set(screen, where);
        // A `drawn-from-project` row names the screen and nothing under it, so
        // the pair a duplicate is judged on is the screen itself.
        const key =
          list === DRAWN_FROM_PROJECT ? screen : `${screen} / ${String(row.region).trim()}`;
        const seen = realised.get(key);
        if (seen === undefined) realised.set(key, where);
        else duplicates.push({ key, first: seen, second: where });
        // With no UI contract at all there is no list to hold the row to, and
        // the readiness gate already reports that project. `region` is not
        // resolved: a screen contract names a screen, not its parts.
        if (declaredScreens.size > 0 && !declaredScreens.has(screen)) {
          issues.push(
            report(
              `row '${where}' names screen '${screen}', which no UI contract declares. ` +
                `An implementer and a reviewer locate the region through the screen, so a ` +
                `row naming one that does not exist gives neither of them anything to act on.`,
            ),
          );
        }
      }
      if (missing.length > 0) {
        issues.push(
          report(
            `row '${where}' names no ${missing.join(", ")}. Each row carries ${cells.join(", ")}, ` +
              `because an implementer reads this to install rather than to reconstruct.`,
          ),
        );
      }
    });
  }
  for (const [screen, where] of drawnFromProject) {
    const other = needed.get(screen);
    if (other === undefined) continue;
    issues.push(
      report(
        `row '${where}' says screen '${screen}' needed nothing, and '${other}' names something ` +
          `it needed. A screen is one or the other, so an implementer is told both to install ` +
          `and that there is nothing to install.`,
      ),
    );
  }
  for (const { key, first, second } of duplicates) {
    issues.push(
      report(
        `names '${key}' at both '${first}' and '${second}'. Each screen region names one ` +
          `thing that realises it, so two rows for it leave an implementer without an answer ` +
          `to what to install.`,
      ),
    );
  }
  return issues;
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

async function readJsonObject(filePath: string): Promise<Record<string, unknown> | undefined> {
  let text: string;
  try {
    text = await readFile(filePath, "utf-8");
  } catch {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
