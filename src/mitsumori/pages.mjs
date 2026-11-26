import { sampleRows, types } from './model.mjs'
import { esc, icon } from '../ui.mjs'

export const name = '見積王'
export const headline = name + '｜見積書・請求書・納品書を無料作成'
export const description = '見積書・請求書・納品書を登録不要で無料作成。Excelの明細を貼り付け、見積から請求・納品へ引き継いで、スマホ・PCでA4 PDFを保存できます。'

export const quoteDirectoryTool = {
  slug: 'mitsumori',
  name,
  category: '帳票',
  desc: '見積書・請求書・納品書を作成し、A4 PDFで保存。',
  short: '作成例と使い方',
}

const tsvExample = [
  ['品目', '数量', '単位', '単価', '税区分', '備考'],
  ...sampleRows.map(row => [row.name, row.quantity, row.unit, row.price, row.rate + '%', row.note]),
].map(row => row.join('\t')).join('\n')

export function entry(url) {
  return `<section class="quote-entry"><div><h2>${name}</h2><p>見積書・請求書・納品書を作成し、A4 PDFで保存。</p></div><a class="button primary" href="${esc(url)}">帳票作成を開く ${icon('arrow')}</a></section>`
}

export function guideBody(processor) {
  const starts = Object.entries(types).map(([type, doc]) =>
    `<a class="button primary" href="${processor}/mitsumori/?type=${type}" rel="noreferrer">${doc.name}を作る ${icon('arrow')}</a>`).join('')
  return `<article class="wrap quote-guide">
    <div class="breadcrumb"><a href="/">ツール一覧</a><span>/</span>帳票作成</div>
    <header class="quote-hero">
      <div><p class="quote-kicker">${name}</p><h1>見積書・請求書・納品書を無料作成</h1>
      <p class="lead">表の明細を貼り付けて、A4のPDFに。見積書の宛先と明細は、請求書や納品書に引き継げます。</p>
      <div class="quote-actions">${starts}</div><p class="quote-small">登録不要・作成件数の上限なし・透かしなし</p></div>
      <aside class="quote-receipt"><p>架空の見積書</p><strong>青葉企画 様</strong><p>半日の社内研修会場</p><dl><dt>会場費（10%）</dt><dd>18,000円</dd><dt>持ち帰り用の焼き菓子（8%）</dt><dd>4,200円</dd><dt>会場費の値引き（10%）</dt><dd>−1,000円</dd><dt>消費税合計</dt><dd>2,036円</dd></dl><p class="quote-receipt-total">税込合計 <b>23,236円</b></p></aside>
    </header>
    <section class="quote-guide-section"><h2>同じ取引の3帳票を作る</h2>
      <ol><li>見積書で「青葉企画 様」などの宛先、発行者、見積日、有効期限を入力します。品目・数量・単位・単価を入力し、プレビューからPDFを保存します。</li>
      <li>内容が確定したら「請求書に複製」を選び、請求日と取引日、支払期限、振込先を確認します。請求書だけを作る場合は、最初から請求書を選べます。</li>
      <li>「納品書に複製」を選び、実際の納品日と数量に合わせて調整します。価格を記載しない納品書も作成できます。</li></ol>
    </section>
    <section class="quote-guide-section"><h2>Excel・スプレッドシートから貼る</h2><p>セルを選んでコピーし、「表から貼り付け」に入力します。列の順番は、品目、数量、単位、単価、税区分、行の備考です。最後の2列は省略できます。確認画面で列の対応を見てから追加します。下の例はタブ区切りのため、そのまま選択してコピーできます。</p>
      <pre id="quote-tsv-example">${esc(tsvExample)}</pre>
      <p>例えば「編集作業　1.5　時間　4000」や「取付工事　1　式　12000」のように、数量や単位を変更できます。値引きは該当する税率を選び、単価にマイナスを入力します。</p>
    </section>
    <section class="quote-guide-section"><h2>消費税と適格請求書</h2><p>通常の帳票は登録番号なしで作成できます。価格は帳票単位で税抜・税込を選択できます。消費税は税率別に対象額を集計し、1帳票につき税率ごとに1回だけ円単位に丸めます。</p>
      <p>登録を受けた発行者は、請求書で「適格請求書の項目を使う」を選べます。1つの取引日で作る標準の請求書を対象としています。発行者名と登録番号、取引日、取引内容、軽減税率の対象表示、税率別対象額・税率・税額、宛先名を出力します。登録の有効性と取引に適用する税率は発行前にご確認ください。</p>
      <p><a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6625.htm">国税庁の記載事項</a> ／ <a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6371.htm">国税庁の端数計算</a></p>
    </section>
    <section class="quote-guide-section"><h2>保存した帳票と入力データ</h2><p>編集、プレビュー、PDF作成は広告のない専用画面で行います。入力した取引情報はブラウザ内で処理し、ページを再読み込みすると消えます。再編集する場合は、下書きファイルを自分の端末へ保存してください。PDFはA4で保存できます。ページを画像として保存するため、PDF内での文字選択・検索はできません。</p><p><a href="/privacy/">データの扱い</a> ／ <a href="/tools/csv-tsv/">表データをCSV・TSVに整える</a></p><div class="quote-actions">${starts}</div></section>
  </article>`
}

