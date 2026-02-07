import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

// Spreadsheet schedule data (2026 Jan-Feb)
const spreadsheetSchedule = [
  { date: '2026-01-20', title: '[RG FAMILY] 시즌1 / 01화!', description: '직급전' },
  { date: '2026-01-22', title: '[RG FAMILY] 시즌1 / 02화!', description: '황금 or 벌금데이' },
  { date: '2026-01-24', title: '[RG FAMILY] 시즌1 / 03화!', description: '퇴근전쟁' },
  { date: '2026-01-27', title: '[RG FAMILY] 시즌1 / 04화!', description: '명품데이' },
  { date: '2026-01-29', title: '[RG FAMILY] 시즌1 / 05화!', description: '1vs1 데스매치' },
  { date: '2026-01-31', title: '[RG FAMILY] 시즌1 / 06화!', description: '도파민데이' },
  { date: '2026-02-03', title: '[RG FAMILY] 시즌1 / 07화!', description: '난사데이 & 중간직급전' },
  { date: '2026-02-05', title: '[RG FAMILY] 시즌1 / 08화!', description: '상위권 3명을 이겨라' },
  { date: '2026-02-07', title: '[RG FAMILY] 시즌1 / 09화!', description: '뉴시그 데이' },
  { date: '2026-02-10', title: '[RG FAMILY] 시즌1 / 10화!', description: '용병 데이 1' },
  { date: '2026-02-12', title: '[RG FAMILY] 시즌1 / 11화!', description: '용병 데이 2' },
  { date: '2026-02-14', title: '[RG FAMILY] 시즌1 / 12화!', description: '주차방지데이' },
  { date: '2026-02-19', title: '[RG FAMILY] 시즌1 / 13화!', description: '팀 데스매치' },
  { date: '2026-02-21', title: '[RG FAMILY] 시즌1 / 14화!', description: '기여도 전쟁' },
  { date: '2026-02-24', title: '[RG FAMILY] 시즌1 / 15화!', description: '최종 직급전' },
]

async function main() {
  console.log('=== Syncing Calendar from Spreadsheet ===\n')

  // Get existing schedules
  const { data: existing, error: fetchError } = await supabase
    .from('schedules')
    .select('*')
    .gte('start_datetime', '2026-01-01')
    .lte('start_datetime', '2026-02-28')
    .order('start_datetime', { ascending: true })

  if (fetchError) {
    console.error('Error fetching schedules:', fetchError.message)
    return
  }

  console.log('Current DB schedules:', existing?.length || 0)
  console.log('')

  // Compare and update
  for (const schedItem of spreadsheetSchedule) {
    const dateStr = schedItem.date
    const existingItem = existing?.find(e => e.start_datetime.startsWith(dateStr))

    if (existingItem) {
      // Check if description matches
      if (existingItem.description !== schedItem.description) {
        console.log(`[UPDATE] ${dateStr}:`)
        console.log(`  DB: "${existingItem.description}" → Sheet: "${schedItem.description}"`)
        
        const { error: updateError } = await supabase
          .from('schedules')
          .update({ 
            description: schedItem.description,
            title: schedItem.title 
          })
          .eq('id', existingItem.id)

        if (updateError) {
          console.log(`  ❌ Error: ${updateError.message}`)
        } else {
          console.log(`  ✅ Updated`)
        }
      } else {
        console.log(`[OK] ${dateStr}: "${schedItem.description}"`)
      }
    } else {
      console.log(`[INSERT] ${dateStr}: "${schedItem.description}"`)
      
      const { error: insertError } = await supabase
        .from('schedules')
        .insert({
          title: schedItem.title,
          description: schedItem.description,
          event_type: 'broadcast',
          start_datetime: `${dateStr}T05:00:00+00:00`,
          is_all_day: false,
          color: '#fd68ba'
        })

      if (insertError) {
        console.log(`  ❌ Error: ${insertError.message}`)
      } else {
        console.log(`  ✅ Inserted`)
      }
    }
  }

  // Check for schedules in DB that are not in spreadsheet (except 설 연휴)
  console.log('\n=== Checking for extra DB entries ===')
  for (const dbItem of existing || []) {
    const dateStr = dbItem.start_datetime.split('T')[0]
    const inSpreadsheet = spreadsheetSchedule.find(s => s.date === dateStr)
    
    if (!inSpreadsheet) {
      if (dbItem.title.includes('설 연휴') || dbItem.description?.includes('휴방')) {
        console.log(`[KEEP] ${dateStr}: "${dbItem.title}" (설 연휴)`)
      } else {
        console.log(`[EXTRA] ${dateStr}: "${dbItem.title}" - "${dbItem.description}" (not in spreadsheet)`)
      }
    }
  }

  console.log('\n=== Sync Complete ===')
}

main()
