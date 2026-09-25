# Legacy AC-0003-0026 before P7 split

Source: `.qfai/specs/spec-0003/03_Acceptance-Criteria.md`, pre-split HEAD.
The current SDD splits the two facets into AC-0003-0026 and AC-0003-0047.

## AC-0003-0026: 配布 install 経路の保持

- US-Refs: US-0003-0021, US-0003-0026
- Given 既存配布 workflow の lockfile 検出 `cache:` 式と lockfile-aware install branch（pnpm / yarn Classic / yarn Berry / npm + no-lockfile）
- When hardening 後の配布 set を検査する
- Then 4 package manager と no-lockfile の全ケースが依然として分岐で扱われ、`cache:` 式は単一 package manager 形式に置換されておらず、新規配布ファイルにも同じ install 分岐が拡張されている。かつ配布 header は package が `engines` で宣言していない Node support floor を主張していない
