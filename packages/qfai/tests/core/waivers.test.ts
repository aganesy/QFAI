import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { applyWaivers } from "../../src/core/waivers.js";
import type { Issue } from "../../src/core/types.js";

describe("applyWaivers", () => {
  it("suppresses findings only when dl_ids and paths match (AND)", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-01",
          "    rule: COMPAT-003",
          "    scope:",
          '      paths: [".qfai/specs/spec-0001/**"]',
          "    match:",
          '      dl_ids: ["DL-20260208-01"]',
          '    reason: "temporary suppression"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(root, ".qfai", "specs", "spec-0001", "delta.md");
      const findings: Issue[] = [
        buildIssue({
          rule: "COMPAT-003",
          dlId: "DL-20260208-01",
          file: matchedFile,
        }),
        buildIssue({
          rule: "COMPAT-003",
          dlId: "DL-20260208-XX",
          file: matchedFile,
        }),
        buildIssue({
          rule: "COMPAT-003",
          dlId: "DL-20260208-01",
          file: path.join(root, "src", "index.ts"),
        }),
      ];

      const result = await applyWaivers(root, findings);
      const kept = result.issues.filter((item) => item.code === "QFAI-COMPAT-003");

      expect(kept).toHaveLength(3);
      expect(kept.filter((item) => item.suppressed)).toHaveLength(1);
      expect(result.waivers.suppressed.total).toBe(1);
      expect(result.waivers.suppressed.byWaiver["WVR-20260208-01"]).toBe(1);
      expect(result.waivers.suppressed.byRule["COMPAT-003"]).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("downgrades warning to info when action=downgrade", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-02",
          "    rule: SCOPE-001",
          "    scope:",
          '      paths: [".qfai/specs/spec-0001/**"]',
          "    action: downgrade",
          "    downgrade_to: Info",
          "    match:",
          '      dl_ids: ["DL-20260208-01"]',
          '    reason: "temporary scope mismatch"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(root, ".qfai", "specs", "spec-0001", "delta.md");
      const findings: Issue[] = [
        buildIssue({
          code: "QFAI-SCOPE-001",
          rule: "SCOPE-001",
          dlId: "DL-20260208-01",
          file: matchedFile,
        }),
      ];

      const result = await applyWaivers(root, findings);
      const downgraded = result.issues.find((item) => item.code === "QFAI-SCOPE-001");

      expect(downgraded?.severity).toBe("info");
      expect(result.waivers.suppressed.total).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("applies waiver only when finding severity matches configured severity", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-02B",
          "    rule: COMPAT-003",
          "    severity: info",
          "    scope:",
          '      paths: [".qfai/specs/spec-0001/**"]',
          '    reason: "apply info-only waiver"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(root, ".qfai", "specs", "spec-0001", "delta.md");
      const findings: Issue[] = [
        buildIssue({
          code: "QFAI-COMPAT-003-WARN",
          rule: "COMPAT-003",
          file: matchedFile,
          severity: "warning",
        }),
        buildIssue({
          code: "QFAI-COMPAT-003-INFO",
          rule: "COMPAT-003",
          file: matchedFile,
          severity: "info",
        }),
      ];

      const result = await applyWaivers(root, findings);
      const warningFinding = result.issues.find((item) => item.code === "QFAI-COMPAT-003-WARN");
      const infoFinding = result.issues.find((item) => item.code === "QFAI-COMPAT-003-INFO");

      expect(warningFinding?.suppressed).toBeUndefined();
      expect(infoFinding?.suppressed).toBe(true);
      expect(result.waivers.suppressed.total).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("treats expires=today(JST) as valid and not expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-05-20T12:00:00.000Z"));

    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-03",
          "    rule: COMPAT-003",
          "    scope:",
          '      paths: [".qfai/specs/spec-0001/**"]',
          "    match:",
          '      dl_ids: ["DL-20260208-01"]',
          '    reason: "boundary test"',
          '    expires: "2030-05-20"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(root, ".qfai", "specs", "spec-0001", "delta.md");
      const findings: Issue[] = [
        buildIssue({
          rule: "COMPAT-003",
          dlId: "DL-20260208-01",
          file: matchedFile,
        }),
      ];

      const result = await applyWaivers(root, findings);
      const codes = result.issues.map((item) => item.code);

      expect(codes).not.toContain("QFAI-WAIVER-003");
      expect(result.waivers.suppressed.total).toBe(1);
    } finally {
      vi.useRealTimers();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("flags expired waivers and keeps target findings", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-04",
          "    rule: COMPAT-003",
          "    scope:",
          '      paths: [".qfai/specs/spec-0001/**"]',
          "    match:",
          '      dl_ids: ["DL-20260208-01"]',
          '    reason: "expired test"',
          '    expires: "2000-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(root, ".qfai", "specs", "spec-0001", "delta.md");
      const findings: Issue[] = [
        buildIssue({
          rule: "COMPAT-003",
          dlId: "DL-20260208-01",
          file: matchedFile,
        }),
      ];

      const result = await applyWaivers(root, findings);
      const codes = result.issues.map((item) => item.code);

      expect(codes).toContain("QFAI-COMPAT-003");
      expect(codes).toContain("QFAI-WAIVER-003");
      expect(result.waivers.suppressed.total).toBe(0);
      expect(result.waivers.active.some((item) => item.id === "WVR-20260208-04")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0014:TC-0014-0006
  it("rejects waiver targeting an error finding", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-04B",
          "    rule: COMPAT-003",
          "    scope:",
          '      paths: [".qfai/specs/spec-0001/**"]',
          '    reason: "attempt to waive error finding"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(root, ".qfai", "specs", "spec-0001", "delta.md");
      const findings: Issue[] = [
        buildIssue({
          rule: "COMPAT-003",
          file: matchedFile,
          severity: "error",
        }),
      ];

      const result = await applyWaivers(root, findings);
      const codes = result.issues.map((item) => item.code);

      expect(codes).toContain("QFAI-COMPAT-003");
      expect(codes).toContain("QFAI-WAIVER-002");
      expect(result.waivers.suppressed.total).toBe(0);
      expect(result.waivers.active.some((item) => item.id === "WVR-20260208-04B")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("excludes blocked waivers from active list", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-05",
          "    rule: UNKNOWN-999",
          "    scope:",
          '      paths: [".qfai/specs/**"]',
          '    reason: "invalid rule test"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [buildIssue({ rule: "COMPAT-003" })];
      const result = await applyWaivers(root, findings);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(true);
      expect(result.waivers.active.some((item) => item.id === "WVR-20260208-05")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects downgrade_to=Warn", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-06",
          "    rule: SCOPE-001",
          "    scope:",
          '      paths: [".qfai/specs/**"]',
          "    action: downgrade",
          "    downgrade_to: Warn",
          '    reason: "invalid downgrade target"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          code: "QFAI-SCOPE-001",
          rule: "SCOPE-001",
          dlId: "DL-20260208-01",
        }),
      ];

      const result = await applyWaivers(root, findings);
      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-001")).toBe(true);
      expect(result.waivers.active).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects unknown action values", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-08",
          "    rule: COMPAT-003",
          "    scope:",
          '      paths: [".qfai/specs/**"]',
          "    action: downgrdae",
          '    reason: "typo action should fail"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [buildIssue({ rule: "COMPAT-003" })];
      const result = await applyWaivers(root, findings);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-001")).toBe(true);
      expect(result.waivers.active).toHaveLength(0);
      expect(result.waivers.suppressed.total).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("treats malformed rule as WAIVER-001", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-07",
          // A dotted validator path — the `rule` field of a finding, which is
          // never a waiver key. `COMPAT-0003` would no longer qualify: it is
          // well-formed under the widened grammar, merely unknown.
          "    rule: specPack.layerPolicy",
          "    scope:",
          '      paths: [".qfai/specs/**"]',
          '    reason: "malformed rule id"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [buildIssue({ rule: "COMPAT-003" })];
      const result = await applyWaivers(root, findings);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-001")).toBe(true);
      expect(result.waivers.active).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // Regression: issue #398. `RULE_ID_RE` accepted none of the identifiers
  // `qfai validate` prints, so copying a code out of `validate.json` — the only
  // spelling an operator ever sees — was a hard `QFAI-WAIVER-001`.
  it("accepts the finding's own code as the waiver rule", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-08",
          "    rule: QFAI-SPACK-090",
          "    scope:",
          '      paths: [".qfai/specs/spec-0001/**"]',
          '    reason: "layer policy exception approved in DL-20260208-01"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          code: "QFAI-SPACK-090",
          // A dotted validator path, as the real emitter sets — so the code is
          // the only key the waiver can name.
          rule: "specPack.layerPolicy",
          file: path.join(root, ".qfai", "specs", "spec-0001", "delta.md"),
        }),
      ];
      const result = await applyWaivers(root, findings);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-001")).toBe(false);
      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(false);
      expect(result.waivers.active).toHaveLength(1);
      expect(result.issues.find((item) => item.code === "QFAI-SPACK-090")?.suppressed).toBe(true);
      expect(result.waivers.suppressed.byRule["QFAI-SPACK-090"]).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // The 46 codes that matched neither branch of the old `resolveRuleId` and so
  // were unwaivable by construction.
  it.each([
    ["TDDLIST_INVALID_STATUS", "tddList.status"],
    ["E_TC_ORPHAN", "spec.testCases"],
    ["D-SCAFFOLD-PLACEHOLDER", "distributedSurface.scaffold"],
    ["QFAI-CFG-LINK-001", "config.link"],
    // Findings added after this fix was written. `qfai-implement/SKILL.md` and
    // `references/execution-ledger.md` tell an operator these are waivable, so
    // the grammar has to keep accepting the shape they are published under.
    ["TDDLIST_EVIDENCE_STATUS_ONLY", "tddList.evidence"],
    ["TDDLIST_BLOCKED_MISSING_REF", "tddList.blockedBy"],
    ["TDDLIST_EXCEPTION_UNRESOLVED_DR", "tddList.exceptionDr"],
  ])("waives %s, which no rule-id branch could resolve", async (code, rule) => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-09",
          `    rule: ${code}`,
          "    scope:",
          '      paths: [".qfai/specs/spec-0001/**"]',
          '    reason: "reviewed and accepted"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          code,
          rule,
          file: path.join(root, ".qfai", "specs", "spec-0001", "delta.md"),
        }),
      ];
      const result = await applyWaivers(root, findings);

      expect(result.waivers.active).toHaveLength(1);
      expect(result.issues.find((item) => item.code === code)?.suppressed).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // Back-compat: waiver files written against the old grammar keep applying.
  it("still accepts the QFAI-stripped rule id", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-10",
          "    rule: SPACK-090",
          "    scope:",
          '      paths: [".qfai/specs/spec-0001/**"]',
          '    reason: "written before the grammar widened"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          code: "QFAI-SPACK-090",
          rule: "specPack.layerPolicy",
          file: path.join(root, ".qfai", "specs", "spec-0001", "delta.md"),
        }),
      ];
      const result = await applyWaivers(root, findings);

      expect(result.waivers.active).toHaveLength(1);
      expect(result.issues.find((item) => item.code === "QFAI-SPACK-090")?.suppressed).toBe(true);
      expect(result.waivers.suppressed.byRule["SPACK-090"]).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // `validateTestTodoStubs` does not run under every profile (`--profile sdd`
  // skips it), so on those runs QFAI-TEST-003 reaches the severity index from
  // no finding. Without a static entry a legitimate global waiver for a
  // deliberately parked suite was rejected as an unknown rule on every such
  // run, failing `--fail-on warning` in profiles unrelated to the gate.
  it.each([["QFAI-TEST-003"], ["TEST-003"]])(
    "accepts a waiver naming %s even when the stub validator did not run",
    async (rule) => {
      const root = await createRoot();
      try {
        await writeWaivers(
          root,
          [
            "version: 1",
            "waivers:",
            "  - id: WVR-20260222-01",
            `    rule: ${rule}`,
            "    scope:",
            '      paths: ["tests/**"]',
            '    reason: "suite parked deliberately"',
            '    expires: "2099-01-01"',
            '    evidence: "delta.md#DL-20260222-01"',
            "",
          ].join("\n"),
        );

        // A run of a profile that never invokes the stub validator: no
        // QFAI-TEST-003 finding is in hand.
        const result = await applyWaivers(root, [buildIssue({ rule: "COMPAT-003" })]);

        expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(false);
        // Registered as `warning`, so it is not refused as an error-severity
        // target either.
        expect(result.issues.some((item) => item.code === "QFAI-WAIVER-002")).toBe(false);
        expect(result.waivers.active).toHaveLength(1);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it("reports a well-formed but unemitted rule as WAIVER-004, not WAIVER-001", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-11",
          "    rule: QFAI-NOSUCH-999",
          "    scope:",
          '      paths: [".qfai/specs/**"]',
          '    reason: "rule does not exist"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const result = await applyWaivers(root, [buildIssue({ rule: "COMPAT-003" })]);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-001")).toBe(false);
      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(true);
      expect(result.waivers.active).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // The code spelling is the one operators are told to write, so it must carry
  // the same `match.dl_ids` requirement as the rule-id spelling.
  it("requires match.dl_ids for a row-scoped rule named by its code", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-12",
          "    rule: TDDLIST_EXCEPTION_PARKED",
          "    scope:",
          '      paths: [".qfai/specs/spec-0001/**"]',
          '    reason: "accepted risk"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          code: "TDDLIST_EXCEPTION_PARKED",
          rule: "TDDLIST-001",
          dlId: "TDD-0001",
          file: path.join(root, ".qfai", "specs", "spec-0001", "tdd", "test-list.md"),
        }),
      ];
      const result = await applyWaivers(root, findings);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-005")).toBe(true);
      expect(result.waivers.active).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // `scope.paths` is mandatory, so a repo-level finding that carries no `file`
  // used to be unwaivable at every glob, `**` included — the waiver validated,
  // reported as active, and matched nothing.
  it("suppresses a finding with no file, which no scope.paths glob could reach", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-13",
          "    rule: QFAI-PLATFORM-001",
          "    scope:",
          '      paths: ["**"]',
          '    reason: "unknown platform accepted for this repo"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          code: "QFAI-PLATFORM-001",
          rule: "platformDetection.unknownPlatform",
        }),
      ];
      const result = await applyWaivers(root, findings);

      expect(result.waivers.active).toHaveLength(1);
      expect(result.issues.find((item) => item.code === "QFAI-PLATFORM-001")?.suppressed).toBe(
        true,
      );
      expect(result.waivers.suppressed.total).toBe(1);
      expect(result.waivers.suppressed.byWaiver["WVR-20260208-13"]).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // A file-less finding is repo-level, but the waiver's other predicates still
  // have to hold: a dl_ids-scoped waiver must not sweep it up.
  it("still requires match.dl_ids to hold for a finding with no file", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-14",
          "    rule: QFAI-PLATFORM-001",
          "    scope:",
          '      paths: ["**"]',
          "    match:",
          '      dl_ids: ["DL-20260208-01"]',
          '    reason: "scoped to one decision log entry"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          code: "QFAI-PLATFORM-001",
          rule: "platformDetection.unknownPlatform",
        }),
      ];
      const result = await applyWaivers(root, findings);

      expect(result.waivers.active).toHaveLength(1);
      expect(result.issues.find((item) => item.code === "QFAI-PLATFORM-001")?.suppressed).toBe(
        undefined,
      );
      expect(result.waivers.suppressed.total).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // A validator may aggregate several files into one file-less finding
  // (`uiDefinitionConsistency` raises one QFAI-CONSISTENCY-002 per screen id
  // across every UI Contract), so a waiver scoped to a single file must not
  // reach it — only an explicitly repo-wide glob does.
  it("does not let a narrow scope.paths waiver suppress a finding with no file", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-15",
          "    rule: QFAI-CONSISTENCY-002",
          "    scope:",
          '      paths: [".qfai/contracts/ui/a.yaml"]',
          '    reason: "one screen of one contract"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          code: "QFAI-CONSISTENCY-002",
          rule: "uiDefinitionConsistency.screenAlignment",
          severity: "info",
        }),
      ];
      const result = await applyWaivers(root, findings);

      expect(result.waivers.active).toHaveLength(1);
      expect(result.issues.find((item) => item.code === "QFAI-CONSISTENCY-002")?.suppressed).toBe(
        undefined,
      );
      expect(result.waivers.suppressed.total).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // The repo-wide glob need not be the only entry: `.some()` over scope.paths.
  it("suppresses a finding with no file when scope.paths mixes a narrow glob with '**/*'", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-16",
          "    rule: QFAI-CONSISTENCY-002",
          "    scope:",
          '      paths: [".qfai/contracts/ui/a.yaml", "**/*"]',
          '    reason: "repo-wide screen alignment is advisory here"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          code: "QFAI-CONSISTENCY-002",
          rule: "uiDefinitionConsistency.screenAlignment",
          severity: "info",
        }),
      ];
      const result = await applyWaivers(root, findings);

      expect(result.waivers.active).toHaveLength(1);
      expect(result.issues.find((item) => item.code === "QFAI-CONSISTENCY-002")?.suppressed).toBe(
        true,
      );
      expect(result.waivers.suppressed.byWaiver["WVR-20260208-16"]).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function createRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-waivers-"));
  await mkdir(path.join(root, ".qfai"), { recursive: true });
  return root;
}

async function writeWaivers(root: string, content: string): Promise<void> {
  await writeFile(path.join(root, ".qfai", "waivers.yml"), content, "utf-8");
}

function buildIssue(input: {
  code?: string;
  rule: string;
  dlId?: string;
  file?: string;
  severity?: Issue["severity"];
}): Issue {
  return {
    code: input.code ?? `QFAI-${input.rule}`,
    severity: input.severity ?? "warning",
    category: "change",
    message: "sample finding",
    rule: input.rule,
    ...(input.dlId ? { dl_id: input.dlId } : {}),
    ...(input.file ? { file: input.file } : {}),
  };
}
