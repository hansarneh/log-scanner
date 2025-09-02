export interface CSVRow {
  [key: string]: string | number
}

export function generateCSV(data: CSVRow[], headers?: string[]): string {
  if (data.length === 0) return ''
  
  // Use provided headers or extract from first row
  const csvHeaders = headers || Object.keys(data[0])
  
  // Create header row
  const headerRow = csvHeaders.map(header => `"${header}"`).join(',')
  
  // Create data rows
  const dataRows = data.map(row => 
    csvHeaders.map(header => {
      const value = row[header]
      // Escape quotes and wrap in quotes if contains comma or newline
      const escaped = String(value).replace(/"/g, '""')
      return `"${escaped}"`
    }).join(',')
  )
  
  return [headerRow, ...dataRows].join('\n')
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
