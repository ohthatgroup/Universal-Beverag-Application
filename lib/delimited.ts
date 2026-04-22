export type Delimiter = ',' | '\t' | ';'

export interface ParsedDelimitedRecord {
  lineNumber: number
  values: Record<string, string>
}

export interface ParsedDelimitedData {
  delimiter: Delimiter
  headers: string[]
  records: ParsedDelimitedRecord[]
}

function trimBom(value: string) {
  return value.replace(/^\uFEFF/, '')
}

export function detectDelimiter(input: string): Delimiter {
  const firstMeaningfulLine =
    input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ''

  const candidates: Delimiter[] = [',', '\t', ';']
  let winner: Delimiter = ','
  let highestScore = -1

  for (const candidate of candidates) {
    const score = firstMeaningfulLine.split(candidate).length - 1
    if (score > highestScore) {
      highestScore = score
      winner = candidate
    }
  }

  return winner
}

function parseDelimitedRows(input: string, delimiter: Delimiter) {
  const rows: Array<{ lineNumber: number; cells: string[] }> = []
  let currentCell = ''
  let currentRow: string[] = []
  let inQuotes = false
  let lineNumber = 1
  let rowLineNumber = 1

  const pushCell = () => {
    currentRow.push(currentCell)
    currentCell = ''
  }

  const pushRow = () => {
    pushCell()
    rows.push({ lineNumber: rowLineNumber, cells: currentRow })
    currentRow = []
  }

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === delimiter) {
      pushCell()
      continue
    }

    if (char === '\r' || char === '\n') {
      if (inQuotes) {
        currentCell += '\n'
      } else {
        pushRow()
        if (char === '\r' && next === '\n') {
          index += 1
        }
        lineNumber += 1
        rowLineNumber = lineNumber
        continue
      }

      if (char === '\r' && next === '\n') {
        index += 1
      }
      lineNumber += 1
      continue
    }

    currentCell += char
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    pushRow()
  }

  return rows
}

function normalizeHeader(header: string) {
  return trimBom(header).trim()
}

function isMeaningfulRow(cells: string[]) {
  return cells.some((cell) => cell.trim().length > 0)
}

export function parseDelimitedData(input: string): ParsedDelimitedData {
  const source = trimBom(input).trim()
  if (!source) {
    throw new Error('Paste or upload a CSV/TSV file with a header row.')
  }

  const delimiter = detectDelimiter(source)
  const rows = parseDelimitedRows(source, delimiter).filter((row) => isMeaningfulRow(row.cells))

  if (rows.length === 0) {
    throw new Error('Paste or upload a CSV/TSV file with a header row.')
  }

  const headerRow = rows[0]
  const headers = headerRow.cells.map(normalizeHeader)

  if (headers.every((header) => header.length === 0)) {
    throw new Error('The header row is empty.')
  }

  const normalizedHeaderKeys = new Set<string>()
  for (const header of headers) {
    if (!header) continue
    const key = header.replace(/[\s_-]+/g, '').toLowerCase()
    if (normalizedHeaderKeys.has(key)) {
      throw new Error(`Duplicate column "${header}" in header row.`)
    }
    normalizedHeaderKeys.add(key)
  }

  const records = rows
    .slice(1)
    .map((row) => {
      const values: Record<string, string> = {}
      headers.forEach((header, index) => {
        if (!header) return
        values[header] = row.cells[index]?.trim() ?? ''
      })
      return {
        lineNumber: row.lineNumber,
        values,
      }
    })
    .filter((record) => Object.values(record.values).some((value) => value.trim().length > 0))

  if (records.length === 0) {
    throw new Error('No data rows were found below the header row.')
  }

  return {
    delimiter,
    headers,
    records,
  }
}
