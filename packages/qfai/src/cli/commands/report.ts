import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ConfigLoadResult, FailOn, QfaiConfig } from "../../core/config.js";
import { loadConfig, resolvePath } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { buildCiProfileIssue } from "../../core/phasePolicy.js";
import { createReportData, formatReportJson, formatReportMarkdown } from "../../core/report.js";
import { writeSpecPackReports } from "../../core/specPackReport.js";
import { buildSpecScope } from "../../core/specScope.js";
import type { ValidationProfile, ValidationResult } from "../../core/types.js";
import { countIssues, validateProject } from "../../core/validate.js";
import { shouldFail } from "../lib/failOn.js";
import { error, info, warn } from "../lib/logger.js";
import { warnIfTruncated } from "../lib/warnings.js";
import {
  appendIssue,
  evaluateLegacyValidateJsonGate,
  profileSuffixedReportPath,
  scopedReportPath,
} from "./validate.js";

export type ReportOptions = {
  root: string;
  format: "md" | "json";
  outPath?: string;
  inputPath?: string;
  runValidate?: boolean;
  baseUrl?: string;
  profile?: ValidationProfile;
  failOn?: FailOn;
  strict?: boolean;
  /** `--spec <id>` values; empty / absent = the whole repo. */
  specIds?: readonly string[];
  /**
   * Override the tool version observed by the legacy-path migration gate
   * under `--run-validate`. Tests use this to pin either side of the sunset;
   * production reads `packages/qfai/package.json#version`, same as `validate`.
   */
  toolVersionOverride?: string;
};

type ReportPaths = {
  /** Where the validate result is read from (or written to under `--run-validate`). */
  validateJsonPath: string;
  /** Absolute path the rendered report is written to. */
  outPath: string;
};

/**
 * Resolves the validate-result path and the rendered-report path, applying
 * `--spec` scoping when present.
 *
 * A scoped run reads `validate.spec-<ids>.json` — what `validate --spec` wrote
 * — and writes `report.spec-<ids>.md` / `.json`, so parallel slice workers stop
 * racing on the shared `report.md`. An explicit `--out` still wins.
 *
 * `null` when any `--spec` value carries no resolvable spec number: the same
 * refusal `scopedReportPath` makes for `validate`, so raw input never reaches a
 * filename and a failing scope never writes the file a healthy one would.
 */
function resolveReportPaths(
  root: string,
  config: QfaiConfig,
  options: ReportOptions,
): ReportPaths | null {
  const outRoot = resolvePath(root, config, "outDir");
  const defaultOut =
    options.format === "json" ? path.join(outRoot, "report.json") : path.join(outRoot, "report.md");
  const configuredValidateJson = config.output.validateJsonPath;
  const specIds = options.specIds ?? [];
  const scopedValidateJson =
    specIds.length > 0 ? scopedReportPath(configuredValidateJson, specIds) : configuredValidateJson;
  const scopedOut = specIds.length > 0 ? scopedReportPath(defaultOut, specIds) : defaultOut;
  if (scopedValidateJson === null || scopedOut === null) {
    return null;
  }
  const out = options.outPath ?? scopedOut;
  return {
    validateJsonPath: scopedValidateJson,
    outPath: path.isAbsolute(out) ? out : path.resolve(root, out),
  };
}

/**
 * True when an explicit `--in` file carries the scope the run was asked for.
 *
 * `--in` hands `runReport` a `ValidationResult` verbatim — `issues`, `counts`,
 * SC coverage and the waiver aggregates are whatever the producing run
 * computed. Scoping the output *name* does nothing to that body, so
 * `report --spec 0004 --in <repo-wide validate.json>` wrote sibling specs'
 * findings into `report.spec-0004.md`. Re-filtering the input is not a way out
 * either: `waivers.suppressed.byWaiver` attributes each suppression to a waiver
 * id the surviving `Issue` no longer names, so that aggregate cannot be
 * recomputed from the file alone and the report would still be part repo-wide.
 *
 * The provenance that does exist is the filename `validate --spec` writes, so
 * that is what is checked — same basename, any directory, which keeps `--in`
 * useful for a slice whose validate result lives outside `outDir`.
 *
 * `--profile` adds a second suffix on top of the scope one, so the run's own
 * `validate.spec-<ids>-<profile>.json` carries the requested scope just as
 * `validate.spec-<ids>.json` does and is accepted alongside it. A sibling
 * profile's file is not: within a scoped run the filename is the only scope
 * provenance there is, and admitting an arbitrary suffix would readmit the
 * mixed-scope body this check exists to refuse.
 */
