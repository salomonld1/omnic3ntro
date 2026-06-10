/**
 * Normaliza un número de teléfono para envío internacional.
 * - Elimina cualquier carácter no numérico (+, espacios, guiones, etc.)
 * - Si el resultado tiene exactamente 10 dígitos, asume México y agrega "52"
 * - Si ya incluye código de país (11+ dígitos), lo deja tal cual
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '52' + digits
  return digits
}
