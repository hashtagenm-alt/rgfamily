#!/usr/bin/env python3
"""
Update profile_info for all organization members in Supabase
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Profile info data for each member (by name)
PROFILE_DATA = {
    "가애": None,  # No profile info provided
    "린아": {
        "mbti": "ESTP",
        "blood_type": "O형",
        "height": "166cm",
        "weight": "51kg",
        "birthday": "2002.01.25",
        "signal_price": 5005,
        "photo_delivery": True,
        "position_pledge": """[1등] 여왕 ▶ MVP 식데(MVP한분만), 왕관
[2등] 공주 ▶ 영감호 1시간
[3등] 귀족 ▶ 마이린이호 1시간
[4등] 일반 ▶ 명예시민(일반클린)"""
    },
    "월아": {
        "mbti": "ESTP",
        "blood_type": "O형",
        "height": "?????",
        "weight": "???",
        "birthday": "0000.04.02",
        "signal_price": 5005,
        "position_pledge": """[1등] 여왕 ▶ MVP 1명 고급 식데
[2등] 공주 ▶ MVP 1명 커데
[3등] 황족 ▶ 번지점프 야방
[4등] 귀족 ▶ 디진다 돈까스 먹방
[5등] 시녀장 ▶ 홍대에서 담배꽁초 300개 줍기
[6등] 시녀 ▶ 갠방에서 코스프레 후 운동이벤트+12시간 노방종
[7,8,9등] 하녀1,2,3 ▶ 지압판 108배하며 정신차리기, 그 아래-반성하며 청소 열심히하기
[10,11,12등] 노예장,노예,쌉노예 ▶ 작성X"""
    },
    "채은": {
        "mbti": "ENFP",
        "blood_type": "O형",
        "height": "170cm",
        "weight": "52kg",
        "birthday": "2004.03.24",
        "signal_price": 5858,
        "position_pledge": """[1등] 여왕 ▶ MVP와 데이트
[2등] 공주 ▶ MVP 1명 개인연락처 + 커피데이트
[3등] 황족 ▶ MVP 1명 전광판 제작 + 수제도시락 선물
[4등] 귀족 ▶ MVP 갠방 원하는코스프레 + 원하는댄스시그 무제한
[5등] 시녀장 ▶ MVP 닉꾸 15일 + 옵챗 + 전데 (보이스톡)
[6등] 시녀 ▶ 갠방 감사인사 치킨핀볼 20마리
[7등] 하녀1 ▶ 신길동짬뽕먹방 + 폰방
[8등] 하녀2 ▶ 강남에서 쓰레기 300개 줍기 + 폰방
[9등] 하녀3 ▶ 갠방에서 하녀옷입고 라부부 30분 + 12시간노방종
[10등] 노예장 ▶ 나가
[11등] 노예 ▶ 죽을
[12등] 쌉노예 ▶ 게요"""
    },
    "가윤": {
        "mbti": "ISTP",
        "blood_type": "O형",
        "height": "167cm",
        "weight": "48kg",
        "birthday": "1996.01.03",
        "signal_price": 5055,
        "position_pledge": """[1] 여왕 ▶ MVP 1명 알.잘.딱 럭셔리 선물 + 수장님들 카드로 RG 체육대회 열기
[2] 공주 ▶ MVP 2명 고급 식사권 선물 + 수장님들 카드로 풀빌라가서 비키니 방송하기 (수장님들 비키니 입힐거임 무조건)
[3] 황족 ▶ 로또 30장 사기 ( 당첨금은 가플단 주기❤️)+ 린아 수장님이랑 모또하야쿠 시그 배틀하기
[4] 귀족 ▶ 밑직급들 스튜디오로 집합 시킨 후 혹독하게 댄스 점검 방송하기
[5,6] 시녀장 & 시녀 ▶ RG에서 10만수르 받기전까지 개인방송 노방종하기
[7,8,9] 하녀1~3 ▶ 100시간 노방종+ 갠방 슈퍼시그 단가 할인하기
[10,11] 노예장 & 노예 ▶ 애완돌이랑 커플 메이드복 입고 스튜디오 청소 방송하기
[12] 쌉노예 ▶ 돌가애 수장님한테 애완돌 선물해주기"""
    },
    "설윤": {
        "mbti": "ISTP",
        "blood_type": "A형",
        "height": "170cm",
        "weight": "50kg",
        "birthday": "2000.01.10",
        "signal_price": 5018,
        "position_pledge": """[1] 여왕 ▶ 설플단 식사권 핀볼+호주가서 캥거루랑 야차룰 뜨기