function inputCarriesRequestedScope(
  inputPath: string,
  scopedValidateJsonPath: string,
  profile: ValidationProfile | undefined,
): boolean {
  const accepted = new Set([path.basename(scopedValidateJsonPath)]);
  if (profile) {
    accepted.add(path.basename(profileSuffixedReportPath(scopedValidateJsonPath, profile)));
  }
  return accepted.has(path.basename(inputPath));
}

/**
 * The ENOENT guidance for a missing validate result.
 *
 * A scoped run reads `validate.spec-<ids>.json`, so the unscoped text — "run
 * `qfai validate`, output `.qfai/report/validate.json`" — named a file this
 * command will never read: following it verbatim left the scoped input missing
 * and the very same `report --spec` exited 2 again. The scoped branch therefore
 * repeats the caller's own `--spec` values on both suggested commands.
 *
 * `--profile` has the same failure mode for the same reason — the reader falls
 * through to `validate-<profile>.json` — so the suggested commands repeat it
 * too, and the quoted destination is the path this run would actually read
 * rather than a fixed literal.
 */
function buildMissingInputGuidance(
  inputPath: string,
  specIds: readonly string[],
  profile: ValidationProfile | undefined,
  expectedValidateJsonPath: string,
): string {
  const header = [`qfai report: 入力ファイルが見つかりません: ${inputPath}`, ""];
  const profileArg = profile ? ` --profile ${profile}` : "";
  if (specIds.length === 0) {
    return [
      ...header,
      "まず qfai validate を実行してください。例:",
      `  qfai validate${profileArg}`,
      `（デフォルトの出力先: ${expectedValidateJsonPath}）`,
      "",
      "または report に --run-validate を指定してください。",
      "GitHub Actions テンプレを使っている場合は、workflow の validate ジョブを先に実行してください。",
    ].join("\n");
  }
  const specArgs = specIds.map((id) => `--spec ${id}`).join(" ");
  return [
    ...header,
    `--spec 付きの report は scoped な validate 結果を読みます。まず同じ --spec で validate を実行してください。例:`,
    `  qfai validate ${specArgs}${profileArg}`,
    `（出力先: ${expectedValidateJsonPath}）`,
    "",
    `または report 自身に --run-validate を指定してください。例:`,
    `  qfai report ${specArgs}${profileArg} --run-validate`,
  ].join("\n");
}

/**
 * レポートを書き出し、`validate` と同じ基準で終了コードを返す。
 * 0=gate 通過 / 1=gate 不通過 / 2=usage / 入力 validate.json 欠如。
 */
