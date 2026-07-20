const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL is not defined in .env.local");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function run() {
  const migrationFile = path.join(__dirname, '..', 'drizzle', '0006_dusty_harrier.sql');
  if (!fs.existsSync(migrationFile)) {
    console.error("Migration file not found:", migrationFile);
    process.exit(1);
  }

  const content = fs.readFileSync(migrationFile, 'utf8');
  // Split by drizzle statement-breakpoint
  const statements = content
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} migration statements to run.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`Running [${i + 1}/${statements.length}]: ${stmt}`);
    try {
      await sql.query(stmt);
      console.log("Success.");
    } catch (err) {
      // If error is that value already exists, we can log and ignore
      if (err.message && err.message.includes("already exists")) {
        console.warn("Already exists, skipping...");
      } else {
        console.error("Error executing statement:", err);
        process.exit(1);
      }
    }
  }

  console.log("Migration completed successfully!");
}

run().catch(err => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
