export function normalizeText(input) {
  return (input || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim()
}

export function splitChars(text) {
  const t = normalizeText(text)
  if (!t) return []
  // 保留换行作为分页/换行提示：这里先当作普通字符，渲染时忽略并换行填充
  return Array.from(t)
}

export function expandChars(chars, repeatEach = 1, options = {}) {
  const { removeSpaces = false } = options
  const r = Math.max(1, Number(repeatEach) || 1)
  const out = []
  for (const ch of chars) {
    if (removeSpaces && ch === ' ') continue
    if (ch === '\n') {
      out.push('\n')
      continue
    }
    for (let i = 0; i < r; i++) out.push(ch)
  }
  return out
}

export function paginate(chars, cols, rows) {
  const perPage = Math.max(1, cols * rows)
  const pages = []
  let current = []
  for (const ch of chars) {
    if (ch === '\n') {
      // 用特殊标记表示换行，渲染时补齐到下一行开头
      current.push('\n')
      continue
    }
    current.push(ch)
    if (current.length >= perPage) {
      pages.push(current)
      current = []
    }
  }
  if (current.length) pages.push(current)
  return pages
}

export function fillGrid(pageChars, cols, rows) {
  const perPage = cols * rows
  const out = []
  let col = 0
  for (const ch of pageChars) {
    if (ch === '\n') {
      // 补齐到下一行
      while (col !== 0) {
        out.push('')
        col = (col + 1) % cols
      }
      continue
    }
    out.push(ch)
    col = (col + 1) % cols
  }
  while (out.length < perPage) out.push('')
  return out
}

