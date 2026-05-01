/**
 * /qfai-prototyping CLI dispatcher (v2.0 transitional stub).
 *
 * v1.x funnel-based round-* commands have been removed (spec-0017 P2).
 * The v2.0 `iterate` command will be implemented in P6.
 * `certify` and `show-spec` continue to be served by `prototypingCertify.ts`.
 *
 * Until P6 lands, this dispatcher rejects all invocations to prevent
 * accidental use of the disabled prototyping skill.
 */

import { error } from "../lib/logger.js";

export type RunPrototypingCommandOptions = {
  root: string;
  action: string;
};

export async function runPrototypingCommand(
  options: RunPrototypingCommandOptions,
): Promise<number> {
  error(
    `qfai prototyping ${options.action}: command unavailable. ` +
      `v1.x round/funnel commands removed in v2.0 (spec-0017). ` +
      `v2.0 \`qfai prototyping iterate --cycle <n>\` lands in P6.`,
  );
  return 2;
}
