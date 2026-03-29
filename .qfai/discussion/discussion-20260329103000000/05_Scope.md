# 05 Scope

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329103000000 |
| Date          | 2026-03-29                   |

## In Scope

1. `/qfai-prototyping` default behavior を static-first に戻す方針整理
2. runtime-heavy checks を opt-in / L2 / ATDD scope に再配置する方針整理
3. render evidence schema と capture status 語彙の整理
4. visual-review / browser evidence backend abstraction の責務整理
5. browser QA phase と structured output 方針の整理
6. tests / docs / report への影響整理

## Out of Scope

1. external critique provider
2. full-harness orchestration
3. calibration pack
4. cost observability
5. long-running handoff

## Success Criteria

- default path が軽量化される
- optional capability が明確に読める
- browser/backend が universal hard dependency でない
- report が修正ポイントを説明できる
- non-web / non-visual project に不要な obligation が漏れない

## Anti-goals

- runtime-heavy checks を名称だけ変えて default に残すこと
- backend abstraction を Playwright 固定にすること
- evidence quality 自体を hard gate にして運用負荷を増やすこと

## Release Slicing

1. runtime gate scope correction
2. render evidence schema and capture
3. backend abstraction
4. browser QA loop
