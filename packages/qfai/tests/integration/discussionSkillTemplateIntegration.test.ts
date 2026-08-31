import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { VISUAL_BROWSER_SURFACES } from "../../src/core/detection/surfaceType.js";
import {
  CANONICAL_REQUIRED_SIDECAR_FILES,
  FORBIDDEN_LEGACY_PATTERNS,
} from "../../src/core/validators/uix/threeLayer.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateBase = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
);
const assistantBase = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
);
const agentsDir = path.join(assistantBase, "agents");
const agentCatalogPath = path.join(assistantBase, "manifest", "agent-catalog.yml");
const skillPath = path.join(templateBase, "SKILL.md");
const uiuxTemplateDir = path.join(templateBase, "templates", "uiux");
const completionMatrixPath = path.join(
  templateBase,
  "references",
  "discussion-completion-matrix.md",
);
const uiBearingPlaybookPath = path.join(templateBase, "references", "ui-bearing-playbook.md");
const sddExecutionPlaybookPath = path.join(
  repoRoot,
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-execution-playbook.md",
);

// Shared vocabulary between the matrix and the Reviewer Gate templates. The
// matrix wraps the phrase across two lines, so match on whitespace not a space.
const EXPLORATION_REFERENCE_PHRASE =
  /exploration references\s+framed as \*\*deviate-from\*\* inputs/i;

// The retired completion conditions the matrix used to carry. The matrix body
// still names these sidecars to declare them forbidden, so their presence is
// only a regression when they come back as numbered completion conditions.
const RETIRED_COMPLETION_CONDITIONS = [
  /Strategy selected/i,
  /taste interview/i,
  /3-layer scoring/i,
  /Dynamic overrides/i,
  /Option comparison/i,
  /Selected anchor/i,
];

/** Extract the ordered list that follows the first `1. ` line of a section. */
function collectOrderedList(section: string): string {
  const lines = section.split("\n");
  const start = lines.findIndex((line) => /^1\. /.test(line));
  if (start === -1) {
    return "";
  }
  const collected: string[] = [];
  for (const line of lines.slice(start)) {
    if (!/^\d+\. /.test(line) && !/^\s{2,}\S/.test(line)) {
      break;
    }
    collected.push(line);
  }
  return collected.join("\n");
}

// `FORBIDDEN_LEGACY_PATTERNS` is a regex list, so it cannot be searched for in
// prose; these are the concrete filenames that stand in for it. The coverage
// case below fails if the validator grows a pattern with no representative
// here, which is what previously let the sweep fall behind the SSOT.
const FORBIDDEN_SIDECAR_NAMES = [
  "10_implementation_strategy.md",
  "11_design_taste_interview.md",
  "12_design_system.md",
  "20_design_eval_invariant.md",
  "30_option_comparison.md",
  "31_selected_anchor_screen.md",
  "33_exploration_rubric.md",
  "34_evaluator_calibration.md",
  "40_contracts.md",
  "50_review_bundle.md",
  "60_critique_loop.md",
];

// Prose shorthand the templates used to carry for the retired 20–24 family.
// Not a filename, so it is deliberately outside the coverage check.
const FORBIDDEN_RANGE_MENTIONS = ["uiux/20-24"];

// The retired concepts themselves, matched by phrase. `FORBIDDEN_SIDECAR_NAMES`
// only sees a filename, so an instruction that reasons against a retired
// artifact without naming its file — "Include only when it materially clarifies
// the selected anchor" — passes the name sweep untouched while still sending the
// author after a pack the skill is forbidden to contain. A retired concept is a
// live trap wherever it appears, so these run over the same tree.
const RETIRED_CONCEPT_PATTERNS = [
  /taste[ _-]interview/i,
  /3-layer evaluation/i,
  /option[ _-]comparison/i,
  /selected[ _-]anchor/i,
];

