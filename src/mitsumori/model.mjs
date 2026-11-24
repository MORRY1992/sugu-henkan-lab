import { parseDelimited } from '../core.mjs'

export const types = {
  quote: { name: '見積書', date: '見積日', due: '見積有効期限' },
  invoice: { name: '請求書', date: '請求日', due: '支払期限' },
  delivery: { name: '納品書', date: '発行日', due: '納品日' },
}
export const rates = { '10': '10%', '8': '8%（軽減）', none: '税計上なし' }
export const documentFields = ['number', 'issued', 'due', 'transaction', 'bank', 'notes']
export const commonFields = ['recipient', 'recipientAddress', 'issuer', 'issuerAddress', 'subject', 'registration', 'taxMode', 'rounding']
export const rowFields = ['name', 'quantity', 'unit', 'price', 'rate', 'note']
export const emptyRow = () => ({ name: '', quantity: '1', unit: '', price: '', rate: '10', note: '' })
export const yen = amount => amount.toLocaleString('ja-JP') + ' 円'

export function localDate(now = new Date()) {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-')
}

export function draft(type, today = localDate()) {
  return {
    ...Object.fromEntries([...commonFields, ...documentFields].map(key => [key, ''])),
    type, issued: today, taxMode: 'exclusive', rounding: 'down', qualified: false, hidePrices: false, rows: [emptyRow()],
  }
}

export function convertQuote(quote, target, today = localDate()) {
  return {
    ...draft(target, today),
    ...Object.fromEntries(commonFields.map(key => [key, quote[key]])),
    rows: quote.rows.map(row => ({ ...row })),
  }
}

function numericText(value) {
  return value.normalize('NFKC').replace(/−/g, '-').trim()
}

function scaled(value, name, places, negative = false) {
  const number = numericText(value)
  const match = /^([+-]?)(\d{1,12}|\d{1,3}(?:,\d{3}){1,3})(?:\.(\d{1,4}))?$/.exec(number)
  if (!match || (!negative && match[1] === '-')) {
    throw new Error(name + 'は整数12桁・小数4桁までの数値を入力してください。')
  }
  const digits = (match[3] || '').padEnd(places, '0')
  const total = BigInt(match[2].replaceAll(',', '') + digits)
  return match[1] === '-' ? -total : total
}

function round(numerator, denominator, mode) {
  const remainder = numerator % denominator
  const integer = numerator / denominator
  if (mode === 'up' && remainder > 0n) return integer + 1n
  if (mode === 'down' && remainder < 0n) return integer - 1n
  if (mode === 'nearest' && (remainder >= 0n ? remainder : -remainder) * 2n >= denominator) {
    return integer + (numerator < 0n ? -1n : 1n)
  }
  return integer
}

export function activeRow(row) {
  return Boolean(row.name.trim() || row.price.trim() || row.unit.trim() || row.note.trim()
    || numericText(row.quantity) !== '1' || row.rate !== '10')
}

function totalRow(row, index, hidePrices) {
  const prefix = `明細 ${index + 1} 行目の`
  if (!row.name.trim()) throw new Error(prefix + '品目を入力してください。')
  if (!Object.hasOwn(rates, row.rate)) throw new Error(prefix + '税区分が不明です。')
  const quantity = scaled(row.quantity, prefix + '数量', 4)
  if (quantity <= 0n) throw new Error(prefix + '数量は 0 より大きくしてください。')
  const normalized = { ...row, quantity: numericText(row.quantity) }
  if (hidePrices) return { ...normalized, amount: 0n }
  const price = scaled(row.price, prefix + '単価', 4, true)
  return { ...normalized, price: numericText(row.price), amount: round(quantity * price, 100_000_000n, 'nearest') }
}

