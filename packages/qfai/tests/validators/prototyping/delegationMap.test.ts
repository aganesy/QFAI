/**
 * Tests for delegationMap role validator.
 *
 * v1.8.4: validateDelegationMapIssues is the standard `Issue[]` adapter.
 *
 * spec-0012 TC-0012-0286 / AC-0012-0171
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  PROTOTYPING_REQUIRED_ROLE_IDS,
  SHIPPED_DELEGATION_SCOPE_TABLE,
  resolveDelegationScope,
} from "../../../src/core/prototyping/policy.js";
import {
  validateDelegationMapIssues,
  validatePrototypingDelegationMap,
} from "../../../src/core/validators/prototyping/delegationMap.js";

const PROTO_JSON_REL_SSOT = ".qfai/evidence/prototyping/prototyping.json";

describe("validateDelegationMapIssues (v1.8.4 standard adapter)", () => {
  const path = ".qfai/evidence/prototyping/prototyping.json";

  it("returns empty when delegationMap is undefined", () => {
    expect(validateDelegationMapIssues(undefined, path)).toEqual([]);
  });

  it("returns empty when all categories are mapped to allowed roles", () => {
    const map = {
      UI実装: "frontend-engineer",
      スクリーンショット: "devops-ci-engineer",
      評価スコアリング: "product-surface-reviewer",
      ビルド: "backend-engineer",
    };
    expect(validateDelegationMapIssues(map, path)).toEqual([]);
  });

  it("emits QFAI-PROT-311 (error, canonical) for an invalid role", () => {
    const map = { UI実装: "qa-gatekeeper" }; // qa-gatekeeper is not allowed for UI実装
    const issues = validateDelegationMapIssues(map, path);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-311");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.category).toBe("canonical");
    expect(issues[0]?.file).toBe(path);
    expect(issues[0]?.message).toMatch(/UI実装/);
    expect(issues[0]?.message).toMatch(/qa-gatekeeper/);
    expect(issues[0]?.suggested_action).toMatch(/frontend-engineer/);
  });

  it("ignores unknown categories (out of scope of this validator)", () => {
    const map = { 未知カテゴリ: "frontend-engineer" };
    expect(validateDelegationMapIssues(map, path)).toEqual([]);
  });

  it("does not treat prototype-chain keys as known categories", () => {
    const map = { toString: "frontend-engineer" };
    expect(validateDelegationMapIssues(map, path)).toEqual([]);
  });

  it("emits one issue per invalid mapping", () => {
    const map = {
      UI実装: "qa-gatekeeper",
      ビルド: "frontend-engineer",
    };
    const issues = validateDelegationMapIssues(map, path);
    expect(issues).toHaveLength(2);
    expect(new Set(issues.map((i) => i.code))).toEqual(new Set(["QFAI-PROT-311"]));
  });

  // ─── Non-string value rejection (Codex review on PR #201) ────────────────
  // Previously stateGate.extractDelegationMap silently filtered out non-string
  // entries before validation, so { UI実装: 123 } was indistinguishable from
  // { UI実装: <missing> } and never raised QFAI-PROT-311.

  it("emits QFAI-PROT-311 for a non-string role (number)", () => {
    const map = { UI実装: 123 };
    const issues = validateDelegationMapIssues(map, path);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-311");
    expect(issues[0]?.message).toMatch(/non-string/);
    expect(issues[0]?.message).toMatch(/got: number/);
  });

  it("emits QFAI-PROT-311 for a non-string role (array)", () => {
    const map = { UI実装: ["frontend-engineer"] };
    const issues = validateDelegationMapIssues(map, path);
    expect(issues).toHaveLength(1);
    // typeof [] is "object", but we report "array" for clarity.
    expect(issues[0]?.message).toMatch(/got: array/);
  });

  it("emits QFAI-PROT-311 for a non-string role (null)", () => {
    const map = { UI実装: null };
    const issues = validateDelegationMapIssues(map, path);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/got: null/);
  });
});

// ─── Wiring entry point ──────────────────────────────────────────────────
// validatePrototypingDelegationMap is what runPrototypingValidators calls.
// Until it existed, the adapter above was exported, unit-tested and never
// invoked, so QFAI-PROT-311 could not fire from `qfai validate`.

describe("validatePrototypingDelegationMap (prototyping.json reader)", () => {
  const tempDirs: string[] = [];
  const PROTO_JSON_REL = ".qfai/evidence/prototyping/prototyping.json";

  async function seedRoot(contents: string | undefined): Promise<string> {
    const root = await mkdtemp(nodePath.join(os.tmpdir(), "qfai-delegation-"));
    tempDirs.push(root);
    if (contents !== undefined) {
      const abs = nodePath.join(root, PROTO_JSON_REL);
      await mkdir(nodePath.dirname(abs), { recursive: true });
      await writeFile(abs, contents, "utf-8");
    }
    return root;
  }

  afterEach(async () => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        await rm(dir, { recursive: true, force: true });
      }
    }
  });

  it("returns empty when prototyping.json is absent", async () => {
    expect(await validatePrototypingDelegationMap(await seedRoot(undefined))).toEqual([]);
  });

  it("returns empty when prototyping.json is unparseable", async () => {
    expect(await validatePrototypingDelegationMap(await seedRoot("{ not json"))).toEqual([]);
  });

  it("returns empty when there is no executionPlan block", async () => {
    const root = await seedRoot(JSON.stringify({ iterations: [] }));
    expect(await validatePrototypingDelegationMap(root)).toEqual([]);
  });

  it("returns empty for an allowed delegation map", async () => {
    const root = await seedRoot(
      JSON.stringify({
        executionPlan: {
          delegationMap: { UI実装: "frontend-engineer", スクリーンショット: "devops-ci-engineer" },
        },
      }),
    );
    expect(await validatePrototypingDelegationMap(root)).toEqual([]);
  });

  it("emits QFAI-PROT-311 for a role outside the Delegation Scope Table", async () => {
    const root = await seedRoot(
      JSON.stringify({
        executionPlan: { delegationMap: { スクリーンショット: "frontend-engineer" } },
      }),
    );
    const issues = await validatePrototypingDelegationMap(root);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-311");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.file).toBe(PROTO_JSON_REL);
  });

  it("emits QFAI-PROT-311 for a non-string role", async () => {
    const root = await seedRoot(
      JSON.stringify({ executionPlan: { delegationMap: { UI実装: 123 } } }),
    );
    const issues = await validatePrototypingDelegationMap(root);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-311");
    expect(issues[0]?.message).toMatch(/non-string/);
  });

  it("returns empty when executionPlan carries no delegationMap key", async () => {
    const root = await seedRoot(JSON.stringify({ executionPlan: { plannedAt: "2025-01-01" } }));
    expect(await validatePrototypingDelegationMap(root)).toEqual([]);
  });

  // A present-but-malformed delegationMap has no other owner: the
  // executionPlan block is not inspected by validatePrototypingEvidence,
  // so without this branch `delegationMap: "frontend"` passes every
  // profile silently.
  it.each([
    ["string", JSON.stringify({ executionPlan: { delegationMap: "frontend" } }), "string"],
    ["array", JSON.stringify({ executionPlan: { delegationMap: ["frontend"] } }), "array"],
    ["null", JSON.stringify({ executionPlan: { delegationMap: null } }), "null"],
  ])("emits QFAI-PROT-311 when delegationMap is a %s", async (_label, contents, describedType) => {
    const issues = await validatePrototypingDelegationMap(await seedRoot(contents));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-311");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.file).toBe(PROTO_JSON_REL);
    expect(issues[0]?.message).toMatch(/must be an object/);
    expect(issues[0]?.message).toMatch(new RegExp(`got: ${describedType}`));
  });
});

// ─── Shipped Delegation Scope Table ↔ policy SSOT ────────────────────────
// The distributed qfai-prototyping/SKILL.md renders the same policy with
// English category labels. When the two drift apart the validator simply
// does not recognise a table-conformant category and never checks its
// assignment, which is how { "Generation": <any role> } used to pass.

describe("shipped Delegation Scope Table categories are validated", () => {
  const SKILL_MD = nodePath.resolve(
    fileURLToPath(import.meta.url),
    "../../../..",
    "assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md",
  );

  async function readShippedScopeRows(): Promise<{ category: string; roles: string[] }[]> {
    const body = await readFile(SKILL_MD, "utf-8");
    const table = body.split("## Delegation Scope Table")[1]?.split("\n## ")[0] ?? "";
    return table
      .split("\n")
      .filter((line) => line.trim().startsWith("|"))
      .map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim()),
      )
      .filter(
        (cells) =>
          cells.length === 2 &&
          cells[0] !== undefined &&
          cells[0] !== "Work" &&
          !/^-+$/.test(cells[0]),
      )
      .map((cells) => ({
        category: cells[0] ?? "",
        // A row MAY list several roles; the shipped rows currently list one.
        roles: (cells[1] ?? "")
          .split(/[,/]/)
          .map((role) => role.trim())
          .filter((role) => role.length > 0),
      }));
  }

  it("parses the shipped table", async () => {
    expect((await readShippedScopeRows()).length).toBeGreaterThan(0);
  });

  it("accepts every shipped category paired with its documented role", async () => {
    for (const { category, roles } of await readShippedScopeRows()) {
      for (const role of roles) {
        expect(
          validateDelegationMapIssues({ [category]: role }, PROTO_JSON_REL_SSOT),
          `shipped row "${category}" -> "${role}" must be an allowed assignment`,
        ).toEqual([]);
      }
    }
  });

  it("flags every shipped category assigned to an out-of-scope role", async () => {
    for (const { category } of await readShippedScopeRows()) {
      const issues = validateDelegationMapIssues(
        { [category]: "qa-gatekeeper" },
        PROTO_JSON_REL_SSOT,
      );
      expect(
        issues.map((i) => i.code),
        `shipped category "${category}" must be recognised`,
      ).toEqual(["QFAI-PROT-311"]);
    }
  });

  // ─── The table's own allowed-role set governs its labels ───────────────
  // Resolving an English label through a canonical Japanese key handed it
  // that key's wider role set, so an assignment the shipped table forbids
  // passed validation.

  it("resolves every shipped label to exactly the roles its own row documents", async () => {
    for (const { category, roles } of await readShippedScopeRows()) {
      expect(
        new Set(resolveDelegationScope(category) ?? []),
        `shipped row "${category}" must not inherit a wider role set`,
      ).toEqual(new Set(roles));
    }
  });

  it("knows exactly the categories the shipped table documents", async () => {
    // Both directions: a new table row without a policy entry is unchecked,
    // and a policy label with no table row invents a rule nobody ships.
    const rows = await readShippedScopeRows();
    expect(new Set(Object.keys(SHIPPED_DELEGATION_SCOPE_TABLE))).toEqual(
      new Set(rows.map((row) => row.category)),
    );
  });

  it("documents only role ids the policy knows", async () => {
    for (const { category, roles } of await readShippedScopeRows()) {
      for (const role of roles) {
        expect(PROTOTYPING_REQUIRED_ROLE_IDS, `shipped row "${category}"`).toContain(role);
      }
    }
  });

  it("rejects a shipped label assigned to a role only its canonical category allows", () => {
    // The table documents `Generation` -> product-experience-architect only;
    // frontend-engineer is allowed for the canonical UI実装 category.
    const issues = validateDelegationMapIssues(
      { Generation: "frontend-engineer" },
      PROTO_JSON_REL_SSOT,
    );

    expect(issues.map((i) => i.code)).toEqual(["QFAI-PROT-311"]);
    expect(issues[0]?.message).toContain("Allowed roles: product-experience-architect.");
  });

  it("rejects Evaluation scoring assigned to the canonical category's extra role", () => {
    const issues = validateDelegationMapIssues(
      { "Evaluation scoring": "product-experience-architect" },
      PROTO_JSON_REL_SSOT,
    );

    expect(issues.map((i) => i.code)).toEqual(["QFAI-PROT-311"]);
    expect(issues[0]?.message).toContain("Allowed roles: product-surface-reviewer.");
  });

  // ─── Over-correction pins ─────────────────────────────────────────────

  it("still accepts a shipped label paired with its own documented role", () => {
    expect(
      validateDelegationMapIssues(
        { Generation: "product-experience-architect" },
        PROTO_JSON_REL_SSOT,
      ),
    ).toEqual([]);
  });

  it("still leaves the canonical categories on their canonical role sets", () => {
    // UI実装 keeps frontend-engineer; only the English label is narrowed.
    expect(
      validateDelegationMapIssues(
        { UI実装: "frontend-engineer", 評価スコアリング: "product-experience-architect" },
        PROTO_JSON_REL_SSOT,
      ),
    ).toEqual([]);
  });

  it.each(["evaluation scoring", "  Evaluation   Scoring  "])(
    "still resolves the label variant %j",
    (label) => {
      expect(
        validateDelegationMapIssues({ [label]: "product-surface-reviewer" }, PROTO_JSON_REL_SSOT),
      ).toEqual([]);
    },
  );

  it.each(["Playwright CLI execution & capture", "Playwright CLI execution and capture"])(
    "still accepts %j for devops-ci-engineer",
    (label) => {
      expect(
        validateDelegationMapIssues({ [label]: "devops-ci-engineer" }, PROTO_JSON_REL_SSOT),
      ).toEqual([]);
    },
  );
});
