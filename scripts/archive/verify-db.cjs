const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://cdiptfmagemjfmsuphaj.supabase.co",
  "sb_secret_snZIkebQVn4xNPbHPMoDRQ_bl45b7rC"
);

async function verify() {
  console.log('=== DB 시그니처 검증 ===\n');
  
  // 전체 시그니처 조회
  const { data: allSigs, error } = await supabase
    .from("signatures")
    .select("sig_number, title, thumbnail_url")
    .order("sig_number");
  
  if (error) {
    console.log("Error:", error.message);
    return;
  }
  
  console.log("DB 시그니처 총 개수:", allSigs.length);
  
  // 이미지 없는 시그니처
  const noImage = allSigs.filter(s => !s.thumbnail_url);
  console.log("이미지 없는 시그니처:", noImage.length);
  if (noImage.length > 0) {
    noImage.forEach(s => console.log("  - " + s.sig_number));
  }
  
  console.log("");
  
  // 주요 수정 항목 확인
  console.log("=== 주요 항목 DB 상태 ===");
  const checkNums = [5015, 5018, 5022, 5044, 5045, 5052, 5053, 5055, 5058, 5071, 5075, 5084, 10053, 10054];
  
  for (const num of checkNums) {
    const sig = allSigs.find(s => s.sig_number === num);
    if (sig) {
      const hasImage = sig.thumbnail_url ? "✓" : "✗";
      const isVerified = sig.thumbnail_url && sig.thumbnail_url.includes("-verified") ? " (verified)" : "";
      console.log(num + ": title=" + sig.title + ", image=" + hasImage + isVerified);
    } else {
      console.log(num + ": ❌ DB에 없음");
    }
  }
  
  console.log("");
  
  // title이 숫자가 아닌 경우 확인 (이름이 잘못 들어간 경우)
  const wrongTitles = allSigs.filter(s => s.title !== String(s.sig_number));
  if (wrongTitles.length > 0) {
    console.log("=== title 불일치 ===");
    wrongTitles.forEach(s => {
      console.log("  " + s.sig_number + ": title='" + s.title + "' (예상: '" + s.sig_number + "')");
    });
  } else {
    console.log("✅ 모든 title이 sig_number와 일치");
  }
}

verify();
