export type ParsedArgs = {
  command: string | null;
  invalid: boolean;
  options: {
    root: string;
    rootExplicit: boolean;
    dir: string;
    force: boolean;
    yes: boolean;
    dryRun: boolean;
    upgradeAssistantTree: boolean;
    reportFormat: "md" | "json";
    reportOut?: string;
    reportIn?: string;
    reportRunValidate: boolean;
    reportBaseUrl?: string;
    doctorFormat: "text" | "json";
    doctorOut?: string;
    validateFormat: "text" | "github";
    profile?:
      | "discussion"
      | "sdd"
      | "prototyping"
      | "atdd"
      | "tdd"
      | "verify"
      | "full"
      | "saas-package";
    /**
     * `qfai doctor --profile <skill>` per-skill profile. Distinct from
     * the validate-side `profile` enum above: when `doctor --profile`
     * receives a value outside the validate enum, the parser routes it
     * here so the doctor command can probe the named skill manifest.
     */
    doctorSkillProfile?: string;
    /** `qfai doctor --clean`: archive TTL-expired review packs. */
    doctorClean?: boolean;
    /** `qfai doctor --autoremediate`: orchestrate install + clean + config. */
    doctorAutoremediate?: boolean;
    strict: boolean;
    failOn?: "never" | "warning" | "error";
    guardrailsAction?: "list" | "extract" | "check";
    guardrailsPaths: string[];
    guardrailsMax?: number;
    guardrailsKeyword?: string;
    /** --format <text|json> for `qfai guardrails list|extract|check`. */
    guardrailsFormat?: "text" | "json";
    platform?: string;
    prototypingAction?: "preflight" | "iterate" | "certify" | "show-spec";
    prototypingTargetUrl?: string;
    /** Subcommand for `qfai discussion <list|use>`. */
    discussionAction?: "list" | "use";
    /** --active for `qfai discussion list`. */
    discussionActive?: boolean;
    /** --format <text|json> for `qfai discussion list --active`. */
    discussionFormat?: "text" | "json";
    /** Positional `<id>` for `qfai discussion use <id>`. */
    discussionId?: string;
    /** --cycle <n> for `qfai prototyping iterate --cycle <n>`. */
    prototypingCycle?: number;
    /** --check flag for `qfai prototyping certify --check`. */
    prototypingCheckOnly?: boolean;
    /**
     * --scope <saas-package|full> for `qfai prototyping certify`. When
     * set to `saas-package`, the sealed certificate carries
     * `scope: "saas-package"` + `notes[]` enumerating the gates the
     * saas-package profile deliberately skips. Default (omitted) seals
     * a full-scope certificate.
     */
    prototypingScope?: "saas-package" | "full";
    /**
     * --upgrade-scope full for `qfai prototyping certify`. Re-gates the
     * gates skipped by the existing scope-limited certificate against
     * the current project state; rewrites the certificate without the
     * scope-limited markers on success.
     */
    prototypingUpgradeScopeFull?: boolean;
    /** --license-patch <file> for `qfai prototyping iterate`. */
    prototypingLicensePatch?: string;
    /** --primary-spec-id <value> for `qfai prototyping iterate`. */
    prototypingPrimarySpecId?: string;
    /**
     * --check-convergence for `qfai prototyping iterate`. Read-only peek
     * of the canonical prototyping state file; reports stopReason +
     * acceptedIterationIndex without re-running the iterate loop.
     */
    prototypingCheckConvergence?: boolean;
    /**
     * --capture for `qfai prototyping iterate`. Opt-in PNG/HTML capture
     * (default OFF; preserves the no-capture default posture). When
     * present, iterate threads `capture: true` into runPrototypingIterate
     * and the default Playwright runner is loaded dynamically when no
     * DI captureScreen is supplied.
     */
    prototypingCapture?: boolean;
    /**
     * --auto-serve for `qfai prototyping iterate`. Opt-in local HTTP
     * server spawn (default OFF; preserves the no-server default
     * posture). When present, iterate threads `autoServe: true` into
     * runPrototypingIterate and the default in-process HTTP server
     * runner is loaded dynamically when no DI serverRunner is supplied.
     */
    prototypingAutoServe?: boolean;
    /**
     * --emit-skeletons for `qfai prototyping iterate --cycle 0`. Opt-in
     * cycle-0 token-driven placeholder HTML emission (default OFF;
     * preserves prior-release bit-for-bit behavior). Only meaningful at cycle 0;
     * silently ignored on other cycles today.
     */
    prototypingEmitSkeletons?: boolean;
    /**
     * --skeleton-mode for `qfai prototyping iterate --cycle 0
     * --emit-skeletons`. Selects the renderer behavior:
     *   - `placeholder` (default): DESIGN.md-token-styled static HTML,
     *     no per-screen LLM call
     *   - `full`: callers may replace the body via generation (the
     *     renderer itself never calls a model)
     *   - `stub`: minimal `<!doctype html>` marker
     * Unknown values are rejected via markInvalid().
     */
    prototypingSkeletonMode?: "placeholder" | "full" | "stub";
    /**
     * --mode for `qfai prototyping iterate`. Selects the prototyping
     * loop posture:
     *   - `convergence` (default): all gates apply at error severity.
     *   - `exploration`: medium gate relaxation — soft-rubric gates
     *     (QFAI-CRIT-008 axes-exceptional, QFAI-DCON-030..032 design
     *     compliance) downgrade error → warning. Schema / path /
     *     license (exit 66) gates stay hard error.
     * Overrides `qfai.config.yaml#prototyping.mode`. Unknown values
     * are rejected via markInvalid().
     */
    prototypingMode?: "convergence" | "exploration";
    /** Subcommand for `qfai audit <log>`. */
    auditAction?: "log";
    /** --scope filter for `qfai audit log`. */
    auditScope?: string;
    /** --operator filter for `qfai audit log`. */
    auditOperator?: string;
    /** --clause filter for `qfai audit log`. */
    auditClause?: string;
    /** --format <table|json> for `qfai audit log`. */
    auditFormat?: "table" | "json";
    /** Subcommand for `qfai handoff <upgrade>`. */
    handoffAction?: "upgrade";
    /** Positional `<legacy-file>` for `qfai handoff upgrade`. */
    handoffLegacyFile?: string;
    /** Subcommand for `qfai atdd <scaffold>`. */
    atddAction?: "scaffold";
    /** `--spec <id>` value for `qfai atdd scaffold`. */
    atddSpecId?: string;
    /** `--spec <id>` values for `qfai validate` (repeatable; empty = whole repo). */
    validateSpecIds: string[];
    /** `--spec <id>` values for `qfai report` (repeatable; empty = whole repo). */
    reportSpecIds: string[];
    help: boolean;
    /**
     * Unrecognized `--flag` tokens, in argv order. The CLI prints them
     * before the usage text so a typo names itself.
     */
    unknownFlags: string[];
    /**
     * Exit code used when `invalid` is set. CLI-arg errors (unknown
     * flag, malformed or missing value) exit 2 on every command, per
     * the exit-code table in the init CLI contract.
     */
    invalidExitCode: number;
  };
};

