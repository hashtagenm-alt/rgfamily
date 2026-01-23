/**
 * Excel Export Utility
 * 데이터를 Excel 파일로 내보내기
 */

import * as XLSX from 'xlsx'

interface ExportColumn<T> {
  key: keyof T | string
  header: string
  format?: (value: unknown, item: T) => string | number
}

interface ExportOptions {
  sheetName?: string
  fileName?: string
}

/**
 * Export data to Excel file
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions = {}
): void {
  const { sheetName = 'Sheet1', fileName = 'export' } = options

  // Transform data to rows with headers
  const headers = columns.map(col => col.header)
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key as keyof T]
      if (col.format) {
        return col.format(value, item)
      }
      return value ?? ''
    })
  })

  // Create worksheet
  const worksheetData = [headers, ...rows]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  // Set column widths
  const colWidths = columns.map((col, idx) => {
    const maxLength = Math.max(
      col.header.length,
      ...rows.map(row => String(row[idx] ?? '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })
  worksheet['!cols'] = colWidths

  // Create workbook and download
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10)
  const fullFileName = `${fileName}_${timestamp}.xlsx`

  // Trigger download
  XLSX.writeFile(workbook, fullFileName)
}

