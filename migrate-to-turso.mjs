import 'dotenv/config'
import { createClient } from '@libsql/client'

const local = createClient({ url: 'file:./dev.db' })
const remote = createClient({
  url:       process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const tables = ['User', 'Contact', 'Template', 'Campaign', 'Message', 'BalanceTransaction']

for (const table of tables) {
  const { rows } = await local.execute(`SELECT * FROM "${table}"`)
  console.log(`${table}: ${rows.length} filas`)
  for (const row of rows) {
    const cols = Object.keys(row)
    const sql  = `INSERT OR IGNORE INTO "${table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`
    await remote.execute({ sql, args: Object.values(row) })
  }
}
console.log('✓ Migración completa')
