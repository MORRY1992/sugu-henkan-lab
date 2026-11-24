import { activeRow, calculate, commonFields, convertQuote, documentFields, draft, emptyRow, parseItems, rates, rowFields, sampleRows, types, validate, yen } from './model.mjs'
import { makePdf, renderPages } from './pdf.mjs'

const get = id => document.getElementById(id)
const requestedType = new URLSearchParams(location.search).get('type')
const documents = new Map()
const inputs = get('quote-inputs')
const rows = get('quote-rows')
const previewButton = get('quote-preview')
const download = get('quote-download')
const paste = get('quote-table')
const pasteFormat = get('quote-format')
const importArea = get('quote-import-preview')
const importButton = get('quote-import')
const initialType = Object.hasOwn(types, requestedType) ? requestedType : 'quote'
let record = draft(initialType)
let importRows = []
let pdfUrl = ''
let revision = 0

const rowLabels = { name: '品目', quantity: '数量', unit: '単位', price: '単価', rate: '税区分', note: '備考' }
const rowOrder = ['name', 'quantity', 'unit', 'price', 'rate', 'note']

function appendRow(row, index) {
  const section = document.createElement('section')
  section.className = 'quote-row'
  section.dataset.index = index
  const header = document.createElement('div')
  header.className = 'quote-row-head'
  const title = document.createElement('strong')
  title.textContent = `明細 ${index + 1}`
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'subtle'
  remove.dataset.remove = index
  remove.setAttribute('aria-label', `明細 ${index + 1} を削除`)
  remove.textContent = '削除'
  header.append(title, remove)
  section.append(header)
  for (const key of rowOrder) {
    if (record.type === 'delivery' && record.hidePrices && ['price', 'rate'].includes(key)) continue
    const label = document.createElement('label')
    label.className = 'quote-field'
    const caption = document.createElement('span')
    caption.textContent = rowLabels[key]
    const control = document.createElement(key === 'rate' ? 'select' : key === 'note' ? 'textarea' : 'input')
    if (key === 'rate') {
      for (const rate of ['10', '8', 'none']) control.add(new Option(rates[rate], rate))
    }
    if (key === 'note') control.rows = 1
    if (key === 'quantity' || key === 'price') control.inputMode = 'decimal'
    control.autocomplete = 'off'
    control.spellcheck = false
    control.dataset.rowField = key
    control.value = row[key]
    label.append(caption, control)
    section.append(label)
  }
  rows.append(section)
  return section
}

function renderRows() {
  rows.replaceChildren()
  record.rows.forEach(appendRow)
}

function setStatus(message) {
  get('quote-status').textContent = message
}

function clearImport() {
  importRows = []
  importArea.replaceChildren()
  importArea.hidden = true
  importButton.hidden = true
  get('quote-import-status').textContent = ''
}

function invalidatePdf() {
  revision++
  if (pdfUrl) URL.revokeObjectURL(pdfUrl)
  pdfUrl = ''
  download.hidden = true
  download.removeAttribute('href')
  get('quote-preview-area').hidden = true
  get('quote-pages').replaceChildren()
  setStatus('')
}

function refreshTotals() {
  const total = get('quote-total')
  const breakdown = get('quote-tax')
  breakdown.replaceChildren()
  try {
    const result = calculate(record)
    total.textContent = result.hidePrices ? '金額非表示' : result.rows.length ? yen(result.total) : '—'
    if (result.hidePrices) return
    for (const group of result.groups) {
      const detail = document.createElement('p')
      const mode = record.taxMode === 'inclusive' ? '税込' : '税抜'
      detail.textContent = group.rate === 'none'
        ? `${rates[group.rate]}　${yen(group.basis)}`
        : `${rates[group.rate]}　${mode}対象額 ${yen(group.basis)}／税 ${yen(group.tax)}`
      breakdown.append(detail)
    }
  } catch {
    total.textContent = '入力を確認'
  }
}

function edit() {
  invalidatePdf()
  refreshTotals()
}

