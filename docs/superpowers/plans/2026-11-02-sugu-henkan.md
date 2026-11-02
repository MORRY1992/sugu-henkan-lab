# すぐ変換ラボ Implementation Plan
> For agentic workers: implement inline using superpowers:executing-plans; final independent review.
**Goal:** 8機能と連続変換、独立2オリジンの広告・入力分離を実装しGitHub/Cloudflareに公開する。
**Architecture:** static guide + isolated browser tools; Node build, pure functions, same-origin QR dependency.
**Tech Stack:** HTML CSS ES modules, Node test, QR generator MIT.
**Spec:** docs/superpowers/specs/2026-11-02-sugu-henkan-design.md

## Global Constraints
追加固定費ゼロ、AdSenseなし、既存サイト無変更、本文の通信・保存・URL混入なし、広告は案内側のみ、既存Publisher3526726。
## Review Focus
- 絵文字・結合文字の数え方
- CSVの引用符と式開始文字、セル内改行
- JSONの大きな整数・重複キーの保全
- エラー後に古い結果をコピーできないこと
- 広告から処理画面へのDOM/通信経路がないこと

### Task 1: 変換エンジン
Files: src/core.mjs, tests/core.test.mjs
Interfaces: countText, convertWidth, cleanText, dedupeLines, parseDelimited, serializeDelimited, formatJSON, transformURL, pipeline
- [ ] 境界の期待値をテスト化し実装前に失敗確認
- [ ] 純粋関数を実装し全テスト成功
### Task 2: UI・案内・安全境界
Files: src/app.mjs, src/site.mjs, scripts/build.mjs, public/style.css, tests/build.test.mjs
Interfaces: build creates dist/guide and dist/tools; tool links never carry input
- [ ] 各8独立紹介、解説5、9処理画面を作成
- [ ] CSP/robots/sitemap/internal linksとUI操作を検証
### Task 3: 公開・運営
Files: .github/workflows/ci.yml, docs/OPERATIONS.md, STATUS.md
- [ ] 自動テスト・日次公開チェック、週次検証を用意
- [ ] 最終レビュー後GitHub main保存
- [ ] Cloudflare二つのGit連携でデプロイ、公開とheadersを確認
- [ ] Adsterra申請、Search Console準備、既存運営枠へ事実のみ追記
