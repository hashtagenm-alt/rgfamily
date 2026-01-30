#!/bin/bash
# 전체 VOD 다운로드 스크립트
#
# 사용법:
#   ./scripts/download-all-vods.sh           # EP3~5 순차 다운로드
#   ./scripts/download-all-vods.sh --check   # 현재 상태만 확인

set -e
cd "$(dirname "$0")/.."

PIPELINE_DIR="/var/folders/z0/0tcbss795xsdp75jmr_t9_kh0000gn/T/rg-vod-pipeline"
GDRIVE_FOLDER_ID="1SYjStc0DAk8NFIe8zj6ZHGd9TVtzfF9X"

# VOD 파일 목록
declare -A EPISODES
EPISODES[3]="엑셀부 시즌1_03화 조기퇴근DAY.mp4"
EPISODES[4]="엑셀부 시즌1_04화 명품데이.mp4"
EPISODES[5]="엑셀부 시즌1_05화 3 vs 9.mp4"

echo "═══════════════════════════════════════════════════════════"
echo "📁 VOD 다운로드 관리"
echo "═══════════════════════════════════════════════════════════"

# 상태 확인 함수
check_status() {
  for ep in 3 4 5; do
    local filename="${EPISODES[$ep]}"
    local filepath="$PIPELINE_DIR/$filename"

    if [ -f "$filepath" ]; then
      local size=$(stat -f%z "$filepath" 2>/dev/null)
      local size_gb=$(echo "scale=2; $size / 1024 / 1024 / 1024" | bc)
      echo "   EP$ep: ✅ 완료 ($size_gb GB)"
    elif ls "$PIPELINE_DIR"/*0${ep}화*.partial 2>/dev/null | head -1 > /dev/null; then
      local partial=$(ls "$PIPELINE_DIR"/*0${ep}화*.partial 2>/dev/null | head -1)
      local size=$(stat -f%z "$partial" 2>/dev/null)
      local size_gb=$(echo "scale=2; $size / 1024 / 1024 / 1024" | bc)
      echo "   EP$ep: ⏳ 다운로드 중 ($size_gb GB)"
    else
      echo "   EP$ep: ❌ 없음"
    fi
  done
}

# --check 모드
if [[ "$1" == "--check" ]]; then
  echo ""
  check_status
  echo ""
  exit 0
fi

echo ""
echo "📊 현재 상태:"
check_status
echo ""

# 다운로드 필요한 에피소드 확인
NEED_DOWNLOAD=()
for ep in 3 4 5; do
  local filename="${EPISODES[$ep]}"
  local filepath="$PIPELINE_DIR/$filename"

  if [ ! -f "$filepath" ] && ! ls "$PIPELINE_DIR"/*0${ep}화*.partial 2>/dev/null | head -1 > /dev/null; then
    NEED_DOWNLOAD+=($ep)
  fi
done

if [ ${#NEED_DOWNLOAD[@]} -eq 0 ]; then
  echo "✅ 모든 에피소드가 다운로드되었거나 진행 중입니다."
  exit 0
fi

echo "📥 다운로드 필요: EP${NEED_DOWNLOAD[*]}"
echo ""

# 순차 다운로드
for ep in "${NEED_DOWNLOAD[@]}"; do
  filename="${EPISODES[$ep]}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📥 EP$ep 다운로드: $filename"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  rclone copy "gdrive:$filename" "$PIPELINE_DIR" \
    --drive-root-folder-id="$GDRIVE_FOLDER_ID" \
    --progress \
    --transfers 4

  echo ""
  echo "✅ EP$ep 다운로드 완료"
  echo ""
done

echo "═══════════════════════════════════════════════════════════"
echo "✅ 전체 다운로드 완료!"
echo "═══════════════════════════════════════════════════════════"
