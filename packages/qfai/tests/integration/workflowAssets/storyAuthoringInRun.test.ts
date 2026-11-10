/**
 * Integration: how a fix route's implement stage seeds a diagnosed example, and how `/qfai-sdd`
 * changes the story tree.
 *
 * Reads the shipped `implement-tdd` step, the `qfai-sdd` skill, its steps and the triage reference.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { parseContractRules } from "../../../src/core/storyTree/contractRules.js";
import {
  SHIPPED_ASSISTANT,
  flat,
  readShipped,
  sectionOf,
  shippedExists,
} from "../../helpers/shippedAssistant.js";

const SKILL = "skill/qfai-sdd/SKILL.md";
const FLOW_STEP = "step/sdd-flow/STEP.md";
const CONTRACT_STEP = "step/sdd-contract/STEP.md";
const TRACEABILITY = "skill/qfai-sdd/references/spec-traceability-rules.md";
const TEMPLATES = path.join(SHIPPED_ASSISTANT, "skill", "qfai-sdd", "templates");
const TRIAGE = "skill/qfai-sdd/references/sdd-triage.md";
const TRIAGE_STEP = "step/sdd-triage/STEP.md";
const CHECKLISTS = "skill/qfai-sdd/references/sdd-phase-checklists.md";
const STORY_STEP = "step/implement-tdd/STEP.md";
const SEEDING = "## A diagnosed missing example";

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("defect example seeding", () => {
  // QFAI:AC-0001-0206-01
  // QFAI:EX-0001-0206-01
  it("appends one example under the matched criterion and cites it from the enforcing rule", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(
      /append exactly one EX to the `03_Example\.md` of the story that owns the AC the diagnosis matched/i,
    );
    expect(text).toMatch(/its ID is the next free EX ID of that story, its `AC-Ref` is that AC/i);
    expect(text).toMatch(
      /add the new EX ID to (?:the Examples cell of the contract rule the diagnosis names as owning that AC|the selected rule's Examples cell)/i,
    );
  });

  // QFAI:AC-0001-0206-02
  // QFAI:EX-0001-0206-02
  it("changes no story, criterion, rule statement, existing example or test", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/(?:the rule's|its) Statement is unchanged/i);
    expect(text).toMatch(/change no story, AC, rule statement or existing EX/i);
  });

  // QFAI:AC-0001-0186-01
  // QFAI:EX-0001-0186-02
  it("carries the diagnosis as the reason for the appended example, and changes no statement", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/the diagnosis is its reason/i);
    expect(text).toMatch(/change no story, AC/i);
    expect(text).toMatch(/(?:the rule's|its) Statement is unchanged/i);
  });

  // QFAI:AC-0001-0206-03
  // QFAI:EX-0001-0206-03
  it("asks nothing and appends no decisions row", async () => {
    const text = await section(STORY_STEP, SEEDING);
    expect(text).toMatch(/the step asks the user nothing/i);
    expect(text).toMatch(
      /append no `decisions\.md` row for the appended example row and the new EX ID/i,
    );
    expect(text).toMatch(/list the EX\b.*\bin the run's final report/i);
  });
});

describe("qfai-sdd changes the story tree", () => {
  // QFAI:AC-0001-0147-03
  // QFAI:EX-0001-0147-05
  it("records in decisions.md only the user's decisions that pass the recording test", async () => {
    const text = await section(TRIAGE, "## Decision and question rows");
    expect(text).toMatch(
      /decisions\.md records only decisions the user made, approvals of critical decisions and releases included, that pass the recording test/i,
    );
    expect(text).toMatch(
      /hard to reverse, surprising to a reader without context, and the result of a real trade-off/i,
    );
    expect(text).toMatch(/a row is appended once the user has decided what it records/i);
    expect(text).toMatch(/an option the user rejects is a row whose Content opens `Declined:`/i);
    expect(text).toMatch(/who declined it and when/i);
    expect(text).toMatch(/a new open-questions\.md row `OQ-yyyymmddhhMMss`/i);
    expect(flat(await readShipped(CHECKLISTS))).toMatch(/a rejected option is a `Declined:` row/i);
  });

  // QFAI:AC-0001-0207-02
  // QFAI:EX-0001-0207-02
  it("ends at SDD when invoked by name, and hands a request to go to the end to qfai-run", async () => {
    const text = await section(SKILL, "## /qfai-sdd");
    expect(text).toMatch(/runs standalone, ends at SDD/i);
    expect(text).toMatch(/`qfai-run`/);
  });

  // QFAI:AC-0001-0207-06
  // QFAI:EX-0001-0207-06
  // QFAI:EX-0001-0207-07
  it("puts a critical change of the story tree to the user, and makes any other change itself", async () => {
    const text = await section(TRIAGE, "## Critical decisions and no-question mode");
    expect(text).toMatch(
      /an UPDATE:MODIFY that changes what an item existing before the stage states/i,
    );
    expect(text).toMatch(
      /a request from the user in the session that names the operation and its effect is the answer, and no second question is asked/i,
    );
    expect(text).toMatch(
      /any other story-tree or contract change, such as an appended AC, EX or BR, the stage makes itself and lists in its report/i,
    );
    const step = await section(TRIAGE_STEP, "## Stage 1: triage and records");
    expect(step).toMatch(/put each critical decision to the user before anything depends on it/i);
    expect(step).toMatch(/make every other story-tree or contract change yourself/i);
  });
});

/** The files under a shipped directory that an agent reads as text, by path relative to it. */
async function textFilesUnder(dir: string): Promise<string[]> {
  const names = await readdir(dir, { recursive: true });
  return names.filter((name) => /\.(md|ya?ml|sql)$/i.test(name));
}

