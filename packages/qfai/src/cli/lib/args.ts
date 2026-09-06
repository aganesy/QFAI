export type ParsedArgs = {
  command: string | null;
  invalid: boolean;
  /**
   * 引数が拒否された理由 (stderr 向け診断文)。`invalid === true` の
   * ときだけ設定され、最初に発火した拒否の理由を保持する。
   */
  invalidReason?: string;
  options: {
    root: string;
    rootExplicit: boolean;
    /**
     * `qfai init` の出力先。`--dir` 未指定で `--root` が明示された
     * init 実行では `root` の値が入る（`--root` は init でも出力先の
     * エイリアスとして働く）。
     */
    dir: string;
    /** `--dir` が明示されたか。init の出力先解決で `--root` より優先する。 */
    dirExplicit: boolean;
    force: boolean;
    yes: boolean;
    dryRun: boolean;
    upgradeAssistantTree: boolean;
    /**
     * `qfai init --verbose`: expand the run report's `skipped` list. Off by
     * default so a no-op re-run reports its skip count instead of every
     * shipped asset path.
     */
    verbose: boolean;
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
    prototypingAction?: "preflight" | "iterate" | "certify" | "show-spec" | "rescope";
    /** `rescope --remove <surface-id>`, repeatable. */
    rescopeRemove: string[];
    /** `rescope --reason <delta-id>`: the decision that retired the surface. */
    rescopeReason?: string;
    prototypingTargetUrl?: string;
    /** Subcommand for `qfai discussion <list|use>`. */
    discussionAction?: "list" | "use";
    /** --active for `qfai discussion list`. */
    discussionActive?: boolean;
    /** --format <text|json> for `qfai discussion list [--active]`. */
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
     * Unknown values are rejected via markInvalid(reason).
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
     * are rejected via markInvalid(reason).
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
     * `--version` / `-V`: print the resolved tool version to stdout and
     * exit 0. Accepted in the command position and as a trailing flag.
     */
    version: boolean;
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

/** Every spelling of the help flag the parser accepts. */
const HELP_FLAGS: ReadonlySet<string> = new Set(["--help", "-h"]);

/** Every spelling of the version flag the parser accepts. */
const VERSION_FLAGS: ReadonlySet<string> = new Set(["--version", "-V"]);

/**
 * The single-dash flags the parser reserves, derived from the alias sets above
 * so the flag loop and the positional scan can never disagree about which short
 * tokens are flags. Every other option is spelled with `--`.
 */
const RESERVED_SHORT_FLAGS: ReadonlySet<string> = new Set(
  [...HELP_FLAGS, ...VERSION_FLAGS].filter((flag) => !flag.startsWith("--")),
);

/** `qfai prototyping <action>` のサブコマンド名。 */
type PrototypingAction = NonNullable<ParsedArgs["options"]["prototypingAction"]>;

/** `qfai guardrails <action>` のサブコマンド名。 */
type GuardrailsAction = NonNullable<ParsedArgs["options"]["guardrailsAction"]>;

export function parseArgs(argv: string[], cwd: string): ParsedArgs {
  const options: ParsedArgs["options"] = {
    rescopeRemove: [],
    root: cwd,
    rootExplicit: false,
    dir: cwd,
    dirExplicit: false,
    force: false,
    yes: false,
    dryRun: false,
    upgradeAssistantTree: false,
    verbose: false,
    reportFormat: "md",
    reportRunValidate: false,
    doctorFormat: "text",
    validateFormat: "text",
    strict: false,
    guardrailsPaths: [],
    validateSpecIds: [],
    reportSpecIds: [],
    help: false,
    version: false,
    unknownFlags: [],
    invalidExitCode: 2,
  };

  const args = [...argv];
  let command = args.shift() ?? null;
  let invalid = false;

  if (command !== null && HELP_FLAGS.has(command)) {
    options.help = true;
    command = null;
  }

  let invalidReason: string | undefined;

  if (command !== null && VERSION_FLAGS.has(command)) {
    options.version = true;
    command = null;
  }

  /**
   * 拒否を記録する。`reason` は main.ts が usage の前に stderr へ
   * 出す診断文。複数回発火しても最初の理由を保持する。
   */
  const markInvalid = (reason: string): void => {
    invalid = true;
    options.help = true;
    invalidReason ??= reason;
    if (command === "guardrails") {
      options.invalidExitCode = 2;
    }
  };

  const scope = (): string => (command ? `qfai ${command}` : "qfai");
  const missingValue = (flag: string): string => `${scope()}: ${flag} requires a value.`;
  const badValue = (flag: string, value: string, expected: string): string =>
    `${scope()}: invalid value for ${flag}: "${value}". Expected: ${expected}`;
  const notValidHere = (flag: string): string =>
    `${scope()}: ${flag} is not valid for this command.`;
  const formatReason = (value: string): string => {
    const choices = formatChoicesFor(command);
    return choices ? badValue("--format", value, choices) : notValidHere("--format");
  };

  // 先頭トークンが `--` で始まる場合、それはコマンド名ではなく未知
  // オプションである。`command = args.shift()` で取り除かれるため下の
  // フラグループには到達せず、ここで捕まえないと main.ts の
  // unknown-command 分岐に落ちて exit 0 になってしまう
  // (`qfai --bogus`)。`--help` / `-h` は直前の分岐で null 化済み。
  if (command !== null && command.startsWith("--")) {
    options.unknownFlags.push(command);
    markInvalid(`qfai: unknown option: ${command}`);
    command = null;
  }

  /**
   * Flag-ownership guard (下の flag-handling contract rule 2 用)。
   * `qfai prototyping <action>` のサブコマンドトークンは flag loop より
   * 前に確定するため、ループ内のどの arm からでも安全に呼べる。
   */
  /**
   * Whether a flag is on one of the commands that actually reads it.
   *
   * A flag accepted where nothing reads it reaches nothing, and the run
   * proceeds as if it had not been given. `--dir` produced a verdict about the
   * CURRENT tree and made `report` overwrite its `report.md` (#1143);
   * `--upgrade-assistant-tree` exited 0 having upgraded nothing;
   * `--dry-run` let an operator believe a run was a rehearsal (#1144).
   *
   * The owner lists are derived from where `main.ts` reads each field, not
   * guessed:
   *
   * - `dir`, `upgradeAssistantTree` — `init`
   * - `yes` — `init`, `doctor`
   * - `force` — `init`, `handoff`, `prototyping`
   * - `dryRun` — `init`, `doctor`, `handoff`, `prototyping`
   *
   * One predicate rather than one per flag: two that mean almost the same
   * thing are two contracts to keep in step, and this is the shape
   * `ownedByPrototyping` and `ownedByGuardrails` below already use.
   */
  const ownedBy = (...commands: string[]): boolean =>
    command !== null && commands.includes(command);

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
    if (isSubcommandToken(candidate)) {
      const action = normalizeGuardrailsAction(candidate);
      if (action) {
        options.guardrailsAction = action;
      } else {
        markInvalid(subcommandReason("guardrails", candidate));
      }
      args.shift();
    }
  }

  // `qfai prototyping <subcommand>` pulls the subcommand token before the
  // flag loop.
  if (command === "prototyping") {
    const candidate = args[0];
    if (isSubcommandToken(candidate)) {
      if (
        candidate === "preflight" ||
        candidate === "iterate" ||
        candidate === "certify" ||
        candidate === "show-spec" ||
        candidate === "rescope"
      ) {
        options.prototypingAction = candidate;
      } else {
        markInvalid(subcommandReason("prototyping", candidate));
      }
      args.shift();
    }
  }

  // `qfai audit <subcommand>` — currently only `log` is supported.
  if (command === "audit") {
    const candidate = args[0];
    if (isSubcommandToken(candidate)) {
      if (candidate === "log") {
        options.auditAction = candidate;
      } else {
        markInvalid(subcommandReason("audit", candidate));
      }
      args.shift();
    }
  }

  // `qfai handoff <subcommand> [<legacy-file>]` — currently only `upgrade`.
  if (command === "handoff") {
    const candidate = args[0];
    if (isSubcommandToken(candidate)) {
      if (candidate === "upgrade") {
        options.handoffAction = candidate;
      } else {
        markInvalid(subcommandReason("handoff", candidate));
      }
      args.shift();
      if (options.handoffAction === "upgrade") {
        const fileCandidate = args[0];
        if (isPositionalToken(fileCandidate)) {
          options.handoffLegacyFile = fileCandidate;
          args.shift();
        }
      }
    }
  }

  // `qfai atdd <subcommand>` — currently only `scaffold` is supported.
  if (command === "atdd") {
    const candidate = args[0];
    if (isSubcommandToken(candidate)) {
      if (candidate === "scaffold") {
        options.atddAction = candidate;
      } else {
        markInvalid(subcommandReason("atdd", candidate));
      }
      args.shift();
    }
  }

  // `qfai discussion <subcommand> [<id>]` pulls the subcommand token (and the
  // positional <id> for `use`) before the flag loop.
  if (command === "discussion") {
    const candidate = args[0];
    if (isSubcommandToken(candidate)) {
      if (candidate === "list" || candidate === "use") {
        options.discussionAction = candidate;
      } else {
        markInvalid(subcommandReason("discussion", candidate));
      }
      args.shift();
      if (options.discussionAction === "use") {
        const idCandidate = args[0];
        if (isPositionalToken(idCandidate)) {
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
    if (arg !== undefined && HELP_FLAGS.has(arg)) {
      options.help = true;
      continue;
    }
    if (arg !== undefined && VERSION_FLAGS.has(arg)) {
      options.version = true;
      continue;
    }
    switch (arg) {
      case "--root":
        {
          const next = consumeOptionValue();
          if (next === null) {
            markInvalid(missingValue("--root"));
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
            markInvalid(missingValue("--dir"));
            break;
          }
          // `--root` is the flag for pointing another command at a tree, and
          // the usage text this refusal prints says so.
          if (ownedBy("init")) {
            options.dir = next;
            options.dirExplicit = true;
          } else {
            markInvalid(notValidHere("--dir"));
          }
        }
        break;
      case "--force":
        // Read by the `init`, `handoff` and `prototyping` arms and nowhere else.
        if (ownedBy("init", "handoff", "prototyping")) {
          options.force = true;
        } else {
          markInvalid(notValidHere("--force"));
        }
        break;
      case "--yes":
        // Read by the `init` and `doctor` arms and nowhere else.
        if (ownedBy("init", "doctor")) {
          options.yes = true;
        } else {
          markInvalid(notValidHere("--yes"));
        }
        break;
      case "--dry-run":
        // Read by `init`, `doctor`, `handoff` and `prototyping`. Accepted elsewhere it let an operator believe a run was a rehearsal.
        if (ownedBy("init", "doctor", "handoff", "prototyping")) {
          options.dryRun = true;
        } else {
          markInvalid(notValidHere("--dry-run"));
        }
        break;
      case "--upgrade-assistant-tree":
        // Same shape as `--dir`, and worse in one way: accepted elsewhere it
        // exited 0 having upgraded nothing, so the operator went on reading an
        // assistant tree they believed had been refreshed.
        if (ownedBy("init")) {
          options.upgradeAssistantTree = true;
        } else {
          markInvalid(notValidHere("--upgrade-assistant-tree"));
        }
        break;
      case "--verbose":
        // init 専用。ヘルプでもそう公開しているので、他コマンドに付けた
        // 場合は黙って捨てず誤指定として扱う（自動化が「詳細が出た」と
        // 誤認したまま成功扱いになるのを防ぐ）。
        if (command !== "init") {
          markInvalid(notValidHere("--verbose"));
          break;
        }
        options.verbose = true;
        break;
      case "--format": {
        const next = consumeOptionValue();
        if (next === null) {
          // `--format` は値必須。欠落時はヘルプ表示（ただし次オプションは食わない）。
          markInvalid(missingValue("--format"));
          break;
        }
        if (command === "prototyping" && options.prototypingAction !== "preflight") {
          markInvalid(`qfai prototyping: --format is only valid for "prototyping preflight".`);
          break;
        }
        if (command === "discussion") {
          if (next === "text" || next === "json") {
            options.discussionFormat = next;
          } else {
            markInvalid(badValue("--format", next, "text|json"));
          }
          break;
        }
        if (command === "audit") {
          if (next === "table" || next === "json") {
            options.auditFormat = next;
          } else {
            markInvalid(badValue("--format", next, "table|json"));
          }
          break;
        }
        if (!applyFormatOption(command, next, options)) {
          markInvalid(formatReason(next));
        }
        break;
      }
      case "--active":
        // usage(): `discussion list --active` のみ。`discussion use <id>`
        // は値を読まないので、そちらに付いた --active は誤指定。
        if (command === "discussion" && options.discussionAction === "list") {
          options.discussionActive = true;
        } else {
          markInvalid(notValidHere("--active"));
        }
        break;
      case "--strict":
        // usage(): validate 専用。report / doctor では runReport /
        // runDoctor が strict を読まないため、黙って捨てずに拒否する。
        if (command === "validate") {
          options.strict = true;
        } else {
          markInvalid(notValidHere("--strict"));
        }
        break;
      case "--phase":
        markInvalid(`${scope()}: --phase is not supported.`);
        consumeOptionValue();
        break;
      case "--profile": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--profile"));
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
          markInvalid(
            badValue(
              "--profile",
              next,
              "discussion|sdd|prototyping|atdd|tdd|verify|full|saas-package",
            ),
          );
        }
        break;
      }
      case "--clean": {
        if (command === "doctor") {
          options.doctorClean = true;
        } else {
          markInvalid(notValidHere("--clean"));
        }
        break;
      }
      case "--autoremediate": {
        if (command === "doctor") {
          options.doctorAutoremediate = true;
        } else {
          markInvalid(notValidHere("--autoremediate"));
        }
        break;
      }
      case "--fail-on": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--fail-on"));
          break;
        }
        // usage(): validate / doctor / prototyping preflight のみが
        // failOn を読む。report 等に付けても runReport は無視するため拒否。
        if (command !== "validate" && command !== "doctor" && !ownedByPrototyping("preflight")) {
          markInvalid(notValidHere("--fail-on"));
          break;
        }
        if (next === "never" || next === "warning" || next === "error") {
          options.failOn = next;
        } else {
          // An unknown threshold must not fall through to the config
          // default: the gate would then silently differ from the flag
          // the caller wrote, in either direction.
          markInvalid(badValue("--fail-on", next, "never|warning|error"));
        }
        break;
      }
      case "--out": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--out"));
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
          markInvalid(notValidHere("--out"));
        }
        break;
      }
      case "--in": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--in"));
          break;
        }
        if (command === "report") {
          options.reportIn = next;
        } else {
          markInvalid(notValidHere("--in"));
        }
        break;
      }
      case "--run-validate":
        if (command === "report") {
          options.reportRunValidate = true;
        } else {
          markInvalid(notValidHere("--run-validate"));
        }
        break;
      case "--base-url": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--base-url"));
          break;
        }
        if (command === "report") {
          options.reportBaseUrl = next;
        } else {
          markInvalid(notValidHere("--base-url"));
        }
        break;
      }
      case "--path": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--path"));
          break;
        }
        if (command === "guardrails") {
          options.guardrailsPaths.push(next);
        } else {
          markInvalid(notValidHere("--path"));
        }
        break;
      }
      case "--max": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--max"));
          break;
        }
        const parsed = Number.parseInt(next, 10);
        // usage(): `guardrails extract` のみ。runGuardrails は list /
        // check パスで max を読まないため、そこでは誤指定として拒否する。
        if (!ownedByGuardrails("extract")) {
          markInvalid(notValidHere("--max"));
        } else if (Number.isNaN(parsed)) {
          markInvalid(badValue("--max", next, "an integer"));
        } else {
          options.guardrailsMax = parsed;
        }
        break;
      }
      case "--keyword": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--keyword"));
          break;
        }
        // usage(): `guardrails list/extract` のみ。check パスは
        // runGuardrails が keyword フィルタ前に early return する。
        if (ownedByGuardrails("list", "extract")) {
          options.guardrailsKeyword = next;
        } else {
          markInvalid(notValidHere("--keyword"));
        }
        break;
      }
      case "--platform": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--platform"));
          break;
        }
        if (command === "validate") {
          options.platform = next;
        } else {
          markInvalid(notValidHere("--platform"));
        }
        break;
      }
      case "--remove": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--remove"));
          break;
        }
        // Repeatable: one decision can retire more than one surface, and each
        // retirement earns its own audit entry.
        if (ownedByPrototyping("rescope")) {
          options.rescopeRemove.push(next);
        } else {
          markInvalid(notValidHere("--remove"));
        }
        break;
      }
      case "--reason": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--reason"));
          break;
        }
        if (ownedByPrototyping("rescope")) {
          options.rescopeReason = next;
        } else {
          markInvalid(notValidHere("--reason"));
        }
        break;
      }
      case "--target-url": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--target-url"));
          break;
        }
        // `doctor --profile prototyping` だけが同じ targetUrl 診断を通す
        // (main.ts: profile !== "prototyping" の doctor には渡らない)。
        // --profile は後続トークンにも置けるため、doctor 側の profile 検査
        // は flag loop 後の post-loop guard で行う。
        if (command === "doctor" || ownedByPrototyping("preflight", "iterate")) {
          options.prototypingTargetUrl = next;
        } else {
          markInvalid(notValidHere("--target-url"));
        }
        break;
      }
      case "--cycle": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--cycle"));
          break;
        }
        const parsed = parseNonNegativeInteger(next);
        if (!ownedByPrototyping("iterate")) {
          markInvalid(notValidHere("--cycle"));
        } else if (parsed === null) {
          markInvalid(badValue("--cycle", next, "a non-negative integer"));
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
          markInvalid(notValidHere("--check"));
        }
        break;
      }
      case "--license-patch": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--license-patch"));
          break;
        }
        if (ownedByPrototyping("iterate")) {
          options.prototypingLicensePatch = next;
        } else {
          markInvalid(notValidHere("--license-patch"));
        }
        break;
      }
      case "--primary-spec-id": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--primary-spec-id"));
          break;
        }
        if (ownedByPrototyping("iterate")) {
          options.prototypingPrimarySpecId = next;
        } else {
          markInvalid(notValidHere("--primary-spec-id"));
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
          markInvalid(notValidHere("--check-convergence"));
        }
        break;
      }
      case "--capture": {
        // Opt-in PNG/HTML capture. No value; presence flips the
        // boolean. Only meaningful for `qfai prototyping iterate`.
        if (ownedByPrototyping("iterate")) {
          options.prototypingCapture = true;
        } else {
          markInvalid(notValidHere("--capture"));
        }
        break;
      }
      case "--auto-serve": {
        // Opt-in local HTTP server spawn. No value; presence flips the
        // boolean. Only meaningful for `qfai prototyping iterate`.
        if (ownedByPrototyping("iterate")) {
          options.prototypingAutoServe = true;
        } else {
          markInvalid(notValidHere("--auto-serve"));
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
          markInvalid(notValidHere("--emit-skeletons"));
        }
        break;
      }
      case "--skeleton-mode": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--skeleton-mode"));
          break;
        }
        if (!ownedByPrototyping("iterate")) {
          markInvalid(notValidHere("--skeleton-mode"));
        } else if (next === "placeholder" || next === "full" || next === "stub") {
          options.prototypingSkeletonMode = next;
        } else {
          markInvalid(badValue("--skeleton-mode", next, "placeholder|full|stub"));
        }
        break;
      }
      case "--mode": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--mode"));
          break;
        }
        if (!ownedByPrototyping("iterate")) {
          markInvalid(notValidHere("--mode"));
        } else if (next === "convergence" || next === "exploration") {
          options.prototypingMode = next;
        } else {
          markInvalid(badValue("--mode", next, "convergence|exploration"));
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
      //      `markInvalid(missingValue(flag))`.
      //   2. When the flag is used on a command / subcommand that does
      //      NOT own it, also call `markInvalid(notValidHere(flag))` so
      //      the misuse is surfaced rather than silently dropped, with a
      //      diagnostic main.ts can print to stderr. The value token is
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
          markInvalid(missingValue("--spec"));
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
          markInvalid(notValidHere("--spec"));
        }
        break;
      }
      case "--scope": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--scope"));
          break;
        }
        if (command === "audit") {
          options.auditScope = next;
        } else if (command === "prototyping" && options.prototypingAction === "certify") {
          if (next === "saas-package" || next === "full") {
            options.prototypingScope = next;
          } else {
            markInvalid(badValue("--scope", next, "saas-package|full"));
          }
        } else {
          markInvalid(notValidHere("--scope"));
        }
        break;
      }
      case "--upgrade-scope": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--upgrade-scope"));
          break;
        }
        if (command === "prototyping" && options.prototypingAction === "certify") {
          if (next === "full") {
            options.prototypingUpgradeScopeFull = true;
          } else {
            markInvalid(badValue("--upgrade-scope", next, "full"));
          }
        } else {
          markInvalid(notValidHere("--upgrade-scope"));
        }
        break;
      }
      case "--operator": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--operator"));
          break;
        }
        if (command === "audit") {
          options.auditOperator = next;
        } else {
          markInvalid(notValidHere("--operator"));
        }
        break;
      }
      case "--clause": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--clause"));
          break;
        }
        if (command === "audit") {
          options.auditClause = next;
        } else {
          markInvalid(notValidHere("--clause"));
        }
        break;
      }
      default:
        // 未知トークンの扱い: `--` で始まるものだけをフラグとみなし、
        // parse error として markInvalid() する。位置引数
        // (`discussion use <id>` / `handoff upgrade <legacy>` など) は
        // 対象外に保つ必要があるため、「switch にマッチしなかった」で
        // はなく `--` プレフィックスで判定する。
        if (arg?.startsWith("--")) {
          options.unknownFlags.push(arg);
          markInvalid(`qfai: unknown option: ${arg}`);
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
    markInvalid(`qfai doctor: --target-url requires --profile prototyping.`);
  }
  if (command === "guardrails" && !options.help && !options.guardrailsAction) {
    markInvalid(subcommandReason("guardrails", null));
  }
  if (command === "prototyping" && !options.help && !options.prototypingAction) {
    markInvalid(subcommandReason("prototyping", null));
  }
  if (command === "discussion" && !options.help && !options.discussionAction) {
    markInvalid(subcommandReason("discussion", null));
  }
  if (command === "audit" && !options.help && !options.auditAction) {
    markInvalid(subcommandReason("audit", null));
  }
  if (command === "handoff" && !options.help && !options.handoffAction) {
    markInvalid(subcommandReason("handoff", null));
  }
  if (command === "atdd" && !options.help && !options.atddAction) {
    markInvalid(subcommandReason("atdd", null));
  }
  // init 以外の全コマンドは `--root` を「対象ディレクトリ」として読む。
  // init だけが `--dir` しか見ないため、`--root` を渡すと値が捨てられ
  // cwd が初期化されていた。init でも `--root` を出力先のエイリアスと
  // して扱う。`--dir` が明示された場合は init 固有の `--dir` を優先。
  if (command === "init" && options.rootExplicit && !options.dirExplicit) {
    options.dir = options.root;
  }
  return { command, invalid, ...(invalidReason ? { invalidReason } : {}), options };
}

