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
public-health：毎日7:40 JST。ただしGitHub repository variable PUBLIC_LAUNCH_CONFIRMED=trueを正式公開確認後に設定した場合のみ有効。初期状態は実行しない。設定は未完了。ChatGPTの専任タスクは下記を参照。
Dependabot：npm依存の月次更新候補。PRをテスト・レビューしてから反映し、自動マージなし。

## 既存ChatGPT枠への統合
Webサイト日次運営・検索対策（6ae0614020f481918e93dcb3ca9e94ea）の既存8/15/19時を維持。第4号は19時M5で専任タスクの結果を回収し、二重点検を避ける。公開未完了時は新しい公開障害として毎日反復通知しない。
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

## 20261125 見積王の確認と公開

- 案内は `dist/guide/tools/mitsumori/index.html`、編集は `dist/tools/mitsumori/index.html`。編集画面のパスは `/mitsumori/`。帳票を指定するクエリには `type=quote|invoice|delivery` だけを使い、取引情報は含めない。
- Cloudflareの二つの既存プロジェクトで、同じGitHubコミットから案内と処理をビルドする。Previewのリンク先は既定では本番処理オリジン。案内プレビューから処理プレビューへ通す場合は、Preview環境の `TOOLS_ORIGIN` に確認済みの処理用プレビューオリジンを個別に指定する。各側の `/release.json` の `sha` と `side`（guide / tools）を照合する。
- 公開前は処理側トップと `/mitsumori/` に到達し、実レスポンスのCSP、no-referrer、noindexを確認する。処理側が到達不能のときは、Cloudflareのプロジェクト・Git連携・最新ログを管理画面で確認し、緩いCSPや同一オリジンへの切り替えで代用しない。
- 案内から帳票へ移動し、架空のサンプルで税込23,236円、3帳票のA4 PDFダウンロードを確認する。見積からの複製で宛先・明細を引き継ぎ、宛先側の発行日・期限・番号を確認する。画面更新後の破棄、長い品目の改頁、読み込み後の通信も点検する。
- AdSenseのサイト登録、所有確認、審査、広告表示、収益は個別に記録する。広告配置・計測は案内側で行い、処理側で作成開始やPDF完成を送信しない。案内上の作成開始クリックとPDF完成は別の指標。収益は見積王の対象ページに帰属できる範囲で集計する。
- 2026-11-25〜12-31 JSTは、専任タスク「すぐ変換ラボの日次運営」が毎日19時ごろに実装・検証・公開状況と未完作業を管理する。

### 処理側Pagesを初めて接続した場合

管理画面の「Deployments」で `main` の初回配信を確認する。既存PRのブランチが一覧に出ない場合は、処理側のPreview branch controlで `feature/mitsumori` が対象か確認し、PRブランチへの次の通常コミットでプレビューを作る。Previewのデプロイ詳細から実際のURLを開き、パス `/mitsumori/` と `/release.json` で編集画面と配信SHAを確認する。案内側とは別のプロジェクトを選ぶ。
