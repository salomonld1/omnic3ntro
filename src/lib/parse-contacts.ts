import * as XLSX from 'xlsx'

export type ContactRow = {
  telefono: string
  nombre?: string
  mensaje?: string
  email?: string
  pais?: string
}

const PHONE_KEYS   = ['telefono', 'phone', 'numero', 'number', 'tel', 'celular', 'cel', 'movil', 'mobile', 'to']
const NAME_KEYS    = ['nombre', 'name', 'contacto', 'contact', 'cliente', 'client']
const MSG_KEYS     = ['mensaje', 'message', 'msg', 'texto', 'text', 'sms']
const EMAIL_KEYS   = ['email', 'correo', 'mail']
const COUNTRY_KEYS = ['pais', 'country', 'estado', 'region']

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z]/g, '')
}

function findKey(headers: string[], candidates: string[]): string | null {
  for (const h of headers) {
    const n = normalize(h)
    if (candidates.some((c) => n === c || n.includes(c))) return h
  }
  return null
}

export async function parseContactsFile(file: File): Promise<ContactRow[]> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', raw: false })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  if (rows.length === 0) throw new Error('El archivo está vacío')

  const headers = Object.keys(rows[0])
  const phoneKey   = findKey(headers, PHONE_KEYS)
  const nameKey    = findKey(headers, NAME_KEYS)
  const msgKey     = findKey(headers, MSG_KEYS)
  const emailKey   = findKey(headers, EMAIL_KEYS)
  const countryKey = findKey(headers, COUNTRY_KEYS)

  if (!phoneKey) {
    throw new Error(
      `No se encontró columna de teléfono. Columnas detectadas: ${headers.join(', ')}. ` +
      `Usa: telefono, phone, numero o cel`
    )
  }

  const contacts: ContactRow[] = []
  for (const row of rows) {
    const telefono = String(row[phoneKey] ?? '').trim()
    if (!telefono) continue
    contacts.push({
      telefono,
      nombre:  nameKey    ? String(row[nameKey]    ?? '').trim() || undefined : undefined,
      mensaje: msgKey     ? String(row[msgKey]     ?? '').trim() || undefined : undefined,
      email:   emailKey   ? String(row[emailKey]   ?? '').trim() || undefined : undefined,
      pais:    countryKey ? String(row[countryKey] ?? '').trim() || undefined : undefined,
    })
  }

  if (contacts.length === 0) throw new Error('No se encontraron números válidos en el archivo')
  return contacts
}

export function applyTemplate(template: string, nombre?: string): string {
  return template.replace(/\{\{nombre\}\}/gi, nombre ?? '').replace(/\{\{name\}\}/gi, nombre ?? '')
}
