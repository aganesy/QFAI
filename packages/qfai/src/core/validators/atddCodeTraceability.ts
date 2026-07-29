import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  ATDD_TEST_KIND_DIRS,
  evaluateAtddCodeTraceability,
  type AtddCodeTraceabilityResult,
  type AtddTestKind,
  type AtddUnknownRef,
} from "../atddTraceability.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

type AtddTraceabilitySummary = {
  missing: {
    us: string[];
    tc: string[];
    conApi: string[];
  };
  /** Missing TC ref -> the test directory its declared `Level` routes to. */
  missingTcHomes: Record<string, string>;
  unknown: Array<{ file: string; token: string }>;
  forbidden: {
    tcInApi: Array<{ file: string; ids: string[] }>;
    tcInE2e: Array<{ file: string; ids: string[] }>;
  };
  scan: {
    matchedFileCount: number;
    truncated: boolean;
    limit: number;
    globs: string[];
  };
};

export async function validateAtddCodeTraceability(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const result = await evaluateAtddCodeTraceability(root, config);
  const issues: Issue[] = [];

  issues.push(...buildUnknownIssues(result.unknown));

  if (result.missing.us.length > 0) {
    issues.push(
      issue(
        "QFAI-ATDD-111",
        `E2E で参照されていない US があります: ${result.missing.us.join(", ")}`,
        "error",
        result.specsRoot,
        "atddCodeTraceability.coverage.usToE2e",
        result.missing.us,
        "change",
        "tests/e2e/** に `QFAI:SPEC-XXXX:US-YYYY` 注釈を追加し、全 US を少なくとも1回参照してください。",
      ),
    );
  }

  if (result.missing.tc.length > 0) {
    const grouped = groupMissingTcByHome(result.missing.tc, result.missingTcHomes);
    issues.push(
      issue(
        "QFAI-ATDD-112",
        `宣言 Level が指すディレクトリで参照されていない TC があります: ${formatMissingTcGroups(grouped)}`,
        "error",
        result.specsRoot,
        "atddCodeTraceability.coverage.tcToDeclaredLayer",
        result.missing.tc,
        "change",
        buildMissingTcFix(grouped),
      ),
    );
  }

  if (result.missing.conApi.length > 0) {
    issues.push(
      issue(
        "QFAI-ATDD-113",
        `API テストで参照されていない CON-API があります: ${result.missing.conApi.join(", ")}`,
        "error",
        result.contractsApiRoot,
        "atddCodeTraceability.coverage.conApiToApiTests",
        result.missing.conApi,
        "change",
        "tests/api/** に `QFAI:CON-API-XXXX` 注釈を追加し、`.qfai/contracts/api` の宣言済み CON-API を全件参照してください。",
      ),
    );
  }

  for (const forbidden of result.forbidden.tcInApi) {
    issues.push(
      issue(
        "QFAI-ATDD-121",
        `宣言 Level が API ではない TC を API テストで参照しています: ${forbidden.ids.join(", ")}`,
        "error",
        forbidden.file,
        "atddCodeTraceability.forbidden.tcInApi",
        forbidden.ids,
        "change",
        "tests/api/** から TC 参照を削除して契約ID（`QFAI:CON-API-XXXX`）を使うか、その TC の `Level` を `L4`/`API` に修正してください。",
      ),
    );
  }

  for (const forbidden of result.forbidden.tcInE2e) {
    issues.push(
      issue(
        "QFAI-ATDD-122",
        `宣言 Level が E2E ではない TC を E2E テストで参照しています: ${forbidden.ids.join(", ")}`,
        "error",
        forbidden.file,
        "atddCodeTraceability.forbidden.tcInE2e",
        forbidden.ids,
        "change",
        "tests/e2e/** から TC 参照を削除して US 参照（`QFAI:SPEC-XXXX:US-YYYY`）を使うか、その TC の `Level` を `L5`/`E2E` に修正してください。",
      ),
    );
  }

  try {
    await writeAtddTraceabilityReport(root, config, result);
  } catch (error) {
    issues.push(
      issue(
        "QFAI-ATDD-901",
        `atdd-traceability report の出力に失敗しました: ${formatError(error)}`,
        "warning",
        path.join(resolvePath(root, config, "outDir"), "atdd-traceability"),
        "atddCodeTraceability.report",
      ),
    );
  }

  return issues;
}

