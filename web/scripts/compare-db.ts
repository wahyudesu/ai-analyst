import pg from "pg"

const { Pool } = pg

const db1 =
  "postgresql://neondb_owner:npg_lqdYNJuIO08a@ep-proud-mouse-aijyu7tu-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
const db2 =
  "postgresql://postgres.mmxbumvufqzhxunpjjuy:NoLIuOGKa76QrP8o@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

async function getSchema(connectionString: string, name: string) {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `)

    const tables: Record<
      string,
      {
        columns: Array<{
          column: string
          type: string
          nullable: boolean
          default: string | null
        }>
      }
    > = {}
    for (const row of res.rows) {
      const tableName = row.table_name as string
      if (!tables[tableName]) {
        tables[tableName] = { columns: [] }
      }
      tables[tableName].columns.push({
        column: row.column_name as string,
        type: row.data_type as string,
        nullable: (row.is_nullable as string) === "YES",
        default: row.column_default as string | null,
      })
    }
    return { name, tables }
  } finally {
    await pool.end()
  }
}

async function main() {
  const [schema1, schema2] = await Promise.all([
    getSchema(db1, "Neon (AI-Analyst)"),
    getSchema(db2, "Supabase (Aiman)"),
  ])

  const tables1 = new Set(Object.keys(schema1.tables))
  const tables2 = new Set(Object.keys(schema2.tables))

  console.log(
    "╔══════════════════════════════════════════════════════════════════════════════╗"
  )
  console.log(
    "║                      DATABASE COMPARISON REPORT                             ║"
  )
  console.log(
    "╚══════════════════════════════════════════════════════════════════════════════╝"
  )
  console.log("")

  // Tables only in DB1
  const onlyInDb1 = [...tables1].filter(t => !tables2.has(t))
  const onlyInDb2 = [...tables2].filter(t => !tables1.has(t))
  const commonTables = [...tables1].filter(t => tables2.has(t))

  console.log("📊 TABLES COUNT:")
  console.log(
    `  Neon (AI-Analyst):    ${Object.keys(schema1.tables).length} tables`
  )
  console.log(
    `  Supabase (Aiman):    ${Object.keys(schema2.tables).length} tables`
  )
  console.log(`  Common:              ${commonTables.length} tables`)
  console.log("")

  if (onlyInDb1.length > 0) {
    console.log("🔵 ONLY IN NEON (AI-Analyst):")
    onlyInDb1.forEach(t => console.log(`   - ${t}`))
    console.log("")
  }

  if (onlyInDb2.length > 0) {
    console.log("🟢 ONLY IN SUPABASE (Aiman):")
    onlyInDb2.forEach(t => console.log(`   - ${t}`))
    console.log("")
  }

  console.log("🔗 COMMON TABLES:")
  commonTables.forEach(t => console.log(`   - ${t}`))
  console.log("")

  // Column comparison for common tables
  console.log("📋 COLUMN DIFFERENCES IN COMMON TABLES:")
  let hasDiff = false
  for (const table of commonTables) {
    const cols1 = new Set(schema1.tables[table].columns.map(c => c.column))
    const cols2 = new Set(schema2.tables[table].columns.map(c => c.column))

    const onlyIn1 = [...cols1].filter(c => !cols2.has(c))
    const onlyIn2 = [...cols2].filter(c => !cols1.has(c))

    if (onlyIn1.length > 0 || onlyIn2.length > 0) {
      hasDiff = true
      console.log(`  ${table}:`)
      if (onlyIn1.length > 0) {
        onlyIn1.forEach(c => console.log(`    Only Neon:      ${c}`))
      }
      if (onlyIn2.length > 0) {
        onlyIn2.forEach(c => console.log(`    Only Supabase:  ${c}`))
      }
    }
  }
  if (!hasDiff) {
    console.log("  ✅ No column differences in common tables")
  }

  console.log("")
  console.log(
    "══════════════════════════════════════════════════════════════════════════════"
  )
  console.log("DETAILED TABLE SCHEMAS:")
  console.log(
    "══════════════════════════════════════════════════════════════════════════════"
  )
  console.log("")

  // List all tables from both databases
  const allTables = [...new Set([...tables1, ...tables2])].sort()
  allTables.forEach(table => {
    console.log(`📁 ${table}`)
    console.log(`   Neon:    ${tables1.has(table) ? "✅" : "❌"}`)
    console.log(`   Supabase:${tables2.has(table) ? "✅" : "❌"}`)
    console.log("")
  })
}

main().catch(console.error)
