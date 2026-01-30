/**
 * 데이터베이스 테이블 구조 분석
 * - 테이블 목록, 컬럼, FK 관계, 데이터 현황 파악
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('========================================');
  console.log('데이터베이스 테이블 구조 분석');
  console.log('========================================\n');

  // 확인할 테이블 목록
  const tables = [
    'profiles',
    'seasons',
    'donations',
    'vip_rewards',
    'vip_images',
    'posts',
    'comments',
    'members',
    'episodes',
    'timeline_events',
    'schedule_events',
    'notices'
  ];

  const tableInfo = {};

  for (const table of tables) {
    console.log('----------------------------------------');
    console.log('테이블: ' + table);
    console.log('----------------------------------------');

    // 데이터 개수
    const { count, error: countErr } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.log('  상태: 테이블 없음 또는 접근 불가');
      console.log('  에러: ' + countErr.message);
      tableInfo[table] = { exists: false, error: countErr.message };
      continue;
    }

    console.log('  레코드 수: ' + count);
    tableInfo[table] = { exists: true, count: count };

    // 샘플 데이터로 컬럼 확인
    const { data: sample } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (sample && sample.length > 0) {
      const columns = Object.keys(sample[0]);
      console.log('  컬럼: ' + columns.join(', '));
      tableInfo[table].columns = columns;

      // FK로 보이는 컬럼 식별
      const fkColumns = columns.filter(c =>
        c.endsWith('_id') || c === 'profile_id' || c === 'user_id' || c === 'author_id'
      );
      if (fkColumns.length > 0) {
        console.log('  FK 후보: ' + fkColumns.join(', '));
        tableInfo[table].fkColumns = fkColumns;
      }
    }
  }

  // 요약
  console.log('\n========================================');
  console.log('테이블 구조 요약');
  console.log('========================================\n');

  // 존재하는 테이블
  const existingTables = Object.entries(tableInfo)
    .filter(([_, info]) => info.exists)
    .map(([name, info]) => name + ' (' + info.count + '개)');

  console.log('존재하는 테이블:');
  existingTables.forEach(t => console.log('  - ' + t));

  // 없는 테이블
  const missingTables = Object.entries(tableInfo)
    .filter(([_, info]) => !info.exists)
    .map(([name, _]) => name);

  if (missingTables.length > 0) {
    console.log('\n없는 테이블:');
    missingTables.forEach(t => console.log('  - ' + t));
  }

  // FK 관계 분석
  console.log('\n========================================');
  console.log('FK 관계 분석');
  console.log('========================================\n');

  // donations -> profiles/seasons 관계 확인
  console.log('donations 테이블 분석...');
  const { data: donations } = await supabase
    .from('donations')
    .select('donor_name, profile_id, season_id')
    .limit(5);

  if (donations) {
    console.log('  샘플:');
    donations.forEach(d => {
      console.log('    donor_name: ' + d.donor_name + ', profile_id: ' + (d.profile_id || 'null') + ', season_id: ' + d.season_id);
    });
  }

  // vip_rewards -> profiles 관계 확인
  console.log('\nvip_rewards 테이블 분석...');
  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('rank, profile_id, season_id, profiles:profile_id(nickname)')
    .order('rank');

  if (vipRewards) {
    console.log('  VIP 목록:');
    vipRewards.forEach(v => {
      const nickname = v.profiles?.nickname || '(프로필 없음)';
      console.log('    ' + v.rank + '위: ' + nickname + ' (profile_id: ' + v.profile_id + ', season_id: ' + v.season_id + ')');
    });
  }

  // members 테이블 분석
  console.log('\nmembers 테이블 분석...');
  const { data: members } = await supabase
    .from('members')
    .select('id, name, nickname, role, unit')
    .limit(10);

  if (members) {
    console.log('  멤버 목록 (' + members.length + '개):');
    members.forEach(m => {
      console.log('    ' + m.name + ' (' + m.nickname + ') - ' + m.role + ' / ' + m.unit);
    });
  }

  // profiles vs members 중복 확인
  console.log('\n========================================');
  console.log('잠재적 중복/혼란 분석');
  console.log('========================================\n');

  console.log('profiles vs members 테이블:');
  console.log('  - profiles: 로그인 사용자 정보 (auth.users 연결)');
  console.log('  - members: RG Family 멤버 정보 (조직도용)');
  console.log('  -> 용도가 다름, 중복 아님\n');

  console.log('donations.donor_name vs profiles.nickname:');
  console.log('  - donations: 후원자 닉네임 (문자열, 비회원 포함)');
  console.log('  - profiles: 가입 회원 닉네임');
  console.log('  -> profile_id로 연결 가능하나 현재 대부분 null\n');

  // 시즌 관련 테이블들
  console.log('시즌 관련 테이블:');
  const { data: seasons } = await supabase.from('seasons').select('*');
  if (seasons) {
    console.log('  seasons: ' + seasons.length + '개');
    seasons.forEach(s => {
      console.log('    ID ' + s.id + ': ' + s.name + ' (active: ' + s.is_active + ')');
    });
  }

  console.log('\n========================================');
  console.log('분석 완료');
  console.log('========================================');
}

main().catch(console.error);
