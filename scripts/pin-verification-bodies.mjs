#!/usr/bin/env node
/**
 * Recompute `verificationBodies` in `.github/required-status-contexts.json`.
 *
 * The hygiene lane pins a digest of every declared verification step's body, so editing one of
 * those steps — or the package script it invokes — fails the lane until the declaration is updated
 * in the same change. That is the point: a change to a required verification is a change a
 * reviewer reads. This is the tool that produces the new value.
 *
 * It imports the lane's own `verificationBodyDigest` rather than restating it. The previous version
 * of this tool lived outside version control and carried a hand-copied copy of that function, which
 * is two sources of truth for one number — and the first edit to either one is where they start
 * disagreeing. Review finding [36] added the invoked package scripts to the digest, which is
 * exactly the sort of edit a copy would have missed.
 *
 * Usage:
 *
 *   node scripts/pin-verification-bodies.mjs
 *
 * Exits non-zero, changing nothing, when a declared item names a step no workflow performs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { argv, cwd, exit, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";

import { effectiveRunDefaults, verificationBodyDigest } from "./check-workflow-hygiene.mjs";

const require = createRequire(import.meta.url);
/** The parser the lane itself uses, out of the workspace that depends on it. */
const { parse: parseYaml } = require("../packages/qfai/node_modules/yaml");

const DECLARATION_REL = ".github/required-status-contexts.json";

function main(root) {
  const declarationPath = path.join(root, DECLARATION_REL);
  const declaration = JSON.parse(readFileSync(declarationPath, "utf-8"));
  const contexts = Array.isArray(declaration.contexts) ? declaration.contexts : [];

  for (const context of contexts) {
    const workflowPath = path.join(root, ".github", "workflows", String(context.workflow));
    const doc = parseYaml(readFileSync(workflowPath, "utf-8"));

    // FIRST occurrence wins, matching the lane's own collection order. A second step wearing the
    // name is a finding there and must not become the pinned value here — pinning it would be this
    // tool quietly resolving a violation instead of reporting it.
    // The step AND the job that carries it. The lane digests a step under its job's effective
    // `defaults.run` — the two outer levels a step inherits — and a tool that digested the same
    // step without them would write a value the lane never computes, so every pin would be a
    // mismatch the moment a job declared one.
    const byName = new Map();
    for (const job of Object.values(doc?.jobs ?? {})) {
      for (const step of job?.steps ?? []) {
        if (typeof step?.name === "string" && !byName.has(step.name)) {
          byName.set(step.name, { step, job });
        }
      }
    }

    // Both sets. `gatedVerifications` names the work of the lanes that may skip, and its
    // digests live in the same `verificationBodies` map — a tool that pinned only the
    // unconditional set would leave every gated item unpinned, which is precisely the state
    // review finding [89] reported.
    const bodies = {};
    const items = [
      ...(context.verificationSet ?? []),
      ...Object.keys(context.gatedVerifications ?? {}),
    ];
    for (const item of items) {
      const found = byName.get(item);
      if (found === undefined) {
        stderr.write(`no step named ${JSON.stringify(item)} in ${String(context.workflow)}\n`);
        return 1;
      }
      bodies[item] = verificationBodyDigest(found.step, root, effectiveRunDefaults(doc, found.job));
      stdout.write(`${bodies[item]}  ${item}\n`);
    }
    context.verificationBodies = bodies;
  }

  writeFileSync(declarationPath, `${JSON.stringify(declaration, null, 2)}\n`, "utf-8");
  stdout.write(`pinned into ${DECLARATION_REL}\n`);
  return 0;
}

const invokedDirectly = fileURLToPath(import.meta.url) === path.resolve(argv[1] ?? "");
if (invokedDirectly) {
  const rootFlag = argv.indexOf("--root");
  exit(
    main(
      rootFlag >= 0 && argv[rootFlag + 1] !== undefined ? path.resolve(argv[rootFlag + 1]) : cwd(),
    ),
  );
}