function renderRecord(next) {
  record = next
  documents.set(record.type, record)
  get('quote-type').value = record.type
  get('quote-issued-label').textContent = types[record.type].date
  get('quote-due-label').textContent = types[record.type].due
  for (const control of inputs.querySelectorAll('[data-field]')) {
    if (control.type === 'checkbox') control.checked = record[control.dataset.field]
    else control.value = record[control.dataset.field]
  }
  for (const key of ['transaction', 'bank', 'qualified', 'registration']) {
    inputs.querySelector(`[data-for="${key}"]`).hidden = record.type !== 'invoice' || (key === 'registration' && !record.qualified)
  }
  inputs.querySelector('[data-for="hidePrices"]').hidden = record.type !== 'delivery'
  get('quote-convert').hidden = record.type !== 'quote'
  paste.value = ''
  clearImport()
  renderRows()
  edit()
}

inputs.addEventListener('input', event => {
  const element = event.target
  const key = element.dataset.field
  const rowKey = element.dataset.rowField
  if (key) record[key] = element.type === 'checkbox' ? element.checked : element.value
  if (rowKey) record.rows[Number(element.closest('[data-index]').dataset.index)][rowKey] = element.value
  if (key === 'qualified') inputs.querySelector('[data-for="registration"]').hidden = !record.qualified
  if (key === 'hidePrices') {
    renderRows()
    clearImport()
  }
  if (key || rowKey) edit()
})

get('quote-add').addEventListener('click', () => {
  const row = emptyRow()
  record.rows.push(row)
  appendRow(row, record.rows.length - 1).querySelector('[data-row-field="name"]').focus()
  edit()
})
rows.addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]')
  if (!remove) return
  const index = Number(remove.dataset.remove)
  record.rows.splice(index, 1)
  if (!record.rows.length) record.rows.push(emptyRow())
  renderRows()
  rows.children[Math.min(index, record.rows.length - 1)].querySelector('[data-row-field="name"]').focus()
  edit()
})

get('quote-type').addEventListener('change', event => {
  const type = event.target.value
  renderRecord(documents.get(type) || draft(type))
})
get('quote-convert').addEventListener('click', event => {
  const button = event.target.closest('[data-convert]')
  if (!button) return
  const type = button.dataset.convert
  const existing = documents.get(type)
  if (existing && !confirm(`編集中の${types[type].name}を、今の見積書からの複製で置き換えますか？`)) return
  renderRecord(convertQuote(record, type))
  setStatus('宛先・明細を引き継ぎました。書類番号と日付をご確認ください。')
  get('quote-type').focus()
})

get('quote-sample').addEventListener('click', () => {
  if ((record.recipient || record.issuer || record.rows.some(activeRow)) && !confirm('現在の入力を架空のサンプルで置き換えますか？')) return
  renderRecord({
    ...draft(record.type), recipient: '青葉企画 様', issuer: '星見会議室', subject: '半日の社内研修会場',
    number: 'SAMPLE-001', rows: sampleRows.map(row => ({ ...row })),
  })
  setStatus('架空のサンプルを入力しました。')
})

paste.addEventListener('input', clearImport)
pasteFormat.addEventListener('change', clearImport)
get('quote-import-review').addEventListener('click', () => {
  clearImport()
  try {
    importRows = parseItems(paste.value, pasteFormat.value, record.type === 'delivery' && record.hidePrices)
    const table = document.createElement('table')
    const header = table.createTHead().insertRow()
    for (const key of rowOrder) {
      const cell = document.createElement('th')
      cell.scope = 'col'
      cell.textContent = rowLabels[key]
      header.append(cell)
    }
    const body = table.createTBody()
    for (const row of importRows.slice(0, 10)) {
      const tr = body.insertRow()
      for (const key of rowOrder) tr.insertCell().textContent = key === 'rate' ? rates[row[key]] : row[key]
    }
    importArea.className = 'quote-import-table'
    importArea.append(table)
    importArea.hidden = false
    importButton.hidden = false
    get('quote-import-status').textContent = `${importRows.length}行を取り込めます。${importRows.length > 10 ? '先頭10行を表示しています。' : ''}`
  } catch (error) {
    get('quote-import-status').textContent = error.message
  }
})
importButton.addEventListener('click', () => {
  const count = importRows.length
  record.rows = record.rows.filter(activeRow).concat(importRows)
  paste.value = ''
  clearImport()
  renderRows()
  edit()
  get('quote-import-review').focus()
  get('quote-import-status').textContent = `${count}行を追加しました。`
})

