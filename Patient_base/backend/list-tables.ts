import postgres from 'postgres';

async function listTables() {
  const sql = postgres(process.env.DATABASE_URL!);
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log("✅ TABLES CURRENTLY IN DATABASE:");
  tables.forEach(t => console.log(`  - ${t.table_name}`));
  await sql.end();
}

listTables().catch(console.error);
