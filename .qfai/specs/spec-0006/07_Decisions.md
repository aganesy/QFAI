# 07 Decisions

## Decisions

1 item.

### DR-0001: --fail-on 未指定時は常に exit 0

- --fail-on が指定されない場合、doctor は常に exit 0 で終了する
- Why: doctor は診断ツールであり、デフォルトでビルドを失敗させるべきではない
