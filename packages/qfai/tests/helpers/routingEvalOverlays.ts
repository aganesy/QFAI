import { spawnSync } from "node:child_process";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
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

async function writeAt(root: string, rel: string, text: string): Promise<void> {
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
}

// The prompt carries the fact: it describes the request, and nothing goes on disk.
const stated: FactOverlay = async () => {};

const SPEC = ".qfai/spec";
const FLOW = `${SPEC}/02_business-flow/business-flow-0001`;
const STORY = `${FLOW}/user-story-0001-0001`;
const CONTRACT = `${SPEC}/03_contract/api/orders.md`;

// The one business flow a fact about existing behaviour needs: a story with one criterion, its
// example, and the contract rule that cites it.
const FIXTURE_FLOW: Record<string, string> = {
  [`${SPEC}/02_business-flow/business-flows.md`]:
    "# Business Flows\n\n## Flows\n\n| BF-ID | Flow | Path |\n| ----- | ---- | ---- |\n| BF-0001 | Take orders | `business-flow-0001/` |\n",
  [`${FLOW}/business-flow.md`]:
    "# BF-0001: Take orders\n\n## Purpose\n\n- A customer places an order.\n\n## Flow\n\n```mermaid\nflowchart LR\n  Order --> Confirm\n```\n",
  [`${FLOW}/user-stories.md`]:
    "# User Stories\n\n## Stories\n\n| US-ID | Story | Path |\n| ----- | ----- | ---- |\n| US-0001-0001 | Place an order | `user-story-0001-0001/` |\n",
  [`${STORY}/01_User-story.md`]:
    "# US-0001-0001: Place an order\n\n## User Story\n\n- Goal: As a customer, I place an order.\n",
  [`${STORY}/02_Acceptance-Criteria.md`]:
    "# Acceptance Criteria\n\n## Criteria\n\n```gherkin\nFeature: Place an order\n  # AC-0001-0001-01\n  Scenario: An order is validated\n    Given a customer\n    When the customer submits an order\n    Then the order is validated\n```\n",
  [`${STORY}/03_Example.md`]:
    "# Examples\n\n## Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| ----- | ------ | ----- | -------- |\n| EX-0001-0001-01 | AC-0001-0001-01 | A valid order | Accepted |\n",
  [CONTRACT]:
    "# API Contract: orders\n\n## Rules\n\n| Rule ID | Rule | Examples | Rule refs |\n| ------- | ---- | -------- | --------- |\n| BR-0001 | An order is validated | EX-0001-0001-01 | - |\n",
};

// Writes the fixture flow once; a later fact adds to it.
async function fixtureFlow(root: string): Promise<void> {
  if (existsSync(path.join(root, CONTRACT))) return;
  for (const [rel, text] of Object.entries(FIXTURE_FLOW)) await writeAt(root, rel, text);
}

const withFlow: FactOverlay = async (root) => fixtureFlow(root);

// A normative rule of the fixture flow's contract, its value spliced into `sentence`.
const rule =
  (sentence: (value: unknown) => string): FactOverlay =>
  async (root, value) => {
    await fixtureFlow(root);
    const text = await readFile(path.join(root, CONTRACT), "utf8");
    const next = (text.match(/^\| BR-\d{4} /gm) ?? []).length + 1;
    const id = `BR-${String(next).padStart(4, "0")}`;
    await appendTo(CONTRACT, `| ${id} | ${sentence(value)} | EX-0001-0001-01 | - |`)(root, value);
  };

// A test annotating the fixture flow's example, or its criterion at an acceptance layer.
const annotatedAt =
  (rel: string, id: string): FactOverlay =>
  async (root) => {
    await fixtureFlow(root);
    await writeAt(root, rel, `// QFAI:${id}\nit("${id}", () => expect(order()).toBeDefined());\n`);
  };

const UNIT_TEST = "tests/unit/orders.test.ts";

