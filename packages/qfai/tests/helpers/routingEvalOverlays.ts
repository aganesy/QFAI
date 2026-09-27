import { spawnSync } from "node:child_process";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { FactOverlay } from "./routingEval.js";

/**
 * What each `repoFacts` key of the routing seeds puts on a fixture tree built from the common
 * base, a `qfai init` output. A key the map does not hold is refused by `buildSeedFixture`, so a
 * seed carrying one is never scored on a tree that lacks its fact.
 */

// Appends `text` to the file at `rel`, creating it and its directory.
function appendTo(rel: string, text: string): FactOverlay {
  return async (root) => {
    const file = path.join(root, rel);
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, `${text}\n`);
  };
}

// The prompt carries the fact: it describes the request, and nothing goes on disk.
const stated: FactOverlay = async () => {};

const RULES = path.join(".qfai", "specs", "spec-0001", "04_Business-Rules.md");
const LEDGER = path.join(".qfai", "specs", "spec-0001", "tdd", "test-list.md");
const LEDGER_HEAD = "| TDD-ID | TC-Refs | Layer | Status |\n| --- | --- | --- | --- |";

// A normative rule of the one fixture spec, its value spliced into `sentence`.
const rule =
  (sentence: (value: unknown) => string): FactOverlay =>
  async (root, value) =>
    appendTo(RULES, `- ${sentence(value)}`)(root, value);

// One ledger row of the fixture spec, holding `status` for a row of `layer`.
const ledgerRow =
  (layer: string): FactOverlay =>
  async (root, value) => {
    const file = path.join(root, LEDGER);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(
      file,
      `${LEDGER_HEAD}\n| TDD-0001 | TC-0001-0001 | ${layer} | ${String(value)} |\n`,
    );
  };

// Names the layer of the ledger row another fact wrote.
const rowLayer: FactOverlay = async (root, value) => {
  const file = path.join(root, LEDGER);
  const text = await readFile(file, "utf8");
  await writeFile(file, text.split("| Unit |").join(`| ${String(value)} |`));
};

const PHONE_HANDLER = (status: unknown) =>
  [
    "export function phoneStatus(phone: string | null): number {",
    `  if (!phone) return ${String(status)};`,
    "  return 200;",
    "}",
  ].join("\n");

