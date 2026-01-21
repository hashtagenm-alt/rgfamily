/**
 * Supabase SQL 직접 실행 스크립트
 * pg 패키지를 사용하여 데이터베이스에 직접 연결
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Supabase 데이터베이스 연결 정보
// 프로젝트: cdiptfmagemjfmsuphaj
const connectionString = `postgresql://postgres.cdiptfmagemjfmsuphaj:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;

async function executeSql() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('데이터베이스 연결 중...');
    await client.connect();
    console.log('✓ 연결 성공\n');

    // 마이그레이션 파일 읽기
    const sqlPath = path.join(__dirname, '../supabase/migrations/20260121_total_donation_rankings.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('SQL 실행 중...');
    await client.query(sql);
    console.log('✓ SQL 실행 완료\n');

    // 확인
    const result = await client.query('SELECT rank, donor_name, is_permanent_vip FROM total_donation_rankings ORDER BY rank LIMIT 5');
    console.log('Top 5 확인:');
    result.rows.forEach(r => {
      const vip = r.is_permanent_vip ? ' [영구VIP]' : '';
      console.log(`  ${r.rank}. ${r.donor_name}${vip}`);
    });

    // 총 개수
    const countResult = await client.query('SELECT COUNT(*) FROM total_donation_rankings');
    console.log(`\n총 ${countResult.rows[0].count}개 레코드`);

  } catch (error) {
    console.error('오류:', error.message);

    if (error.message.includes('password')) {
      console.log('\n데이터베이스 비밀번호가 필요합니다.');
      console.log('Supabase Dashboard > Settings > Database에서 비밀번호를 확인하세요.');
    }
  } finally {
    await client.end();
  }
}

executeSql();
