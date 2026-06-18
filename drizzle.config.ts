import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load .env.local for local migrations
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL environment variable is not set. Migrations may fail if run.');
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