const MISSING_TC_HOME_ORDER: AtddTestKind[] = ["integration", "api", "e2e"];

/**
 * Buckets the missing TC refs by the directory their declared `Level` routes
 * to, so the message and the fix name the layer the author actually declared.
 */
function groupMissingTcByHome(
  missingTc: string[],
  homes: Map<string, AtddTestKind>,
): Map<AtddTestKind, string[]> {
  const grouped = new Map<AtddTestKind, string[]>();
  for (const ref of missingTc) {
    const home = homes.get(ref) ?? "integration";
    const bucket = grouped.get(home) ?? [];
    bucket.push(ref);
    grouped.set(home, bucket);
  }
  return grouped;
}

function orderedMissingTcGroups(
  grouped: Map<AtddTestKind, string[]>,
): Array<[AtddTestKind, string[]]> {
  return MISSING_TC_HOME_ORDER.filter((kind) => (grouped.get(kind)?.length ?? 0) > 0).map(
    (kind) => [kind, grouped.get(kind) ?? []],
  );
}

function formatMissingTcGroups(grouped: Map<AtddTestKind, string[]>): string {
  return orderedMissingTcGroups(grouped)
    .map(([kind, refs]) => `${ATDD_TEST_KIND_DIRS[kind]} -> ${refs.join(", ")}`)
    .join(" / ");
}

function buildMissingTcFix(grouped: Map<AtddTestKind, string[]>): string {
  const perHome = orderedMissingTcGroups(grouped)
    .map(([kind, refs]) => `${ATDD_TEST_KIND_DIRS[kind]}: ${refs.join(", ")}`)
    .join(" / ");
  return `各 TC の宣言 Level が指すディレクトリに \`QFAI:SPEC-XXXX:TC-YYYY\` 注釈を追加してください（L3/Integration -> tests/integration/**、L4/API -> tests/api/**、L5/E2E -> tests/e2e/**、Level 未宣言は tests/integration/**）: ${perHome}`;
}

