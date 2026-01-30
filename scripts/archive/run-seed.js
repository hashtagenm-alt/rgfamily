/**
 * Supabase SQL Seed Runner
 * 시즌 1 후원 데이터를 Supabase에 업로드
 *
 * 참고: profiles.id는 auth.users UUID를 참조하므로
 * 후원 데이터만 삽입 (donor_id 없이, donor_name만 사용)
 */

const { createClient } = require('@supabase/supabase-js')

// 환경변수 로드
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 시즌 1 후원 Top 50 데이터
const season1Top50 = [
  { rank: 1, id: 'luka831', name: '손밍매니아', hearts: 254663, unit: 'excel' },
  { rank: 2, id: 'mickey94', name: '미키™', hearts: 215381, unit: 'excel' },
  { rank: 3, id: 'ilcy2k', name: '쩔어서짜다', hearts: 185465, unit: 'excel' },
  { rank: 4, id: '2395546632', name: '❥CaNnOt', hearts: 176754, unit: 'excel' },
  { rank: 5, id: 'skypower1119', name: '까부는넌내꺼야119', hearts: 70847, unit: 'excel' },
  { rank: 6, id: 'symail92', name: '☀칰힌사주면천사☀', hearts: 58895, unit: 'excel' },
  { rank: 7, id: 'welcometome791', name: '한세아♡백작♡하얀만두피', hearts: 49523, unit: 'excel' },
  { rank: 8, id: '16516385', name: '시라☆구구단☆시우', hearts: 48690, unit: 'excel' },
  { rank: 9, id: 'yuricap85', name: '한세아내꺼♡호랭이', hearts: 47367, unit: 'excel' },
  { rank: 10, id: 'ksbjh77', name: '[RG]✨린아의발굴™', hearts: 40685, unit: 'excel' },
  { rank: 11, id: 'thursdayday', name: '미드굿♣️가애', hearts: 36970, unit: 'excel' },
  { rank: 12, id: 'rhehrgks486', name: '❤️지수ෆ해린❤️치토스㉦', hearts: 36488, unit: 'excel' },
  { rank: 13, id: 'tmdgus080222', name: '조패러갈꽈', hearts: 27020, unit: 'excel' },
  { rank: 14, id: 'bbwin12', name: '✨바위늪✨', hearts: 25062, unit: 'excel' },
  { rank: 15, id: 'bravo1975', name: '가윤이꼬❤️함주라', hearts: 22822, unit: 'excel' },
  { rank: 16, id: 'tnvenvelv777', name: 'qldh라유', hearts: 22621, unit: 'excel' },
  { rank: 17, id: 'loveday77', name: '[RG]린아✨여행™', hearts: 19032, unit: 'excel' },
  { rank: 18, id: 'skrrrr12', name: '김스껄', hearts: 15741, unit: 'excel' },
  { rank: 19, id: 'museent03020302', name: '[로진]43세정영민', hearts: 14432, unit: 'excel' },
  { rank: 20, id: 'rriiiqp123', name: '이태린ෆ', hearts: 14205, unit: 'excel' },
  { rank: 21, id: 'uuu981214', name: 'ෆ유은', hearts: 13797, unit: 'excel' },
  { rank: 22, id: 'wony0502', name: '홍서하네❥페르소나™', hearts: 12364, unit: 'excel' },
  { rank: 23, id: 'kim6223164', name: '57774', hearts: 12208, unit: 'excel' },
  { rank: 24, id: 'wow486', name: '니니ღ', hearts: 12095, unit: 'excel' },
  { rank: 25, id: 'akffkdcodl', name: '말랑채이', hearts: 12003, unit: 'excel' },
  { rank: 26, id: 'okd12121', name: '채은S2으악❤️', hearts: 11866, unit: 'excel' },
  { rank: 27, id: 'disk197346', name: '[RG]린아네☀둥그레', hearts: 11381, unit: 'excel' },
  { rank: 28, id: 'bluekjhmi', name: '아름다운집', hearts: 11018, unit: 'excel' },
  { rank: 29, id: '4427766178', name: '미쯔✨', hearts: 10673, unit: 'excel' },
  { rank: 30, id: 'duxnqkrxn', name: '♬♪행복한베니와✨엔띠♬', hearts: 10008, unit: 'excel' },
  { rank: 31, id: 'oxxx139', name: '소율❤️', hearts: 10001, unit: 'excel' },
  { rank: 32, id: 'ysooa1030', name: '[S]윤수아잉❤️', hearts: 10000, unit: 'excel' },
  { rank: 33, id: 'syk7574', name: '✧도루묵✧', hearts: 7717, unit: 'excel' },
  { rank: 34, id: 'ejeh2472', name: '사랑해씌발™', hearts: 7257, unit: 'excel' },
  { rank: 35, id: 'dungeon7', name: '계몽☽BJ죽어흑흑_조랭', hearts: 6878, unit: 'excel' },
  { rank: 36, id: 'mugongja', name: '[SD]티모', hearts: 6124, unit: 'excel' },
  { rank: 37, id: 'kingofthestock', name: '풀묶™', hearts: 5674, unit: 'excel' },
  { rank: 38, id: 'dyeks10', name: '손밍ღ타코보이', hearts: 5647, unit: 'excel' },
  { rank: 39, id: '365719', name: '가윤이꼬❤️털이', hearts: 5419, unit: 'excel' },
  { rank: 40, id: 'gjsfken77', name: '[GV]케인♣️', hearts: 5036, unit: 'excel' },
  { rank: 41, id: 'tjdsdm12', name: '시은◡*', hearts: 5000, unit: 'excel' },
  { rank: 42, id: 'no0163', name: '유진이ෆ', hearts: 4853, unit: 'excel' },
  { rank: 43, id: 'mmkorea', name: '이태리ෆ탤받쮸', hearts: 4848, unit: 'excel' },
  { rank: 44, id: 'anfth1234', name: '갈색말티푸', hearts: 4564, unit: 'excel' },
  { rank: 45, id: 'njw7920', name: '❤️사람❤️', hearts: 4462, unit: 'excel' },
  { rank: 46, id: 'asm3158', name: 'FA진스', hearts: 4444, unit: 'excel' },
  { rank: 47, id: 'bbbb1007', name: '✿도화살✿', hearts: 4315, unit: 'excel' },
  { rank: 48, id: 'scv19001', name: '잔망미니언즈', hearts: 4276, unit: 'excel' },
  { rank: 49, id: '3293064651', name: '킴소금쟁이', hearts: 4000, unit: 'excel' },
  { rank: 50, id: 'dogyoung9157', name: '도도_♡', hearts: 3815, unit: 'excel' },
]

