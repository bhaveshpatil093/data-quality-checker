import multer from 'multer'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { runAudit } from '../backend/audit.js'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls'])
const EMPTY_VALUES = new Set(['', 'null', 'undefined', 'na', 'n/a', 'none', '-'])

export const config = {
  api: {
    bodyParser: false,
  },
}

function normalizeCell(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (EMPTY_VALUES.has(trimmed.toLowerCase())) return null
    return trimmed
  }
  return value
}

function normalizeHeaders(headers = []) {
  return headers.map((header, index) => {
    const raw = String(header ?? '').trim()
    return raw || `Column_${index + 1}`
  })
}

function getNonEmptyCellCount(row = []) {
  return row.filter((cell) => String(cell ?? '').trim() !== '').length
}

function extractHeadersAndRows(matrix = []) {
  if (!Array.isArray(matrix) || matrix.length === 0) return { headers: [], rows: [] }

  const scanLimit = Math.min(matrix.length, 25)
  let headerIndex = 0
  let bestScore = -1
  for (let i = 0; i < scanLimit; i += 1) {
    const score = getNonEmptyCellCount(matrix[i])
    if (score > bestScore) {
      bestScore = score
      headerIndex = i
    }
  }

  const rawHeaders = matrix[headerIndex] || []
  const headers = normalizeHeaders(rawHeaders)
  const rows = matrix
    .slice(headerIndex + 1)
    .filter((row) => getNonEmptyCellCount(row) > 0)

  return { headers, rows }
}

function mapRows(headers, rows) {
  return rows.map((row) => {
    const record = {}
    headers.forEach((header, idx) => {
      record[header] = normalizeCell(row[idx])
    })
    return record
  })
}

function validateParsedData(headers, rows) {
  if (!Array.isArray(headers) || headers.length === 0) {
    return { ok: false, error: 'No columns detected in uploaded file' }
  }
  if (!Array.isArray(rows)) {
    return { ok: false, error: 'Parsed rows are invalid' }
  }
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    const rowKeys = Object.keys(row)
    if (rowKeys.length !== headers.length) {
      return { ok: false, error: `Row ${rowIndex + 1} has inconsistent column count` }
    }
    const hasMismatchedKey = headers.some((header) => !Object.prototype.hasOwnProperty.call(row, header))
    if (hasMismatchedKey) {
      return { ok: false, error: `Row ${rowIndex + 1} columns do not match file header` }
    }
  }
  return {
    ok: true,
    summary: {
      rowsProcessed: rows.length,
      columnsProcessed: headers.length,
      columnNames: headers,
    },
  }
}

function parseCsvFromBuffer(fileBuffer) {
  const raw = fileBuffer.toString('utf8')
  const parsed = Papa.parse(raw, { skipEmptyLines: 'greedy' })
  if (parsed.errors?.length) throw new Error(parsed.errors[0].message || 'Invalid CSV file')
  const { headers, rows } = extractHeadersAndRows(parsed.data)
  return { headers, rows: mapRows(headers, rows) }
}

function parseExcelFromBuffer(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', dense: true })
  if (!workbook.SheetNames.length) throw new Error('Excel file has no sheets')
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null, blankrows: false })
  const { headers, rows } = extractHeadersAndRows(matrix)
  return { headers, rows: mapRows(headers, rows) }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const extension = (file.originalname.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(`.${extension}`)) {
      cb(new Error('Only CSV, XLSX, and XLS files are allowed'))
      return
    }
    cb(null, true)
  },
}).single('file')

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    await runMulter(req, res)
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }

    const extension = (req.file.originalname.split('.').pop() || '').toLowerCase()
    const parsed = extension === 'csv'
      ? parseCsvFromBuffer(req.file.buffer)
      : parseExcelFromBuffer(req.file.buffer)

    const validation = validateParsedData(parsed.headers, parsed.rows)
    if (!validation.ok) {
      res.status(400).json({ error: validation.error })
      return
    }

    const audit = runAudit(parsed.headers, parsed.rows)
    res.status(200).json({
      fileName: req.file.originalname,
      headers: parsed.headers,
      rows: parsed.rows,
      rowCount: parsed.rows.length,
      columnCount: parsed.headers.length,
      validation: validation.summary,
      audit,
    })
  } catch (error) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: `File too large. Max size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.` })
      return
    }
    res.status(400).json({ error: error?.message || 'Upload failed' })
  }
}
