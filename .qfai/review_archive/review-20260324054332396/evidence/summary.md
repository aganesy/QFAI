# ATDD Traceability Summary

## Missing Coverage

- US -> E2E
  - SPEC-0001:US-0001
  - SPEC-0002:US-0002
  - SPEC-0003:US-0003
  - SPEC-0004:US-0004
  - SPEC-0005:US-0005
  - SPEC-0006:US-0006
  - SPEC-0007:US-0007
  - SPEC-0008:US-0008
  - SPEC-0009:US-0009
  - SPEC-0010:US-0010
  - SPEC-0011:US-0011
  - SPEC-0012:US-0012
  - SPEC-0013:US-0013
  - SPEC-0014:US-0014
  - SPEC-0015:US-0015
  - SPEC-0016:US-0016
  - SPEC-0017:US-0017
  - SPEC-0018:US-0018
- TC -> Integration
  - SPEC-0001:TC-0001
  - SPEC-0002:TC-0002
  - SPEC-0003:TC-0003
  - SPEC-0004:TC-0004
  - SPEC-0005:TC-0005
  - SPEC-0006:TC-0006
  - SPEC-0007:TC-0007
  - SPEC-0008:TC-0008
  - SPEC-0009:TC-0009
  - SPEC-0010:TC-0010
  - SPEC-0011:TC-0011
  - SPEC-0012:TC-0012
  - SPEC-0013:TC-0013
  - SPEC-0014:TC-0014
  - SPEC-0015:TC-0015
  - SPEC-0016:TC-0016
  - SPEC-0017:TC-0017
  - SPEC-0018:TC-0018
- CON-API -> API
  - なし

## Unknown References

- なし

## Forbidden References

- TC in tests/api/\*\*
  - なし
- TC in tests/e2e/\*\*
  - なし

## Scan

- matchedFileCount: 0
- truncated: false
- limit: 20000
- globs:
  - tests/e2e/\*_/_.{ts,tsx,js,jsx,mjs,cjs,mts,cts,feature,md,markdown}
  - tests/api/\*_/_.{ts,tsx,js,jsx,mjs,cjs,mts,cts,feature,md,markdown}
  - tests/integration/\*_/_.{ts,tsx,js,jsx,mjs,cjs,mts,cts,feature,md,markdown}
