#!/bin/bash
# EP2 다운로드 완료 후 자동 업로드
#
# 사용법:
#   ./scripts/ep2-auto-upload.sh
#   ./scripts/ep2-auto-upload.sh --fast  # 30fps 모드

set -e
cd "$(dirname "$0")/.."

EP2_FILE="/var/folders/z0/0tcbss795xsdp75jmr_t9_kh0000gn/T/rg-vod-pipeline/ep2.mp4"
LOG_FILE="/private/tmp/ep2-upload.log"
FAST_MODE=""

if [ "$1" == "--fast" ]; then
  FAST_MODE="--fast"
  echo "🚀 30fps 고속 모드 활성화"
fi

echo "═══════════════════════════════════════════════════════════"
echo "🎬 EP2 재업로드 (maxDurationSeconds 수정됨)"
echo "═══════════════════════════════════════════════════════════"

# Check if download is complete
echo ""
echo "⏳ 다운로드 완료 대기 중..."

while true; do
  if pgrep -f "rclone.*ep2.mp4" > /dev/null; then
    PROGRESS=$(tail -1 /private/tmp/ep2-download.log 2>/dev/null | grep -oE "[0-9]+%" | tail -1 || echo "0%")
    echo -ne "\r   다운로드 진행: $PROGRESS    "
    sleep 30
  else
    # Check if file exists and has content
    if [ -f "$EP2_FILE" ]; then
      SIZE=$(stat -f%z "$EP2_FILE" 2>/dev/null || echo 0)
      if [ "$SIZE" -gt 1000000000 ]; then
        echo ""
        echo "✅ 다운로드 완료!"
        break
      fi
    fi
    echo ""
    echo "❌ 다운로드 실패 또는 파일 없음"
    exit 1
  fi
done

# Start upload
echo ""
echo "🚀 업로드 시작..."
echo "   로그: $LOG_FILE"
echo ""

caffeinate -s npx tsx scripts/split-vod-upload-v2.ts \
  --input "$EP2_FILE" \
  --title "엑셀부 시즌1_02화 황금or벌금DAY" \
  $FAST_MODE \
  2>&1 | tee "$LOG_FILE"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ EP2 업로드 완료!"
echo "═══════════════════════════════════════════════════════════"