describe("discussion skill template integration", () => {
  it("uiux template directory が screen-level sidecars を持つ", async () => {
    const files = await readdir(uiuxTemplateDir);
    expect(files).toContain("40_screen_contracts.md");
    expect(files).toContain("50_review_input_bundle.md");
    // Brand-level inputs moved to root DESIGN.md; rubric/calibration
    // sidecars previously removed.
    expect(files).not.toContain("33_exploration_rubric.md");
    expect(files).not.toContain("34_evaluator_calibration.md");
  });

  it("SKILL.md の UI-bearing completion が brand SSOT を要求している", async () => {
    const content = await readFile(skillPath, "utf-8");
    expect(content).toMatch(/DESIGN\.md/);
    expect(content).toMatch(/40_screen_contracts\.md/);
    expect(content).toMatch(/50_review_input_bundle\.md/);
  });

  // SKILL.md is the only file the skill is guaranteed to load; references are
  // opt-in. If its family list drops a member of
  // `threeLayer.ts#CANONICAL_REQUIRED_SIDECAR_FILES`, an operator builds a
  // `uiux/` that the completeness gate cannot flag and the Reviewer Gate then
  // demands a file nobody was told to create.
  it("SKILL.md の canonical sidecar family が validator の SSOT と一致している", async () => {
    const content = await readFile(skillPath, "utf-8");

    const familySection = content
      .split(/^## /m)
      .find((section) => section.startsWith("UI-bearing Canonical Sidecar Family"));
    expect(familySection).toBeDefined();
    for (const file of CANONICAL_REQUIRED_SIDECAR_FILES) {
      expect(familySection, `family section omits ${file}`).toContain(`uiux/${file}`);
    }

    // The `project_memory` restatement survives context compaction, so it must
    // carry the same family as the prose above it.
    const projectMemory = content.split(/^project_memory:$/m)[1];
    expect(projectMemory).toBeDefined();
    const memoryLine = (projectMemory ?? "")
      .split("\n")
      .find((line) => line.includes("UI-bearing sidecar family"));
    expect(memoryLine).toBeDefined();
    for (const file of CANONICAL_REQUIRED_SIDECAR_FILES) {
      expect(memoryLine, `project_memory omits ${file}`).toContain(file);
    }
  });

  it("forbidden sidecar 名の一覧が validator の SSOT を網羅している", () => {
    // Ties the list above to the validator: a pattern added to
    // FORBIDDEN_LEGACY_PATTERNS without a representative filename here would
    // otherwise leave the sweep below blind to that whole family.
    for (const pattern of FORBIDDEN_LEGACY_PATTERNS) {
      expect(
        FORBIDDEN_SIDECAR_NAMES.some((name) => pattern.test(name)),
        `no representative filename covers ${pattern}`,
      ).toBe(true);
    }
  });

  // The shipped skill must not tell an agent to produce a sidecar that
  // `validators/uix/threeLayer.ts#FORBIDDEN_LEGACY_PATTERNS` rejects.
  // Following such guidance creates the file and then fails validation,
  // so a stale instruction anywhere in the tree is a live trap — the
  // sweep therefore covers references/ and templates/, not just SKILL.md.
  it("配布 skill が forbidden legacy sidecar の生成を指示していない", async () => {
    const forbiddenMentions = [...FORBIDDEN_SIDECAR_NAMES, ...FORBIDDEN_RANGE_MENTIONS];
    // Four files name them on purpose: `00_index.md` is the
    // forbidden-legacy manifest, `ui_ux_best_practices.md` carries the
    // explicit "do NOT create" warning, `discussion-completion-matrix.md`
    // declares the sidecars neither required nor permitted, and
    // `ui-bearing-playbook.md` records the removal. Everywhere else a
    // mention is an instruction to generate.
    const allowNamingFiles = new Set([
      "00_index.md",
      "ui_ux_best_practices.md",
      "ui-bearing-playbook.md",
      "discussion-completion-matrix.md",
    ]);
    const offenders: string[] = [];
    for (const file of await collectMarkdownFiles(templateBase)) {
      if (allowNamingFiles.has(path.basename(file))) continue;
      const content = await readFile(file, "utf-8");
      const label = path.relative(templateBase, file).replace(/\\/g, "/");
      for (const mention of forbiddenMentions) {
        if (content.includes(mention)) {
          offenders.push(`${label} → ${mention}`);
        }
      }
      for (const pattern of RETIRED_CONCEPT_PATTERNS) {
        if (pattern.test(content)) {
          offenders.push(`${label} → ${pattern.source}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // The same residue on a different shipped surface: an agent definition that
  // tells a reviewer to reconcile a `selected anchor` sidecar sends it after an
  // artifact `ui_ux_best_practices.md` forbids the pack from containing.
  it("配布 agent 定義が retired discussion concept を参照していない", async () => {
    const files = [...(await collectMarkdownFiles(agentsDir)), agentCatalogPath];
    const offenders: string[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf-8");
      const label = path.relative(assistantBase, file).replace(/\\/g, "/");
      for (const pattern of RETIRED_CONCEPT_PATTERNS) {
        if (pattern.test(content)) {
          offenders.push(`${label} → ${pattern.source}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // `cli` is discussion UI-bearing, but `/qfai-prototyping` rejects it, and the
  // prototyping loop's DESIGN.md drift scanner is the only reader of the
  // `visual.*` token values. Requiring a `cli` pack to author the token tree
  // therefore blocks completion on an artifact nothing downstream reads.
  it("cli pack が root DESIGN.md の visual token tree で完了をブロックされない", async () => {
    const playbook = await readFile(uiBearingPlaybookPath, "utf-8");
    const surfaceRow = (surface: string): string =>
      playbook.split("\n").find((line) => new RegExp(`^\\|\\s*${surface}\\s+\\|`).test(line)) ?? "";

    // The surfaces prototyping actually executes keep the full family. Tied to
    // the code SSOT so a surface added there cannot silently skip this doc.
    for (const surface of VISUAL_BROWSER_SURFACES) {
      expect(surfaceRow(surface), `no Surface Mapping row for '${surface}'`).toMatch(
        /Generate full uiux sidecar family/,
      );
    }

    // `cli` stays UI-bearing but gets its own outcome. It must still name all
    // three canonical sidecars: completion condition 3 and the Reviewer Gate
    // require the whole family from `cli` too, so a row that reads
    // "screen contracts only" sends the pack back for the two it skipped.
    const cliRow = surfaceRow("cli");
    expect(cliRow).toMatch(/\|\s*Yes\s*\|/);
    expect(cliRow).not.toMatch(/Generate full uiux sidecar family/);
    expect(cliRow).toMatch(/no root `DESIGN\.md`/i);
    for (const sidecar of ["00_index.md", "40_screen_contracts.md", "50_review_input_bundle.md"]) {
      expect(cliRow, `cli Surface Mapping row omits ${sidecar}`).toContain(sidecar);
    }

    // The completion matrix must carry the matching carve-out, or the pack is
    // still blocked by condition 1 no matter what the playbook says.
    const matrix = await readFile(completionMatrixPath, "utf-8");
    const cliSection = matrix.split(/^## /m).find((section) => section.startsWith("CLI Packs"));
    expect(cliSection).toBeDefined();
    expect(cliSection).toMatch(/No root `DESIGN\.md` required/i);
    const uiBearingConditions = collectOrderedList(
      matrix.split(/^## /m).find((section) => section.startsWith("UI-bearing Packs")) ?? "",
    );
    expect(uiBearingConditions).toMatch(/Visual-prototyping surfaces/i);

    // SKILL.md states the same requirement independently; if it still demands
    // root DESIGN.md for every UI-bearing pack the carve-out is unreachable.
    const skill = await readFile(skillPath, "utf-8");
    expect(skill).toMatch(/Root `DESIGN\.md` is required only on the visual-prototyping surfaces/);
    expect(skill).toMatch(/skip for cli-only and non-ui targets/);

    // `route` remains a required field for every surface
    // (`validators/uix/screenContract.ts#REQUIRED_FIELDS`), so the template must
    // re-scope it for cli rather than telling authors to drop it.
    const screenContracts = await readFile(
      path.join(uiuxTemplateDir, "40_screen_contracts.md"),
      "utf-8",
    );
    expect(screenContracts).toMatch(/^- route:/m);
    expect(screenContracts).toMatch(/`route:` is required on every surface/);
    expect(screenContracts).toMatch(/command invocation/i);
  });

  // `primary_surface: cli` with `secondary_surfaces: [web]` is a valid
  // classification (`detection/surfaceType.ts#readValidatedClassificationBlock`),
  // and it still ships a visual surface. A carve-out written against
  // `primary_surface` alone would drop the token SSOT for that product.
  it("DESIGN.md carve-out が secondary_surfaces も判定に含めている", async () => {
    const skill = await readFile(skillPath, "utf-8");
    const playbook = await readFile(uiBearingPlaybookPath, "utf-8");
    const matrix = await readFile(completionMatrixPath, "utf-8");
    const context = await readFile(path.join(templateBase, "templates", "01_Context.md"), "utf-8");

    for (const [name, body] of [
      ["SKILL.md", skill],
      ["ui-bearing-playbook.md", playbook],
      ["discussion-completion-matrix.md", matrix],
      ["01_Context.md", context],
    ] as const) {
      expect(body, `${name} scopes the carve-out to a cli-only pack`).toMatch(/cli-only/);
      expect(body, `${name} names secondary_surfaces in the decision`).toMatch(
        /secondary_surfaces/,
      );
    }

    // The playbook is the reference the other three defer to, so it has to
    // state the rule outright, not merely mention the field.
    expect(playbook).toMatch(/`primary_surface: cli` with `secondary_surfaces: \[web\]`/);
  });

  // The canonical `uiux/00_index.md` is copied into every UI-bearing pack and
  // declares the family's own completeness rule. Left unconditional it tells
  // the generated pack that root DESIGN.md must sit beside the three sidecars,
  // which contradicts the carve-out the same run just applied.
  it("生成される 00_index.md が cli-only pack に DESIGN.md を要求しない", async () => {
    const index = await readFile(path.join(uiuxTemplateDir, "00_index.md"), "utf-8");
    const completeness = index.split(/^## /m).find((s) => s.startsWith("Completeness Rule")) ?? "";
    expect(completeness, "no Completeness Rule section").not.toBe("");
    expect(completeness).toMatch(/cli-only/);
    // Every DESIGN.md mention in the manifest must be scoped, not absolute.
    for (const line of index.split("\n").filter((line) => line.includes("DESIGN.md"))) {
      expect(line, `unconditional DESIGN.md requirement -> ${line}`).not.toMatch(
        /MUST be present .*alongside root `DESIGN\.md`/,
      );
    }
  });

  // A cli-only pack finishes SDD and enters `/qfai-implement`, whose Visual
  // Review Guard read order lists root DESIGN.md, its lock, design-system.yaml
  // and prototype-handoff.yaml. None of those exist for a cli-only target, so
  // the guard must name the reduced read order or implementation is blocked on
  // inputs this carve-out guarantees will never be produced.
  it("qfai-implement の Visual Review Guard が cli-only の read order を持つ", async () => {
    const implementSkill = await readFile(
      path.join(
        repoRoot,
        "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md",
      ),
      "utf-8",
    );
    const guard =
      implementSkill.split(/^## /m).find((s) => s.startsWith("Visual Review Guard")) ?? "";
    expect(guard, "no Visual Review Guard section").not.toBe("");
    expect(guard).toMatch(/cli-only/);
    expect(guard).toMatch(/`\.qfai\/contracts\/ui\/\*\.yaml`/);
  });

  // `/qfai-implement` takes ONE spec from an argument or the queue, while
  // `.qfai/state.json#discussion.currentId` is repository-wide. Deciding
  // cli-only from the active pointer alone would strip a web spec of its
  // DESIGN.md / lock / prototype inputs whenever someone left the pointer on a
  // CLI pack — and demand them of a CLI spec whenever it points at a web pack.
  it("qfai-implement の cli-only 判定が実装対象 spec の provenance に紐づく", async () => {
    const implementSkill = await readFile(
      path.join(
        repoRoot,
        "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md",
      ),
      "utf-8",
    );
    const guard =
      implementSkill.split(/^## /m).find((s) => s.startsWith("Visual Review Guard")) ?? "";
    expect(guard, "the cli-only test is not scoped to one spec").toMatch(/per implemented spec/i);
    // The persisted spec -> pack correspondence is the `Source:` provenance the
    // spec templates carry, not the runtime pointer.
    expect(guard).toMatch(/02_User-stories\.md/);
    expect(guard).toMatch(/Source: discussion-/);
  });

  // `/qfai-prototyping` rejects `cli`, so a cli item can never produce the
  // prototype the parity gate compares against. Left unscoped, the completion
  // checklist makes every cli UI-affecting row permanently un-`done`-able.
  it("qfai-implement の parity gate が cli を prototype 比較から外している", async () => {
    const implementSkill = await readFile(
      path.join(
        repoRoot,
        "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md",
      ),
      "utf-8",
    );
    const parityLines = implementSkill
      .split("\n")
      .filter((line) => /product-surface-reviewer/.test(line) && /parity/i.test(line));
    expect(parityLines.length, "no product-surface-reviewer parity line").toBeGreaterThan(0);
    for (const line of parityLines) {
      expect(line, `unconditional prototype parity gate -> ${line}`).toMatch(/cli-only/);
    }
  });

  // Half a carve-out is worse than none: if the Reviewer Gate still demands a
  // root DESIGN.md from `cli`, the pack discussion just exempted is bounced at
  // review instead of at completion.
  it("Reviewer Gate と review bundle が cli pack を DESIGN.md 要求から外している", async () => {
    const gatePaths = [
      path.join(templateBase, "templates", "14_Review-Request.md"),
      path.join(templateBase, "templates", "review", "review_request.md"),
      path.join(templateBase, "templates", "review", "Rxx_reviewer.md"),
      path.join(uiuxTemplateDir, "50_review_input_bundle.md"),
    ];
    for (const gatePath of gatePaths) {
      const body = await readFile(gatePath, "utf-8");
      const name = path.basename(gatePath);
      // Every DESIGN.md-bearing checklist line must carry the exemption.
      const designLines = body
        .split("\n")
        .filter((line) => /^[-|]/.test(line) && line.includes("DESIGN.md"));
      expect(designLines.length, `${name} has no DESIGN.md checklist line`).toBeGreaterThan(0);
      for (const line of designLines) {
        expect(line, `${name}: unconditional DESIGN.md requirement -> ${line}`).toMatch(
          /cli-only|visual-prototyping/i,
        );
      }
    }
  });

  // `templates/prototyping.yaml` and `qfai-prototyping/SKILL.md` both reject
  // `cli` as an execution surface, so discussion must not hand a cli pack a
  // recommendation the next skill refuses to run.
  it("cli pack に prototyping.yaml を生成させない", async () => {
    const skill = await readFile(skillPath, "utf-8");
    const context = await readFile(path.join(templateBase, "templates", "01_Context.md"), "utf-8");
    const prototypingYaml = await readFile(
      path.join(templateBase, "templates", "prototyping.yaml"),
      "utf-8",
    );

    // The shipped yaml is the SSOT for the valid execution-surface set.
    expect(prototypingYaml).toMatch(/web \| mobile \| desktop \| mixed/);
    expect(prototypingYaml).toMatch(/not valid prototyping execution surfaces/);

    // The classification note must not advertise `cli` as one of them.
    const surfaceNote = context
      .split("\n")
      .find((line) => line.includes("prototyping.yaml") && line.includes("subset"));
    expect(surfaceNote, "01_Context.md lost its prototyping-surface note").toBeDefined();
    expect(surfaceNote).toMatch(/`web\|mobile\|desktop\|mixed`/);
    expect(surfaceNote).not.toMatch(/`web\|mobile\|desktop\|cli\|mixed`/);

    const generationStep = skill
      .split("\n")
      .find((line) => /^\d+\. Generate `prototyping\.yaml`/.test(line));
    expect(generationStep, "SKILL.md lost its prototyping.yaml step").toBeDefined();
    expect(generationStep).toMatch(/cli-only pack emits none/);
  });

  // A cli-only pack deliberately emits no `prototyping.yaml`, so the next
  // stage must not stop on its absence. `/qfai-sdd` Stage 0 is the first thing
  // that pack meets after discussion completes — an unconditional stop there
  // simply moves the blocker one skill downstream.
  it("SDD Stage 0 preflight が cli-only pack に prototyping.yaml を要求しない", async () => {
    const playbook = await readFile(sddExecutionPlaybookPath, "utf-8");
    const stageZero = playbook.split(/^## /m).find((s) => s.startsWith("Stage 0: Preflight")) ?? "";
    expect(stageZero, "no Stage 0: Preflight section").not.toBe("");
    expect(stageZero).toMatch(/prototyping\.yaml/);
    // The stop condition survives — but only for the surfaces that produce the
    // file. `VISUAL_BROWSER_SURFACES` is the code SSOT for that set.
    expect(stageZero).toMatch(/visual-prototyping/i);
    for (const surface of VISUAL_BROWSER_SURFACES) {
      expect(stageZero, `Stage 0 does not name the '${surface}' surface`).toContain(
        `\`${surface}\``,
      );
    }
    expect(stageZero).toMatch(/cli-only/);
  });

  // `screenContract.ts` requires a non-empty `route`, never a URL. Telling
  // native mobile/desktop authors that a web path is "expected" pushes them to
  // invent one for a product that has no URLs at all.
  it("40_screen_contracts.md が surface ごとの route の意味を定義している", async () => {
    const screenContracts = await readFile(
      path.join(uiuxTemplateDir, "40_screen_contracts.md"),
      "utf-8",
    );
    expect(screenContracts).toMatch(/`route:` is required on every surface/);
    // Every classification surface that can carry a screen gets its own row.
    for (const surface of ["web", "mobile", "desktop", "cli", "mixed"]) {
      expect(screenContracts, `no route row for '${surface}'`).toMatch(
        new RegExp(`^\\|\\s*\`${surface}\``, "m"),
      );
    }
    expect(screenContracts).toMatch(/deep link/i);
    expect(screenContracts).toMatch(/navigation destination/i);
    expect(screenContracts).toMatch(/command invocation/i);
    // Native surfaces must not be lumped in with the web-path expectation.
    expect(screenContracts).not.toMatch(
      /a web path is only expected on the\s+visual-prototyping surfaces/,
    );
  });

  it("09_Constraints.md が accessibility を正しい階層で参照している", async () => {
    // `accessibility` is a TOP-LEVEL DESIGN.md key. `visual` rejects
    // unknown keys, so an author who followed a `visual.accessibility`
    // pointer would write a file that fails to parse.
    const content = await readFile(
      path.join(templateBase, "templates", "09_Constraints.md"),
      "utf-8",
    );
    expect(content).not.toMatch(/visual\.accessibility/);
    expect(content).toMatch(/accessibility/);
  });

  // The Reviewer Gate templates and the completion matrix are two halves of the
  // same UI-bearing exit condition. When they disagree, a pack that satisfies
  // the matrix is sent back by the reviewer, and a pack that satisfies the
  // reviewer fails the forbidden-sidecar check — the UI-bearing pack cannot be
  // completed at all.
  it("review テンプレートが completion matrix と同じ UI ファミリーを要求している", async () => {
    const reviewDir = path.join(templateBase, "templates", "review");

    // Half one: the matrix itself must still carry the current UI family and
    // must not have regrown any retired completion condition.
    const matrix = await readFile(completionMatrixPath, "utf-8");
    const uiBearingSection = matrix
      .split(/^## /m)
      .find((section) => section.startsWith("UI-bearing Packs"));
    expect(uiBearingSection).toBeDefined();
    const matrixConditions = collectOrderedList(uiBearingSection ?? "");
    expect(matrixConditions).not.toBe("");
    for (const pattern of RETIRED_COMPLETION_CONDITIONS) {
      expect(matrixConditions).not.toMatch(pattern);
    }
    expect(matrixConditions).toMatch(/DESIGN\.md/);
    expect(matrixConditions).toMatch(/40_screen_contracts\.md/);
    expect(matrixConditions).toMatch(/50_review_input_bundle\.md/);
    expect(matrixConditions).toMatch(/unranked/i);
    expect(matrixConditions).toMatch(/forbidden legacy sidecar/i);
    expect(matrixConditions).toMatch(EXPLORATION_REFERENCE_PHRASE);

    // Half two: the Reviewer Gate templates must demand the same family in the
    // same words, so neither half can send back a pack the other accepts.
    for (const fileName of ["review_request.md", "Rxx_reviewer.md"]) {
      const content = await readFile(path.join(reviewDir, fileName), "utf-8");
      for (const pattern of RETIRED_CONCEPT_PATTERNS) {
        expect(content).not.toMatch(pattern);
      }
      expect(content).toMatch(/DESIGN\.md/);
      expect(content).toMatch(/unranked/i);
      expect(content).toMatch(/canonical `uiux\/` family/i);
      expect(content).toMatch(/forbidden legacy sidecar/i);
      expect(content).toMatch(EXPLORATION_REFERENCE_PHRASE);
    }
  });
});

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectMarkdownFiles(full)));
    } else if (entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}
