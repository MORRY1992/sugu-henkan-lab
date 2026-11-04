# すぐ変換ラボ 運用・公開手順

正本：MORRY1992/sugu-henkan-lab main。第4号案件F5-04。既存F計画サイトは変更しない。

## 初回Cloudflare Pages（無料、Git連携）
GitHubアカウントMORRY1992と既存Cloudflareアカウントを使用。重複プロジェクトを一覧で確認してから二つを作成。新規アカウント/有料プランは不要。

|項目|案内・集客|入力処理専用|
|---|---|---|
|候補プロジェクト名|sugu-henkan-lab|sugu-henkan-tools|
|GitHub|MORRY1992/sugu-henkan-lab|同左|
|Production branch|main|main|
|Framework preset|None|None|
|Build command|npm run build|npm run build|
|Build output directory|dist/guide|dist/tools|
|Root directory|空欄|空欄|
|Environment|NODE_VERSION=22|NODE_VERSION=22|

公開後に実際の二つのURLとGitHub自動デプロイを確認する。候補URLを確認済み扱いしない。名前が空いていなければ選定した二つのオリジンをGUIDE_ORIGIN/TOOLS_ORIGINの環境変数として両プロジェクトへ同じ値で設定し、scripts/monitor.mjs、src/ads.json、文書のURLを更新してテスト。

## 検証
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
npm run check

本番はnpm run monitorでトップ/robots/sitemapと処理側CSPを検査。取得制限は停止と断定しない。モニターは通常1日1回・7リクエスト程度、広告の操作や収益目的のリロードなし。
処理側のレスポンスにconnect-src 'none' / frame-ancestors 'none' / script-src 'self' / no-referrerが付いているか確認。CloudflareのWeb Analytics、Zaraz、その他外部スクリプトを処理側で有効にしない。

## GitHub Actions
validate：push/PR/手動/週1回（月曜4:20 JST）。build→26件以上のtests→syntax。最新実測件数をQAへ記録。
public-health：毎日7:40 JST。ただしGitHub repository variable PUBLIC_LAUNCH_CONFIRMED=trueを正式公開確認後に設定した場合のみ有効。初期状態は実行しない。設定は未完了。新しいChatGPT定期タスクは作らない。
Dependabot：npm依存の月次更新候補。PRをテスト・レビューしてから反映し、自動マージなし。

## 既存ChatGPT枠への統合
Webサイト日次運営・検索対策（6ae0614020f481918e93dcb3ca9e94ea）の既存8/15/19時を維持。第4号の軽量読取は19時M5と同じ枠へ追加し二重点検を避ける。公開未完了時は新しい公開障害として毎日反復通知しない。
毎日：URL/重大エラーを読取。利用可能なアクセス・検索データのみ報告。
毎週月曜19時：自動テスト/リンク/スマホ/セキュリティ/SEOの最新結果を確認。自動テストを実行できない場合は成功としない。
毎月1日19時：同じ期間・サイト別の訪問/PV/広告表示/eCPM/収益を比較。未接続は0ではなく未確認。英語版と追加機能の優先順を提案。
この処理専用側は解析未接続のため、ツール開始率/再利用率/関連ツール移動率は現在測定しない。ブラウザ本文を測定用に送らない。

## 広告
既存Publisher3526726。案内側の正式URLのみAdsterraへ追加。初期候補Social Bar、追加Native Banner。InterstitialはSocial Barの実際の構成/制御可能性を管理画面で確認し、許可方式と操作性を検証してから。形式ごとのeCPMや予測収益を捏造しない。
申請/承認/Active/専用コード/配信/実績は別の状態としてsrc/ads.jsonとSTATUS.mdに記録。未取得コードを入れず、他サイトコード流用禁止。案内側だけのCSPへ正式コードが必要とするドメインを最小許可し、処理側は変更しない。広告コードのルート配置・共通テンプレへの無差別挿入禁止。

## SEO
18案内ページにtitle/description/canonical/OGP PNG/内部リンク、WebSite/WebApplication構造化データ、robots/sitemap。処理側はnoindexで重複を抑制。サイトマップ/所有確認/インデックス/検索表示/クリックを分ける。Search Consoleは本番URLを確認してHTML確認タグを案内側だけへ固有に設定し所有確認・sitemap送信。
英語版は未実装。日本語版の利用と需要の一次データを見て判断する。

## 復旧
問題を確認したらCloudflare Pagesの直前の正常なデプロイへrollbackできる。GitHubはforceせず修正またはrevertコミットで戻す。セキュリティヘッダーを弱めて機能不具合を隠さない。入力データは収集していないため復元不可。業務データをIssueに貼らせず架空のサンプルで再現。

## 20261104 改修後の公開ゲート

1. `npm ci --ignore-scripts --no-audit --no-fund` → `npm run build` → `npm test` → `npm run check` → `npm run check:release`。validate CIも同じゲートを実行。
2. PRのbase/head SHAと差分、mainの現在headを確認してからマージ。履歴を書き換えず、不一致なら差分を再読する。
3. 既存の案内/処理二つのCloudflareプロジェクト、GitHub連携、production branch=main、build command=npm run build、output=dist/guide / dist/tools、Node 22を照合。source commitとデプロイcommitを分けて記録する。
4. 案内トップ・個別・ノート・privacy/contact、処理の全機能をPC/モバイル幅で確認。未実行→成功→入力変更→再実行→消去と、JSON/URL/CSVのエラーからの復帰を確認。
5. 処理側は実レスポンスのCSP/noindex/no-referrerも確認。入力時・実行時の通信追加がないことを確認する。クリップボード・PNG/テキスト保存・QRの実読取は静的テスト成功と区別して記録。
6. 正式公開の判定は二つの実URL・配信commit・実ヘッダーの確認後に行う。候補URLのまま公開済みとは記録しない。広告pending・未接続解析・未確認収益を成功/0としない。

UI/文言の更新時は `src/ui.mjs`、`scripts/build.mjs`、`public/style.css` が主な編集先。機能/上限は `src/core.mjs`、条件は `src/controls.mjs`、ツール名/仕様は `src/catalog.mjs`。広告を共通テンプレートへ入れない。GSC確認タグを追加する場合も案内側だけへ、空値や重複を入れない。本文の比較・サンプル・スクリーンショットに実ユーザーデータを使わない。詳細は [改修記録](REDESIGN_20261104.md)。
