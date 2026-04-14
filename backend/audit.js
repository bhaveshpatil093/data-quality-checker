function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function toPercent(value, total) {
  if (!total) return 0
  return (value / total) * 100
}

function classifyValueType(value) {
  if (value === null || value === undefined || value === '') return 'null'
  const text = String(value).trim()
  if (!text) return 'null'
  if (/^(true|false)$/i.test(text)) return 'boolean'
  if (Number.isFinite(Number(text))) return Number.isInteger(Number(text)) ? 'int64' : 'float64'
  const dateMs = Date.parse(text)
  if (!Number.isNaN(dateMs) && /[-/]|T|:/.test(text)) return 'date'
  return 'object'
}

function quantile(sorted, q) {
  if (!sorted.length) return 0
  const position = (sorted.length - 1) * q
  const base = Math.floor(position)
  const rest = position - base
  const current = sorted[base]
  const next = sorted[base + 1] ?? current
  return current + rest * (next - current)
}

function getDominantType(typeCounts) {
  return Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'object'
}

function normalizeDisplayType(dominantType, hasFloats) {
  if (dominantType === 'float64' || dominantType === 'int64') return hasFloats ? 'float64' : 'int64'
  if (dominantType === 'boolean') return 'boolean'
  if (dominantType === 'date') return 'date'
  return 'object'
}

function buildColumnProfiles(headers, rows) {
  const rowCount = rows.length
  const stats = headers.map((name) => ({
    name,
    nullCount: 0,
    uniqueSet: new Set(),
    samples: [],
    typeCounts: { int64: 0, float64: 0, boolean: 0, date: 0, object: 0 },
    numericValues: [],
  }))

  rows.forEach((row) => {
    headers.forEach((header, columnIndex) => {
      const value = row[header] ?? null
      const info = stats[columnIndex]
      if (info.samples.length < 40) info.samples.push(value)
      if (value === null || value === undefined || value === '') {
        info.nullCount += 1
        return
      }
      const text = String(value)
      info.uniqueSet.add(text)
      const valueType = classifyValueType(value)
      info.typeCounts[valueType] += 1
      if (valueType === 'int64' || valueType === 'float64') info.numericValues.push(Number(text))
    })
  })

  return stats.map((info) => {
    const nonNullCount = rowCount - info.nullCount
    const dominantType = getDominantType(info.typeCounts)
    const type = normalizeDisplayType(dominantType, info.typeCounts.float64 > 0)
    let outlierCount = 0
    if ((type === 'int64' || type === 'float64') && info.numericValues.length >= 8) {
      const sorted = [...info.numericValues].sort((a, b) => a - b)
      const q1 = quantile(sorted, 0.25)
      const q3 = quantile(sorted, 0.75)
      const iqr = q3 - q1
      if (iqr > 0) {
        const lower = q1 - 1.5 * iqr
        const upper = q3 + 1.5 * iqr
        outlierCount = sorted.filter((n) => n < lower || n > upper).length
      }
    }
    const inconsistentTypeCount = nonNullCount - (info.typeCounts[dominantType] || 0)
    return {
      name: info.name,
      type,
      nullCount: info.nullCount,
      nullPct: Math.round(toPercent(info.nullCount, rowCount)),
      uniqueCount: info.uniqueSet.size,
      uniquePct: nonNullCount ? Math.round(toPercent(info.uniqueSet.size, nonNullCount)) : 0,
      outlierCount,
      outlierPct: nonNullCount ? Math.round(toPercent(outlierCount, nonNullCount)) : 0,
      inconsistentTypeCount,
      inconsistentTypePct: nonNullCount ? Math.round(toPercent(inconsistentTypeCount, nonNullCount)) : 0,
      dominantType: type,
      values: info.samples,
    }
  })
}

