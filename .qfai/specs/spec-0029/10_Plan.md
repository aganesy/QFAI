# 10 Plan

## Implementation Strategy

### Phase 1: Core Interface (Priority: P1)

1. Define `CritiqueProvider` interface in `packages/qfai/src/core/critique/types.ts`
   - `CritiqueInput`: output text, context, iteration number
   - `CritiqueResponse`: scores, dimensions, suggestions, metadata
   - `CritiqueAdapter`: orchestrator that wraps providers with fail-open
2. Implement `CritiqueAdapter` in `packages/qfai/src/core/critique/adapter.ts`
   - Provider registration and lookup
   - Response schema validation
   - Fail-open wrapper with logging
   - Configurable timeout (default 30s)

### Phase 2: Generic Command Provider (Priority: P1)

3. Implement `GenericCommandProvider` in `packages/qfai/src/core/critique/providers/command.ts`
   - Command template with argument substitution
   - Argument sanitization against injection (shell metacharacter escaping)
   - Process execution with timeout
   - stdout parsing to CritiqueResponse

### Phase 3: Example Providers (Priority: P2)

4. Implement `EchoProvider` in `packages/qfai/src/core/critique/providers/echo.ts`
   - Returns predefined critique for testing/demo
5. Implement `FileProvider` in `packages/qfai/src/core/critique/providers/file.ts`
   - Reads critique from a JSON file (useful for offline/CI scenarios)

### Phase 4: Configuration (Priority: P2)

6. Add critique provider configuration to `qfai.config.yaml` schema
   - `critique.providers[]`: name, type, command/path, timeout
   - `critique.defaultProvider`: provider name
   - `critique.failOpen`: boolean (default true)

## Test Strategy

### Integration Tests (L3)

- `tests/integration/critique/adapter.test.ts` → TC-0029-0001, TC-0029-0002, TC-0029-0004, TC-0029-0008
- `tests/integration/critique/command-provider.test.ts` → TC-0029-0003
- `tests/integration/critique/timeout.test.ts` → TC-0029-0005
- `tests/integration/critique/examples.test.ts` → TC-0029-0006
- `tests/integration/critique/state-transition.test.ts` → TC-0029-0007

### E2E Tests (L5)

- `tests/e2e/critique-adapter.test.ts` → US-0029-0001, US-0029-0002, US-0029-0004

### Test Annotations

- Integration: `QFAI:SPEC-0029:TC-XXXX`
- E2E: `QFAI:SPEC-0029:US-XXXX`

## Dependencies

- None (leaf module, consumed by spec-0031)

## Risk Mitigation

- Command injection: comprehensive sanitization tests before merge
- Provider timeout: AbortController pattern with explicit cleanup
