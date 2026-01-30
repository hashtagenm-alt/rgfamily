import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const { Client } = pg

async function runMigration() {
  const client = new Client({
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.cdiptfmagemjfmsuphaj',
    password: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('Connecting to Supabase database...')
    await client.connect()
    console.log('Connected!')

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260120_bj_thank_you_messages.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('Running BJ Thank You Messages migration...')
    await client.query(migrationSQL)
    console.log('Migration completed successfully!')

  } catch (error) {
    console.error('Migration failed:', error.message)
    if (error.message.includes('already exists')) {
      console.log('Table already exists - migration may have been run before.')
    }
  } finally {
    await client.end()
  }
}

runMigration()
