import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  atddTestKindDirs,
  evaluateAtddCodeTraceability,
  type AtddCodeTraceabilityResult,
  type AtddTestKind,
  type AtddUnknownRef,
} from "../atddTraceability.js";
import type { SpecScope } from "../specScope.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/** `SPEC-0004:US-0002` / `SPEC-0004:TC-0002-0007` — the spec number is group 1. */
const OWNING_SPEC_RE = /^SPEC-(\d{4}):/;

/**
 * Drops `SPEC-NNNN:`-prefixed refs the run was not scoped to.
 *
 * `isFindingInSpecScope` decides whether a finding survives, but it cannot edit
 * one. So a `--spec` run kept these findings — correctly, the requested spec is
 * implicated — while the message, `refs` and GitHub annotation still listed
 * every other spec's missing obligations. Narrowing the ref lists before the
 * messages are built is what makes "this spec's obligations only" true of the
 * output and not merely of the exit code.
 *
 * Only the two spec-owned rules are narrowed. `QFAI-ATDD-113` / `-115` are
 * attributed to `.qfai/contracts/**`, which no spec owns, so there is nothing
 * to narrow them by; `qfai-atdd/SKILL.md` states that limit rather than this
 * hiding it.
 */
function narrowToScope(
  result: AtddCodeTraceabilityResult,
  scope: SpecScope | undefined,
): AtddCodeTraceabilityResult {
  if (scope === undefined) {
    return result;
  }
  const inScope = (ref: string): boolean => {
    const number = OWNING_SPEC_RE.exec(ref)?.[1];
    return number === undefined || scope.has(number);
  };
  // The forbidden lists are narrowed on the same terms. Their findings are
  // filed against a `tests/**` path, which `specsRoot` does not own, so a
  // sibling's misplaced annotation survived every filter and failed a scoped
  // gate the requested spec had fully discharged. An entry left with no
  // in-scope id is dropped entirely rather than reported with an empty list.
  const narrowForbidden = (
    entries: Array<{ file: string; ids: string[] }>,
  ): Array<{ file: string; ids: string[] }> =>
    entries
      .map((entry) => ({ ...entry, ids: entry.ids.filter(inScope) }))
      .filter((entry) => entry.ids.length > 0);

  return {
    ...result,
    missing: {
      ...result.missing,
      us: result.missing.us.filter(inScope),
      tc: result.missing.tc.filter(inScope),
    },
    forbidden: {
      tcInApi: narrowForbidden(result.forbidden.tcInApi),
      tcInE2e: narrowForbidden(result.forbidden.tcInE2e),
      tcInIntegration: narrowForbidden(result.forbidden.tcInIntegration),
    },
  };
}

/**
 * Spec directories implicated by a list of `SPEC-NNNN:*` refs, first one first.
 *
 * `QFAI-ATDD-111` and `QFAI-ATDD-112` were filed against `specsRoot` itself.
 * `owningSpecNumber` returns `null` for a path that is not inside a
 * `spec-NNNN` directory, and `isPathInSpecScope` treats an unowned path as
 * belonging to every scope — so both findings survived every `--spec` filter,
 * and a spec that had discharged all of its own obligations still failed its
 * gate on a sibling's. Attributing the finding to the specs it actually names
 * follows the representative-plus-`relatedFiles` shape `QFAI-ID-001` already
 * uses for a multi-file finding.
 *
 * Contract-owned findings (`QFAI-ATDD-113` / `-115`) are deliberately left
 * repo-wide: `.qfai/contracts/**` has no spec owner in the model, so there is
 * nothing to attribute them to.
 */
function owningSpecDirs(refs: readonly string[], specsRoot: string): string[] {
  const numbers = new Set<string>();
  for (const ref of refs) {
    const number = OWNING_SPEC_RE.exec(ref)?.[1];
    if (number !== undefined) {
      numbers.add(number);
    }
  }
  return Array.from(numbers)
    .sort((left, right) => left.localeCompare(right))
    .map((number) => path.join(specsRoot, `spec-${number}`));
}

/**
 * Splits owning spec directories into the finding's representative `file` and
 * its `relatedFiles`. Falls back to `specsRoot` when no ref names a spec, which
 * keeps the previous behaviour for a malformed ref rather than dropping the
 * finding's location entirely.
 */