[2] 공주 ▶ 복권 100장 긁기 (당첨금 : 설플단 선물 삼) + 린아 수장님한테 바우치 배우기
[3] 황족 ▶ MVP 1명 수제 간식 선물+ 매운 짬뽕사서 가애 수장님 먹여주기
[4] 귀족 ▶ 밑직급 더블링 교육하기 (수장님들 포함 ㅋ❤️)
[5,6] 시녀장 & 시녀 ▶ 밑직급 랜덤 2명 골라서 피융신같은 코스프레 입히고 출근 시키기
[7,8,9] 하녀1~3 ▶ 설윤이가 피융신같은 코스프레 입고 출근하기..
[10,11] 노예장 & 노예 ▶ 신세한탄하면서 살풀이 받으러가기..
[12] 쌉노예 ▶ 죄송한 마음을 담아 수장님께 절 2번하기"""
    },
    "한세아": {
        "mbti": "INTJ",
        "blood_type": "AB형",
        "height": "160cm",
        "weight": "47kg",
        "birthday": "1992.12.14",
        "signal_price": 6245,
        "position_pledge": """[1] 여왕 ▶ MVP 세아랑 식데 및 백화점 데이트
[2] 공주 ▶ 한플단 전체회식 (세아카드)
[3] 황족 ▶ 대표님들이 정해주는 컨텐츠 하기
[4] 귀족 ▶ 한플단 시크릿 선물 핀볼 + 야외 캠빙장에서 24시간 노방종
[5,6] 시녀장, 시녀 ▶ 밑직급들 룰렛으로 2명 데리고 등산 야방 ( 정상에서 간절하게 기도하기) 또는 강남역에서 RG 홍보 전단지 돌리기
[7,8,9] 하녀1 ,하녀2 ,하녀3 ▶ 직접만든 수제 도시락 대표님들께 배달하기 + 수발들기
[10] 노예장 ▶ 밑직급들 데리고 소 똥 치우고 오기
[11,12] 노예, 쌉노예 ▶ 노장투혼으로 청소나 열심히 하기"""
    },
    "청아": {
        "mbti": "ISTP",
        "blood_type": "O형",
        "height": "163cm",
        "weight": "몰라여",
        "birthday": "2004.01.03",
        "position_pledge": """[1등] 여왕 ▶ MVP분과 궁합보러 가기 + 식사 데이트
[2등] 공주 ▶ MVP분과 식사 데이트
[3등] 황족 ▶MVP분과 영화 데이트
[4등] 귀족 ▶MVP분과 커피 데이트
[5등] 시녀장 ▶ MVP분께 선물
[6등] 시녀 ▶ MVP분께 선물
[7등] 하녀1 ▶MVP분께 선물
[8등] 하녀2 ▶퇴방 매일 키기
[9등] 하녀3 ▶퇴방 매일 키기
[10등] 노예장 ▶ 청소 열심히 하기
[11등] 노예 ▶청소 열심히 하기
[12등] 쌉노예 ▶청소 열심히 하기"""
    },
    "손밍": {
        "mbti": "INTP",
        "blood_type": "O형",
        "height": "161cm",
        "weight": "45kg",
        "birthday": "1996.07.25",
        "position_pledge": """[1등] 여왕 ▶ MVP 돌아온 손밍코스
[2등] 공주 ▶ MVP 식데
[3등] 황족 ▶ MVP 커데
[4등] 귀족 ▶ MVP 5명 단체식사
[5등] 시녀장 ▶ MVP 개인연락처
[6등] 시녀 ▶ MVP 갠방소원권 (협의)
[7등] 하녀1 ▶ 갠방 비키니방송
[8등] 하녀2 ▶ 하루 코스프레 입고 출근
[9등] 하녀3 ▶ 반려견과 5KM 산책야방
[10,11,12등] 노예장,노예,쌉노예 ▶ 12시간 노방종"""
    },
    "해린": {
        "mbti": "ESFP",
        "blood_type": "B형",
        "height": "157cm",
        "weight": "50kg",
        "birthday": "2005.07.05",
        "position_pledge": """[1등] 여왕 ▶ MVP 1명 식데+명품선물
[2등] 공주 ▶ MVP 5명 소고기 정모
[3등] 황족 ▶ MVP 3명 수제도시락 배달
[4등] 귀족 ▶ 한라산 정상찍고오기
[5등] 시녀장 ▶ 풀빌라 비키니 방송
[6등] 시녀 ▶ 원하는 코스튬으로 엑셀출근(방송컨셉에 맞게)
[7등] 하녀1 ▶ 퇴방 8시간하기
[8등] 하녀2 ▶ 퇴방 12시간
[9등] 하녀3 ▶ ㅍ번따 5명 노방종 야방 (홍대)
[10등] 노예장 ▶ 사찰에서 스님과 108배
[11등] 노예 ▶ 24시간 노방종 플단모으기
[12등] 쌉노예 ▶ 오이도 바닷가 입수(일상복)"""
    },
    "키키": {
        "mbti": "ESTP",
        "blood_type": "AB형",
        "height": "165cm",
        "weight": "43kg",
        "birthday": "1999.02.10",
        "position_pledge": """[1등] 여왕 ▶ MVP 소원권 (협의)
