const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(timestamp: number): string {
  return dateFormat.format(new Date(timestamp))
}

export function formatDateTime(timestamp: number): string {
  return dateTimeFormat.format(new Date(timestamp))
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return `${Math.round(value)}%`
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}

export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  // BOM para o Excel abrir acentos corretamente.
  const blob = new Blob(['﻿', content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
