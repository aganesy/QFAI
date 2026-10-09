import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { VISUAL_BROWSER_SURFACES } from "../../src/core/detection/surfaceType.js";
import { CANONICAL_REQUIRED_SIDECAR_FILES } from "../../src/core/validators/uix/threeLayer.js";
import { readDiscussionSkill, readDiscussionStep } from "../helpers/discussionSteps.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateBase = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
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
const skillPath = path.join(templateBase, "SKILL.md");
const uiuxTemplateDir = path.join(templateBase, "templates", "uiux");
const completionMatrixPath = path.join(
  templateBase,
  "references",
  "discussion-completion-matrix.md",
);
const uiBearingPlaybookPath = path.join(templateBase, "references", "ui-bearing-playbook.md");

// Shared vocabulary between the matrix and the Reviewer Gate templates. The
// matrix wraps the phrase across two lines, so match on whitespace not a space.
const EXPLORATION_REFERENCE_PHRASE =
  /competitor references\s+framed as \*\*deviate-from\*\* inputs/i;

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

describe("discussion skill template integration", () => {
  it("the uiux template directory has screen-level sidecars", async () => {
    const files = await readdir(uiuxTemplateDir);
    expect(files).toContain("40_screen_contracts.md");
    expect(files).toContain("50_review_input_bundle.md");
  });

  it("SKILL.md requires the brand SSOT for UI-bearing completion", async () => {
    const content = await readFile(skillPath, "utf-8");
    expect(content).toMatch(/DESIGN\.md/);
    expect(content).toMatch(/40_screen_contracts\.md/);
    expect(content).toMatch(/50_review_input_bundle\.md/);
  });

  // QFAI:AC-0001-0016-01
  // QFAI:EX-0001-0016-01
  it("completes a UI-bearing pack with the brand theme recorded and the explorations unranked", async () => {
    const matrix = (await readFile(completionMatrixPath, "utf-8")).replace(/\s+/g, " ");
    const context = await readFile(path.join(templateBase, "templates", "01_Context.md"), "utf-8");
    expect(matrix).toMatch(
      /exploration directions are carried unranked — no single screen exploration is selected and the design system is not finalized here/i,
    );
    expect(matrix).toMatch(
      /`01_Context\.md#Design Direction` names an adopted theme, what departs from it, and what stays ordinary/,
    );
    expect(context).toMatch(/^## Design Direction$/m);
    expect(context).toMatch(/^- adopted_theme: /m);
    expect(context).toMatch(/^- brand_accent: /m);
    expect(context).toMatch(/^- conventions_kept: /m);
    expect(context).toMatch(/^- chosen_by: \[user\|assumption\]$/m);
  });

  // QFAI:AC-0001-0082-01
  // QFAI:EX-0001-0082-01
  it("gives a rejected direction its reason and recurrence cue in 04_Sources.md", async () => {
    const sources = await readFile(path.join(templateBase, "templates", "04_Sources.md"), "utf-8");
    const section = sources.split(/^## /m).find((part) => part.startsWith("Design Anti-Goals"));
    expect(section).toBeDefined();
    expect(section?.replace(/\s+/g, " ")).toMatch(
      /record each rejected direction with its reason and a concrete cue that would show it recurring in a prototype/i,
    );
    expect(section).toMatch(
      /^\| Rejected direction \| Rejection reason \| Recurrence cue \| Source or decision \| Status\s*\|$/m,
    );
    const step = (await readDiscussionStep(assistantBase, "discussion-pack")).replace(/\s+/g, " ");
    expect(step).toMatch(
      /record each rejected direction, why it was rejected, a concrete cue for its recurrence, and its decision or source/i,
    );
    expect(step).toMatch(
      /any rejected direction with a reason and recurrence cue\. No `missing` row passes/,
    );
  });

  // SKILL.md is the only file the skill is guaranteed to load; references are
  // opt-in. If its family list drops a member of
  // `threeLayer.ts#CANONICAL_REQUIRED_SIDECAR_FILES`, an operator builds a
  // `uiux/` that the completeness gate cannot flag and the Reviewer Gate then
  // demands a file nobody was told to create.
  it("the canonical sidecar family in SKILL.md matches the validator SSOT", async () => {
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

  // `cli` is discussion UI-bearing, but `/qfai-prototyping` rejects it, and the
  // prototyping loop's DESIGN.md drift scanner is the only reader of the
  // `visual.*` token values. Requiring a `cli` pack to author the token tree
  // therefore blocks completion on an artifact nothing downstream reads.
  it("a cli pack is not blocked from completing by the root DESIGN.md visual token tree", async () => {
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
    expect(cliSection).toMatch(/no root `DESIGN\.md`/i);
    const uiBearingConditions = collectOrderedList(
      matrix.split(/^## /m).find((section) => section.startsWith("UI-bearing Packs")) ?? "",
    );
    expect(uiBearingConditions).toMatch(/Visual-prototyping surfaces/i);

    // The skill and its steps state the same requirement independently; if they
    // still demand brand answers from every UI-bearing pack the carve-out is
    // unreachable.
    const skill = await readDiscussionSkill(assistantBase);
    expect(skill).toMatch(/`common-design-md` step writes no `DESIGN\.md`/);
    expect(skill).toMatch(/the brand questions do not apply to it/);
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
  // QFAI:EX-0001-0087-03
  it("the DESIGN.md carve-out also counts secondary_surfaces", async () => {
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
  it("the generated 00_index.md does not require DESIGN.md of a cli-only pack", async () => {
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

  // Root DESIGN.md is written by `/qfai-sdd` after discussion ends.
  // A discussion review line that asks for it can be satisfied by no pack at
  // all, so the gates check the direction record the pack does produce.
  it("the review bundle looks at the recorded design direction, not DESIGN.md", async () => {
    const gatePaths = [path.join(uiuxTemplateDir, "50_review_input_bundle.md")];
    for (const gatePath of gatePaths) {
      const body = await readFile(gatePath, "utf-8");
      const name = path.basename(gatePath);
      const checklist = body.split("\n").filter((line) => /^[-|]/.test(line));

      // The positive half: dropping the brand lines outright would leave the
      // pack's own design record unreviewed, and this test passing. The line
      // also has to name a surface, since a cli-only pack records none.
      const directionLines = checklist.filter(
        (line) =>
          line.includes("04_Sources.md") && /cli-only|visual-prototyping|UI-bearing/i.test(line),
      );
      expect(directionLines.length, `${name} reviews no design direction`).toBeGreaterThan(0);

      // The negative half: no line may demand the artifact itself.
      for (const line of checklist) {
        expect(line, `${name}: discussion gate still requires DESIGN.md -> ${line}`).not.toContain(
          "DESIGN.md",
        );
      }
    }
  });

  // `templates/prototyping.yaml` and `qfai-prototyping/SKILL.md` both reject
  // `cli` as an execution surface, so discussion must not hand a cli pack a
  // recommendation the next skill refuses to run.
  it("does not make a cli pack generate prototyping.yaml", async () => {
    const skill = await readDiscussionSkill(assistantBase);
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

  // `screenContract.ts` requires a non-empty `route`, never a URL. Telling
  // native mobile/desktop authors that a web path is "expected" pushes them to
  // invent one for a product that has no URLs at all.
  it("40_screen_contracts.md defines the meaning of the route per surface", async () => {
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

  it("09_Constraints.md references accessibility at the right level", async () => {
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

  // The completion matrix carries the current UI family.
  it("the completion matrix requires the current UI family", async () => {
    const matrix = await readFile(completionMatrixPath, "utf-8");
    const uiBearingSection = matrix
      .split(/^## /m)
      .find((section) => section.startsWith("UI-bearing Packs"));
    expect(uiBearingSection).toBeDefined();
    const matrixConditions = collectOrderedList(uiBearingSection ?? "");
    expect(matrixConditions).not.toBe("");
    expect(matrixConditions).toMatch(/DESIGN\.md/);
    expect(matrixConditions).toMatch(/40_screen_contracts\.md/);
    expect(matrixConditions).toMatch(/50_review_input_bundle\.md/);
    expect(matrixConditions).toMatch(/unranked/i);
    expect(matrixConditions).toMatch(EXPLORATION_REFERENCE_PHRASE);
  });
});

describe("the screen-contract template names only the user's brand direction", () => {
  it("ranks no exploration, and every direction it names is the one in 01_Context.md", async () => {
    const template = await readFile(path.join(uiuxTemplateDir, "40_screen_contracts.md"), "utf-8");
    expect(template).not.toMatch(/\b(selected|winner|finali[sz]ed?)\b/i);
    const named = template.split("\n").filter((line) => /direction/i.test(line));
    expect(named.length).toBeGreaterThan(0);
    for (const line of named) {
      expect(line, `a direction other than the user's brand direction: ${line}`).toMatch(
        /01_Context\.md#Design Direction/,
      );
    }
    expect(template).toContain(
      "Reference registries (product intent, brand signals, anti-goals): `../04_Sources.md`",
    );
  });
});
