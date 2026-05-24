/**
 * Integration acceptance skeleton for spec-0006 CHG-005 test cases.
 *
 * `it.todo` Red skeletons; implementation lands during the follow-up
 * `/qfai-implement` TDD micro cycle.
 *
 * Note: TC-0006-0017 is layered here even though its spec `Type:` column
 * marks it `unit`. ATDD layer pinning is by TC location (every TC must be
 * referenced from tests/integration/**); type-column values are planning
 * signals per .qfai/assistant/catalog/test-layers.md "Volume policy".
 */
// QFAI:SPEC-0006:TC-0006-0012
// QFAI:SPEC-0006:TC-0006-0013
// QFAI:SPEC-0006:TC-0006-0014
// QFAI:SPEC-0006:TC-0006-0015
// QFAI:SPEC-0006:TC-0006-0016
// QFAI:SPEC-0006:TC-0006-0017
// QFAI:SPEC-0006:TC-0006-0018

import { describe, it } from "vitest";

describe("TC-0006-0012: playwright primary probe detects node_modules/.bin/playwright", () => {
  it.todo("primary probe resolves the local bin shim before any fallback");
});

describe("TC-0006-0013: playwright probe order documented and observable", () => {
  it.todo("doctor surfaces `playwright -> npx fallback -> playwright-cli (deprecated)` order");
});

describe("TC-0006-0014: playwright-cli triggers D-DEPRECATED-PROBE with sunset 1.10.0", () => {
  it.todo("deprecation finding body literally contains `sunset: 1.10.0`");
});

describe("TC-0006-0015: full failure surfaces `npm i -D playwright` install hint", () => {
  it.todo("install hint string appears in the error path when no probe candidate resolves");
});

describe("TC-0006-0016: fresh init + playwright install yields zero error lines", () => {
  it.todo("fresh `qfai init` + `npm i -D playwright` -> doctor exits with no [error] lines");
});

describe("TC-0006-0017: skills.integrity defaults to warning, --fail-on error still exits 0", () => {
  it.todo("skills.integrity finding severity is warning by default and does not block --fail-on error");
});

describe("TC-0006-0018: doctor summary 2-group split routes skills.integrity to advisory group", () => {
  it.todo(
    "skills.integrity always lands in the advisory group regardless of message wording",
  );
});
