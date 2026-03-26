# R11 — Devil's Advocate

## Verdict

PASS

## Notes

- 当初は `failOpen: false` を discussion で決め切る案もあり得たが、実装時の exit code と partial failure semantics を伴うため SDD defer がより防御的である。
- 代替案を検討したうえで、現時点の分離は妥当。