export const FACT_OVERLAYS: Readonly<Record<string, FactOverlay>> = {
  changeIsNonNormativeText: appendTo("README.md", "The upload was succesful."),
  readmeIsNormative: appendTo(
    "README.md",
    "## Public API\n\nThis section is normative: every request carries a bearer token.",
  ),
  securityBoundaryChange: stated,
  commentIsNonExecutable: appendTo(
    path.join("src", "greeting.ts"),
    '// Retruns the greeting.\nexport const greeting = "hello";',
  ),
  policyContent: stated,
  codeBehaviorIntendedUnchanged: appendTo(
    path.join("src", "total.ts"),
    "export const total=(a:number,b:number)=>{return a+b}",
  ),
  dependencyChange: appendTo(
    "package.json",
    JSON.stringify({ name: "fixture", version: "1.0.0", dependencies: { "example-lib": "1.2.0" } }),
  ),
  compatibilityUnverified: stated,
  ciControlChange: appendTo(
    path.join(".github", "workflows", "ci.yml"),
    "on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - run: npm test",
  ),
  requestedTimeoutKnown: stated,
  normativeExpectedStatus: rule((value) => `An empty phone number returns ${String(value)}.`),
  observedStatus: async (root, value) =>
    appendTo(path.join("src", "phone.ts"), PHONE_HANDLER(value))(root, value),
  ledgerStatus: ledgerRow("Unit"),
  existingTestCoversCase: stated,
  specMissing: stated,
  userExpectedStatus: stated,
  expectedBehaviorUnknown: stated,
  multipleIncompatibleExpectedOutcomes: stated,
  normativeRule: rule((value) => `The profile API must ${String(value)}.`),
  observedRule: appendTo(
    path.join("src", "profile.ts"),
    "export function canSeeProfile(loggedIn: boolean): boolean {\n  return loggedIn || true;\n}",
  ),
  existingSpecRequiresAdmin: rule(
    () => "The admin screen requires an authenticated administrator.",
  ),
  destructiveDataChange: appendTo(
    path.join("db", "migrations", "0001_old_orders.sql"),
    "CREATE TABLE old_orders (id integer);",
  ),
  environmentNotConfirmed: stated,
  newCapability: stated,
  requirementsClear: stated,
  uxPolicySettled: stated,
  importantProductDecisionsOpen: stated,
  newVisualSurface: stated,
  brandDirectionMissing: stated,
  nfrThresholdMs: rule((value) => `The list search answers within ${String(value)} ms.`),
  meaningUnchanged: stated,
  structuralRefactor: appendTo(
    path.join("src", "orders.ts"),
    [
      "export const netOf = (lines: number[]) => lines.reduce((sum, line) => sum + line, 0);",
      "export const grossOf = (lines: number[]) => lines.reduce((sum, line) => sum + line, 0) * 1.1;",
    ].join("\n"),
  ),
  externalBehaviorUnchanged: stated,
  functionUnreachableVerified: appendTo(
    path.join("src", "format.ts"),
    "function legacyFormat(value: number): string {\n  return String(value);\n}\n\nexport const format = (value: number) => value.toFixed(2);",
  ),
  publicExport: stated,
  testOracleKnown: stated,
  existingAcceptanceObligation: ledgerRow("Integration"),
  changeRequested: stated,
  generatedFile: appendTo(
    path.join("src", "generated", "api-client.ts"),
    "// @generated by openapi-generator. Do not edit.\n// The typed clinet for the public API.\nexport {};",
  ),
  qfaiAssetChange: appendTo(
    path.join(".qfai", "assistant", "skills", "qfai-sdd", "SKILL.md"),
    "\nStages recieve their inputs from the work order.",
  ),
  repairNotAuthorized: stated,
  explicitSkill: stated,
  privacySensitiveExternalEffect: stated,
  untrustedLog: async (root, value) =>
    appendTo(path.join("logs", "app.log"), String(value))(root, value),
  quotedRequestOnly: stated,
  sameScope: stated,
  currentRequestedScope: stated,
  expectedBehaviorKnown: stated,
  materialPermissionRequired: stated,
  providedApprover: stated,
  designLocked: appendTo(
    path.join(".qfai", "contracts", "design", "customer-list.md"),
    "# Customer list\n\nA two-column grid. This layout is locked.",
  ),
  expectedLayoutKnown: stated,
  newBrandDecision: stated,
  publicContractBreak: appendTo(
    path.join(".qfai", "contracts", "api", "order-total.md"),
    "# Order total\n\n`GET /orders/{id}/total` returns the total as a string.",
  ),
  consumerImpactUnapproved: stated,
  deploymentConsumersUnknown: appendTo(".env.example", "LEGACY_TOKEN=\nUNUSED_FLAG=0"),
  expectedEffectUnclear: stated,
  toolPolicyChange: stated,
  weakensCurrentGate: stated,
  exampleIsContractuallyNormative: appendTo(
    "README.md",
    '## Example\n\nThis example is normative.\n\n```ts\nif (!user.isAdmin) throw new Error("forbidden");\n```',
  ),
  nonNormativeDocsOnly: appendTo(
    path.join("docs", "guide.md"),
    "# Guide\n\nWelcome ,this guide explains the setup .\n\n```sh\nnpm install\n```",
  ),
  codeBlocksUnchanged: stated,
  normativeStatus: rule((value) => `A null input returns ${String(value)}.`),
  environmentSettingChange: appendTo(".env.example", "LOG_LEVEL=info"),
  sqlFileChange: appendTo(
    path.join("db", "migrations", "0003_users.sql"),
    "CREATE TABLE users (\n  id integer -- the user's identifer\n);",
  ),
  existingCapability: stated,
  normativeMax: rule((value) => `A batch holds at most ${String(value)} items.`),
  requestedMax: stated,
  existingTCDoesNotCoverBoundary: stated,
  existingACAlreadyCoversIt: stated,
  existingLedgerStatus: ledgerRow("Unit"),
  testLayer: rowLayer,
  sameObligation: stated,
  newAcceptanceTestNeeded: stated,
  qfaiLocalLauncherMissing: async (root) =>
    rm(path.join(root, "node_modules", "qfai"), { recursive: true, force: true }),
  specStatus: async (root, value) =>
    appendTo(path.join(".qfai", "specs", "spec-0001", "01_Spec.md"), `Status: ${String(value)}`)(
      root,
      value,
    ),
  activeSuccessorKnown: stated,
  targetExplicit: stated,
  normativeRequirementsKnown: stated,
  ledgerValid: stated,
  twoClearNewCapabilities: stated,
  dependencyOrderKnown: stated,
  validDesignContractSupplied: stated,
  siblingUIOptInChangesE2EObligations: stated,
  requestedBehaviorClear: stated,
  specSplit: stated,
  productionDeployRequested: stated,
  specificEnvironmentUnconfirmed: stated,
  completionTarget: stated,
  criticalDecisionOpen: appendTo(
    path.join(".qfai", "specs", "spec-0001", "08_Open-questions.md"),
    "- Open: whether a deleted customer's addresses are kept.",
  ),
  structuralOptimization: stated,
  scopeClear: stated,
  requestedEffectKnown: stated,
};

/**
 * The keys no overlay reproduces, each with the reason. The factory refuses a seed naming one.
 */
export const REFUSED_FACT_KEYS: Readonly<Record<string, string>> = {
  observedMs: "a measured duration differs from run to run",
  flakyFixture: "a flaky outcome is not deterministic by definition",
  activeRuns: "a run's ID and journal carry the time and random IDs",
  activeRun: "a run's ID and journal carry the time and random IDs",
  currentStage: "a run's ID and journal carry the time and random IDs",
  terminalRuns: "a run's ID and journal carry the time and random IDs",
  branchChanged: "it is a change since a run started, and a run cannot be reproduced",
  workingTreeInputChanged: "it is a change since a run started, and a run cannot be reproduced",
  oldApprovalScope: "an authorization record carries the digests of the run that wrote it",
  grantDependencyChanged: "an authorization record carries the digests of the run that wrote it",
  scopeDebtOwnerUnknown: "scope debt is recorded by a run",
  conversationBindingMissing: "it is the host session's state, not the tree's",
  requiredDelegationAvailable: "it is the host's capability, not the tree's",
  noQuestionMode: "it is how the host is invoked, not the tree's",
  fileResolvesViaSymlinkOutsideAuthorizedRoot:
    "a symlink needs a privilege Windows does not grant by default",
};

// Where the built CLI is, for the base every fixture copies.
const CLI = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dist",
  "cli",
  "index.mjs",
);

/** Writes the common base into `root`: the output of `qfai init`. */
export function buildBase(root: string): void {
  const init = spawnSync(process.execPath, [CLI, "init", "--yes"], { cwd: root, encoding: "utf8" });
  if (init.status !== 0) throw new Error(`qfai init: ${init.stderr}`);
}
