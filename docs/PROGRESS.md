# すぐ変換ラボ 実行記録
- 正式指示を詳細仕様として採用。詳細設計一任・細かな確認省略の指示により追加の設計承認待ちは設けない。
- 別オリジン2つを採用。公開未確認。
- 既存ぴったり印刷を公開HTMLで確認。画像→実寸A4 PDFが主機能であり、文字/表変換との重複はない。
- Cloudflare管理画面はログイン待ち。GitHubブラウザはMORRY1992ログイン済み。

- Task 1/2 complete: 26 tests and syntax checks pass. Independent final review completed, important findings fixed via RED→GREEN.
- CSV empty record, CSV 50,001st row without trailing newline, JSON depth/output expansion, unsupported grapheme-count fallback fixed.
- QR software read-back: 9/9. Browser actual PNG and real device scan remain unverified.
- Root tools select enabled; OGP PNG generated.
