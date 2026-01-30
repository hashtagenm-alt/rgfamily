#!/bin/bash
# EP3 분할 업로드 시작 스크립트
#
# EP2 완료 후 실행:
#   ./scripts/start-ep3.sh
#   ./scripts/start-ep3.sh --fast  # 30fps 모드 (2배 빠름)

set -e
cd "$(dirname "$0")/.."

PIPELINE_DIR="/var/folders/z0/0tcbss795xsdp75jmr_t9_kh0000gn/T/rg-vod-pipeline"
GDRIVE_FOLDER_ID="1SYjStc0DAk8NFIe8zj6ZHGd9TVtzfF9X"
EP2_FILE="$PIPELINE_DIR/엑셀부 시즌1_02화 황금or벌금DAY.mp4"
EP3_FILE="$PIPELINE_DIR/엑셀부 시즌1_03화 조기퇴근DAY.mp4"
LOG_FILE="/tmp/ep3-upload.log"

echo "═══════════════════════════════════════════════════════════"
echo "🎬 EP3 분할 업로드 준비"
echo "═══════════════════════════════════════════════════════════"

# Step 1: Delete EP2 original to free space
if [ -f "$EP2_FILE" ]; then
  SIZE=$(stat -f%z "$EP2_FILE" 2>/dev/null)
  SIZE_GB=$(echo "scale=2; $SIZE / 1024 / 1024 / 1024" | bc)
  echo ""
  echo "⚠️  EP2 원본 파일 발견: ${SIZE_GB} GB"
  echo "   용량 확보를 위해 삭제가 필요합니다."
  echo ""
  read -p "EP2 원본을 삭제하시겠습니까? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f "$EP2_FILE"
    echo "   ✅ EP2 원본 삭제 완료 (${SIZE_GB} GB 확보)"
  else
    echo "   ❌ EP2 삭제 취소. 용량 부족으로 진행 불가."
    exit 1
  fi
fi

echo ""
echo "💾 현재 여유 공간: $(df -h / | tail -1 | awk '{print $4}')"
echo ""

# Step 2: Download EP3 if not exists
if [ -f "$EP3_FILE" ]; then
  SIZE=$(stat -f%z "$EP3_FILE" 2>/dev/null)
  SIZE_GB=$(echo "scale=2; $SIZE / 1024 / 1024 / 1024" | bc)
  echo "✅ EP3 파일 확인됨: ${SIZE_GB} GB"
else
  echo "📥 EP3 다운로드 시작..."
  echo "   소스: Google Drive"
  echo "   예상 크기: ~89 GB"
  echo "   예상 시간: ~30분 (네트워크 속도에 따라 다름)"
  echo ""

  rclone copy "gdrive:엑셀부 시즌1_03화 조기퇴근DAY.mp4" "$PIPELINE_DIR" \
    --drive-root-folder-id="$GDRIVE_FOLDER_ID" \
    --progress \
    --transfers 4

  echo ""
  echo "✅ EP3 다운로드 완료"
fi

# Check for --fast flag
FAST_FLAG=""
if [[ "$1" == "--fast" ]]; then
  FAST_FLAG="--fast"
  echo "🚀 FAST 모드 활성화 (30fps 변환)"
fi

echo ""
echo "📋 실행 명령어:"
echo "   npx tsx scripts/split-vod-upload-v2.ts --episode 3 $FAST_FLAG"
echo ""
echo "로그 파일: $LOG_FILE"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Confirm
read -p "시작하시겠습니까? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "취소됨"
  exit 0
fi

# Run
echo ""
echo "🚀 EP3 업로드 시작..."
nohup npx tsx scripts/split-vod-upload-v2.ts --episode 3 $FAST_FLAG > "$LOG_FILE" 2>&1 &
PID=$!

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ 백그라운드에서 실행 중"
echo "   PID: $PID"
echo "   로그: tail -f $LOG_FILE"
echo "═══════════════════════════════════════════════════════════"