/** `qfai prototyping <action>` のサブコマンド名。 */
type PrototypingAction = NonNullable<ParsedArgs["options"]["prototypingAction"]>;

/** `qfai guardrails <action>` のサブコマンド名。 */
type GuardrailsAction = NonNullable<ParsedArgs["options"]["guardrailsAction"]>;

export function parseArgs(argv: string[], cwd: string): ParsedArgs {
  const options: ParsedArgs["options"] = {
    root: cwd,
    rootExplicit: false,
    dir: cwd,
    force: false,
    yes: false,
    dryRun: false,
    upgradeAssistantTree: false,
    reportFormat: "md",
    reportRunValidate: false,
    doctorFormat: "text",
    validateFormat: "text",
    strict: false,
    guardrailsPaths: [],
    validateSpecIds: [],
    reportSpecIds: [],
    help: false,
    unknownFlags: [],
    invalidExitCode: 2,
  };

  const args = [...argv];
  let command = args.shift() ?? null;
  let invalid = false;

  if (command === "--help" || command === "-h") {
    options.help = true;
    command = null;
  }

  const markInvalid = (): void => {
    invalid = true;
    options.help = true;
  };

  // 先頭トークンが `--` で始まる場合、それはコマンド名ではなく未知
  // オプションである。`command = args.shift()` で取り除かれるため下の
  // フラグループには到達せず、ここで捕まえないと main.ts の
  // unknown-command 分岐に落ちて exit 0 になってしまう
  // (`qfai --bogus`)。`--help` / `-h` は直前の分岐で null 化済み。
  if (command !== null && command.startsWith("--")) {
    options.unknownFlags.push(command);
    markInvalid();
    command = null;
  }

  /**
   * Flag-ownership guard (下の flag-handling contract rule 2 用)。
   * `qfai prototyping <action>` のサブコマンドトークンは flag loop より
   * 前に確定するため、ループ内のどの arm からでも安全に呼べる。
   */
  const ownedByPrototyping = (...actions: PrototypingAction[]): boolean => {
    if (command !== "prototyping") {
      return false;
    }
    const action = options.prototypingAction;
    return action !== undefined && actions.includes(action);
  };

  /**
   * `qfai guardrails <action>` 版の flag-ownership guard。
   * action トークンも flag loop より前に確定するため、ループ内から安全に
   * 呼べる (`--max` は extract、`--keyword` は list/extract のみが読む)。
   */
  const ownedByGuardrails = (...actions: GuardrailsAction[]): boolean => {
    if (command !== "guardrails") {
      return false;
    }
    const action = options.guardrailsAction;
    return action !== undefined && actions.includes(action);
  };

  if (command === "guardrails") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      const action = normalizeGuardrailsAction(candidate);
      if (action) {
        options.guardrailsAction = action;
      } else {
        markInvalid();
      }
      args.shift();
    }
  }

  // `qfai prototyping <subcommand>` pulls the subcommand token before the
  // flag loop.
  if (command === "prototyping") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (
        candidate === "preflight" ||
        candidate === "iterate" ||
        candidate === "certify" ||
        candidate === "show-spec"
      ) {
        options.prototypingAction = candidate;
      } else {
        markInvalid();
      }
      args.shift();
    }
  }

  // `qfai audit <subcommand>` — currently only `log` is supported.
  if (command === "audit") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (candidate === "log") {
        options.auditAction = candidate;
      } else {
        markInvalid();
      }
      args.shift();
    }
  }

  // `qfai handoff <subcommand> [<legacy-file>]` — currently only `upgrade`.
  if (command === "handoff") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (candidate === "upgrade") {
        options.handoffAction = candidate;
      } else {
        markInvalid();
      }
      args.shift();
      if (options.handoffAction === "upgrade") {
        const fileCandidate = args[0];
        if (fileCandidate && !fileCandidate.startsWith("--")) {
          options.handoffLegacyFile = fileCandidate;
          args.shift();
        }
      }
    }
  }

  // `qfai atdd <subcommand>` — currently only `scaffold` is supported.
  if (command === "atdd") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (candidate === "scaffold") {
        options.atddAction = candidate;
      } else {
        markInvalid();
      }
      args.shift();
    }
  }

  // `qfai discussion <subcommand> [<id>]` pulls the subcommand token (and the
  // positional <id> for `use`) before the flag loop.
  if (command === "discussion") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (candidate === "list" || candidate === "use") {
        options.discussionAction = candidate;
      } else {
        markInvalid();
      }
      args.shift();
      if (options.discussionAction === "use") {
        const idCandidate = args[0];
        if (idCandidate && !idCandidate.startsWith("--")) {
          options.discussionId = idCandidate;
          args.shift();
        }
      }
    }
  }

  /**
   * Value-token consumption for every value-taking flag arm below.
   * The cursor advances the moment a value token exists — before the arm
   * decides whether the flag is used on an owning command — so rule 1 / 2 of
   * the flag-handling contract holds by construction rather than by each arm
   * remembering a trailing `i += 1`.
   */
  let i = 0;
  const consumeOptionValue = (): string | null => {
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      return null;
    }
    i += 1;
    return next;
  };

  for (; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--root":
        {
          const next = consumeOptionValue();
          if (next === null) {
            markInvalid();
            break;
          }
          options.root = next;
          options.rootExplicit = true;
        }
        break;
      case "--dir":
        {
          const next = consumeOptionValue();
          if (next === null) {
            markInvalid();
            break;
          }
          options.dir = next;
        }
        break;
      case "--force":
        options.force = true;
        break;
      case "--yes":
        options.yes = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--upgrade-assistant-tree":
        options.upgradeAssistantTree = true;
        break;
      case "--format": {
        const next = consumeOptionValue();
        if (next === null) {
          // `--format` は値必須。欠落時はヘルプ表示（ただし次オプションは食わない）。
          markInvalid();
          break;
        }
        if (command === "prototyping" && options.prototypingAction !== "preflight") {
          markInvalid();
          break;
        }
        if (command === "discussion") {
          if (next === "text" || next === "json") {
            options.discussionFormat = next;
          } else {
            markInvalid();
          }
          break;
        }
        if (command === "audit") {
          if (next === "table" || next === "json") {
            options.auditFormat = next;
          } else {
            markInvalid();
          }
          break;
        }
        if (!applyFormatOption(command, next, options)) {
          markInvalid();
        }
        break;
      }
      case "--active":
        // usage(): `discussion list --active` のみ。`discussion use <id>`
        // は値を読まないので、そちらに付いた --active は誤指定。
        if (command === "discussion" && options.discussionAction === "list") {
          options.discussionActive = true;
        } else {
          markInvalid();
        }
        break;
      case "--strict":
        // usage(): validate 専用。report / doctor では runReport /
        // runDoctor が strict を読まないため、黙って捨てずに拒否する。
        if (command === "validate") {
          options.strict = true;
        } else {
          markInvalid();
        }
        break;
      case "--phase":
        markInvalid();
        consumeOptionValue();
        break;
      case "--profile": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (isValidationProfile(next)) {
          options.profile = next;
        } else if (command === "doctor" && isSkillProfileName(next)) {
          // `qfai doctor --profile <skill>` accepts arbitrary skill
          // names that fall outside the validate-side enum. The
          // doctor command threads the value into the manifest probe.
          options.doctorSkillProfile = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--clean": {
        if (command === "doctor") {
          options.doctorClean = true;
        } else {
          markInvalid();
        }
        break;
      }
      case "--autoremediate": {
        if (command === "doctor") {
          options.doctorAutoremediate = true;
        } else {
          markInvalid();
        }
        break;
      }
      case "--fail-on": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        // usage(): validate / doctor / prototyping preflight のみが
        // failOn を読む。report 等に付けても runReport は無視するため拒否。
        if (command !== "validate" && command !== "doctor" && !ownedByPrototyping("preflight")) {
          markInvalid();
          break;
        }
        if (next === "never" || next === "warning" || next === "error") {
          options.failOn = next;
        } else {
          // An unknown threshold must not fall through to the config
          // default: the gate would then silently differ from the flag
          // the caller wrote, in either direction.
          markInvalid();
        }
        break;
      }
      case "--out": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (
          command === "doctor" ||
          (command === "prototyping" && options.prototypingAction === "preflight")
        ) {
          options.doctorOut = next;
        } else if (command === "report") {
          options.reportOut = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--in": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "report") {
          options.reportIn = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--run-validate":
        if (command === "report") {
          options.reportRunValidate = true;
        } else {
          markInvalid();
        }
        break;
      case "--base-url": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "report") {
          options.reportBaseUrl = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--path": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "guardrails") {
          options.guardrailsPaths.push(next);
        } else {
          markInvalid();
        }
        break;
      }
      case "--max": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        const parsed = Number.parseInt(next, 10);
        // usage(): `guardrails extract` のみ。runGuardrails は list /
        // check パスで max を読まないため、そこでは誤指定として拒否する。
        if (!ownedByGuardrails("extract") || Number.isNaN(parsed)) {
          markInvalid();
        } else {
          options.guardrailsMax = parsed;
        }
        break;
      }
      case "--keyword": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        // usage(): `guardrails list/extract` のみ。check パスは
        // runGuardrails が keyword フィルタ前に early return する。
        if (ownedByGuardrails("list", "extract")) {
          options.guardrailsKeyword = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--platform": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "validate") {
          options.platform = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--target-url": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        // `doctor --profile prototyping` だけが同じ targetUrl 診断を通す
        // (main.ts: profile !== "prototyping" の doctor には渡らない)。
        // --profile は後続トークンにも置けるため、doctor 側の profile 検査
        // は flag loop 後の post-loop guard で行う。
        if (command === "doctor" || ownedByPrototyping("preflight", "iterate")) {
          options.prototypingTargetUrl = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--cycle": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        const parsed = parseNonNegativeInteger(next);
        if (!ownedByPrototyping("iterate") || parsed === null) {
          markInvalid();
        } else {
          options.prototypingCycle = parsed;
        }
        break;
      }
      case "--check": {
        // only used by `qfai prototyping certify --check`.
        // The flag takes no value; presence flips the boolean.
        if (ownedByPrototyping("certify")) {
          options.prototypingCheckOnly = true;
        } else {
          markInvalid();
        }
        break;
      }
      case "--license-patch": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (ownedByPrototyping("iterate")) {
          options.prototypingLicensePatch = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--primary-spec-id": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (ownedByPrototyping("iterate")) {
          options.prototypingPrimarySpecId = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--check-convergence": {
        // Read-only peek of the canonical prototyping state file. No
        // value; presence flips the boolean. Only meaningful for
        // `qfai prototyping iterate`; main.ts wires it through only on
        // the iterate path. See
        // .qfai/contracts/cli/qfai-prototyping-iterate.md.
        if (ownedByPrototyping("iterate")) {
          options.prototypingCheckConvergence = true;
        } else {
          markInvalid();
        }
        break;
      }
      case "--capture": {
        // Opt-in PNG/HTML capture. No value; presence flips the
        // boolean. Only meaningful for `qfai prototyping iterate`.
        if (ownedByPrototyping("iterate")) {
          options.prototypingCapture = true;
        } else {
          markInvalid();
        }
        break;
      }
      case "--auto-serve": {
        // Opt-in local HTTP server spawn. No value; presence flips the
        // boolean. Only meaningful for `qfai prototyping iterate`.
        if (ownedByPrototyping("iterate")) {
          options.prototypingAutoServe = true;
        } else {
          markInvalid();
        }
        break;
      }
      case "--emit-skeletons": {
        // Opt-in cycle-0 placeholder HTML emission. No value; presence
        // flips the boolean. Only meaningful for
        // `qfai prototyping iterate --cycle 0`; iterate itself ignores
        // it on cycle >= 1.
        if (ownedByPrototyping("iterate")) {
          options.prototypingEmitSkeletons = true;
        } else {
          markInvalid();
        }
        break;
      }
      case "--skeleton-mode": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (!ownedByPrototyping("iterate")) {
          markInvalid();
        } else if (next === "placeholder" || next === "full" || next === "stub") {
          options.prototypingSkeletonMode = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--mode": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (!ownedByPrototyping("iterate")) {
          markInvalid();
        } else if (next === "convergence" || next === "exploration") {
          options.prototypingMode = next;
        } else {
          markInvalid();
        }
        break;
      }
      // Flag-handling contract — governs EVERY command-specific arm of
      // this switch, not a named subset. (Genuinely global flags —
      // `--root`, `--dir`, `--force`, `--yes`, `--dry-run`, `--help` —
      // are exempt because they have no owning command. `--strict` and
      // `--fail-on` are NOT global: `usage()` scopes them to validate
      // and to validate / doctor / prototyping preflight respectively,
      // so they carry owner tests like every other arm.)
      //   1. A value-taking flag always reads its value token via
      //      `consumeOptionValue()`, which advances the cursor as part
      //      of the read. A missing value (`null`) is a parse error →
      //      `markInvalid()`.
      //   2. When the flag is used on a command / subcommand that does
      //      NOT own it, also call `markInvalid()` so the misuse is
      //      surfaced rather than silently dropped. The value token is
      //      STILL consumed so it cannot leak into the positional
      //      stream — keeping consumption symmetric across all
      //      value-taking flags.
      //   3. The accepting-subcommand branch performs any per-flag
      //      enum / domain validation and routes the value to the
      //      right option slot.
      // Ownership is the one documented in `usage()` (main.ts); the
      // `prototyping` subcommand arms use `ownedByPrototyping()`.
      // Pre-fix `--scope` (consumed-on-misuse) and `--upgrade-scope`
      // (not-consumed-on-misuse) used opposite conventions for the
      // same goal; this contract block plus the unified shape below
      // resolves the asymmetry.
      case "--spec": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "atdd") {
          options.atddSpecId = next;
        } else if (command === "validate") {
          // Repeatable: `--spec 0003 --spec 0004` scopes the run to both.
          options.validateSpecIds.push(next);
        } else if (command === "report") {
          // Repeatable, same shape as `validate`. Without this branch the
          // per-spec scoping `validate --spec` introduced stopped one command
          // later: a slice worker holding `validate.spec-0003.json` had no way
          // to render its own slice without writing the shared `report.md`.
          options.reportSpecIds.push(next);
        } else {
          markInvalid();
        }
        break;
      }
      case "--scope": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "audit") {
          options.auditScope = next;
        } else if (command === "prototyping" && options.prototypingAction === "certify") {
          if (next === "saas-package" || next === "full") {
            options.prototypingScope = next;
          } else {
            markInvalid();
          }
        } else {
          markInvalid();
        }
        break;
      }
      case "--upgrade-scope": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "prototyping" && options.prototypingAction === "certify") {
          if (next === "full") {
            options.prototypingUpgradeScopeFull = true;
          } else {
            markInvalid();
          }
        } else {
          markInvalid();
        }
        break;
      }
      case "--operator": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "audit") {
          options.auditOperator = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--clause": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "audit") {
          options.auditClause = next;
        } else {
          markInvalid();
        }
        break;
      }
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        // 未知トークンの扱い: `--` で始まるものだけをフラグとみなし、
        // parse error として markInvalid() する。位置引数
        // (`discussion use <id>` / `handoff upgrade <legacy>` など) は
        // 対象外に保つ必要があるため、「switch にマッチしなかった」で
        // はなく `--` プレフィックスで判定する。
        if (arg?.startsWith("--")) {
          options.unknownFlags.push(arg);
          markInvalid();
        }
        break;
    }
  }

  // `--target-url` on doctor is only honored by the built-in prototyping
  // profile (main.ts gates it on `options.profile === "prototyping"`).
  // `--profile` may appear after `--target-url`, so the pairing can only be
  // judged here, once every token has been read.
  if (
    command === "doctor" &&
    options.prototypingTargetUrl !== undefined &&
    options.profile !== "prototyping"
  ) {
    markInvalid();
  }
  if (command === "guardrails" && !options.help && !options.guardrailsAction) {
    markInvalid();
  }
  if (command === "prototyping" && !options.help && !options.prototypingAction) {
    markInvalid();
  }
  if (command === "discussion" && !options.help && !options.discussionAction) {
    markInvalid();
  }
  if (command === "audit" && !options.help && !options.auditAction) {
    markInvalid();
  }
  if (command === "handoff" && !options.help && !options.handoffAction) {
    markInvalid();
  }
  if (command === "atdd" && !options.help && !options.atddAction) {
    markInvalid();
  }
  return { command, invalid, options };
}