export function editorBody() {
  const field = (key, label, options = {}) => `<label class="quote-field" data-for="${key}"><span>${label}</span>${options.area
    ? `<textarea data-field="${key}" rows="2" autocomplete="off" spellcheck="false"></textarea>`
    : `<input type="${options.type || 'text'}" data-field="${key}" autocomplete="off" spellcheck="false"${options.placeholder ? ` placeholder="${options.placeholder}"` : ''}>`}</label>`
  return `<div class="wrap quote-workspace">
    <div class="quote-heading"><div><h1>${name}</h1><p>入力とPDF作成はこの端末内で行います。</p></div>
      <label class="quote-field quote-type"><span>帳票の種類</span><select id="quote-type">${Object.entries(types).map(([type, doc]) => `<option value="${type}">${doc.name}</option>`).join('')}</select></label>
    </div>
    <div class="quote-actions quote-drafts"><button type="button" class="subtle" id="quote-sample">架空のサンプル</button><button type="button" class="subtle" id="draft-save">下書きファイルを保存</button><button type="button" class="subtle" id="draft-open">下書きファイルを開く</button><input type="file" id="draft-file" accept=".json,application/json" hidden></div>
    <div class="quote-editor-grid">
      <div id="quote-inputs">
       <section class="quote-panel" aria-labelledby="quote-details-title">
         <h2 id="quote-details-title">宛先と発行情報</h2>
         <div class="quote-form-grid">
           ${field('recipient', '宛先名（必須）', { placeholder: '例　株式会社青葉 御中' })}
           ${field('issuer', '発行者名（必須）', { placeholder: '個人名・屋号・法人名' })}
           ${field('recipientAddress', '宛先の住所・連絡先', { area: true })}
           ${field('issuerAddress', '発行者の住所・連絡先', { area: true })}
           ${field('subject', '件名')}${field('number', '書類番号')}
           ${field('issued', '<span id="quote-issued-label">見積日</span>（必須）', { type: 'date' })}
           ${field('due', '<span id="quote-due-label">見積有効期限</span>', { type: 'date' })}
           ${field('transaction', '取引日（適格請求書では必須）', { type: 'date' })}
           ${field('bank', '振込先', { area: true })}
           <label class="quote-check" data-for="qualified"><input type="checkbox" data-field="qualified">適格請求書の項目を使う</label>
           ${field('registration', '登録番号（T＋数字13桁）')}
           ${field('notes', '書類全体の備考', { area: true })}
         </div>
       </section>
       <section class="quote-panel" aria-labelledby="quote-lines-title">
         <h2 id="quote-lines-title">明細</h2>
         <div class="quote-form-grid quote-settings">
           <label class="quote-field"><span>入力する単価</span><select data-field="taxMode"><option value="exclusive">税抜</option><option value="inclusive">税込</option></select></label>
           <label class="quote-field"><span>消費税の端数</span><select data-field="rounding"><option value="down">切り捨て</option><option value="nearest">四捨五入</option><option value="up">切り上げ</option></select></label>
           <label class="quote-check" data-for="hidePrices"><input type="checkbox" data-field="hidePrices">納品書の金額を表示しない</label>
         </div>
         <div id="quote-rows"></div>
         <div class="quote-actions"><button type="button" id="quote-add">＋ 明細を追加</button></div>
         <details id="quote-paste" class="quote-paste"><summary>表から貼り付け</summary><p>品目 → 数量 → 単位 → 単価 → 税区分 → 備考。最後の2列は省略できます。</p>
           <label class="quote-field"><span>貼り付ける明細</span><textarea id="quote-table" rows="4" autocomplete="off" spellcheck="false" placeholder="Excelなどからコピーしたセルを貼り付け"></textarea></label>
           <label class="quote-field"><span>区切り</span><select id="quote-format"><option value="auto">自動（タブまたはカンマ）</option><option value="tab">タブ（TSV）</option><option value="comma">カンマ（CSV）</option></select></label>
           <button type="button" id="quote-import-review">取り込みを確認</button>
           <div id="quote-import-preview" hidden></div><p id="quote-import-status" role="status"></p>
           <button type="button" id="quote-import" hidden>この明細を追加</button>
         </details>
       </section>
      </div>
      <aside class="quote-panel quote-output" aria-label="合計とPDF">
        <h2>合計とPDF</h2><p class="quote-total" id="quote-total">—</p><div id="quote-tax"></div>
        <p class="quote-small">行の金額は円単位に四捨五入し、消費税は税率別の集計後に丸めます。</p>
        <div class="quote-actions"><button type="button" id="quote-preview" class="primary">PDFプレビューを作成</button><a id="quote-download" class="button primary" download hidden>PDFを保存</a></div>
        <p id="quote-status" role="status"></p>
        <div id="quote-convert" class="quote-convert"><p>宛先と明細を引き継ぐ</p><div class="quote-actions"><button type="button" data-convert="invoice">請求書に複製</button><button type="button" data-convert="delivery">納品書に複製</button></div></div>
      </aside>
    </div>
    <section id="quote-preview-area" class="quote-preview" hidden aria-labelledby="quote-preview-title"><h2 id="quote-preview-title">PDFプレビュー</h2><div id="quote-pages"></div></section>
  </div>`
}
