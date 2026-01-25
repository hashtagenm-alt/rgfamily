const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  "https://cdiptfmagemjfmsuphaj.supabase.co",
  "sb_secret_snZIkebQVn4xNPbHPMoDRQ_bl45b7rC"
);

async function check() {
  const { data } = await supabase
    .from("signatures")
    .select("sig_number, title, thumbnail_url")
    .order("sig_number");
  
  console.log("=== 이미지 없는 시그니처 ===");
  const noImage = data.filter(d => !d.thumbnail_url);
  noImage.forEach(d => console.log(d.sig_number + ": " + (d.title || "N/A")));
  
  console.log("");
  console.log("=== 총 시그니처 수 ===");
  console.log("전체:", data.length);
  console.log("이미지 있음:", data.filter(d => d.thumbnail_url).length);
  console.log("이미지 없음:", noImage.length);
}

check();
