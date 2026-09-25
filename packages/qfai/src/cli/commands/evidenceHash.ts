/**
 * `qfai evidence hash <kind> <target>...` — print one value the completion
 * gate recomputes, computed by the function the gate recomputes it with.
 *
 * Read-only. A value that cannot be computed is refused on stderr, and nothing
 * reaches stdout, so a caller capturing stdout never records a partial value.
 */
import { loadConfig, resolvePath } from "../../core/config.js";
import {
  checkpointVerificationSeal,
  completionAuditHash,
  type EvidenceHash,
  redTestManifestHash,
  reviewPackSealOf,
} from "../../core/validators/tddList.js";
import type { EvidenceHashKind } from "../lib/args.js";
import { EXIT_CODES } from "../lib/exitCodes.js";
import { error, info } from "../lib/logger.js";

export type EvidenceHashOptions = {
  root: string;
  kind: EvidenceHashKind;
  /** Arity is the parser's: one target, or one or more for `red-test`. */
  targets: readonly string[];
};

export async function runEvidenceHash(options: EvidenceHashOptions): Promise<number> {
  const outcome = await computeEvidenceHash(options);
  if ("refused" in outcome) {
    error(`qfai evidence hash ${options.kind}: ${outcome.refused}`);
    return EXIT_CODES.inputError;
  }
  info(outcome.hash);
  return EXIT_CODES.ok;
}

async function computeEvidenceHash(options: EvidenceHashOptions): Promise<EvidenceHash> {
  const { root, kind, targets } = options;
  const target = targets[0] ?? "";
  switch (kind) {
    case "review-pack":
      return reviewPackSealOf(root, target);
    case "red-test": {
      const hash = await redTestManifestHash(root, targets.join("\n"));
      return hash === null ? { refused: MANIFEST_REFUSAL } : { hash };
    }
    case "checkpoint": {
      const entry = entryTarget(target);
      return "refused" in entry
        ? entry
        : checkpointVerificationSeal(root, entry.evidenceFile, entry.tddId);
    }
    case "completion":
    case "parity": {
      const entry = entryTarget(target);
      if ("refused" in entry) return entry;
      const { config } = await loadConfig(root);
      return completionAuditHash(
        root,
        resolvePath(root, config, "specsDir"),
        entry.evidenceFile,
        entry.tddId,
        kind === "parity",
      );
    }
  }
}

const MANIFEST_REFUSAL =
  "a manifest lists each path once, in byte order, each a file or a link inside the project";

/** `<evidence-file>#<TDD-ID>`, the anchor a ledger's Evidence cell points at. */
function entryTarget(
  target: string,
): { evidenceFile: string; tddId: string } | { refused: string } {
  const match = /^(.+)#(tdd-\d{4,})$/i.exec(target);
  const evidenceFile = match?.[1];
  const tddId = match?.[2];
  if (evidenceFile === undefined || tddId === undefined) {
    return {
      refused: `${target} is not <evidence-file>#<TDD-ID>, such as .qfai/evidence/implement-spec-0001.md#tdd-0001`,
    };
  }
  return { evidenceFile, tddId: tddId.toUpperCase() };
}
