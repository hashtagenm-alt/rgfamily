#!/bin/bash

# 시그니처 영상 압축 및 업로드 스크립트
#
# 사용법: ./scripts/compress-and-upload-videos.sh [멤버명]
# 예: ./scripts/compress-and-upload-videos.sh 가애

set -e

SOURCE_DIR="/tmp/signature-videos/01화"
OUTPUT_DIR="/tmp/signature-videos-compressed/01화"
TARGET_SIZE_MB=45  # 타겟 파일 크기 (50MB 제한에 여유 두기)

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 특정 멤버만 처리할 경우
TARGET_MEMBER="$1"

echo "========================================"
echo "🎬 시그니처 영상 압축 스크립트"
echo "   소스: $SOURCE_DIR"
echo "   출력: $OUTPUT_DIR"
echo "   타겟 크기: ${TARGET_SIZE_MB}MB"
if [ -n "$TARGET_MEMBER" ]; then
    echo "   대상 멤버: $TARGET_MEMBER"
fi
echo "========================================"

# 출력 폴더 생성
mkdir -p "$OUTPUT_DIR"

# 영상 길이 가져오기 (초)
get_duration() {
    ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$1" 2>/dev/null
}

# 영상 압축
compress_video() {
    local input="$1"
    local output="$2"
    local filename=$(basename "$input")

    # 영상 길이 확인
    local duration=$(get_duration "$input")
    if [ -z "$duration" ] || [ "$duration" = "N/A" ]; then
        echo -e "${RED}   ❌ 영상 길이를 가져올 수 없음: $filename${NC}"
        return 1
    fi

    # 타겟 비트레이트 계산 (kbps)
    # 공식: (타겟크기MB * 8192) / 영상길이초 - 오디오비트레이트
    local audio_bitrate=128  # kbps
    local target_total=$(echo "scale=0; ($TARGET_SIZE_MB * 8192) / $duration" | bc)
    local video_bitrate=$((target_total - audio_bitrate))

    # 최소 비트레이트 보장
    if [ "$video_bitrate" -lt 500 ]; then
        video_bitrate=500
    fi

    local duration_int=$(printf "%.0f" "$duration")
    echo "   📊 영상 길이: ${duration_int}초, 타겟 비트레이트: ${video_bitrate}kbps"

    # 2-pass 인코딩으로 정확한 파일 크기 달성
    echo "   ⏳ 압축 중... (2-pass 인코딩)"

    # Pass 1
    ffmpeg -y -i "$input" \
        -c:v libx264 -preset medium -b:v "${video_bitrate}k" \
        -pass 1 -passlogfile /tmp/ffmpeg2pass \
        -an -f null /dev/null 2>/dev/null

    # Pass 2
    ffmpeg -y -i "$input" \
        -c:v libx264 -preset medium -b:v "${video_bitrate}k" \
        -pass 2 -passlogfile /tmp/ffmpeg2pass \
        -c:a aac -b:a "${audio_bitrate}k" \
        -movflags +faststart \
        "$output" 2>/dev/null

    # 결과 확인
    if [ -f "$output" ]; then
        local output_size=$(du -m "$output" | cut -f1)
        echo -e "${GREEN}   ✅ 완료: ${output_size}MB${NC}"
        return 0
    else
        echo -e "${RED}   ❌ 압축 실패${NC}"
        return 1
    fi
}

# 멤버 폴더 처리
process_member() {
    local member="$1"
    local member_dir="$SOURCE_DIR/$member"
    local output_member_dir="$OUTPUT_DIR/$member"

    echo ""
    echo "====== $member ======"

    mkdir -p "$output_member_dir"

    for video in "$member_dir"/*.mp4; do
        [ -e "$video" ] || continue

        local filename=$(basename "$video")
        local output_file="$output_member_dir/$filename"

        echo ""
        echo "📁 처리 중: $filename"

        # 이미 처리된 파일인지 확인
        if [ -f "$output_file" ]; then
            local existing_size=$(du -m "$output_file" | cut -f1)
            if [ "$existing_size" -le "$TARGET_SIZE_MB" ]; then
                echo -e "${YELLOW}   ⏭️  이미 압축됨 (${existing_size}MB)${NC}"
                continue
            fi
        fi

        # 원본 크기 확인
        local original_size=$(du -m "$video" | cut -f1)
        echo "   📦 원본 크기: ${original_size}MB"

        # 이미 목표 크기 이하면 복사만
        if [ "$original_size" -le "$TARGET_SIZE_MB" ]; then
            echo -e "${GREEN}   ✅ 이미 ${TARGET_SIZE_MB}MB 이하, 복사만 진행${NC}"
            cp "$video" "$output_file"
            continue
        fi

        compress_video "$video" "$output_file"
    done
}

# 메인 처리
if [ -n "$TARGET_MEMBER" ]; then
    if [ -d "$SOURCE_DIR/$TARGET_MEMBER" ]; then
        process_member "$TARGET_MEMBER"
    else
        echo -e "${RED}❌ 멤버 폴더를 찾을 수 없음: $TARGET_MEMBER${NC}"
        exit 1
    fi
else
    for member_dir in "$SOURCE_DIR"/*/; do
        member=$(basename "$member_dir")
        process_member "$member"
    done
fi

echo ""
echo "========================================"
echo "✅ 압축 완료!"
echo ""
echo "📋 압축된 파일 목록:"
du -h "$OUTPUT_DIR"/*/*.mp4 2>/dev/null || echo "압축된 파일 없음"
echo ""
echo "다음 단계: npx tsx scripts/upload-signature-videos.ts"
echo "========================================