/** Every citation in `text` of a document named `file`, as written, path prefix included. */
function citationsOf(text: string, file: string): string[] {
  const pattern = new RegExp(`[^\\s\`"'()<>]*${file.replace(".", "\\.")}`, "g");
  return [...text.matchAll(pattern)].map((match) => match[0]);
}

describe("qfai-sdd writes the story tree", () => {
  // QFAI:AC-0001-0147-04
  // QFAI:EX-0001-0147-07
  it("states each policy fact once and keeps the gate commands in the Standard commands section of tech.md", async () => {
    const procedure = await section(FLOW_STEP, "## Procedure");
    expect(procedure).toContain(
      "Write each fact once across `01_policy/objective.md`, `initiative.md`, `principle.md` and `03_contract/tech.md`.",
    );
    expect(procedure).toContain(
      "the quality-gate commands, one labelled item each, only in the Standard commands section of `tech.md`. Other documents point there.",
    );
    expect(flat(await readShipped(TRACEABILITY))).toContain(
      "A value set, a behaviour rule or a command belongs to the contract or tech.md that owns it, and policy links there.",
    );
    const tech = await readFile(path.join(TEMPLATES, "spec", "03_contract", "tech.md"), "utf-8");
    expect(tech).toMatch(/^## Standard commands \(copy-paste\)$/m);
  });

  // QFAI:AC-0001-0147-05
  it("allocates the highest number in a scope plus one, and reissues no retired ID", async () => {
    const allocation = await section(TRIAGE, "## ID allocation");
    expect(allocation).toContain(
      "Read all IDs of the kind in the relevant scope, including IDs named by decision rows and by the commits that retired them. The next ID is the highest plus one.",
    );
    expect(allocation).toContain(
      "Empty numeric scopes begin at 0001, and AC/EX tails begin at 01.",
    );
    expect(allocation).toContain(
      "Do not reuse an ID because its file was removed or a change was declined.",
    );
    expect(allocation).toContain(
      "Take the number from `npx qfai sdd next-id <kind> [<parent-ID>] --base <local-ref>` right before writing it",
    );
    expect(allocation).toContain(
      "prints the number after the highest of both, wherever a row sits. It writes nothing and does not see open pull requests.",
    );
    expect(await section(TRIAGE_STEP, "## ID allocation")).toContain(
      "Take each new ID from `npx qfai sdd next-id <kind> [<parent-ID>] --base <local-ref>` with a fetched base",
    );
    const scopes = flat(await readShipped(TRACEABILITY));
    expect(scopes).toContain(
      "Count IDs named in decision rows and in the commits that retired them, so deletion never frees an ID.",
    );
    expect(scopes).toContain("Directory names match their BF and US IDs.");
  });

  // QFAI:AC-0001-0147-05
  // QFAI:EX-0001-0147-46
  it("reads the IDs open pull requests add, checks them at merge time, and resolves register conflicts by merging the base", async () => {
    const step = await section(TRIAGE_STEP, "## ID allocation");
    const reference = await section(TRIAGE, "## ID allocation");
    for (const text of [step, reference]) {
      expect(text).toContain(
        "list the open pull requests once per session through its REST API, for example `gh api repos/{owner}/{repo}/pulls?state=open`, and reuse that listing for every ID the session takes.",
      );
      expect(text).toContain(
        "Fetch each one's head ref, such as `refs/pull/<n>/head`, so a pull request from a fork is read too, and read the IDs it adds from `git diff <base>...<head>`.",
      );
      expect(text).toContain(
        "Take the highest across the base, the working tree and those heads, plus one.",
      );
      expect(text).toContain("Without a forge CLI, read the base alone.");
      expect(text).toContain(
        "When merging the base into the branch, check each such ID the branch adds against the merged base. The base's item keeps its ID; the branch renumbers its own item and every reference to it, then runs the gates again.",
      );
      expect(text).toContain("`git merge origin/<base>`");
    }
    expect(step).toContain(
      "A decisions.md or open-questions.md row takes its timestamp ID instead, and reads neither the base nor any pull request.",
    );
    expect(reference).toContain(
      "A decisions.md or open-questions.md row takes its timestamp ID from the time it is written instead; no count and no other branch decides it.",
    );
  });

  // QFAI:AC-0001-0147-06
  // QFAI:EX-0001-0147-09
  it("writes each rule inside the contract that enforces it, in that file type's form", async () => {
    expect(await section(CONTRACT_STEP, "## Procedure")).toContain(
      "Put each BR in the contract that enforces it, numbered `BR-<contract number>-NNNN`: `x-qfai-rules` in YAML or JSON, `-- Rule` and `-- Examples:` in SQL, and a `## Business rules` table in Markdown.",
    );
    const samples: [string, RegExp][] = [
      [path.join("contracts", "api-contract.sample.yaml"), /^# QFAI-CONTRACT-ID: API-(\d{4})$/m],
      [path.join("contracts", "db-contract.sample.sql"), /^-- QFAI-CONTRACT-ID: DB-(\d{4})$/m],
      [path.join("spec", "03_contract", "cli", "cli-NNNN-title.md"), /^# CLI-(\d{4}):/m],
    ];
    for (const [relative, declaration] of samples) {
      const text = await readFile(path.join(TEMPLATES, relative), "utf-8");
      const number = declaration.exec(text)?.[1];
      expect(number, relative).toBeDefined();
      const scan = parseContractRules(relative, text);
      expect(scan.errors, relative).toEqual([]);
      expect(scan.rules.length, relative).toBeGreaterThan(0);
      for (const rule of scan.rules) {
        expect(rule.id.startsWith(`BR-${number}-`), `${relative} ${rule.id}`).toBe(true);
        expect(rule.statement, relative).not.toBe("");
        expect(rule.examples.length, relative).toBeGreaterThan(0);
      }
    }
    const templateFiles = await textFilesUnder(TEMPLATES);
    expect(templateFiles.filter((name) => /rules?\.md$/i.test(path.basename(name)))).toEqual([]);
  });

  // QFAI:EX-0001-0147-10
  it("defines a rule that several contracts rely on once, in the contract authoritative for it", async () => {
    expect(await section(CONTRACT_STEP, "## Procedure")).toContain(
      "Define a rule shared by contracts once, in its authoritative contract. No other contract restates or cites it: only code and tests cite a BR.",
    );
    expect(flat(await readShipped(TRACEABILITY))).toContain(
      "The authoritative contract defines a shared BR once. Other contracts neither restate nor cite it.",
    );
  });

  // QFAI:AC-0001-0147-07
  // QFAI:EX-0001-0147-11
  it("cites the change-classification and requirements-decomposition documents where they live", async () => {
    const skillDir = path.join(SHIPPED_ASSISTANT, "skill", "qfai-sdd");
    const files = [
      ...(await textFilesUnder(skillDir)).map((name) => path.join(skillDir, name)),
      ...(await readdir(path.join(SHIPPED_ASSISTANT, "step")))
        .filter((name) => name.startsWith("sdd-"))
        .map((name) => path.join(SHIPPED_ASSISTANT, "step", name, "STEP.md")),
    ];
    const classification = ".qfai/assistant/rule/change-classification.md";
    const decomposition = `${defaultConfig.paths.skillsDir}/qfai-sdd/references/requirements-decomposition.md`;
    let classificationCitations = 0;
    let decompositionCitations = 0;
    for (const file of files) {
      const text = await readFile(file, "utf-8");
      expect(text, file).not.toContain(".qfai/assistant/constitution/");
      const classified = citationsOf(text, "change-classification.md");
      const decomposed = citationsOf(text, "requirements-decomposition.md");
      expect(
        classified.filter((cited) => cited !== classification),
        file,
      ).toEqual([]);
      expect(
        decomposed.filter((cited) => cited !== decomposition),
        file,
      ).toEqual([]);
      classificationCitations += classified.length;
      decompositionCitations += decomposed.length;
    }
    expect(classificationCitations).toBeGreaterThan(0);
    expect(decompositionCitations).toBeGreaterThan(0);
    expect(shippedExists("rule/change-classification.md")).toBe(true);
    expect(shippedExists("skill/qfai-sdd/references/requirements-decomposition.md")).toBe(true);
  });
});

describe("capacity-safe story authoring guidance", () => {
  // QFAI:AC-0001-0008-09
  // QFAI:EX-0001-0008-23
  // QFAI:EX-0001-0008-24
  // QFAI:EX-0001-0008-25
  it("preflights the entire batch against retired-inclusive two-digit capacity", async () => {
    const capacity = await section(TRIAGE, "### Capacity before writing");
    expect(capacity).toMatch(/AC and EX tails stay two digits.*01 through 99/u);
    expect(capacity).toMatch(/Before writing a planned batch.*each affected kind and story/u);
    expect(capacity).toMatch(/high-water number H.*0 when empty/u);
    expect(capacity).toMatch(/remaining capacity 99-H.*requested additions/u);
    expect(capacity).toMatch(/tree and decisions, including retired IDs/u);
    expect(capacity).toMatch(
      /requested additions exceed 99-H.*stop before any partial allocation or invalid declaration/u,
    );
    expect(capacity).toMatch(/Never fill gaps, reuse retired IDs or emit tail 100/u);
    expect(capacity).toMatch(/empty scope has capacity 99/u);
    expect(capacity).toMatch(/H = 98 allows one addition at tail 99, not two/u);
    expect(capacity).toMatch(/retired 99 still exhausts the scope/u);

    const procedure = await section("step/sdd-story/STEP.md", "## Procedure");
    const preWrite = procedure.split("2. Write the story index")[0] ?? "";
    expect(preWrite).toContain("sdd-triage.md#capacity-before-writing");
    expect(preWrite).toMatch(/retired-inclusive remaining capacity and requested count/u);
    expect(preWrite).toMatch(/stop an over-capacity batch before any dependent declaration/u);
    const scopes = await section(TRACEABILITY, "## Identifier scopes");
    expect(scopes).toMatch(
      /For a capacity-only sibling or actual move the user decided.*owning stage.s capacity preflight and complete map before writing/u,
    );
    expect(scopes).toMatch(/retired-inclusive remaining 99-H/u);
    expect(scopes).toMatch(/Stop an over-capacity batch before partial declarations/u);
  });

  // QFAI:AC-0001-0008-09
  // QFAI:EX-0001-0008-26
  it("bounds capacity claims to observed sources and rechecks later publication", async () => {
    const capacity = await section(TRIAGE, "### Capacity before writing");
    expect(capacity).toMatch(/observed published parallel heads and known reservations/u);
    expect(capacity).toMatch(/project.s existing method/u);
    expect(capacity).toMatch(/Name the fixed observation and what it did not cover/u);
    expect(capacity).toMatch(
      /snapshot reserves nothing.*cannot cover unpublished concurrent work/u,
    );
    expect(capacity).toMatch(/Recheck newly published claims or collisions before publication/u);
    const collisions =
      (await section(TRIAGE, "### Actual moves and incoming collisions")).split(
        "Two branches can take",
      )[0] ?? "";
    expect(collisions).toMatch(/fixed provenance and meaning.*only the provably incoming item/u);
    expect(collisions).toMatch(/without blanket replacement/u);
    expect(collisions).toMatch(/Keep unaffected published cases and IDs/u);
  });

  // QFAI:AC-0001-0147-16
  // QFAI:EX-0001-0147-41
  // QFAI:EX-0001-0147-43
  it("limits a same-goal sibling to decided cohesive incoming overflow and rejects fitting additions", async () => {
    const partition = await section(TRIAGE, "### Capacity partition");
    expect(partition).toMatch(
      /Only additions exceeding an actual AC or EX scope.s remaining 99-H qualify/u,
    );
    expect(partition).toMatch(/source story, affected kind, H, remainder and requested count/u);
    expect(partition).toMatch(/leaving every published case and ID in place/u);
    expect(partition).toMatch(
      /cohesive incoming group.*capacity-checked sibling.*same BF and actual actor goal/u,
    );
    expect(partition).toMatch(
      /partition is a critical decision: the user answers it, with its affected paths, before writing/u,
    );
    expect(partition).toMatch(/truthful cohesive scope.*each criterion.s owner/u);
    expect(partition).toMatch(
      /do not invent a new product outcome, duplicate an obligation or weaken it/u,
    );
    expect(partition).toMatch(
      /different actor, goal, flow or intended behavior is its own critical decision/u,
    );
    expect(partition).toMatch(/Additions that fit the original scope do not qualify/u);
    expect(partition).toMatch(
      /A missing decision, insufficient destination capacity or no truthful partition stops the dependent write/u,
    );
    expect(partition).toMatch(
      /prospective split places new overflow cases.*existing case.*complete map/u,
    );
    expect(partition).toMatch(/decide no future specific creation, move or split/u);
    const moves =
      (await section(TRIAGE, "### Actual moves and incoming collisions")).split(
        "Two branches can take",
      )[0] ?? "";
    expect(moves).toMatch(
      /uncovered declarations, missing counted test links, changed assertions or an incomplete map stops/u,
    );

    const decomposition = await section(
      "skill/qfai-sdd/references/requirements-decomposition.md",
      "## Item size",
    );
    expect(decomposition).toMatch(
      /same actual actor goal.*same BF.*requested AC or EX additions exceed.*remaining capacity/u,
    );
    expect(decomposition).toMatch(
      /only new, cohesive incoming cases there, once the user has decided the partition/u,
    );
    expect(decomposition).toMatch(/Confirm retired-inclusive capacity before writing/u);
    expect(await section("step/sdd-story/STEP.md", "## Procedure")).toContain(
      "sdd-triage.md#capacity-partition",
    );
    expect(decomposition).toMatch(
      /invents no new product outcome and decides no future creation or move/u,
    );
  });

  // QFAI:AC-0001-0147-16
  // QFAI:EX-0001-0147-42
  // QFAI:EX-0001-0147-44
  it("requires a complete source-bound move map the user decided and preserves historical decision references", async () => {
    const moves =
      (await section(TRIAGE, "### Actual moves and incoming collisions")).split(
        "Two branches can take",
      )[0] ?? "";
    expect(moves).toMatch(
      /actual AC\/EX move the user decided or incoming collision repair.*complete one-to-one map/u,
    );
    for (const term of [
      "fixed source commit and declaration path",
      "original BF/US/AC/EX identity",
      "case meaning",
      "destination story, AC/EX IDs and paths",
      "active BR citation",
      "counted adjacent test declaration",
      "unaffected cases",
      "input, expected outcome and executable assertion",
    ]) {
      expect(moves).toContain(term);
    }
    expect(moves).toMatch(/both scopes. retired-inclusive capacity/u);
    expect(moves).toMatch(/destination EX needs one existing destination AC.*each AC needs an EX/u);
    expect(moves).toMatch(/owning BR link and counted test obligation/u);
    expect(moves).toMatch(/ID change alone proves no coverage/u);
    expect(moves).toMatch(
      /Name the old moved IDs as retired in the stage report and the commit message, and never refill them/u,
    );
    expect(moves).toMatch(
      /Inherited published DEC ID, Content and Approach cells.*old-ID references remain historical and unchanged/u,
    );
    expect(moves).toMatch(/update only the active references the move covers/u);
    expect(moves).toMatch(
      /fixed provenance and meaning.*only the provably incoming item.*without blanket replacement/u,
    );
    expect(moves).toMatch(
      /Unknown ownership, ambiguous collisions.*incomplete map stops the move without a completion claim/u,
    );
    expect(moves).toMatch(
      /manual decision and mapping procedure, not a move executor or mapping schema/u,
    );
    const scopes = await section(TRACEABILITY, "## Identifier scopes");
    expect(scopes).toMatch(
      /complete fixed-source map.*update the active indexes, contract citations and counted test references/u,
    );
    expect(scopes).toMatch(
      /Inherited DEC ID, Content and Approach cells.*historical and unchanged/u,
    );
  });
});