function parseNonNegativeInteger(value: string): number | null {
  if (!/^\d+$/u.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function applyFormatOption(
  command: string | null,
  value: string | undefined,
  options: ParsedArgs["options"],
): boolean {
  if (!value) {
    return false;
  }
  if (command === "report") {
    if (value === "md" || value === "json") {
      options.reportFormat = value;
      return true;
    }
    return false;
  }
  if (command === "validate") {
    if (value === "text" || value === "github") {
      options.validateFormat = value;
      return true;
    }
    return false;
  }
  if (command === "doctor" || command === "prototyping") {
    if (value === "text" || value === "json") {
      options.doctorFormat = value;
      return true;
    }
    return false;
  }
  if (command === "guardrails") {
    if (value === "text" || value === "json") {
      options.guardrailsFormat = value;
      return true;
    }
    return false;
  }
  return false;
}

function normalizeGuardrailsAction(value: string): "list" | "extract" | "check" | null {
  switch (value) {
    case "list":
    case "extract":
    case "check":
      return value;
    default:
      return null;
  }
}

function isSkillProfileName(value: string): boolean {
  // Skill names are non-empty, lower-kebab-case-ish identifiers. Keep
  // the gate permissive so future skills don't need a parser update.
  return /^[a-z][a-z0-9-]*$/u.test(value);
}

function isValidationProfile(
  value: string,
): value is
  | "discussion"
  | "sdd"
  | "prototyping"
  | "atdd"
  | "tdd"
  | "verify"
  | "full"
  | "saas-package" {
  return (
    value === "discussion" ||
    value === "sdd" ||
    value === "prototyping" ||
    value === "atdd" ||
    value === "tdd" ||
    value === "verify" ||
    value === "full" ||
    value === "saas-package"
  );
}
