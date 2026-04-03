#!/bin/bash
set -e

CF_ACCOUNT_ID="a6b7376e04fbd77bb0f69b9fd0170b01"
CF_API_TOKEN="KM9peHrWI896rTU1Rqx3zOZqm4p8ZoGTLB5rbnMq"
VIMEO_TOKEN="7edb04f53f678528c04677fcb23f5dd6"
VIDEO_UID="4c187c357c82e658d17e2abbf543541a"
TITLE="엑셀부 시즌1_12화 주차방지데이 (Part 4/4)"
TEMP_DIR="/tmp/vimeo-test"

mkdir -p "$TEMP_DIR"
ORIG="$TEMP_DIR/${VIDEO_UID}_orig.mp4"
COMP="$TEMP_DIR/${VIDEO_UID}_compressed.mp4"

echo "============================================"
echo "  테스트: CF → FFmpeg → Vimeo"
echo "  UID: $VIDEO_UID"
echo "============================================"

# 1. Cloudflare 다운로드 URL 생성 + 완료 대기
echo ""
echo "1️⃣  Cloudflare MP4 생성 요청..."
curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${VIDEO_UID}/downloads" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" > /dev/null

echo "⏳ MP4 생성 완료 대기 중 (대용량 영상은 수분 소요)..."
while true; do
  CF_RESP=$(curl -s \
    "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${VIDEO_UID}/downloads" \
    -H "Authorization: Bearer ${CF_API_TOKEN}")

  STATUS=$(echo "$CF_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('default',{}).get('status',''))")
  PCT=$(echo "$CF_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('default',{}).get('percentComplete',0))")

  echo "   상태: $STATUS ($PCT%)"

  if [ "$STATUS" = "ready" ]; then
    break
  fi
  sleep 10
done

DOWNLOAD_URL=$(echo "$CF_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('default',{}).get('url',''))")
echo "✅ MP4 준비 완료"

# 2. 다운로드
echo ""
echo "2️⃣  다운로드 중 (23GB, 시간 걸림)..."
curl -L --progress-bar "$DOWNLOAD_URL" -o "$ORIG"
ORIG_SIZE=$(stat -c%s "$ORIG")
echo "✅ 다운로드 완료: $(numfmt --to=iec $ORIG_SIZE)"

# 3. FFmpeg 압축
echo ""
echo "3️⃣  FFmpeg H.265 압축 중 (CRF 28)..."
ffmpeg -y -i "$ORIG" -c:v libx265 -crf 28 -preset fast -c:a aac -b:a 128k -movflags +faststart "$COMP"
rm "$ORIG"
COMP_SIZE=$(stat -c%s "$COMP")
echo "✅ 압축 완료: $(numfmt --to=iec $COMP_SIZE)"

# 4. Vimeo 업로드 준비
echo ""
echo "4️⃣  Vimeo 업로드 준비..."
VIMEO_RESP=$(curl -s -X POST "https://api.vimeo.com/me/videos" \
  -H "Authorization: bearer ${VIMEO_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/vnd.vimeo.*+json;version=3.4" \
  -d "{\"upload\":{\"approach\":\"tus\",\"size\":${COMP_SIZE}},\"name\":\"${TITLE}\",\"privacy\":{\"view\":\"unlisted\"}}")

UPLOAD_LINK=$(echo "$VIMEO_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('upload',{}).get('upload_link',''))")
VIMEO_ID=$(echo "$VIMEO_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('uri','').split('/')[-1])")

if [ -z "$UPLOAD_LINK" ]; then
  echo "❌ Vimeo 업로드 준비 실패:"
  echo "$VIMEO_RESP"
  exit 1
fi
echo "✅ Vimeo ID: $VIMEO_ID"

# 5. TUS 업로드 (Python 청크 방식)
echo ""
echo "5️⃣  Vimeo 업로드 중..."
python3 - <<PYEOF
import os, sys

upload_link = """$UPLOAD_LINK"""
file_path = """$COMP"""
file_size = $COMP_SIZE
chunk_size = 128 * 1024 * 1024  # 128MB 청크

try:
    import urllib.request, urllib.error
except ImportError:
    print("urllib 없음")
    sys.exit(1)

offset = 0
with open(file_path, 'rb') as f:
    while offset < file_size:
        chunk = f.read(chunk_size)
        if not chunk:
            break
        req = urllib.request.Request(upload_link, data=chunk, method='PATCH')
        req.add_header('Content-Type', 'application/offset+octet-stream')
        req.add_header('Tus-Resumable', '1.0.0')
        req.add_header('Upload-Offset', str(offset))
        req.add_header('Content-Length', str(len(chunk)))
        try:
            urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:
            if e.code not in (204, 200):
                print(f"업로드 에러: {e.code} {e.read()}")
                sys.exit(1)
        offset += len(chunk)
        pct = offset / file_size * 100
        print(f"  업로드: {pct:.1f}% ({offset // 1024 // 1024}MB / {file_size // 1024 // 1024}MB)", end='\r', flush=True)

print("\n✅ 업로드 완료")
PYEOF

rm "$COMP"

echo ""
echo "============================================"
echo "✅ 테스트 완료!"
echo "   Vimeo ID: $VIMEO_ID"
echo "   URL: https://vimeo.com/$VIMEO_ID"
echo "============================================"
