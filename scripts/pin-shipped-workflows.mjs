#!/usr/bin/env node
/* global console */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { SHIPPED_DIR, SHIPPED_WORKFLOWS } from "./shipped-workflow-cost.mjs";

const require = createRequire(import.meta.url);
const { parse: parseYaml } = require("../packages/qfai/node_modules/yaml");
const HELPER = "packages/qfai/tests/helpers/shippedLaneCommands.ts";
const HEX = /^[a-f0-9]{64}$/;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function pinRows(source, name, map) {
  const declarations = source.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations]);
  const declaration = declarations.find(
    (item) => ts.isIdentifier(item.name) && item.name.text === name,
  );
  let array = declaration?.initializer;
  if (map && array && ts.isNewExpression(array) && array.expression.getText(source) === "Map") {
    array = array.arguments?.[0];
  }
  if (!array || !ts.isArrayLiteralExpression(array)) {
    throw new Error(HELPER + ": expected rows for " + name);
  }

  return array.elements.map((row) => {
    if (!ts.isArrayLiteralExpression(row) || row.elements.length !== 2) {
      throw new Error(HELPER + ": expected key and value in " + name);
    }
    const [key, value] = row.elements;
    if (!ts.isStringLiteral(key) || !ts.isStringLiteral(value)) {
      throw new Error(HELPER + ": expected string pins in " + name);
    }
    return { key: key.text, value };
  });
}

function shapePins(source, name) {
  const rows = pinRows(source, name, true);
  const pins = new Map(rows.map(({ key, value }) => [key, value.text]));
  if (pins.size !== rows.length) throw new Error(HELPER + ": duplicate shape in " + name);
  return pins;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkShape(pins, key, actual) {
  if (pins.get(key) !== JSON.stringify(actual)) throw new Error(key + ": pinned shape changed");
  pins.delete(key);
}

function refreshDigest(changes, source, pin, previous, next) {
  if (!HEX.test(previous)) throw new Error(pin.key + ": invalid digest pin");
  if (previous === next) return;

  const literal = pin.value.getText(source);
  const offset = literal.indexOf(previous);
  if (offset < 0 || literal.lastIndexOf(previous) !== offset) {
    throw new Error(pin.key + ": could not locate one digest in the pin");
  }
  changes.push({ at: pin.value.getStart(source) + offset, previous, next });
}

function checkStep(changes, source, pin, key, step) {
  if (!pin || pin.key !== key || !isRecord(step)) {
    throw new Error(key + ": pinned step order or shape changed");
  }
  if (typeof step.run !== "string") {
    if (pin.value.text !== JSON.stringify(step))
      throw new Error(key + ": pinned step shape changed");
    return;
  }

  const pinnedRun = JSON.parse(pin.value.text).run;
  const previous =
    typeof pinnedRun === "string" ? /^<body ([a-f0-9]{64})>$/.exec(pinnedRun)?.[1] : undefined;
  if (!previous || pin.value.text !== JSON.stringify({ ...step, run: pinnedRun })) {
    throw new Error(key + ": pinned step shape changed");
  }
  refreshDigest(changes, source, pin, previous, sha256(step.run));
}

function computeChanges(root, source) {
  const files = pinRows(source, "ALLOWED_WORKFLOW_FILES", true);
  if (
    JSON.stringify(files.map(({ key }) => key).sort()) !==
    JSON.stringify([...SHIPPED_WORKFLOWS].sort())
  ) {
    throw new Error(HELPER + ": shipped workflow file pins changed");
  }
  const workflowPins = shapePins(source, "ALLOWED_WORKFLOW_SHAPE");
  const jobPins = shapePins(source, "ALLOWED_JOB_SHAPE");
  const steps = pinRows(source, "ALLOWED_STEP_SHAPE", false);
  const changes = [];
  let stepIndex = 0;

  for (const file of files) {
    const bytes = readFileSync(path.join(root, ...SHIPPED_DIR.split("/"), file.key));
    const workflow = parseYaml(bytes.toString("utf8"));
    if (!isRecord(workflow) || !isRecord(workflow.jobs)) {
      throw new Error(file.key + ": expected a workflow with jobs");
    }
    const { jobs, ...shape } = workflow;
    checkShape(workflowPins, file.key, shape);
    for (const [id, job] of Object.entries(jobs)) {
      const key = file.key + "#" + id;
      if (!isRecord(job)) throw new Error(key + ": expected a job mapping");
      const { steps: jobSteps = [], ...jobShape } = job;
      checkShape(jobPins, key, jobShape);
      if (!Array.isArray(jobSteps)) throw new Error(key + ": expected a step list");
      for (const step of jobSteps) {
        checkStep(changes, source, steps[stepIndex], key, step);
        stepIndex++;
      }
    }
    refreshDigest(changes, source, file, file.value.text, sha256(bytes));
  }
  if (workflowPins.size || jobPins.size || stepIndex !== steps.length) {
    throw new Error(HELPER + ": a pinned workflow, job, or step disappeared");
  }
  return changes;
}

function writePins(helper, content) {
  const temporary = path.join(
    path.dirname(helper),
    "." + path.basename(helper) + "." + randomUUID(),
  );
  try {
    writeFileSync(temporary, content, { flag: "wx", mode: statSync(helper).mode });
    renameSync(temporary, helper);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function rootFrom(args) {
  if (args.length === 0) return fileURLToPath(new URL("..", import.meta.url));
  if (args.length === 2 && args[0] === "--root" && args[1] && !args[1].startsWith("--")) {
    return path.resolve(args[1]);
  }
  throw new Error("expected --root <dir> or no arguments");
}

try {
  const root = rootFrom(process.argv.slice(2));
  const helper = path.join(root, ...HELPER.split("/"));
  const original = readFileSync(helper, "utf8");
  const source = ts.createSourceFile(
    HELPER,
    original,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const changes = computeChanges(root, source);
  let updated = original;
  for (const { at, previous, next } of changes.sort((a, b) => b.at - a.at)) {
    updated = updated.slice(0, at) + next + updated.slice(at + previous.length);
  }

  if (updated !== original) writePins(helper, updated);
  console.log(
    HELPER + ": " + (changes.length ? "updated " + changes.length + " digest(s)" : "unchanged"),
  );
} catch (error) {
  console.error("pin-shipped-workflows: " + error.message);
  process.exitCode = 1;
}
