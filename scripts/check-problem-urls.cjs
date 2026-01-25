const { createClient } = require("@supabase/supabase-js");
const https = require("https");

const supabase = createClient(
  "https://cdiptfmagemjfmsuphaj.supabase.co",
  "sb_secret_snZIkebQVn4xNPbHPMoDRQ_bl45b7rC"
);

async function check() {
  const { data } = await supabase
    .from("signatures")
    .select("sig_number, thumbnail_url")
    .in("sig_number", [5018, 5044])
    .order("sig_number");
  
  console.log("=== 5018, 5044 URL 확인 ===");
  data.forEach(d => {
    console.log(d.sig_number + ":");
    console.log("  " + d.thumbnail_url);
  });
}

check();
