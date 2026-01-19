import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTable() {
  console.log('Checking bj_thank_you_messages table...')

  const { data, error } = await supabase
    .from('bj_thank_you_messages')
    .select('id')
    .limit(1)

  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01') {
      console.log('Table does not exist - run migration')
      return false
    }
    console.log('Error:', error.message, error.code)
    return false
  }

  console.log('Table exists\! Records found:', data ? data.length : 0)
  return true
}

checkTable()
