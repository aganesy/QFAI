# 12 OQ Resolution Log

Append-only resolution timeline. Each entry records the rationale, options considered, and the adopted decision.

---

## OQ-0001: packHash inclusion in calibrationRef

- **Resolved**: 2026-04-15
- **Owner**: agent
- **Question**: Should `packHash` be included in `calibrationRef` for integrity verification?
- **Options considered**:
  - **Option A** (Include packHash): Adds cryptographic integrity; enables tamper detection. Requires hash computation in `CalibrationLoader`, hash storage in `calibrationRef`, and hash comparison in validator.
  - **Option B** (Exclude / defer): Simpler. `packVersion + packPath + configPath` is sufficient for the v1.7.15-07 audit closure requirement.
- **Adopted**: **Option B — Defer packHash**
- **Rationale**: SRC-0001 §3-4 uses the conditional phrasing "packHash（導入する場合）", explicitly marking hash inclusion as optional. The v1.7.15-07 audit report did not raise a packHash finding. Introducing hash infrastructure now would add complexity without a corresponding audit requirement. TC-08 captures the deferral constraint.
- **Impact**: `FullHarnessRequest.calibrationRef` and validator do not reference `packHash`. Can be revisited in a future audit cycle.

---

## OQ-0002: Error class location (prototyping/errors.ts vs core/errors.ts)

- **Resolved**: 2026-04-15
- **Owner**: agent
- **Question**: Should the 6 new error classes live in a new `prototyping/errors.ts` or in the existing `core/errors.ts`?
- **Options considered**:
  - **Option A** (New file `prototyping/errors.ts`): Co-located with prototyping modules. SRP: `core/errors.ts` stays as general error utilities; `prototyping/errors.ts` owns prototyping-domain errors. Independently testable.
  - **Option B** (Extend `core/errors.ts`): Fewer files, but couples domain-specific prototyping errors to a general module, violating SRP.
- **Adopted**: **Option A — New file `packages/qfai/src/core/prototyping/errors.ts`**
- **Rationale**: SRP requires that domain-specific error classes live in their domain module. `core/errors.ts` is a general utility; adding 6 prototyping-specific classes there would make it a dumping ground. Co-location in `prototyping/` also makes import graphs easier to reason about (no circular risk from `execution.ts` → `core/errors.ts` → back to prototyping).
- **Impact**: REQ-0013 specifies `prototyping/errors.ts`. All WS-5 catch blocks import from this file.

---

## OQ-0003: configPath in FullHarnessRequest.calibrationRef — mandatory vs optional

- **Resolved**: 2026-04-15
- **Owner**: agent
- **Question**: Should `configPath` in `FullHarnessRequest.calibrationRef` be mandatory or optional?
- **Options considered**:
  - **Option A** (Optional: `configPath?: string`): Matches design doc's conditional phrasing. Validator skips comparison when `configPath` is absent from summary.
  - **Option B** (Mandatory: `configPath: string`): Stricter, but incompatible with the common case where no config overlay is used.
- **Adopted**: **Option A — Optional (`configPath?: string`)**
- **Rationale**: SRC-0001 §3-4 states "configPath（summary に出すなら）" — comparison is conditional on the field being present in the summary. Forcing it to be mandatory would break all pack configurations that do not use a config overlay, which is the majority. REQ-0002 and REQ-0010 both specify `configPath?`.
- **Impact**: `FullHarnessRequest.calibrationRef` type uses `configPath?: string`. Validator skips `configPath` comparison when the field is absent.

---

## OQ-0004: Scalar field obsolete detection — parse-time vs normalize-time

- **Resolved**: 2026-04-15
- **Owner**: agent
- **Question**: Should obsolete scalar calibration fields be detected at JSON schema parse-time or at normalize-time in `config.ts`?
- **Options considered**:
  - **Option A** (normalize-time): Post-parse validation in `config.ts` normalize step. Consistent with existing config validation patterns. No JSON schema changes required.
  - **Option B** (parse-time): Stricter (earlier error), but requires JSON schema changes or a custom parse step, deviating from the existing codebase pattern.
- **Adopted**: **Option A — normalize-time**
- **Rationale**: The existing `config.ts` normalization flow is the established validation point for config errors. Introducing a parse-time mechanism would require changes to the schema validator infrastructure, which is out of scope. normalize-time detection via a `validateObsoleteCalibrationFields()` helper is consistent with existing patterns and satisfies REQ-0016.
- **Impact**: REQ-0016 specifies normalize-time. `config.ts` normalize step throws on obsolete fields.

---

## OQ-0005: surfacePolicy.ts rejection message — generated from constant vs hardcoded

- **Resolved**: 2026-04-15
- **Owner**: agent
- **Question**: Should the `assertSupportedPrototypingSurface()` rejection message be generated from `PROTOTYPING_SUPPORTED_SURFACES` constant, or should the stale string be replaced with a new hardcoded string?
- **Options considered**:
  - **Option A** (Hardcode "web/mobile/desktop/mixed"): Simple one-line fix. But the same staleness problem can recur if `PROTOTYPING_SUPPORTED_SURFACES` is updated without touching the message string.
  - **Option B** (Generate from constant: `PROTOTYPING_SUPPORTED_SURFACES.join(", ")`): DRY principle. The constant is already the SSOT for supported surfaces. Message is perpetually correct as long as the constant is updated.
- **Adopted**: **Option B — Generate from constant**
- **Rationale**: The root cause of WS-7 (stale `cli` in the message) is precisely that a separate hardcoded string diverged from the constant. Option A would be a short-term fix that does not eliminate the root cause. Option B eliminates the possibility of recurrence. REQ-0018 specifies this approach.
- **Impact**: `assertSupportedPrototypingSurface()` message is generated via `PROTOTYPING_SUPPORTED_SURFACES.join(", ")` or equivalent. No standalone message string to maintain.
