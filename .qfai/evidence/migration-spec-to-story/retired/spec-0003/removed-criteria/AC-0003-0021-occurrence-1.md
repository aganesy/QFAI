## AC-0003-0021: migration memo authoring

- US-Refs: US-0003-0018
- Given `qfai init --upgrade-assistant-tree` が成功した直後
- When migration completion を確認する
- Then `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` が生成され、本文は (1) 移行前 layout、(2) 移行後 layout、(3) 影響ファイル一覧、(4) sunset 予定 minor version を含む

