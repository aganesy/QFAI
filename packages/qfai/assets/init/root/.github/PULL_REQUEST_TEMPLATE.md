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

## delta.md

- Updated: (path) `.../delta.md`
- DL Entry: `DL-YYYYMMDD-XX`

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
