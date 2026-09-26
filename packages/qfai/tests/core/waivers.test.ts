import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { applyWaivers, applyWaiversToExtraFindings } from "../../src/core/waivers.js";
import type { Issue } from "../../src/core/types.js";

describe("applyWaivers", () => {
  it("rejects retired row-ID matching", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-00",
          "    rule: QFAI-STORY-006",
          "    scope:",
          '      paths: [".qfai/spec/**"]',
          "    match:",
          '      dl_ids: ["DL-20260208-01"]',
          '    reason: "retired selector"',
          '    expires: "2099-01-01"',
          '    evidence: "decision.md"',
          "",
        ].join("\n"),
      );
      const result = await applyWaivers(root, [
        buildIssue({ code: "QFAI-STORY-006", rule: "storyTree.testObligation" }),
      ]);
      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-001")).toBe(true);
      expect(result.waivers.active).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("suppresses findings only when rule and path match", async () => {
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
          '      paths: [".qfai/spec/02_business-flow/business-flow-0001/**"]',
          '    reason: "temporary suppression"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(
        root,
        ".qfai",
        "spec",
        "02_business-flow",
        "business-flow-0001",
        "delta.md",
      );
      const findings: Issue[] = [
        buildIssue({
          rule: "COMPAT-003",
          file: matchedFile,
        }),
        buildIssue({
          code: "QFAI-STORY-006",
          rule: "STORY-006",
          file: matchedFile,
        }),
        buildIssue({
          rule: "COMPAT-003",
          file: path.join(root, "src", "index.ts"),
        }),
      ];

      const result = await applyWaivers(root, findings);
      const kept = result.issues.filter((item) => item.code === "QFAI-COMPAT-003");

      expect(kept).toHaveLength(2);
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
          "    rule: COMPAT-003",
          "    scope:",
          '      paths: [".qfai/spec/02_business-flow/business-flow-0001/**"]',
          "    action: downgrade",
          "    downgrade_to: Info",
          '    reason: "temporary scope mismatch"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(
        root,
        ".qfai",
        "spec",
        "02_business-flow",
        "business-flow-0001",
        "delta.md",
      );
      const findings: Issue[] = [
        buildIssue({
          code: "QFAI-COMPAT-003",
          rule: "COMPAT-003",
          file: matchedFile,
        }),
      ];

      const result = await applyWaivers(root, findings);
      const downgraded = result.issues.find((item) => item.code === "QFAI-COMPAT-003");

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
          '      paths: [".qfai/spec/02_business-flow/business-flow-0001/**"]',
          '    reason: "apply info-only waiver"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(
        root,
        ".qfai",
        "spec",
        "02_business-flow",
        "business-flow-0001",
        "delta.md",
      );
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
          '      paths: [".qfai/spec/02_business-flow/business-flow-0001/**"]',
          '    reason: "boundary test"',
          '    expires: "2030-05-20"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(
        root,
        ".qfai",
        "spec",
        "02_business-flow",
        "business-flow-0001",
        "delta.md",
      );
      const findings: Issue[] = [
        buildIssue({
          rule: "COMPAT-003",
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
          '      paths: [".qfai/spec/02_business-flow/business-flow-0001/**"]',
          '    reason: "expired test"',
          '    expires: "2000-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(
        root,
        ".qfai",
        "spec",
        "02_business-flow",
        "business-flow-0001",
        "delta.md",
      );
      const findings: Issue[] = [
        buildIssue({
          rule: "COMPAT-003",
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
          '      paths: [".qfai/spec/02_business-flow/business-flow-0001/**"]',
          '    reason: "attempt to waive error finding"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(
        root,
        ".qfai",
        "spec",
        "02_business-flow",
        "business-flow-0001",
        "delta.md",
      );
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

  it("says a post-waiver rule cannot be suppressed rather than calling it unknown", async () => {
    // `applyWaivers` runs inside `core/validate.ts`, and `src/cli/` appends
    // findings afterwards — so a waiver naming one can never match, whatever it
    // is called. A message saying `未知の rule` would send the operator
    // looking for a typo that is not there, and the remedy differs: a typo is
    // corrected, this waiver is removed.
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-06",
          "    rule: QFAI-PROFILE-001",
          "    scope:",
          '      paths: [".qfai/spec/**"]',
          '    reason: "post-waiver rule test"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const result = await applyWaivers(root, []);

      const finding = result.issues.find((item) => item.code === "QFAI-WAIVER-004");
      expect(finding).toBeDefined();
      // The rule exists; what it cannot do is be waived.
      expect(finding?.message).not.toContain("未知の rule");
      expect(finding?.message).toContain("存在しますが waiver では抑制できません");
      expect(finding?.message).toContain("削除");
      expect(result.waivers.active.some((item) => item.id === "WVR-20260208-06")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still calls a genuinely unknown rule unknown", async () => {
    // The negative control. Without it, a change that reported every
    // unmatchable waiver as post-waiver would pass the row above.
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-07",
          "    rule: QFAI-NOT-A-RULE-999",
          "    scope:",
          '      paths: [".qfai/spec/**"]',
          '    reason: "unknown rule control"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const result = await applyWaivers(root, []);

      const finding = result.issues.find((item) => item.code === "QFAI-WAIVER-004");
      expect(finding).toBeDefined();
      expect(finding?.message).toContain("未知の rule");
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
          '      paths: [".qfai/spec/**"]',
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
          "    rule: COMPAT-003",
          "    scope:",
          '      paths: [".qfai/spec/**"]',
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
          code: "QFAI-COMPAT-003",
          rule: "COMPAT-003",
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
          '      paths: [".qfai/spec/**"]',
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
          '      paths: [".qfai/spec/**"]',
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

  // `RULE_ID_RE` must accept the identifiers `qfai validate` prints: rejecting
  // them would make copying a code out of `validate.json` — the only
  // spelling an operator ever sees — a hard `QFAI-WAIVER-001`.
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
          '      paths: [".qfai/spec/02_business-flow/business-flow-0001/**"]',
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
          file: path.join(
            root,
            ".qfai",
            "spec",
            "02_business-flow",
            "business-flow-0001",
            "delta.md",
          ),
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

  // Rule identifiers from current validators must resolve without a
  // category-specific spelling branch.
  it.each([
    ["QFAI-STORY-006", "storyTree.testObligation"],
    ["QFAI-STORY-007", "storyTree.misplacedAnnotation"],
    ["D-SCAFFOLD-PLACEHOLDER", "distributedSurface.scaffold"],
    ["QFAI-CFG-LINK-001", "config.link"],
    ["QFAI-STORY-008", "storyTree.undeclaredAnnotation"],
    ["QFAI-STORY-009", "storyTree.testException"],
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
          '      paths: [".qfai/spec/02_business-flow/business-flow-0001/**"]',
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
          file: path.join(
            root,
            ".qfai",
            "spec",
            "02_business-flow",
            "business-flow-0001",
            "delta.md",
          ),
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
          '      paths: [".qfai/spec/02_business-flow/business-flow-0001/**"]',
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
          file: path.join(
            root,
            ".qfai",
            "spec",
            "02_business-flow",
            "business-flow-0001",
            "delta.md",
          ),
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
  // no finding. The rule is an error, so the waiver is refused — and the
  // static entry is what makes the refusal the same on a run that emits the
  // finding and a run that does not. Without it the same waiver file reads as
  // an unknown rule on one profile and an error-severity target on another.
  it.each([["QFAI-TEST-003"], ["TEST-003"]])(
    "refuses a waiver naming %s as an error target, even when the stub validator did not run",
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

        // Not an unknown rule: the static entry is what recognises it.
        expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(false);
        // Refused for the reason that is true on every profile.
        expect(result.issues.some((item) => item.code === "QFAI-WAIVER-002")).toBe(true);
        expect(result.waivers.active).toHaveLength(0);
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
          '      paths: [".qfai/spec/**"]',
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

  // The normal end state of a waiver: the rule fired, the waiver was written,
  // the defect was fixed. From then on the rule is quiet, and the waiver must
  // not be reported as naming a rule that does not exist. Every rule here is
  // waivable — one emitted only at `error` is refused for that reason instead,
  // which the error-only case below covers.
  it.each([
    ["QFAI-CONTRACT-031", "a code the emitter names through a constant"],
    ["CONTRACT-031", "the back-compat stripped alias"],
    ["W-STALE-REFERENCE", "a single-segment prefixed code"],
  ])("keeps a waiver for the quiet rule %s active (%s)", async (rule) => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-12",
          `    rule: ${rule}`,
          "    scope:",
          '      paths: [".qfai/spec/**"]',
          '    reason: "root cause fixed; kept on file until expiry"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      // None of the rules above appear in this run's findings.
      const result = await applyWaivers(root, [buildIssue({ rule: "COMPAT-003" })]);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(false);
      expect(result.waivers.active.map((item) => item.id)).toEqual(["WVR-20260208-12"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // These codes belong to the retired spec-pack validators. Migration may
  // still read that format, but validate cannot emit these findings, so a
  // quiet waiver must not be accepted as if it could suppress a future one.
  it.each([
    "E_OQ_STATUS_UNPARSEABLE",
    "QFAI-ATDD-112",
    "ATDD-112",
    "QFAI-ORPHAN-100",
    "QFAI-PLAN-002",
  ])("reports a waiver for retired rule %s as unmatched", async (rule) => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-12R",
          `    rule: ${rule}`,
          "    scope:",
          '      paths: [".qfai/spec/**"]',
          '    reason: "retired validator"',
          '    expires: "2099-01-01"',
          '    evidence: "migration.md"',
          "",
        ].join("\n"),
      );
      const result = await applyWaivers(root, [buildIssue({ rule: "COMPAT-003" })]);
      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(true);
      expect(result.waivers.active).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // The run that produces the finding judges the waiver against the severity it
  // observed, whatever the generated registry says.
  it("still blocks a waiver for an error finding the run produced", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-13",
          "    rule: QFAI-ATDD-112",
          "    scope:",
          '      paths: [".qfai/spec/**"]',
          '    reason: "error target"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const result = await applyWaivers(root, [
        buildIssue({ code: "QFAI-ATDD-112", rule: "atdd.codeTraceability", severity: "error" }),
      ]);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-002")).toBe(true);
      expect(result.waivers.active).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // A rule every emitter raises at `error` can never be waived, so the answer
  // must not depend on whether this run happened to produce the finding: the
  // same waiver file would otherwise be active on a clean run and rejected on
  // the run that finally fires the rule.
  it.each([
    ["QFAI-STORY-006", "the code the CLI prints"],
    ["STORY-006", "the back-compat stripped alias"],
    ["QFAI-STORY-002", "a structure wrapper with fixed error severity"],
    ["QFAI-SPACK-102", "an open decision rejected by the story-tree wrapper"],
    ["QFAI-ATDD-131", "a coverage matrix wrapper with fixed error severity"],
  ])("blocks a waiver for the quiet error-only rule %s (%s)", async (rule) => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-14",
          `    rule: ${rule}`,
          "    scope:",
          '      paths: [".qfai/spec/**"]',
          '    reason: "error target on a quiet run"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      // The rule produced nothing on this run.
      const result = await applyWaivers(root, [buildIssue({ rule: "COMPAT-003" })]);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-002")).toBe(true);
      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(false);
      expect(result.waivers.active).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([["QFAI-CRIT-008"], ["QFAI-DCON-030"], ["QFAI-DCON-031"], ["QFAI-DCON-032"]])(
    "keeps a waiver for the exploration-relaxable rule %s active on a quiet run",
    async (rule) => {
      const root = await createRoot();
      try {
        await writeWaivers(
          root,
          [
            "version: 1",
            "waivers:",
            "  - id: WVR-20260208-15",
            `    rule: ${rule}`,
            "    scope:",
            '      paths: [".qfai/prototyping/**"]',
            '    reason: "soft-rubric gate, relaxed under exploration"',
            '    expires: "2099-01-01"',
            '    evidence: "delta.md#DL-20260208-01"',
            "",
          ].join("\n"),
        );

        // The rule produced nothing on this run.
        const result = await applyWaivers(root, [buildIssue({ rule: "COMPAT-003" })]);

        expect(result.issues.some((item) => item.code === "QFAI-WAIVER-002")).toBe(false);
        expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(false);
        expect(result.waivers.active.map((item) => item.id)).toEqual(["WVR-20260208-15"]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  // The property-resolved emitters must reach the registry too: a waiver for
  // one of them read as an unknown rule on every run where it stayed quiet.
  it.each([["QFAI-AUD-001"], ["QFAI-AUD-020"]])(
    "recognises the quiet rule %s, whose emitter names it through a property",
    async (rule) => {
      const root = await createRoot();
      try {
        await writeWaivers(
          root,
          [
            "version: 1",
            "waivers:",
            "  - id: WVR-20260208-16",
            `    rule: ${rule}`,
            "    scope:",
            '      paths: [".qfai/spec/**"]',
            '    reason: "root cause fixed; kept on file until expiry"',
            '    expires: "2099-01-01"',
            '    evidence: "delta.md#DL-20260208-01"',
            "",
          ].join("\n"),
        );

        const result = await applyWaivers(root, [buildIssue({ rule: "COMPAT-003" })]);

        expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(false);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it("still reports a waiver naming a rule emitted after the waiver pass", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-18",
          "    rule: QFAI-PROFILE-001",
          "    scope:",
          '      paths: [".qfai/spec/**"]',
          '    reason: "partial profile is intentional here"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const result = await applyWaivers(root, [buildIssue({ rule: "COMPAT-003" })]);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(true);
      expect(result.waivers.active).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // The other half of the post-waiver check: `D-DEPRECATED-PATH` is *also*
  // emitted by `validators/assistantTreeMigration.ts`, which runs inside the
  // waiver pass. A blanket "the CLI emits it, so drop it" would have taken a
  // rule that is genuinely waivable with it.
  it("recognises a rule the CLI re-emits but a validator raises too", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-19",
          "    rule: D-DEPRECATED-PATH",
          "    scope:",
          '      paths: [".qfai/assistant/**"]',
          '    reason: "migration scheduled for the next minor"',
          '    expires: "2099-01-01"',
          '    evidence: "delta.md#DL-20260208-01"',
          "",
        ].join("\n"),
      );

      const result = await applyWaivers(root, [buildIssue({ rule: "COMPAT-003" })]);

      expect(result.issues.some((item) => item.code === "QFAI-WAIVER-004")).toBe(false);
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

/**
 * The pass over findings raised outside `validateProject` reports on the waiver
 * file too.
 *
 * Its verdicts are not a copy of the first pass's. Rule severity is read from
 * the findings in hand, and these findings are the ones validation never saw,
 * so a waiver against them is judged against an index the first pass could not
 * build. A caller that gets only the applied result has no way to say why a
 * waiver did nothing.
 *
 * One case per code, because each is reached by a different defect in the file
 * and a single fixture would pass on whichever one it happened to trip.
 */
describe("applyWaiversToExtraFindings reports on the waiver file", () => {
  it("returns the wrong-extension verdict", async () => {
    const root = await createRoot();
    try {
      await writeFile(
        path.join(root, ".qfai", "waivers.yaml"),
        "version: 1\nwaivers: []\n",
        "utf-8",
      );

      const result = await applyWaiversToExtraFindings(root, [buildIssue({ rule: "CTYPE-004" })]);

      expect(result.validationIssues.map((item) => item.code)).toContain("QFAI-WAIVER-001");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns the refusal of a waiver whose rule this run raised as an error", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(root, extraFindingWaiver("QFAI-CTYPE-004"));

      const result = await applyWaiversToExtraFindings(root, [
        buildIssue({ rule: "CTYPE-004", severity: "error" }),
      ]);

      const refusal = result.validationIssues.find((item) => item.code === "QFAI-WAIVER-002");
      expect(refusal?.message).toContain("QFAI-CTYPE-004");
      // The refusal is the whole answer: nothing was suppressed, so without it
      // the operator sees a waiver that did nothing and no reason for it.
      expect(result.suppressed.total).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns the unknown-rule verdict", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(root, extraFindingWaiver("QFAI-NOT-A-RULE-999"));

      const result = await applyWaiversToExtraFindings(root, [buildIssue({ rule: "CTYPE-004" })]);

      const verdict = result.validationIssues.find((item) => item.code === "QFAI-WAIVER-004");
      expect(verdict?.message).toContain("QFAI-NOT-A-RULE-999");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps applying the waivers it accepts", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(root, extraFindingWaiver("QFAI-CTYPE-004"));

      const result = await applyWaiversToExtraFindings(root, [buildIssue({ rule: "CTYPE-004" })]);

      expect(result.validationIssues).toEqual([]);
      expect(result.suppressed.total).toBe(1);
      expect(result.active.map((waiver) => waiver.id)).toEqual(["WVR-20260901-01"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

/** A repo-wide waiver on one rule, so only the rule id varies between cases. */
function extraFindingWaiver(rule: string): string {
  return [
    "version: 1",
    "waivers:",
    "  - id: WVR-20260901-01",
    `    rule: ${rule}`,
    "    scope:",
    '      paths: ["**"]',
    '    reason: "accepted while the delta is still being decided"',
    '    expires: "2099-01-01"',
    '    evidence: ".qfai/spec/02_business-flow/business-flow-0001/09_delta.md"',
    "",
  ].join("\n");
}

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
  file?: string;
  severity?: Issue["severity"];
}): Issue {
  return {
    code: input.code ?? `QFAI-${input.rule}`,
    severity: input.severity ?? "warning",
    category: "change",
    message: "sample finding",
    rule: input.rule,
    ...(input.file ? { file: input.file } : {}),
  };
}