function buildUnknownIssues(unknown: AtddUnknownRef[]): Issue[] {
  if (unknown.length === 0) {
    return [];
  }

  const grouped = new Map<
    string,
    { file: string; kind: AtddUnknownRef["kind"]; tokens: Set<string> }
  >();
  for (const entry of unknown) {
    const key = `${entry.kind}|${entry.file}`;
    const current = grouped.get(key) ?? {
      file: entry.file,
      kind: entry.kind,
      tokens: new Set<string>(),
    };
    current.tokens.add(entry.token);
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map((entry) => {
      const refs = Array.from(entry.tokens).sort((left, right) => left.localeCompare(right));
      if (entry.kind === "us") {
        return issue(
          "QFAI-ATDD-101",
          `未定義の US 参照を検出しました: ${refs.join(", ")}`,
          "error",
          entry.file,
          "atddCodeTraceability.unknown.us",
          refs,
          "change",
          "spec 側に US を定義するか、テスト注釈を正しい ID へ修正してください。",
        );
      }
      if (entry.kind === "tc") {
        return issue(
          "QFAI-ATDD-102",
          `未定義の TC 参照を検出しました: ${refs.join(", ")}`,
          "error",
          entry.file,
          "atddCodeTraceability.unknown.tc",
          refs,
          "change",
          "spec 側に TC を定義するか、テスト注釈を正しい ID へ修正してください。",
        );
      }
      return issue(
        "QFAI-ATDD-103",
        `未定義の CON-API 参照を検出しました: ${refs.join(", ")}`,
        "error",
        entry.file,
        "atddCodeTraceability.unknown.conApi",
        refs,
        "change",
        "contracts/api に CON-API を宣言するか、テスト注釈を正しい ID へ修正してください。",
      );
    })
    .sort((left, right) => {
      if (left.code !== right.code) {
        return left.code.localeCompare(right.code);
      }
      return (left.file ?? "").localeCompare(right.file ?? "");
    });
}

async function writeAtddTraceabilityReport(
  root: string,
  config: QfaiConfig,
  result: AtddCodeTraceabilityResult,
): Promise<void> {
  const outputDir = path.join(resolvePath(root, config, "outDir"), "atdd-traceability");
  await mkdir(outputDir, { recursive: true });

  const summary: AtddTraceabilitySummary = {
    missing: {
      us: result.missing.us,
      tc: result.missing.tc,
      conApi: result.missing.conApi,
    },
    unknown: result.unknown.map((entry) => ({
      file: entry.file,
      token: entry.token,
    })),
    missingTcHomes: Object.fromEntries(
      result.missing.tc.map((ref) => [
        ref,
        ATDD_TEST_KIND_DIRS[result.missingTcHomes.get(ref) ?? "integration"],
      ]),
    ),
    forbidden: {
      tcInApi: result.forbidden.tcInApi,
      tcInE2e: result.forbidden.tcInE2e,
    },
    scan: {
      matchedFileCount: result.scan.matchedFileCount,
      truncated: result.scan.truncated,
      limit: result.scan.limit,
      globs: result.scan.globs,
    },
  };

  await writeFile(
    path.join(outputDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf-8",
  );
  await writeFile(path.join(outputDir, "summary.md"), buildSummaryMarkdown(summary), "utf-8");
}

function buildSummaryMarkdown(summary: AtddTraceabilitySummary): string {
  const lines: string[] = [];
  lines.push("# ATDD Traceability Summary");
  lines.push("");
  lines.push("## Missing Coverage");
  lines.push("");
  lines.push("- US -> E2E");
  lines.push(...toList(summary.missing.us));
  lines.push("- TC -> declared Level home (L3 integration / L4 api / L5 e2e)");
  lines.push(
    ...toList(
      summary.missing.tc.map((ref) => {
        const home = summary.missingTcHomes[ref];
        return home === undefined ? ref : `${ref} (${home})`;
      }),
    ),
  );
  lines.push("- CON-API -> API");
  lines.push(...toList(summary.missing.conApi));
  lines.push("");
  lines.push("## Unknown References");
  lines.push("");
  if (summary.unknown.length === 0) {
    lines.push("- なし");
  } else {
    for (const item of summary.unknown) {
      lines.push(`- ${item.token} (${item.file})`);
    }
  }
  lines.push("");
  lines.push("## Forbidden References");
  lines.push("");
  lines.push("- TC in tests/api/**");
  lines.push(...toFileIdList(summary.forbidden.tcInApi));
  lines.push("- TC in tests/e2e/**");
  lines.push(...toFileIdList(summary.forbidden.tcInE2e));
  lines.push("");
  lines.push("## Scan");
  lines.push("");
  lines.push(`- matchedFileCount: ${summary.scan.matchedFileCount}`);
  lines.push(`- truncated: ${summary.scan.truncated ? "true" : "false"}`);
  lines.push(`- limit: ${summary.scan.limit}`);
  lines.push("- globs:");
  for (const glob of summary.scan.globs) {
    lines.push(`  - ${glob}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function toList(items: string[]): string[] {
  if (items.length === 0) {
    return ["  - なし"];
  }
  return items.map((item) => `  - ${item}`);
}

function toFileIdList(items: Array<{ file: string; ids: string[] }>): string[] {
  if (items.length === 0) {
    return ["  - なし"];
  }
  return items.map((item) => `  - ${item.file}: ${item.ids.join(", ")}`);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
