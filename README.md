# すぐ変換ラボ
コピペしたら、すぐ整う。文字・文章・表データ・Web用テキストの無料ツール。

- 8機能：文字数、全角半角、改行空白、重複行、CSV/TSV、JSON、URL、QRコード
- 追加：複数作業の連続変換。設定だけを任意保存
- ブラウザ内で処理し本文を送信しない。広告/案内と処理を別オリジンへ配置
- 2MiB入力上限。CSV50,000行、JSON128段、QR1000UTF-8バイト上限

`npm ci --ignore-scripts && npm run build && npm test && npm run check`

`dist/guide` と `dist/tools` を独立したCloudflare PagesへGitHub連携。
本番URLは初回公開後に確認しSTATUSへ記録。現在の状態は[STATUS.md](STATUS.md)、手順は[運用文書](docs/OPERATIONS.md)、検証は[QA](docs/QA.md)。

QR依存：qrcode-generator 1.4.4、MIT、Kazuhiko Arase。入力を外部APIへ渡さず同一オリジンから配信。[ライセンス](vendor/THIRD_PARTY_LICENSES.txt)。
