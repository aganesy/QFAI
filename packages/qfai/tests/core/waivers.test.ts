import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

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
          "    rule_id: COMPAT-003",
          "    action: suppress",
          "    match:",
          '      dl_ids: ["DL-20260208-01"]',
          '      paths: [".qfai/specs/spec-0001/**"]',
          '    reason: "temporary suppression"',
          '    expires_on: "2099-01-01"',
          "",
        ].join("\n"),
      );

      const matchedFile = path.join(
        root,
        ".qfai",
        "specs",
        "spec-0001",
        "delta.md",
      );
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
      const kept = result.issues.filter(
        (item) => item.code === "QFAI-COMPAT-003",
      );

      expect(kept).toHaveLength(2);
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
          "    rule_id: SCOPE-001",
          "    action: downgrade",
          "    downgrade_to: Info",
          "    match:",
          '      dl_ids: ["DL-20260208-01"]',
          '    reason: "temporary scope mismatch"',
          '    expires_on: "2099-01-01"',
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
      const downgraded = result.issues.find(
        (item) => item.code === "QFAI-SCOPE-001",
      );

      expect(downgraded?.severity).toBe("info");
      expect(result.waivers.suppressed.total).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("treats expires_on=today(JST) as valid and not expired", async () => {
    const root = await createRoot();
    try {
      await writeWaivers(
        root,
        [
          "version: 1",
          "waivers:",
          "  - id: WVR-20260208-03",
          "    rule_id: COMPAT-003",
          "    action: suppress",
          "    match:",
          '      dl_ids: ["DL-20260208-01"]',
          '    reason: "boundary test"',
          `    expires_on: "${todayJst()}"`,
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          rule: "COMPAT-003",
          dlId: "DL-20260208-01",
        }),
      ];

      const result = await applyWaivers(root, findings);
      const codes = result.issues.map((item) => item.code);

      expect(codes).not.toContain("QFAI-WAIVER-002");
      expect(result.waivers.suppressed.total).toBe(1);
    } finally {
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
          "    rule_id: COMPAT-003",
          "    action: suppress",
          "    match:",
          '      dl_ids: ["DL-20260208-01"]',
          '    reason: "expired test"',
          '    expires_on: "2000-01-01"',
          "",
        ].join("\n"),
      );

      const findings: Issue[] = [
        buildIssue({
          rule: "COMPAT-003",
          dlId: "DL-20260208-01",
        }),
      ];

      const result = await applyWaivers(root, findings);
      const codes = result.issues.map((item) => item.code);

      expect(codes).toContain("QFAI-COMPAT-003");
      expect(codes).toContain("QFAI-WAIVER-002");
      expect(result.waivers.suppressed.total).toBe(0);
      expect(
        result.waivers.active.some((item) => item.id === "WVR-20260208-04"),
      ).toBe(false);
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
}): Issue {
  return {
    code: input.code ?? `QFAI-${input.rule}`,
    severity: "warning",
    category: "change",
    message: "sample finding",
    rule: input.rule,
    ...(input.dlId ? { dl_id: input.dlId } : {}),
    ...(input.file ? { file: input.file } : {}),
  };
}

function todayJst(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}