async function seed() {
  console.log('🚀 시즌 1 후원 데이터 업로드 시작...\n')

  try {
    // 1. 시즌 1 생성/업데이트
    console.log('1️⃣ 시즌 1 생성/업데이트...')
    const { error: seasonError } = await supabase
      .from('seasons')
      .upsert({
        id: 1,
        name: '시즌 1',
        start_date: '2025-01-01',
        end_date: null,
        is_active: true,
      }, { onConflict: 'id' })

    if (seasonError) throw seasonError
    console.log('   ✅ 시즌 1 완료')

    // 2. 에피소드 1 생성/업데이트
    console.log('2️⃣ 에피소드 1 생성/업데이트...')
    const { data: existingEpisode } = await supabase
      .from('episodes')
      .select('id')
      .eq('season_id', 1)
      .eq('episode_number', 1)
      .single()

    let episodeId = 1
    if (existingEpisode) {
      episodeId = existingEpisode.id
      const { error: episodeError } = await supabase
        .from('episodes')
        .update({
          title: '시즌 1 - 1회차',
          broadcast_date: '2025-01-20',
          is_rank_battle: false,
          is_finalized: true,
        })
        .eq('id', existingEpisode.id)

      if (episodeError) throw episodeError
    } else {
      const { data: newEpisode, error: episodeError } = await supabase
        .from('episodes')
        .insert({
          season_id: 1,
          episode_number: 1,
          title: '시즌 1 - 1회차',
          broadcast_date: '2025-01-20',
          is_rank_battle: false,
          is_finalized: true,
        })
        .select('id')
        .single()

      if (episodeError) throw episodeError
      if (newEpisode) episodeId = newEpisode.id
    }
    console.log('   ✅ 에피소드 1 완료 (ID:', episodeId, ')')

    // 3. 기존 시즌 1 후원 데이터 삭제
    console.log('3️⃣ 기존 시즌 1 후원 데이터 삭제...')
    const { error: deleteError } = await supabase
      .from('donations')
      .delete()
      .eq('season_id', 1)

    if (deleteError) throw deleteError
    console.log('   ✅ 기존 데이터 삭제 완료')

    // 4. 후원 내역 삽입 (donor_id 없이, donor_name만 사용)
    // profiles 테이블은 auth.users UUID를 참조하므로 건드리지 않음
    console.log('4️⃣ 후원 내역 추가 (50건)...')
    const donations = season1Top50.map((donor) => ({
      // donor_id는 NULL (auth.users에 등록된 사용자가 아님)
      donor_name: donor.name,
      amount: donor.hearts,
      season_id: 1,
      unit: donor.unit,
      created_at: '2025-01-20T00:00:00Z',
    }))

    const { error: donationError } = await supabase
      .from('donations')
      .insert(donations)

    if (donationError) throw donationError
    console.log('   ✅ 후원 내역 50건 완료')

    // 결과 확인
    const { data: count } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', 1)

    console.log('\n🎉 시즌 1 후원 데이터 업로드 완료!')
    console.log(`   - 후원 내역: 50건`)
    console.log(`   - 엑셀부: ${season1Top50.filter(d => d.unit === 'excel').length}명`)

  } catch (error) {
    console.error('❌ 에러 발생:', error.message)
    console.error('   상세:', error)
    process.exit(1)
  }
}

seed()