[2등] 공주 ▶ MVP 식데
[3등] 황족 ▶ MVP 식데
[4등] 귀족 ▶ MVP 식데
[5등] 시녀장 ▶ MVP 식데
[6등] 시녀 ▶ MVP 식데
[7등] 하녀1 ▶ MVP 식데
[8등] 하녀2 ▶ MVP 식데
[9등] 하녀3 ▶ MVP 식데
[10,11,12등] 노예장,노예,쌉노예 ▶ MVP 커데"""
    },
    "한백설": {
        "mbti": "ISTP",
        "blood_type": "O형",
        "height": "168cm",
        "weight": "46kg",
        "birthday": "1997.11.26",
        "position_pledge": """1등 여왕 ㅡ MVP 1명 원하는 옷 스타일 입고 고급 식데 + 고급 선물
2등 공주 ㅡ MVP 1명  원하는 옷 스타일 입고 커데 + 고급 선물
3등 황족 ㅡ MVP 1명 도시락 직접 배달
4등 귀족 ㅡ MVP 1명 커피 직접 배달
5등 시녀장 ㅡ MVP가 원하는 코스튬 + 원하는 음원 춤 배워오기
6등 시녀 ㅡ 갠방 섹시 비키니 방송
7등 하녀1 ㅡ 퇴방 4시간 1회
8등 하녀2 ㅡ 갠방 열심히 하겠습니다 외치며 108배 하기 1회
9등 하녀3 ㅡ 갠방 8시간 (낮, 밤 4시간씩 나눠서 플단 모으기) 1회
10등 노예장 ㅡ 노예들 데리고 청소하기
11등 노예 ㅡ 쌉노예 데리고 청소하기
12등 쌉노예 ㅡ 구석가서 즙이나 쳐 짜기"""
    },
    "홍서하": {
        "mbti": "ISTP",
        "blood_type": "B형",
        "height": "158cm",
        "weight": "42kg",
        "birthday": "2001.08.30",
        "signal_price": 5044,
        "position_pledge": """[1등] 여왕 ▶ 그때의 기억을 되살리며 축하와 감격과 눈물의 번지점프 라쓰고
[2등] 공주 ▶ 엠부삐 1분에게 명품선물
[3등] 황족 ▶ 원데이클라스가기 ㅋ이쁜쿠키만들어가 ㅋ 엠부삐세분께 정성가득사랑가득 드림메
[4등] 귀족 ▶ 유기묘를 사랑하는 멤버들과 유기견봉사
[5등] 시녀장 ▶ 홍플해주신분들 핀볼돌려가 5묭 배민선물드리기
[6등] 시녀 ▶ 매 회차 백댄서 출동하기
[7,8,9등] 하녀1,2,3 ▶ 녀짓하기 온갖 심부름은 나의 몫 ,,
[10,11,12등] 노예장, 그 밑... ▶ 최저시급이라도 벌게해주세요."""
    },
    "퀸로니": {
        "mbti": "ENFP",
        "blood_type": "B형",
        "height": "178cm",
        "weight": "80kg",
        "birthday": "1991.09.30",
        "position_pledge": """[1등] 여왕 ▶ MVP 명품선물
[2등] 공주 ▶ 번지점프
[3등] 황족 ▶ 흉가야방
[4등] 귀족 ▶ 야방 드라군 1시간
[5등] 시녀장 ▶ 24시간 노방종
[6등] 시녀 ▶ 시녀장 노예로 살기
[7등] 하녀1 ▶ 매일 퇴방 4시간 이상
[8등] 하녀2 ▶ 매일 퇴방 3시간 이상
[9등] 하녀3 ▶ 매일 퇴방 2시간 이상
[10등] 노예장 ▶ 여왕님 방송 중 노예역할
[11등] 노예 ▶ 여왕님 공주님 방송 중 노예역할
[12등] 쌉노예 ▶ 귀족까지 노예역할"""
    }
}

def main():
    print("Updating profile_info in Supabase...")

    # Get all members
    result = supabase.table("organization").select("id, name").execute()
    members = result.data

    print(f"Found {len(members)} members in database")

    updated = 0
    for member in members:
        name = member["name"]
        member_id = member["id"]

        if name in PROFILE_DATA:
            profile_info = PROFILE_DATA[name]
            if profile_info is not None:
                # Update the profile_info
                update_result = supabase.table("organization").update({
                    "profile_info": profile_info
                }).eq("id", member_id).execute()

                print(f"✅ Updated {name} (ID: {member_id})")
                updated += 1
            else:
                print(f"⏭️  Skipped {name} (no profile info)")
        else:
            print(f"⚠️  {name} not found in PROFILE_DATA")

    print(f"\nDone! Updated {updated} members.")

if __name__ == "__main__":
    main()
