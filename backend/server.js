import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { runAudit } from './audit.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadDir = path.join(__dirname, 'tmp-uploads')
const PORT = Number(process.env.PORT || 4000)
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls'])
const EMPTY_VALUES = new Set(['', 'null', 'undefined', 'na', 'n/a', 'none', '-'])

await fs.mkdir(uploadDir, { recursive: true })

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
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return { headers: [], rows: [] }
  }

  // Pick the densest row in the first chunk to avoid using title rows like "Table1".
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
  if (bestScore <= 0) {
    headerIndex = 0
  }

  const rawHeaders = matrix[headerIndex] || []
  const headers = normalizeHeaders(rawHeaders)
  const rawRows = matrix
    .slice(headerIndex + 1)
    .filter((row) => getNonEmptyCellCount(row) > 0)

  return { headers, rows: rawRows }
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

  const invalidHeader = headers.find((header) => !String(header || '').trim())
  if (invalidHeader !== undefined) {
    return { ok: false, error: 'Column names must be non-empty' }
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

async function parseCsvFromPath(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = Papa.parse(raw, { skipEmptyLines: 'greedy' })
  if (parsed.errors?.length) {
    throw new Error(parsed.errors[0].message || 'Invalid CSV file')
  }
  const { headers, rows } = extractHeadersAndRows(parsed.data)
  return { headers, rows: mapRows(headers, rows) }
}

async function parseExcelFromPath(filePath) {
  const buffer = await fs.readFile(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer', dense: true })
  if (!workbook.SheetNames.length) {
    throw new Error('Excel file has no sheets')
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: null,
    blankrows: false,
  })
  const { headers, rows } = extractHeadersAndRows(matrix)
  return { headers, rows: mapRows(headers, rows) }
}

const app = express()
app.use(cors())

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}-${safeName}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      cb(new Error('Only CSV, XLSX, and XLS files are allowed'))
      return
    }
    cb(null, true)
  },
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const tempPath = req.file?.path
  if (!req.file || !tempPath) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  try {
    console.info(`[upload:${requestId}] file received`, {
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      tempPath,
    })

    const extension = path.extname(req.file.originalname).toLowerCase()
    const parsed = extension === '.csv'
      ? await parseCsvFromPath(tempPath)
      : await parseExcelFromPath(tempPath)
    console.info(`[upload:${requestId}] file parsed`, {
      rowCount: parsed.rows.length,
      columnCount: parsed.headers.length,
      columns: parsed.headers,
    })

    const validation = validateParsedData(parsed.headers, parsed.rows)
    if (!validation.ok) {
      console.error(`[upload:${requestId}] validation failed`, { error: validation.error })
      res.status(400).json({ error: validation.error })
      return
    }

    const audit = runAudit(parsed.headers, parsed.rows)
    console.info(`[upload:${requestId}] file analyzed`, {
      score: audit.scores.overall,
      issueCount: audit.issues.length,
      duplicateRows: audit.summary.duplicateRows,
    })

    res.json({
      requestId,
      fileName: req.file.originalname,
      headers: parsed.headers,
      rows: parsed.rows,
      rowCount: parsed.rows.length,
      columnCount: parsed.headers.length,
      validation: validation.summary,
      audit,
    })
  } catch (error) {
    console.error(`[upload:${requestId}] processing failed`, {
      error: error.message || 'Failed to parse file',
    })
    res.status(400).json({ error: error.message || 'Failed to parse file' })
  } finally {
    await fs.unlink(tempPath).catch(() => {})
  }
})

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: `File too large. Max size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.` })
    return
  }
  res.status(400).json({ error: err.message || 'Request failed' })
})

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
