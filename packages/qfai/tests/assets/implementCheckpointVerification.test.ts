import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SKILL_MD_MAX_LINES } from "../helpers/skillBudget.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped surface plus its root mirror. */
const SKILL_DIRS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement"),
  path.join(repoRoot, ".qfai/assistant/skills/qfai-implement"),
];

/** GitHub's heading slug: lowercase, drop punctuation, spaces to hyphens. */
function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function headingSlugs(markdown: string): Set<string> {
  const slugs = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (match?.[1]) {
      slugs.add(slug(match[1]));
    }
  }
  return slugs;
}

describe("qfai-implement checkpoint verification contract", () => {
  it("reaches the spec-level boundary before the all-done early exit", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");

      // The bare "all done -> nothing to do" exit skipped the per-spec boundary
      // permanently: an interrupted run, or a re-run of a complete ledger, could
      // never record it afterwards.
      expect(skill).not.toMatch(
        /^- When all items are `done`, report "nothing to do" and exit\.$/m,
      );
      expect(skill).toContain("spec-level checkpoint boundary");
      // A ledger whose last row went to `exception` is terminal too — gating the
      // recovery on "all done" left that path with no way to record the boundary.
      expect(skill).toContain("terminal (`done` or a valid `exception`)");
      expect(skill).toContain(
        "references/checkpoint-verification.md#spec-level-boundary-on-an-already-complete-ledger",
      );

      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(headingSlugs(reference)).toContain(
        "spec-level-boundary-on-an-already-complete-ledger",
      );
    }
  });

  it("resolves every same-file anchor the skill body points at", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const slugs = headingSlugs(skill);

      const anchors = Array.from(skill.matchAll(/\(see `#([a-z0-9-]+)`\)/g), (m) => m[1]);
      expect(anchors.length).toBeGreaterThan(0);
      for (const anchor of anchors) {
        expect(slugs, `${anchor} must be a heading in qfai-implement/SKILL.md`).toContain(anchor);
      }
    }
  });

  // The per-item command is FILE-SCOPED, and the earlier prescription it replaces
  // is the reason: `-t` / `-k` hand the ledger's `Selector` to a REGEX matcher, so
  // a selector in the common `TC-NNNN-NNNN (TDD-NNNN): title` shape has its
  // parentheses read as a capture group, matches nothing, reports `1 skipped` — and
  // EXITS 0. Exit code is what the surrounding procedure reads, so that failure is
  // invisible exactly where it is consumed. Hence both halves are pinned here: the
  // prescribed form is present AND the defective one is gone.
  it("prescribes the file-scoped run and demotes the name option behind its regex caveat", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("run **file-scoped, with no test-name option**");
      // The fenced command itself, EOL-agnostic so a CRLF checkout reads the same.
      expect(reference).toMatch(/```bash\r?\n\s*<test runner> <Test file>\r?\n\s*```/);
      expect(reference).not.toContain("<test runner> <Test file> -t '<Selector>'");

      // The caveat must name the MECHANISM and the SILENCE, not merely counsel
      // care: a reader told only "mind the quoting" reproduces the exit-0 skip.
      expect(reference).toContain("reads as a capture group, not as characters");
      expect(reference).toContain("**exits 0**");
      // Narrowing survives as an OPTION, with the check that makes it safe.
      expect(reference).toContain("**If you do narrow**");
      expect(reference).toContain("A skipped count is not a pass.");
    }
  });

  // `go test` selects by package, not by file: handing it a lone `*_test.go`
  // switches it into file mode and drops the rest of the package from the
  // build, so the item's test normally fails on undefined symbols. This guidance
  // SURVIVES the file-scoped prescription — only its `-run` flag left with `-t`,
  // which is why the last assertion pins the flag's absence separately.
  it("derives a package, not a file, for package-selecting runners", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**The unit of selection is not always a file.**");
      expect(reference).toContain("Package-selecting runners (`go test`) take a");
      expect(reference).toMatch(/```bash\r?\n\s*go test \.\/<dir of Test file>\r?\n\s*```/);
      expect(reference).toContain("drops the rest of the package from the build");
      expect(reference).toContain("Derive the package from the `Test file`'s directory");
      expect(reference).not.toContain("-run '<Selector>'");
    }
  });

  // The reviewers PASS before the per-item checkpoint, so a fix made because
  // the checkpoint failed is code no reviewer has judged.
  it("requires a fresh reviewer PASS after a checkpoint fix", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**A fix invalidates the reviewer PASS that preceded it.**");
      expect(reference).toContain("re-submit to every routed blocking reviewer");
      expect(reference).toContain("obtain a fresh PASS **before** re-running the command set");
      expect(reference).toContain("carrying code no reviewer ever saw");
    }
  });

  // A spec-level re-run has no "item just completed" to build step 1 from.
  it("defines a per-spec command set without the item selector", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("## Verification command set (per item)");
      expect(reference).toContain("## Verification command set (per spec)");
      expect(reference).toContain("step 1 is dropped");
    }
  });

  it("launches the CLI through npx, which is how a project dependency resolves", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      // The claim is the launcher, not the whole invocation: the command also
      // carries `--spec <spec-id>`, because this skill runs one spec at a time
      // and an unscoped checkpoint fails on a sibling's in-flight work.
      expect(reference).toContain("`npx qfai validate --profile tdd --fail-on error --spec");
      // A bare launcher exits 127 on a normal local install, failing every checkpoint.
      expect(reference).not.toMatch(/^\d+\.\s+`qfai /m);
    }
  });

  it("keeps the skill body inside its progressive-disclosure budget", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill.split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
    }
  });
});

/** `### Item completion checklist (N-point gate)` — the arity in the gate's own name. */
const GATE_HEADING = /^#{1,6}\s+Item completion checklist \((\d+)-point gate\)\s*$/;

/** Every spelling of the gate's size, wherever it is named. */
const GATE_LABEL = /(\d+)-point (?:reviewer )?gate/g;

/** Manifest comments that name the gate, relative to `assistant/`. */
const GATE_NAMING_MANIFESTS = ["manifest/agent-routing.yml", "manifest/review-profiles.yml"];

/** The arity the checklist heading claims, and the ordinals actually listed under it. */
function gateArity(skill: string): { named: number; ordinals: number[] } {
  const lines = skill.split(/\r?\n/);
  const start = lines.findIndex((line) => GATE_HEADING.test(line));
  if (start === -1) {
    return { named: 0, ordinals: [] };
  }
  const named = Number(GATE_HEADING.exec(lines[start] ?? "")?.[1]);
  const ordinals: number[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) {
      break;
    }
    const ordinal = /^(\d+)\.\s/.exec(line);
    if (ordinal?.[1]) {
      ordinals.push(Number(ordinal[1]));
    }
  }
  return { named, ordinals };
}

/** Absolute paths of every prose/manifest file in the skill directory. */
async function gateNamingFiles(skillDir: string): Promise<string[]> {
  const entries = await readdir(skillDir, { recursive: true });
  return entries.filter((entry) => /\.(md|ya?ml)$/.test(entry)).map((e) => path.join(skillDir, e));
}

describe("qfai-implement gate arity naming", () => {
  // The twelfth item was inserted without renaming the gate, so nine lines went
  // on calling it the 11-point gate. Counting the list is the only check that
  // does not itself have to be kept in sync by hand.
  it("names the gate by the number of items it actually has, everywhere", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const { named, ordinals } = gateArity(skill);

      expect(named).toBeGreaterThan(0);
      expect(ordinals).toEqual(Array.from({ length: named }, (_, index) => index + 1));

      const assistant = path.resolve(dir, "..", "..");
      const files = [
        ...(await gateNamingFiles(dir)),
        ...GATE_NAMING_MANIFESTS.map((rel) => path.join(assistant, rel)),
      ];
      for (const file of files) {
        const content = await readFile(file, "utf-8");
        for (const [label, arity] of content.matchAll(GATE_LABEL)) {
          const where = `${path.relative(repoRoot, file)} calls it the ${label}`;
          expect(Number(arity), where).toBe(named);
        }
      }
    }
  });

  // Item 11 was not deleted, it means something else now: a citation left on the
  // old ordinal resolves to the reviewer-verdict append and looks satisfied, so
  // the checkpoint the sentence exists to require is never located in the gate.
  it("cites checkpoint verification by the item that carries it, not the one it displaced", async () => {
    const citing = ["references/volume-policy.md", "references/relevant-test-suite.md"];
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const { named } = gateArity(skill);
      const last = `${named}. Checkpoint verification passed`;
      const lines = skill.split(/\r?\n/);
      expect(
        lines.some((line) => line.startsWith(last)),
        `gate item ${named} is "${last}"`,
      ).toBe(true);

      for (const rel of citing) {
        const content = await readFile(path.join(dir, rel), "utf-8");
        expect(content).toContain("`SKILL.md#checkpoint-verification`");
        expect(content).toContain(`item ${named} of the ${named}-point gate`);
        expect(content, `${rel} cites the pre-insertion ordinal`).not.toMatch(/\bitem 11\b/);
      }
    }
  });
});
