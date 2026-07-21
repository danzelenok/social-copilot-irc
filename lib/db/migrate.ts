import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { migrate } from "drizzle-orm/neon-http/migrator"

async function run() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error("DATABASE_URL not found in environment")
    process.exit(1)
  }

  console.log("Connecting to Neon database over HTTP...")
  const sql = neon(dbUrl)
  const db = drizzle(sql)

  console.log("Applying migrations from ./drizzle ...")
  await migrate(db, { migrationsFolder: "./drizzle" })
  console.log("MIGRATION_SUCCESS: All migrations applied to Neon database successfully!")
}

run().catch((err) => {
  console.error("Migration error:", err)
  process.exit(1)
})
