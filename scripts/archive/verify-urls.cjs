const { createClient } = require("@supabase/supabase-js");
const https = require("https");

const supabase = createClient(
  "https://cdiptfmagemjfmsuphaj.supabase.co",
  "sb_secret_snZIkebQVn4xNPbHPMoDRQ_bl45b7rC"
);

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on("error", (err) => {
      resolve({ url, status: "ERROR", error: err.message });
    });
  });
}

async function check() {
  // 등록용 12개 + 10053 확인
  const sigNumbers = [5015, 5018, 5022, 5044, 5045, 5052, 5053, 5055, 5058, 5071, 5075, 5084, 10053];
  
  const { data } = await supabase
    .from("signatures")
    .select("sig_number, thumbnail_url")
    .in("sig_number", sigNumbers)
    .order("sig_number");
  
  console.log("=== 이미지 URL 접근성 확인 ===");
  
  for (const sig of data) {
    if (sig.thumbnail_url) {
      const result = await checkUrl(sig.thumbnail_url);
      const status = result.status === 200 ? "✓ OK" : "✗ " + result.status;
      console.log(sig.sig_number + ": " + status);
    } else {
      console.log(sig.sig_number + ": ✗ No URL");
    }
  }
}

check();
