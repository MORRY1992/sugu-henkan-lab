import { rates, registrationNumber, types, yen } from './model.mjs'

const pageWidth = 595.28
const pageHeight = 841.89
const margin = 43
const contentWidth = pageWidth - margin * 2
const bottom = pageHeight - 54
const scale = 2.5
const ink = '#162c28'
const accent = '#346558'
const border = '#d9e4de'
const textFont = '"Hiragino Sans","Yu Gothic","Noto Sans CJK JP",sans-serif'
const segmenter = globalThis.Intl?.Segmenter ? new Intl.Segmenter('ja') : null

function wrap(context, value, width) {
  return String(value).replace(/\r\n?/g, '\n').split('\n').flatMap(paragraph => {
    const characters = segmenter ? Array.from(segmenter.segment(paragraph), entry => entry.segment) : Array.from(paragraph)
    const lines = []
    let line = ''
    for (const char of characters) {
      if (line && context.measureText(line + char).width > width) {
        lines.push(line)
        line = ''
      }
      line += char
    }
    return [...lines, line]
  })
}

export function renderPages(record, totals) {
  const pages = []
  const doc = types[record.type]
  const columns = totals.hidePrices
    ? [['品目', 252], ['数量', 81], ['単位', 66], ['備考', 110]]
    : [['品目', 146], ['数量', 63], ['単位', 41], ['単価', 75], ['税率', 38], ['金額', 78], ['備考', 68]]
  let canvas
  let context
  let y
  const font = (size = 10, bold = false) => { context.font = `${bold ? 700 : 400} ${size}px ${textFont}` }
  function text(value, x, top, color = ink) {
    context.fillStyle = color
    context.fillText(value, x, top)
  }
  function rectangle(x, top, width, height, color) {
    context.fillStyle = color
    context.fillRect(x, top, width, height)
  }
  function newPage() {
    canvas = document.createElement('canvas')
    canvas.width = Math.round(pageWidth * scale)
    canvas.height = Math.round(pageHeight * scale)
    context = canvas.getContext('2d', { alpha: false })
    context.scale(scale, scale)
    context.textBaseline = 'top'
    rectangle(0, 0, pageWidth, pageHeight, '#fff')
    rectangle(margin, margin, contentWidth, 3, accent)
    font(pages.length ? 17 : 29, true)
    text(pages.length ? doc.name + '（続き）' : doc.name, margin, 60)
    y = pages.length ? 93 : 111
    pages.push(canvas)
  }
  function ensure(height) {
    if (y + height > bottom) newPage()
  }
  function lines(value, label, bold = false) {
    if (!value) return
    const size = bold ? 14 : 10
    font(size, bold)
    const items = wrap(context, value, contentWidth - 110)
    items.forEach((line, index) => {
      ensure(18)
      font(size, bold)
      if (index === 0) {
        font()
        text(label, margin, y + 2, accent)
        font(size, bold)
      }
      text(line, margin + 105, y)
      y += 18
    })
    y += 4
  }
  function tableHead() {
    ensure(46)
    rectangle(margin, y, contentWidth, 26, '#eaf3ed')
    font(9, true)
    let x = margin
    for (const [label, width] of columns) {
      text(label, x + 6, y + 8)
      x += width
    }
    y += 26
  }
  newPage()
  lines(record.recipient, '宛先', true)
  lines(record.recipientAddress, '宛先住所')
  lines(record.issuer, '発行者', true)
  lines(record.issuerAddress, '発行者情報')
  if (record.type === 'invoice' && record.qualified) lines(registrationNumber(record.registration), '登録番号')
  lines(record.subject, '件名')
  lines(record.number, '書類番号')
  lines(record.issued, doc.date)
  lines(record.due, doc.due)
  if (record.type === 'invoice') lines(record.transaction, '取引日')
  y += 10
  tableHead()
  for (const row of totals.rows) {
    const cells = totals.hidePrices
      ? [row.name, row.quantity, row.unit, row.note]
      : [row.name, row.quantity, row.unit, row.price, row.rate === '8' ? '8%※' : row.rate === 'none' ? '—' : '10%', row.amount.toLocaleString('ja-JP'), row.note]
    font(9)
    const content = cells.map((cell, index) => wrap(context, cell, columns[index][1] - 12))
    const count = Math.max(...content.map(cell => cell.length))
    if (count * 14 + 10 <= bottom - 119 && y + count * 14 + 10 > bottom) {
      newPage()
      tableHead()
    }
    for (let start = 0; start < count;) {
      if (y + 24 > bottom) {
        newPage()
        tableHead()
      }
      const chunk = Math.min(count - start, Math.floor((bottom - y - 10) / 14))
      let x = margin
      font(9)
      for (let index = 0; index < columns.length; index++) {
        const width = columns[index][1]
        content[index].slice(start, start + chunk).forEach((line, offset) => {
          text(line, x + 6, y + 5 + offset * 14)
        })
        x += width
      }
      y += chunk * 14 + 10
      rectangle(margin, y, contentWidth, 0.65, border)
      start += chunk
    }
  }
  y += 18
  if (!totals.hidePrices) {
    ensure(68 + totals.groups.length * 22)
    if (totals.groups.some(group => group.rate === '8')) lines('※ 軽減税率の対象品目', '税率')
    const taxMode = record.taxMode === 'inclusive' ? '税込' : '税抜'
    for (const group of totals.groups) {
      const amount = group.rate === 'none'
        ? yen(group.basis)
        : `${taxMode}対象額 ${yen(group.basis)} ／ 消費税 ${yen(group.tax)}`
      lines(amount, rates[group.rate])
    }
    lines(yen(totals.tax), '消費税合計')
    rectangle(margin, y, contentWidth, 1, accent)
    y += 11
    lines(yen(totals.total), '合計（税込）', true)
  }
  if (record.type === 'invoice') lines(record.bank, '振込先')
  lines(record.notes, '備考')
  for (const [index, page] of pages.entries()) {
    context = page.getContext('2d')
    font(9)
    const number = `${index + 1} / ${pages.length}`
    text(number, pageWidth - margin - context.measureText(number).width, pageHeight - 37, accent)
    page.setAttribute('role', 'img')
    page.setAttribute('aria-label', `${doc.name}のプレビュー ${number}ページ`)
  }
  return pages
}

function jpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PDF画像を生成できませんでした。')), 'image/jpeg', 0.94)
  })
}

export async function makePdf(pages) {
  const encoder = new TextEncoder()
  const parts = []
  const offsets = [0]
  let length = 0
  function append(input) {
    const bytes = typeof input === 'string' ? encoder.encode(input) : input
    parts.push(bytes)
    length += bytes.length ?? bytes.size
  }
  function object(id, ...body) {
    offsets[id] = length
    append(`${id} 0 obj\n`)
    body.forEach(append)
    append('\nendobj\n')
  }
  append('%PDF-1.4\n%')
  append(new Uint8Array([226, 227, 207, 211, 10]))
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  const kids = pages.map((_, index) => `${3 + index * 3} 0 R`).join(' ')
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`)
  for (const [index, canvas] of pages.entries()) {
    const page = 3 + index * 3
    const image = await jpeg(canvas)
    const paint = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`
    object(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 ${page + 2} 0 R >> >> /Contents ${page + 1} 0 R >>`)
    object(page + 1, `<< /Length ${paint.length} >>\nstream\n`, paint, 'endstream')
    object(page + 2, `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.size} >>\nstream\n`, image, '\nendstream')
  }
  const start = length
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`)
  offsets.slice(1).forEach(offset => append(`${String(offset).padStart(10, '0')} 00000 n \n`))
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`)
  return new Blob(parts, { type: 'application/pdf' })
}
