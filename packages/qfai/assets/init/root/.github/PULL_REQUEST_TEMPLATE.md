# Pull Request Template

## Summary

- What changed?
- Why now?
- Scope and non-scope in one short paragraph.

## Change Type (Primary)

- [ ] Initial
- [ ] Behavior
- [ ] Structural
- [ ] Ops

## Tags

- [ ] @api
- [ ] @db
- [ ] @nfr
- [ ] @docs
- [ ] @test

## Compatibility (compat)

- [ ] Compatibility
- [ ] Improvement
- [ ] Change
- [ ] Bug-for-bug

> If compat=Change: ensure delta.md DL entry has a "Migration / Follow-ups" section.

## Waivers (optional)

- [ ] No waivers used
- [ ] Waivers used: `.qfai/waivers.yml`
  - IDs: WVR-YYYYMMDD-XX, ...
  - Rationale: (1-2 lines)
  - Expiry: (date)

## delta.md

- Updated: (path) `.../delta.md`
- DL Entry: `DL-YYYYMMDD-XX`

## Verification (delta.md)

- [ ] Verification.Plan is recorded in delta.md
- [ ] Plan items include: `id / level / target / method / owner / expected`
- [ ] If `compat=Change`: Verification.Plan is present and non-empty
- [ ] If `primary=Behavior`: at least one `acceptance` or `manual` verification item exists
- [ ] If `@db`: at least one `migration` or `rollback` verification item exists (or waiver is declared)

## Review Focus (auto by type)

- If Behavior: acceptance expectations updated? migration notes present?
- If Structural: acceptance expectations unchanged? risk of behavior drift?
- If Ops: no product behavior change? CI/templates/docs consistent?

## Validation

- Commands:
- Result:

## Risks

- Functional:
- Performance:
- Security:
- Operations:
