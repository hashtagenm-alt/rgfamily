const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('donations')
    .select('season_id, donor_name, amount')
    .order('amount', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('총 레코드:', data.length);

  const bySeasons = {};
  data.forEach(d => {
    const s = d.season_id || 'null';
    if (!bySeasons[s]) bySeasons[s] = [];
    bySeasons[s].push(d);
  });

  Object.keys(bySeasons).forEach(s => {
    console.log(`\n시즌 ${s}: ${bySeasons[s].length}건`);
    bySeasons[s].slice(0, 5).forEach((d, i) => console.log(`  ${i+1}. ${d.donor_name}: ${d.amount}`));
  });
}

check();