function specAttribution(
  refs: readonly string[],
  specsRoot: string,
): { file: string; relatedFiles: string[] } {
  const dirs = owningSpecDirs(refs, specsRoot);
  const [first, ...rest] = dirs;
  return { file: first ?? specsRoot, relatedFiles: rest };
}

type AtddTraceabilitySummary = {
  missing: {
    us: string[];
    tc: string[];
    conApi: string[];
    conDb: string[];
  };
  /** Missing TC ref -> the test directory its declared `Level` routes to. */
  missingTcHomes: Record<string, string>;
  /**
   * `CON-API-*` IDs whose contract declares `x-qfai-status: planned`, so they
   * are outside the `QFAI-ATDD-113` obligation. Persisted because
   * `missing.conApi: []` alone cannot tell "every contract is covered" apart
   * from "every contract is deferred" — the audit artifact has to answer that.
   */
  deferred: {
    conApi: string[];
    conDb: string[];
  };
  unknown: Array<{ file: string; token: string }>;
  forbidden: {
    tcInApi: Array<{ file: string; ids: string[] }>;
    tcInE2e: Array<{ file: string; ids: string[] }>;
    tcInIntegration: Array<{ file: string; ids: string[] }>;
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
  options: { specScope?: SpecScope } = {},
): Promise<Issue[]> {
  const evaluated = await evaluateAtddCodeTraceability(root, config);
  // A `--spec` run must not put a sibling spec's ids in this run's message.
  // `isFindingInSpecScope` decides whether a finding survives, but it cannot
  // edit one — so a scoped run kept the finding (correctly, the requested spec
  // is implicated) while its message, `refs` and GitHub annotation still
  // listed every other spec's missing obligations. Narrowing the ref lists
  // before the messages are built is what makes "this spec's obligations only"
  // true of the output and not just of the exit code.
  const result = narrowToScope(evaluated, options.specScope);
  // Display paths must follow the configured testsDir; the scan already does.
  const dirs = atddTestKindDirs(config.paths.testsDir);
  const issues: Issue[] = [];

  issues.push(...buildUnknownIssues(result.unknown));

  if (result.missing.us.length > 0) {
    const usAttribution = specAttribution(result.missing.us, result.specsRoot);
    issues.push(
      issue(
        "QFAI-ATDD-111",
        `E2E で参照されていない US があります: ${result.missing.us.join(", ")}`,
        "error",
        usAttribution.file,
        "atddCodeTraceability.coverage.usToE2e",
        result.missing.us,
        "change",
        // Conditional wording: scoping is opt-in. When no spec declares a
        // surface type the obligation stays project-wide, so an unconditional
        // "user-facing specs only" would be wrong for exactly the projects
        // that have not opted in — while the unscoped reading must not become
        // "annotate every US in the repository", which is the annotation-only
        // E2E tree `catalog/test-layers.md` forbids.
        "tests/e2e/** に `QFAI:SPEC-XXXX:US-YYYY` 注釈を追加し、上記の US を少なくとも1回参照してください。surface typing を宣言している場合、対象は user-facing surface の spec のみです。どの spec も宣言していない場合は全 spec が対象のままです（`.qfai/assistant/catalog/test-layers.md#atdd-annotation-hard-gate`）。",
        { relatedFiles: usAttribution.relatedFiles },
      ),
    );
  }

  if (result.missing.tc.length > 0) {
    const grouped = groupMissingTcByHome(result.missing.tc, result.missingTcHomes);
    const tcAttribution = specAttribution(result.missing.tc, result.specsRoot);
    issues.push(
      issue(
        "QFAI-ATDD-112",
        `宣言 Level が指すディレクトリで参照されていない TC があります: ${formatMissingTcGroups(grouped, dirs)}`,
        "error",
        tcAttribution.file,
        "atddCodeTraceability.coverage.tcToDeclaredLayer",
        result.missing.tc,
        "change",
        buildMissingTcFix(grouped, dirs),
        { relatedFiles: tcAttribution.relatedFiles },
      ),
    );
  }

  if (result.deferredApiContractIds.size > 0) {
    const deferred = Array.from(result.deferredApiContractIds).sort((left, right) =>
      left.localeCompare(right),
    );
    issues.push(
      issue(
        "QFAI-ATDD-114",
        `CON-API の API テスト義務を \`x-qfai-status: planned\` で延期しています: ${deferred.join(", ")}`,
        "info",
        result.contractsApiRoot,
        "atddCodeTraceability.coverage.conApiDeferred",
        deferred,
        "canonical",
        "スライス実装時に `x-qfai-status` を planned 以外へ戻し、tests/api/** で参照してください。",
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

  if (result.skippedTestFiles.length > 0) {
    issues.push(
      issue(
        "QFAI-ATDD-105",
        `走査対象の3ディレクトリ外にあるテストファイルは coverage に数えられません: ${result.skippedTestFiles.slice(0, 10).join(", ")}${result.skippedTestFiles.length > 10 ? ` (他 ${result.skippedTestFiles.length - 10} 件)` : ""}`,
        "info",
        result.specsRoot,
        "atddCodeTraceability.scan.skipped",
        result.skippedTestFiles.slice(0, 10),
        "canonical",
        `${dirs.integration} / ${dirs.api} / ${dirs.e2e} のいずれかに移動してください。注釈が正しくても、この3つの外にあるファイルはどのカバレッジ規則にも数えられません。`,
      ),
    );
  }

  // `CON-DB-*` is a first-class authored contract kind that nothing downstream
  // had to touch: no annotation form, no read-set entry, no coverage rule, and
  // no unknown-reference report either. These two findings are the DB peers of
  // QFAI-ATDD-113 / -114. Integration is the layer that owns them: a DB
  // contract is exercised against real infrastructure, which is L3's declared
  // scope.
  if (result.deferredDbContractIds.size > 0) {
    const deferred = Array.from(result.deferredDbContractIds).sort((left, right) =>
      left.localeCompare(right),
    );
    issues.push(
      issue(
        "QFAI-ATDD-116",
        `CON-DB の Integration テスト義務を \`-- x-qfai-status: planned\` で延期しています: ${deferred.join(", ")}`,
        "info",
        result.contractsDbRoot,
        "atddCodeTraceability.coverage.conDbDeferred",
        deferred,
        "canonical",
        `スライス実装時に \`-- x-qfai-status: planned\` を外し、${dirs.integration} で参照してください。`,
      ),
    );
  }

  if (result.missing.conDb.length > 0) {
    issues.push(
      issue(
        "QFAI-ATDD-115",
        `Integration テストで参照されていない CON-DB があります: ${result.missing.conDb.join(", ")}`,
        "error",
        result.contractsDbRoot,
        "atddCodeTraceability.coverage.conDbToIntegrationTests",
        result.missing.conDb,
        "change",
        `${dirs.integration} に \`QFAI:CON-DB-XXXX\` 注釈を追加し、\`.qfai/contracts/db\` の宣言済み CON-DB を全件参照してください。まだスライスに含まれない契約は \`-- x-qfai-status: planned\` で延期できます。`,
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
        `${dirs.api} から TC 参照を削除して契約ID（\`QFAI:CON-API-XXXX\`）を使うか、その TC の \`Level\` を \`L4\`/\`API\` に修正してください。`,
        // Attributed to the specs the misplaced ids name. `file` stays the
        // test path — that is what the operator edits — but a `tests/**`
        // path has no spec owner, so without this the finding survived every
        // `--spec` filter.
        { relatedFiles: owningSpecDirs(forbidden.ids, result.specsRoot) },
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
        `${dirs.e2e} から TC 参照を削除して US 参照（\`QFAI:SPEC-XXXX:US-YYYY\`）を使うか、その TC の \`Level\` を \`L5\`/\`E2E\` に修正してください。`,
        // Attributed to the specs the misplaced ids name. `file` stays the
        // test path — that is what the operator edits — but a `tests/**`
        // path has no spec owner, so without this the finding survived every
        // `--spec` filter.
        { relatedFiles: owningSpecDirs(forbidden.ids, result.specsRoot) },
      ),
    );
  }

  for (const forbidden of result.forbidden.tcInIntegration) {
    issues.push(
      issue(
        "QFAI-ATDD-123",
        `宣言 Level が Integration ではない TC を Integration テストで参照しています: ${forbidden.ids.join(", ")}`,
        "error",
        forbidden.file,
        "atddCodeTraceability.forbidden.tcInIntegration",
        forbidden.ids,
        "change",
        `TC 注釈は宣言 Level が指す1ディレクトリだけに置きます。${dirs.integration} に残存する TC 参照を削除するか、その TC の \`Level\` を \`L3\`/\`Integration\` に戻してください。`,
        // Attributed to the specs the misplaced ids name. `file` stays the
        // test path — that is what the operator edits — but a `tests/**`
        // path has no spec owner, so without this the finding survived every
        // `--spec` filter.
        { relatedFiles: owningSpecDirs(forbidden.ids, result.specsRoot) },
      ),
    );
  }

  try {
    // `evaluated`, not `result`: `.qfai/report/atdd-traceability/` is a single
    // shared path with no scope in its name, so writing the narrowed set there
    // let a `--spec 0002` gate overwrite the repo-wide audit artifact with a
    // partial one — and two per-spec runs would leave the last writer's spec
    // only, with `summary.json` and `summary.md` possibly from different runs.
    // The report stays repo-wide under every scope, which also makes a
    // concurrent overwrite harmless: both writers produce the same content.
    await writeAtddTraceabilityReport(root, config, evaluated);
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

function formatMissingTcGroups(
  grouped: Map<AtddTestKind, string[]>,
  dirs: Record<AtddTestKind, string>,
): string {
  return orderedMissingTcGroups(grouped)
    .map(([kind, refs]) => `${dirs[kind]} -> ${refs.join(", ")}`)
    .join(" / ");
}

function buildMissingTcFix(
  grouped: Map<AtddTestKind, string[]>,
  dirs: Record<AtddTestKind, string>,
): string {
  const perHome = orderedMissingTcGroups(grouped)
    .map(([kind, refs]) => `${dirs[kind]}: ${refs.join(", ")}`)
    .join(" / ");
  return `各 TC の宣言 Level が指すディレクトリに \`QFAI:SPEC-XXXX:TC-YYYY\` 注釈を追加してください（L3/Integration -> ${dirs.integration}、L4/API -> ${dirs.api}、L5/E2E -> ${dirs.e2e}、Level 未宣言は ${dirs.integration}）: ${perHome}`;
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
      if (entry.kind === "conDb") {
        return issue(
          "QFAI-ATDD-104",
          `未定義の CON-DB 参照を検出しました: ${refs.join(", ")}`,
          "error",
          entry.file,
          "atddCodeTraceability.unknown.conDb",
          refs,
          "change",
          "contracts/db に CON-DB を宣言するか、テスト注釈を正しい ID へ修正してください。",
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

  // Hoisted out of the `missing.tc` map below: the directory table depends only
  // on the configured testsDir, so rebuilding it per missing ref was pure
  // repetition.
  const testKindDirs = atddTestKindDirs(config.paths.testsDir);

  const summary: AtddTraceabilitySummary = {
    missing: {
      us: result.missing.us,
      tc: result.missing.tc,
      conApi: result.missing.conApi,
      conDb: result.missing.conDb,
    },
    deferred: {
      conApi: Array.from(result.deferredApiContractIds).sort((left, right) =>
        left.localeCompare(right),
      ),
      conDb: Array.from(result.deferredDbContractIds).sort((left, right) =>
        left.localeCompare(right),
      ),
    },
    unknown: result.unknown.map((entry) => ({
      file: entry.file,
      token: entry.token,
    })),
    missingTcHomes: Object.fromEntries(
      result.missing.tc.map((ref) => [
        ref,
        testKindDirs[result.missingTcHomes.get(ref) ?? "integration"],
      ]),
    ),
    forbidden: {
      tcInApi: result.forbidden.tcInApi,
      tcInE2e: result.forbidden.tcInE2e,
      tcInIntegration: result.forbidden.tcInIntegration,
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
  lines.push("- CON-DB -> Integration");
  lines.push(...toList(summary.missing.conDb));
  lines.push("");
  lines.push("## Deferred Coverage");
  lines.push("");
  lines.push("- CON-API (`x-qfai-status: planned`, outside QFAI-ATDD-113)");
  lines.push(...toList(summary.deferred.conApi));
  lines.push("- CON-DB (`-- x-qfai-status: planned`, outside QFAI-ATDD-115)");
  lines.push(...toList(summary.deferred.conDb));
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
  lines.push("- TC outside its declared home in tests/integration/**");
  lines.push(...toFileIdList(summary.forbidden.tcInIntegration));
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