export function calculate(record) {
  const hidePrices = record.type === 'delivery' && record.hidePrices
  const rows = record.rows.flatMap((row, index) => activeRow(row) ? [totalRow(row, index, hidePrices)] : [])
  const groups = ['10', '8', 'none']
    .filter(rate => rows.some(row => row.rate === rate)).map(rate => {
      const basis = rows.filter(row => row.rate === rate).reduce((sum, row) => sum + row.amount, 0n)
      const percent = rate === 'none' ? 0n : BigInt(rate)
      const base = record.taxMode === 'inclusive' ? 100n + percent : 100n
      return { rate, basis, tax: round(basis * percent, base, record.rounding) }
    })
  const subtotal = groups.reduce((sum, group) => sum + group.basis, 0n)
  const tax = groups.reduce((sum, group) => sum + group.tax, 0n)
  const total = record.taxMode === 'inclusive' ? subtotal : subtotal + tax
  return { rows, groups, subtotal, tax, total, hidePrices }
}

export function validate(record) {
  const totals = calculate(record)
  if (!totals.rows.length) throw new Error('明細を1件以上入力してください。')
  if (!record.recipient.trim() || !record.issuer.trim()) throw new Error('宛先と発行者の名前を入力してください。')
  if (!record.issued) throw new Error(types[record.type].date + 'を入力してください。')
  if (record.type === 'invoice' && record.qualified) {
    if (!/^T\d{13}$/.test(registrationNumber(record.registration))) throw new Error('登録番号を T と数字13桁で入力してください。')
    if (!record.transaction) throw new Error('適格請求書には取引日を入力してください。')
    if (!totals.groups.some(group => group.rate !== 'none')) throw new Error('適格請求書には課税明細を1件以上入力してください。')
    if (totals.groups.some(group => group.rate !== 'none' && group.basis < 0n)) throw new Error('税率別対象額がマイナスになる明細は通常の請求書で作成してください。')
  }
  return totals
}

export const registrationNumber = value => value.normalize('NFKC').trim().toUpperCase()

const rateLookup = { '10': '10', '10%': '10', '8': '8', '8%': '8', '8%(軽減)': '8', '0': 'none', '0%': 'none', none: 'none', 'なし': 'none', '税計上なし': 'none', '非課税': 'none', '対象外': 'none', '不課税': 'none' }
export function parseItems(text, format, hidePrices = false) {
  const source = text.replace(/^\uFEFF/, '')
  const sep = format === 'tab' || (format === 'auto' && source.includes('\t')) ? '\t' : ','
  const table = parseDelimited(source, sep)
  const header = table[0]?.[0]?.trim()
  const hasHeader = ['品目', '品目名', '商品名'].includes(header) && table[0][1]?.trim() === '数量'
  if (hasHeader) table.shift()
  const rows = table.flatMap((cells, index) => {
    if (cells.every(cell => !cell.trim())) return []
    const line = index + (hasHeader ? 2 : 1)
    if (cells.length < 4 || cells.length > 6) throw new Error(`貼り付けの ${line} 行目は4〜6列で入力してください。`)
    const [name, quantity, unit, price, rawRate = '', note = ''] = cells
    const rateKey = numericText(rawRate)
    const rate = rateKey ? Object.hasOwn(rateLookup, rateKey) && rateLookup[rateKey] : '10'
    if (!rate) throw new Error(`貼り付けの ${line} 行目の税区分は 10%、8%、0% のいずれかです。`)
    const row = { name, quantity, unit, price, rate, note }
    try {
      totalRow(row, index, hidePrices)
      return [row]
    } catch (error) {
      throw new Error(`貼り付けの ${line} 行目を確認してください。 ${error.message}`)
    }
  })
  if (!rows.length) throw new Error('取り込める明細がありません。')
  return rows
}

export const sampleRows = [
  { name: '研修会場利用（午前）', quantity: '1', unit: '室', price: '18000', rate: '10', note: '机・椅子を含む' },
  { name: '持ち帰り用の焼き菓子', quantity: '12', unit: '個', price: '350', rate: '8', note: '個包装' },
  { name: '会場費の値引き', quantity: '1', unit: '式', price: '-1000', rate: '10', note: '' },
]