// Moves the example's test to the layer named: an API test checks the criterion.
const testLayer: FactOverlay = async (root, value) => {
  if (value !== "api") return;
  await rm(path.join(root, UNIT_TEST), { force: true });
  await annotatedAt("tests/api/orders.test.ts", "AC-0001-0001-01")(root, value);
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
  normativeExpectedStatus: rule((value) => `An empty phone number returns ${String(value)}`),
  observedStatus: async (root, value) =>
    appendTo(path.join("src", "phone.ts"), PHONE_HANDLER(value))(root, value),
  existingTestCoversCase: stated,
  storyMissing: stated,
  userExpectedStatus: stated,
  expectedBehaviorUnknown: stated,
  multipleIncompatibleExpectedOutcomes: stated,
  normativeRule: rule((value) => `The profile API must ${String(value)}`),
  observedRule: appendTo(
    path.join("src", "profile.ts"),
    "export function canSeeProfile(loggedIn: boolean): boolean {\n  return loggedIn || true;\n}",
  ),
  existingSpecRequiresAdmin: rule(() => "The admin screen requires an authenticated administrator"),
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
  nfrThresholdMs: rule((value) => `The list search answers within ${String(value)} ms`),
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
  existingAcceptanceObligation: annotatedAt("tests/integration/orders.test.ts", "AC-0001-0001-01"),
  changeRequested: stated,
  generatedFile: appendTo(
    path.join("src", "generated", "api-client.ts"),
    "// @generated by openapi-generator. Do not edit.\n// The typed clinet for the public API.\nexport {};",
  ),
  qfaiAssetChange: appendTo(
    path.join(".qfai", "assistant", "skill", "qfai-sdd", "SKILL.md"),
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
    `${SPEC}/03_contract/design/customer-list.md`,
    "# Customer list\n\nA two-column grid. This layout is locked.",
  ),
  expectedLayoutKnown: stated,
  newBrandDecision: stated,
  publicContractBreak: appendTo(
    `${SPEC}/03_contract/api/order-total.md`,
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
  normativeStatus: rule((value) => `A null input returns ${String(value)}`),
  environmentSettingChange: appendTo(".env.example", "LOG_LEVEL=info"),
  sqlFileChange: appendTo(
    path.join("db", "migrations", "0003_users.sql"),
    "CREATE TABLE users (\n  id integer -- the user's identifer\n);",
  ),
  existingCapability: withFlow,
  normativeMax: rule((value) => `A batch holds at most ${String(value)} items`),
  requestedMax: stated,
  existingExampleDoesNotCoverBoundary: stated,
  existingACAlreadyCoversIt: withFlow,
  exampleAnnotated: annotatedAt(UNIT_TEST, "EX-0001-0001-01"),
  testLayer,
  sameObligation: stated,
  newAcceptanceTestNeeded: stated,
  qfaiLocalLauncherMissing: async (root) =>
    rm(path.join(root, "node_modules", "qfai"), { recursive: true, force: true }),
  // The one status the seeds name is `superseded`, recorded as the triage row that retired it.
  storyStatus: async (root) => {
    await fixtureFlow(root);
    await writeAt(
      root,
      `${SPEC}/decisions.md`,
      "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | ------- | -------- | ------ |\n| DEC-0001 | SUPERSEDE US-0001-0001 | Approved by the owner | DONE |\n",
    );
  },
  activeSuccessorKnown: stated,
  targetExplicit: withFlow,
  normativeRequirementsKnown: stated,
  examplesValid: stated,
  twoClearNewCapabilities: stated,
  dependencyOrderKnown: stated,
  validDesignContractSupplied: stated,
  siblingUIOptInChangesE2EObligations: stated,
  requestedBehaviorClear: stated,
  specSplit: withFlow,
  productionDeployRequested: stated,
  specificEnvironmentUnconfirmed: stated,
  completionTarget: stated,
  criticalDecisionOpen: async (root) =>
    writeAt(
      root,
      `${SPEC}/open-questions.md`,
      "# Open Questions\n\n## Open Questions\n\n| ID | Content | Approach | Status |\n| --- | ------- | -------- | ------ |\n| OQ-0001 | Whether a deleted customer's addresses are kept | Ask the owner | TODO |\n",
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
