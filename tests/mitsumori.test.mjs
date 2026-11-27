import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { calculate, convertQuote, draft, parseItems, sampleRows, validate } from '../src/mitsumori/model.mjs'
import { renderPages } from '../src/mitsumori/pdf.mjs'

const row = (price, rate = '10', quantity = '1') => ({ name: '品目', quantity, unit: '式', price, rate, note: '' })

test('税率別に合算してから1回だけ端数処理する', () => {
  const record = { ...draft('quote'), rows: [row('19'), row('19'), row('12', '8'), row('12', '8'), row('40', 'none')] }
  const result = calculate(record)
  assert.deepEqual(result.groups, [
    { rate: '10', basis: 38n, tax: 3n },
    { rate: '8', basis: 24n, tax: 1n },
    { rate: 'none', basis: 40n, tax: 0n },
  ])
  assert.equal(result.total, 106n)
  assert.equal(calculate({ ...record, rounding: 'up' }).tax, 6n)
  assert.equal(calculate({ ...record, rounding: 'nearest' }).tax, 6n)
})

test('税込・小数・全角・値引きを整数演算で扱う', () => {
  const record = { ...draft('invoice'), taxMode: 'inclusive', rows: [row('１，１００', '10', '１．２５'), row('-275'), row('108', '8')] }
  const result = calculate(record)
  assert.equal(result.total, 1208n)
  assert.equal(result.tax, 108n)
  assert.equal(calculate({ ...record, rows: [row('19.995', '10', '0.5')] }).rows[0].amount, 10n)
  assert.throws(() => calculate({ ...record, rows: [row('12,34')] }), /数値/)
  assert.throws(() => calculate({ ...record, rows: [row('100', '10', '0')] }), /大きく/)
  assert.equal(calculate({ ...record, taxMode: 'exclusive', rows: [row('999999999999', 'none', '999999999999')] }).total, 999999999998000000000001n)
})

test('3帳票を単独で作成し、複製は明細を分離して番号と日付を作り直す', () => {
  const quote = { ...draft('quote', '2026-11-25'), recipient: '青葉企画 様', issuer: '個人名', number: 'Q-1', due: '2026-12-01', rows: sampleRows.map(item => ({ ...item })) }
  for (const type of ['quote', 'invoice', 'delivery']) {
    assert.equal(validate({ ...quote, type }).total, 23236n)
  }
  const invoice = convertQuote(quote, 'invoice', '2026-12-02')
  assert.equal(invoice.recipient, quote.recipient)
  assert.deepEqual(invoice.rows, quote.rows)
  assert.equal(invoice.issued, '2026-12-02')
  for (const key of ['due', 'number', 'transaction', 'bank']) assert.equal(invoice[key], '')
  invoice.rows[0].name = '変更'
  assert.equal(quote.rows[0].name, sampleRows[0].name)
  const delivery = convertQuote(quote, 'delivery', '2026-12-03')
  const hidden = { ...delivery, hidePrices: true, rows: [row('')] }
  assert.equal(validate(hidden).hidePrices, true)
  assert.equal(validate(hidden).rows.length, 1)
})

test('適格請求書は登録番号と取引日を確認し、通常帳票は登録番号不要', () => {
  const record = { ...draft('invoice'), issuer: '山田', recipient: '青葉', rows: [row('100')] }
  assert.equal(validate(record).total, 110n)
  assert.throws(() => validate({ ...record, qualified: true }), /登録番号/)
  const qualified = { ...record, qualified: true, registration: 'Ｔ１２３４５６７８９０１２３' }
  assert.throws(() => validate(qualified), /取引日/)
  assert.equal(validate({ ...qualified, transaction: '2026-11-24' }).total, 110n)
})

test('Excel TSVと引用符・改行付きCSVを維持し、形が違う表を拒否する', () => {
  const fromTable = parseItems('品目\t数量\t単位\t単価\t税区分\t備考\r\n作業\t1.5\t時間\t2000\t８％\t現地', 'auto')
  assert.deepEqual(fromTable, [{ name: '作業', quantity: '1.5', unit: '時間', price: '2000', rate: '8', note: '現地' }])
  const fromCsv = parseItems('"研修,午前",1,式,"2,000",0%,"備考\n二行目"', 'comma')
  assert.equal(fromCsv[0].name, '研修,午前')
  assert.equal(fromCsv[0].note, '備考\n二行目')
  assert.throws(() => parseItems('品目,1,品', 'auto'), /4〜6列/)
  assert.throws(() => parseItems('品目,1,品,400,20%', 'auto'), /税区分/)
  assert.doesNotThrow(() => JSON.stringify(fromTable))
})

test('帳票案内と処理を分離し、処理に計測・自動保存・外部フォントを含めない', () => {
  const guide = readFileSync('dist/guide/tools/mitsumori/index.html', 'utf8')
  const processor = readFileSync('dist/tools/mitsumori/index.html', 'utf8')
  assert.match(guide, /\/mitsumori\/\?type=invoice/)
  assert.match(processor, /name="robots" content="noindex,follow"/)
  assert.match(processor, /src="\/mitsumori\/app.mjs"/)
  for (const file of ['app.mjs', 'model.mjs', 'pdf.mjs']) {
    const code = readFileSync('dist/tools/mitsumori/' + file, 'utf8')
    assert.doesNotMatch(code, /\b(?:fetch|sendBeacon|postMessage)\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB/)
  }
})

test('案内のタブ区切り見本を帳票に取り込むと同じ明細と合計になる', () => {
  const html = readFileSync('dist/guide/tools/mitsumori/index.html', 'utf8')
  const [, example] = html.match(/<pre id="quote-tsv-example">([^<]+)<\/pre>/)
  const rows = parseItems(example, 'auto')
  assert.deepEqual(rows, sampleRows)
  assert.equal(calculate({ ...draft('quote'), rows }).total, 23236n)
})

test('軽減税率を含む合計欄は改ページをまたがない', (t) => {
  globalThis.document = {
    createElement() {
      const drawnText = []
      const context = {
        fillText: (text) => drawnText.push(text),
        measureText: (text) => ({ width: text.length * 5 }),
        fillRect() {},
        scale() {},
      }
      return { drawnText, getContext: () => context, setAttribute() {} }
    },
  }
  t.after(() => { delete globalThis.document })

  const rates = ['10', '8', 'none']
  const rows = Array.from({ length: 17 }, (_, index) => ({
    ...row('100', rates[index % rates.length]),
    note: index === 0 ? '一行目\n二行目' : '',
  }))
  const record = {
    ...draft('quote', '2026-11-27'), recipient: '架空の宛先', issuer: '架空の発行者', rows,
  }
  const pages = renderPages(record, validate(record))
  const summary = ['※ 軽減税率の対象品目', '10%', '8%（軽減）', '税計上なし', '消費税合計', '合計（税込）']

  assert.equal(pages.length, 2)
  assert.deepEqual(pages[1].drawnText.filter(text => summary.includes(text)), summary)
})