/** `qfai <command> <subcommand>` で受理されるサブコマンドの集合。 */
const SUBCOMMAND_EXPECTATIONS = new Map<string, string>([
  ["guardrails", "list|extract|check"],
  ["prototyping", "preflight|iterate|certify|show-spec"],
  ["discussion", "list|use"],
  ["audit", "log"],
  ["handoff", "upgrade"],
  ["atdd", "scaffold"],
]);

/**
 * サブコマンド欠落 / 不正の診断文を組み立てる。`value === null` は
 * 「そもそも指定されていない」ケース。
 */
function subcommandReason(command: string, value: string | null): string {
  const expected = SUBCOMMAND_EXPECTATIONS.get(command) ?? "";
  const what = value === null ? "unknown or missing subcommand" : `unknown subcommand "${value}"`;
  return `qfai ${command}: ${what}. Expected: ${expected}`;
}

/** `--format` が当該コマンドで受理する値の集合 (空 = 非対応)。 */
function formatChoicesFor(command: string | null): string {
  if (command === "report") {
    return "md|json";
  }
  if (command === "validate") {
    return "text|github";
  }
  if (command === "doctor" || command === "prototyping") {
    return "text|json";
  }
  return "";
}

/**
 * Whether a token can be the subcommand name in `qfai <command> <subcommand>`.
 *
 * The scan that pulls it runs *before* the flag loop, so testing only for a
 * `--` prefix let the short forms through as candidates: `qfai prototyping -V`
 * had `-V` taken as an unknown action and shifted away, which both raised a
 * usage error and stopped the flag loop from ever setting `options.version`,
 * while the long `--version` was skipped here and worked. A subcommand name is
 * drawn from a closed set and none of them starts with `-`, so this position
 * excludes every dash-prefixed token.
 */
function isSubcommandToken(token: string | undefined): token is string {
  return token !== undefined && token.length > 0 && !token.startsWith("-");
}

/**
 * Whether a token can be the positional value after a subcommand — the
 * `<legacy-file>` of `handoff upgrade`, the `<id>` of `discussion use`.
 *
 * A positional is caller data rather than a closed set, and a relative path may
 * legitimately begin with a single `-`: `qfai handoff upgrade -legacy.yaml`
 * names a file in the working directory and has to keep converting. So this
 * position excludes only the spellings the parser actually reserves — any `--`
 * long flag, plus RESERVED_SHORT_FLAGS — which still keeps `-V` and `-h` out
 * of the positional and lets them reach the flag loop.
 */
function isPositionalToken(token: string | undefined): token is string {
  return (
    token !== undefined &&
    token.length > 0 &&
    !token.startsWith("--") &&
    !RESERVED_SHORT_FLAGS.has(token)
  );
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