function detectIssues(columns, rows) {
  const issues = []
  let id = 1
  columns.forEach((column) => {
    if (column.nullCount > 0) {
      const severity = column.nullPct > 20 ? 'critical' : column.nullPct > 5 ? 'warning' : 'minor'
      issues.push({ id: id++, column: column.name, type: 'Missing Values', dimension: 'completeness', severity, count: column.nullCount, pct: `${column.nullPct}%`, fixed: false, diagnosis: `${column.nullCount} rows in "${column.name}" are empty/null, which can break aggregations and downstream model features.`, fix: 'Impute values or keep nulls with explicit handling rules.' })
    }
    if ((column.type === 'int64' || column.type === 'float64') && column.outlierCount > 0) {
      issues.push({ id: id++, column: column.name, type: 'Statistical Outliers', dimension: 'accuracy', severity: column.outlierPct > 5 ? 'warning' : 'minor', count: column.outlierCount, pct: `${column.outlierPct}%`, fixed: false, diagnosis: `"${column.name}" contains IQR-based extreme values that fall outside expected numeric ranges.`, fix: 'Review outliers with domain rules, then cap/remove/flag where appropriate.' })
    }
    if (column.inconsistentTypeCount > 0) {
      const severity = column.inconsistentTypePct > 20 ? 'critical' : column.inconsistentTypePct > 8 ? 'warning' : 'minor'
      issues.push({ id: id++, column: column.name, type: 'Data Type Inconsistency', dimension: 'consistency', severity, count: column.inconsistentTypeCount, pct: `${column.inconsistentTypePct}%`, fixed: false, diagnosis: `"${column.name}" mixes multiple data types in a single column, causing parsing and filtering instability.`, fix: `Cast all values in "${column.name}" to a single canonical type.` })
    }
  })
  const rowSet = new Set()
  let duplicateRows = 0
  rows.forEach((row) => {
    const key = JSON.stringify(row)
    if (rowSet.has(key)) duplicateRows += 1
    else rowSet.add(key)
  })
  if (duplicateRows > 0) {
    const duplicatePct = Math.round(toPercent(duplicateRows, rows.length))
    issues.push({ id: id++, column: 'Entire Row', type: 'Exact Duplicates', dimension: 'uniqueness', severity: duplicatePct > 5 ? 'critical' : 'warning', count: duplicateRows, pct: `${duplicatePct}%`, fixed: false, diagnosis: `${duplicateRows} rows are exact duplicates, which can inflate totals and skew metrics.`, fix: 'Drop duplicates using all columns or a business key.' })
  }
  return issues
}

function buildScores(columns, issues, rows) {
  const totalRows = rows.length
  const totalColumns = Math.max(columns.length, 1)
  const totalCells = Math.max(totalRows * totalColumns, 1)
  const missingCells = columns.reduce((sum, col) => sum + col.nullCount, 0)
  const duplicateRows = issues.find((issue) => issue.type === 'Exact Duplicates')?.count || 0
  const inconsistentCells = columns.reduce((sum, col) => sum + col.inconsistentTypeCount, 0)
  const totalNonNullCells = Math.max(totalCells - missingCells, 1)
  const missingPenalty = clamp(Math.round((missingCells / totalCells) * 60))
  const duplicatePenalty = clamp(Math.round((duplicateRows / Math.max(totalRows, 1)) * 25))
  const inconsistencyPenalty = clamp(Math.round((inconsistentCells / totalNonNullCells) * 15))
  return {
    overall: clamp(100 - missingPenalty - duplicatePenalty - inconsistencyPenalty),
    completeness: clamp(100 - missingPenalty),
    uniqueness: clamp(100 - duplicatePenalty),
    consistency: clamp(100 - inconsistencyPenalty),
    penalties: {
      missingValues: missingPenalty,
      duplicateRows: duplicatePenalty,
      inconsistencies: inconsistencyPenalty,
      total: missingPenalty + duplicatePenalty + inconsistencyPenalty,
    },
  }
}

export function runAudit(headers, rows) {
  const columns = buildColumnProfiles(headers, rows)
  const issues = detectIssues(columns, rows)
  const scores = buildScores(columns, issues, rows)
  const duplicateRows = issues.find((issue) => issue.type === 'Exact Duplicates')?.count || 0
  return {
    columns,
    issues,
    scores,
    summary: {
      rowCount: rows.length,
      columnCount: headers.length,
      duplicateRows,
      missingByColumn: columns.map((column) => ({ column: column.name, missingCount: column.nullCount, missingPct: column.nullPct })),
      scoreBreakdown: {
        formula: 'DQ Score = 100 - Missing Values Penalty - Duplicate Rows Penalty - Inconsistency Penalty',
        penalties: scores.penalties,
      },
    },
  }
}