export async function runReport(options: ReportOptions): Promise<number> {
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  const specIds = options.specIds ?? [];
  const paths = resolveReportPaths(root, configResult.config, options);
  if (paths === null) {
    error(
      [
        `qfai report: --spec の値を spec 番号として解釈できません: ${specIds.join(", ")}`,
        "例: --spec 0003 / --spec spec-0004",
      ].join("\n"),
    );
    return 2;
  }
  let validation: ValidationResult;
  let ranNarrowProfileInCi = false;
  if (options.runValidate) {
    if (options.inputPath) {
      warn("report: --run-validate が指定されたため --in は無視します。");
    }
    const ran = await runValidateForReport(root, configResult, options, paths.validateJsonPath);
    ranNarrowProfileInCi = ran.ranNarrowProfileInCi;
    validation = ran.validation;
  } else {
    const inputPath = resolveInputPath(
      root,
      paths.validateJsonPath,
      options.inputPath,
      options.profile,
    );
    if (
      options.inputPath !== undefined &&
      specIds.length > 0 &&
      !inputCarriesRequestedScope(inputPath, paths.validateJsonPath, options.profile)
    ) {
      const specArgs = specIds.map((id) => `--spec ${id}`).join(" ");
      error(
        [
          `qfai report: --in の validate 結果が --spec の scope と一致しません: ${inputPath}`,
          `--spec 付きの report は counts / issues / SC coverage / waiver 集計を入力ファイルからそのまま採用するため、repo 全体や別 spec の結果を渡すと scope 外の結果が出力に混ざります。`,
          `${path.basename(paths.validateJsonPath)} という名前の scoped な validate 結果を指定してください。例:`,
          `  qfai validate ${specArgs}`,
          `  qfai report ${specArgs}`,
        ].join("\n"),
      );
      return 2;
    }
    const loaded = await loadValidationResult(
      inputPath,
      specIds,
      options.profile,
      resolveInputPath(root, paths.validateJsonPath, undefined, options.profile),
    );
    if (loaded === null) {
      return 2;
    }
    warnOnProfileMismatch(inputPath, loaded, options.profile);
    // --run-validate 側と同じく、CI で narrow profile を使ったことを報告する。
    // ここでは finding を足さない: 読み込んだ validate 出力には、それを書いた
    // validate 実行が既に QFAI-VALIDATE-017 を載せている。
    //
    // 判定は「指定した profile」ではなく「実際にレポートへ採用した profile」で
    // 行う。明示 `--in` は不一致でも優先されるので、`--profile sdd --in
    // validate-prototyping.json` のような組み合わせでは成果物側の profile が
    // 実態を表す。profile 未記録の旧形式のときだけ指定値へフォールバックする。
    ranNarrowProfileInCi = buildCiProfileIssue(loaded.profile ?? options.profile) !== null;
    validation = loaded;
  }

  // The rendered body has to honour the same scope as the filename: a scoped
  // run that re-walked every spec put sibling specs — including ones another
  // worker was mid-edit on — inside `report.spec-<ids>.md`.
  const data = await createReportData(
    root,
    validation,
    configResult,
    specIds.length > 0 ? { specIds } : {},
  );
  warnIfTruncated(data.traceability.testFiles, "report");
  const output =
    options.format === "json"
      ? formatReportJson(data)
      : options.baseUrl
        ? formatReportMarkdown(data, { baseUrl: options.baseUrl })
        : formatReportMarkdown(data);

  const outPath = paths.outPath;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${output}\n`, "utf-8");
  // Scoped: touch only the packs this run owns. An unscoped call rewrites every
  // spec pack, which is how a slice worker clobbered its siblings' artifacts.
  await writeSpecPackReports(root, configResult.config, buildSpecScope(specIds));

  if (ranNarrowProfileInCi) {
    // Reported, not fatal: the run happened and its findings are real. Exiting
    // non-zero here made every stage gate that names a narrow profile
    // unreachable in CI.
    warn(
      "report: CI で full-scan ではない profile を実行しました。stage gate としては有効ですが、完了宣言の前に --profile full（または --profile 指定なし）で full-scan を実行してください。",
    );
  }
  // `report --run-validate` は CI の単一ステップとして使われる。gate を
  // 持たないと validate が拒否する状態でも永続的に緑になるため、validate と
  // 同じ failOn 解決と severity 比較で終了コードを決める。
  const failOn = resolveFailOn(options, configResult.config.validation.failOn);
  info(
    `report: info=${validation.counts.info} warning=${validation.counts.warning} error=${validation.counts.error} failOn=${failOn}`,
  );
  info(`wrote report: ${outPath}`);
  return shouldFail(validation, failOn) ? 1 : 0;
}

/**
 * `--run-validate`: run the same validators `qfai validate` runs, apply the
 * same post-processing, and write the same (scope-resolved) validate result.
 *
 * The post-processing is shared, not re-implemented: `report --run-validate`
 * is documented as the single-step CI usage, so a finding `validate` raises
 * (here the legacy-path `D-DEPRECATED-PATH` migration gate) must reach this
 * exit code too, and a write `validate` refuses must be refused here as well.
 * Otherwise a project whose `output.validateJsonPath` still names the legacy
 * SSOT sees `qfai validate` exit 1 and refuse the write while `qfai report
 * --run-validate` re-creates the deprecated file and exits 0.
 *
 * `writeTo` is the scope-resolved target, so a post-sunset refusal covers the
 * scoped `validate.spec-<ids>.json` as well: a brand-new file inside the
 * directory the sunset exists to retire would read as "still fine to write
 * here". The scope also reaches the gate itself — `scopedSpecIds` is what
 * keeps the PRE-sunset writer-side notice off a slice that writes no shared
 * report at all.
 */
async function runValidateForReport(
  root: string,
  configResult: ConfigLoadResult,
  options: ReportOptions,
  writeTo: string,
): Promise<{ validation: ValidationResult; ranNarrowProfileInCi: boolean }> {
  const specIds = options.specIds ?? [];
  const ciProfileIssue = buildCiProfileIssue(options.profile);
  const validated = await validateProject(root, configResult, {
    ...(options.profile ? { profile: options.profile } : {}),
    ...(specIds.length > 0 ? { specIds } : {}),
  });
  const withCiIssue = ciProfileIssue ? appendIssue(validated, ciProfileIssue) : validated;
  const legacyGate = await evaluateLegacyValidateJsonGate({
    root,
    configuredValidateJsonPath: configResult.config.output.validateJsonPath,
    ...(options.toolVersionOverride !== undefined
      ? { toolVersionOverride: options.toolVersionOverride }
      : {}),
    scopedSpecIds: specIds,
  });
  const gated = legacyGate.issue ? appendIssue(withCiIssue, legacyGate.issue) : withCiIssue;
  const normalized = normalizeValidationResult(root, gated);
  if (!legacyGate.refuseConfiguredLegacyWrite) {
    await writeValidationResults(root, writeTo, normalized, options.profile);
  }
  return { validation: normalized, ranNarrowProfileInCi: ciProfileIssue !== null };
}

function resolveFailOn(options: ReportOptions, fallback: FailOn): FailOn {
  if (options.failOn) {
    return options.failOn;
  }
  if (options.strict) {
    return "warning";
  }
  return fallback;
}

/**
 * 読み取り側 (`--run-validate` なし) の入力パスを決める。
 *
 * `--profile` が指定されたときは、常に最新のポインタ (`validate.json`) では
 * なく profile 接尾辞付きファイルを読む。`validate.json` は「最後に走った
 * profile」の出力でしかなく、CLI コントラクトの Consumer rule も profile で
 * スコープする読み手には接尾辞付きファイルを要求している。明示された `--in`
 * は運用者の意思なので、常にそちらを優先する。
 */
function resolveInputPath(
  root: string,
  configuredPath: string,
  inputPath: string | undefined,
  profile: ValidationProfile | undefined,
): string {
  const input =
    inputPath ?? (profile ? profileSuffixedReportPath(configuredPath, profile) : configuredPath);
  return path.isAbsolute(input) ? input : path.resolve(root, input);
}

/**
 * 入力の validate 出力を読む。見つからないときは案内を出して `null` を返す
 * (呼び出し側が exit code を立てる)。それ以外の失敗はそのまま投げる。
 *
 * 案内文は `buildMissingInputGuidance` に委ねる: `--spec` と `--profile` は
 * どちらも読み取り先のファイル名を変えるので、片方だけを知っている文面は
 * 「その通りに実行してもまた同じ exit 2 になる」案内になる。
 */
async function loadValidationResult(
  inputPath: string,
  specIds: readonly string[],
  profile: ValidationProfile | undefined,
  expectedValidateJsonPath: string,
): Promise<ValidationResult | null> {
  try {
    return await readValidationResult(inputPath);
  } catch (err) {
    if (isEnoent(err)) {
      error(buildMissingInputGuidance(inputPath, specIds, profile, expectedValidateJsonPath));
      return null;
    }
    throw err;
  }
}

/**
 * 読み込んだ validate 出力の profile が `--profile` と食い違うときに警告する。
 * 接尾辞付きファイルを読む経路では通常起きないが、`--in` で別 profile の
 * 出力を指した場合はここだけが唯一の検出点になる。
 */
function warnOnProfileMismatch(
  inputPath: string,
  validation: ValidationResult,
  profile: ValidationProfile | undefined,
): void {
  if (!profile || validation.profile === undefined || validation.profile === profile) {
    return;
  }
  warn(
    `report: --profile ${profile} を指定しましたが、入力 ${inputPath} は profile "${validation.profile}" の実行結果です。` +
      `そのままの数値でレポートを生成します。`,
  );
}

async function readValidationResult(inputPath: string): Promise<ValidationResult> {
  const raw = await readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isValidationResult(parsed)) {
    throw new Error(`validate.json の形式が不正です: ${inputPath}`);
  }
  return reconcileCounts(parsed, inputPath);
}
/**
 * `--in` の `counts` は外部ファイル由来で、`issues` と食い違いうる（古い
 * validate.json、手編集、部分的な書き換え）。gate も report 本文のサマリも
 * `counts` を読むため、食い違いを放置すると error を列挙したレポートが
 * exit 0 で緑になる。`issues` から（suppressed を除いて）数え直し、差異は
 * 警告した上で数え直した値を採用する。
 */
function reconcileCounts(result: ValidationResult, inputPath: string): ValidationResult {
  const recounted = countIssues(result.issues);
  const stated = result.counts;
  if (
    recounted.info === stated.info &&
    recounted.warning === stated.warning &&
    recounted.error === stated.error
  ) {
    return result;
  }
  warn(
    [
      `report: ${inputPath} の counts が issues と一致しません`,
      `(counts: info=${stated.info} warning=${stated.warning} error=${stated.error} /`,
      `issues: info=${recounted.info} warning=${recounted.warning} error=${recounted.error})。`,
      "issues から数え直した値で集計と gate 判定を行います。",
    ].join(" "),
  );
  return { ...result, counts: recounted };
}

/**
 * The two fields the recount reads off an `--in` issue.
 *
 * `severity` picks the bucket, and `suppressed` decides whether the issue is
 * counted at all. `countIssues` tests `suppressed` for truthiness, so a
 * hand-written or externally generated `"suppressed": "false"` is a
 * *suppression* — an error carrying one drops out of the recount and takes the
 * gate's only reason to fail with it, on the very input the gate was just
 * taught to trust. Neither field may arrive as anything but what its type
 * allows: `severity` one of the three names, `suppressed` absent or a boolean.
 */
function isGateReadableIssue(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }
  const severity: unknown = Reflect.get(issue, "severity");
  if (severity !== "info" && severity !== "warning" && severity !== "error") {
    return false;
  }
  const suppressed: unknown = Reflect.get(issue, "suppressed");
  return suppressed === undefined || typeof suppressed === "boolean";
}

function isValidationResult(value: unknown): value is ValidationResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.toolVersion !== "string") {
    return false;
  }
  const profile = record.profile;
  if (
    profile !== undefined &&
    profile !== "discussion" &&
    profile !== "sdd" &&
    profile !== "prototyping" &&
    profile !== "atdd" &&
    profile !== "tdd" &&
    profile !== "verify" &&
    profile !== "full" &&
    profile !== "saas-package"
  ) {
    return false;
  }
  // `severity` and `suppressed` are load-bearing: the gate counts by the first
  // and skips on the second, so a value of the wrong type would silently drop
  // out of the recount instead of failing loudly.
  if (!Array.isArray(record.issues) || !record.issues.every(isGateReadableIssue)) {
    return false;
  }
  const counts = record.counts as Record<string, unknown> | undefined;
  if (!counts) {
    return false;
  }
  if (
    typeof counts.info !== "number" ||
    typeof counts.warning !== "number" ||
    typeof counts.error !== "number"
  ) {
    return false;
  }

  const traceability = record.traceability as Record<string, unknown> | undefined;
  if (!traceability || typeof traceability !== "object") {
    return false;
  }

  const sc = traceability.sc as Record<string, unknown> | undefined;
  const testFiles = traceability.testFiles as Record<string, unknown> | undefined;
  if (!sc || !testFiles) {
    return false;
  }
  if (
    typeof sc.total !== "number" ||
    typeof sc.covered !== "number" ||
    typeof sc.missing !== "number"
  ) {
    return false;
  }
  if (!Array.isArray(sc.missingIds)) {
    return false;
  }
  if (!sc.refs || typeof sc.refs !== "object") {
    return false;
  }
  if (
    !Array.isArray(testFiles.globs) ||
    !Array.isArray(testFiles.excludeGlobs) ||
    typeof testFiles.matchedFileCount !== "number"
  ) {
    return false;
  }

  return true;
}

/**
 * `--run-validate` の検証結果を、通常の `qfai validate` と同じ 2 か所に書く:
 * 常に最新のポインタ (`validate.json`) と profile 接尾辞付きファイル
 * (`validate-<profile>.json`)。
 *
 * 読み取り側 (`resolveInputPath`) は `--profile` 指定時に必ず接尾辞付き
 * ファイルを見るので、ここで接尾辞付きを更新しないと、後続の
 * `qfai report --profile X` が「ファイルが無い」で exit 2 になるか、
 * 古い実行結果からレポートを作ってしまう。
 */
async function writeValidationResults(
  root: string,
  configuredPath: string,
  result: ValidationResult,
  requestedProfile: ValidationProfile | undefined,
): Promise<void> {
  await writeValidationResult(root, configuredPath, result);
  const profileLabel = result.profile ?? requestedProfile ?? "full";
  await writeValidationResult(
    root,
    profileSuffixedReportPath(configuredPath, profileLabel),
    result,
  );
}

async function writeValidationResult(
  root: string,
  outputPath: string,
  result: ValidationResult,
): Promise<void> {
  const abs = path.isAbsolute(outputPath) ? outputPath : path.resolve(root, outputPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
}