previewButton.addEventListener('click', async () => {
  invalidatePdf()
  const version = revision
  previewButton.disabled = true
  try {
    const totals = validate(record)
    setStatus('PDFを作成しています…')
    const pages = renderPages(record, totals)
    const blob = await makePdf(pages)
    if (version !== revision) return
    pdfUrl = URL.createObjectURL(blob)
    download.href = pdfUrl
    const slug = record.number.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 80)
    download.download = types[record.type].name + (slug ? '-' + slug : '') + '.pdf'
    download.hidden = false
    get('quote-pages').replaceChildren(...pages)
    get('quote-preview-area').hidden = false
    setStatus(`A4 ${pages.length}ページ。プレビューを確認し、PDFを保存できます。`)
  } catch (error) {
    if (version === revision) setStatus(error.message || 'PDFを作成できませんでした。')
  } finally {
    previewButton.disabled = false
  }
})

get('draft-save').addEventListener('click', () => {
  if (!confirm('宛先・振込先などの入力内容を含む下書きを、この端末に保存しますか？')) return
  const blob = new Blob([JSON.stringify({ version: 1, record })], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = types[record.type].name + '-下書き.json'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
})

function restoreDraft(data) {
  const source = data?.record
  if (data?.version !== 1 || !Object.hasOwn(types, source?.type) || !Array.isArray(source.rows)) {
    throw new Error('見積王で保存した下書きファイルを選んでください。')
  }
  const rebuilt = draft(source.type)
  for (const key of [...documentFields, ...commonFields]) {
    if (typeof source[key] !== 'string') throw new Error('下書きの入力形式を確認してください。')
    rebuilt[key] = source[key]
  }
  if (!['inclusive', 'exclusive'].includes(rebuilt.taxMode) || !['down', 'nearest', 'up'].includes(rebuilt.rounding)) {
    throw new Error('下書きの税設定を確認してください。')
  }
  rebuilt.rows = source.rows.map(row => {
    if (!row || !rowFields.every(key => typeof row[key] === 'string') || !Object.hasOwn(rates, row.rate)) {
      throw new Error('下書きの明細形式を確認してください。')
    }
    return Object.fromEntries(rowFields.map(key => [key, row[key]]))
  })
  if (!rebuilt.rows.length) rebuilt.rows.push(emptyRow())
  rebuilt.qualified = source.qualified === true
  rebuilt.hidePrices = source.hidePrices === true
  return rebuilt
}

const draftFile = get('draft-file')
get('draft-open').addEventListener('click', () => draftFile.click())
draftFile.addEventListener('change', async () => {
  const file = draftFile.files[0]
  draftFile.value = ''
  if (!file) return
  try {
    const next = restoreDraft(JSON.parse(await file.text()))
    if (documents.has(next.type) && !confirm(`${types[next.type].name}の入力を下書きの内容で置き換えますか？`)) return
    renderRecord(next)
    setStatus('下書きを開きました。')
  } catch (error) {
    setStatus(error instanceof SyntaxError ? '下書きファイルを読み込めませんでした。' : error.message)
  }
})
get('tool-switch')?.addEventListener('change', event => {
  if (event.target.value) location.href = '/' + event.target.value + '/'
})
window.addEventListener('pagehide', () => {
  documents.clear()
  renderRecord(draft(initialType))
})
renderRecord(record)
