
범위가 큽니다(DB 스키마 + 실시간 + 5개 게임 기능). 한 턴에 모두 만들기보다 **2단계**로 쪼개는 걸 제안드려요. 1단계가 끝난 직후에 바로 2단계로 넘어갑니다.

---

## 1단계 — 협업 인프라 + 캘린더 연동 (먼저 빌드)

### 데이터 모델 (Lovable Cloud)
```text
rooms        (code PK)
profiles     (user_id PK, nickname, avatar_url)   -- 로그인 사용자
room_members (room_code, user_id, joined_at)      -- 입장 기록
tasks        (id, room_code, title, quadrant, deadline,
              owner_id NULL, mentions text[],
              completed, deleted, created_by, created_at, updated_at)
```
- RLS: 같은 room에 속한 멤버만 SELECT/INSERT/UPDATE.
- Realtime publication: `tasks`, `room_members`.
- **Presence**: 누가 지금 접속해 있는지는 Realtime Presence 채널로 (DB 불필요).

### 인증
- 익명 사용자 흐름은 유지: 첫 진입 시 자동으로 **익명 가입** (이메일/비번 자동 생성, 닉네임/아바타는 로컬 프로필을 profiles 테이블에 동기화). Room Code 입력 후 `room_members`에 upsert.

### Task에 owner / 멘션
- TaskCard 호버 시 owner 배지 + "@" 칩.
- "+ owner" 클릭 → 현재 room 멤버 목록 popover에서 선택.
- 본문에 `@nickname` 자동완성 → 멘션 배열에 저장 + 멘션된 사람에게 토스트 알림(같은 방 본인 한정).

### 사이드바
- "In this room" 섹션 추가: 멤버 아바타 + 닉네임 리스트 (presence로 온라인 점 표시).

### 캘린더
- `deadline`이 있는 task만 표시 (이미 그렇게 동작 중인지 확인 후 보강).
- 날짜 셀의 task 칩 클릭 → Dialog로 열어서 title/owner/quadrant/deadline 편집.

### 스토어 정리
- `useTaskStore`를 **localStorage 기반에서 Cloud + Realtime 구독**으로 교체. 외부 API 동일 유지(addTask/moveTask 등)하지만 내부는 supabase 호출.
- `useProfileStore`는 그대로(로컬), 단 로그인 후 profiles 테이블에 sync.

---

## 2단계 — 게임 아이디어 1~5 (1단계 직후)

1. **팀장님 한숨 모션**: Slingshot 좌측 하단에 SVG/이모지 캐릭터. miss(어떤 quadrant에도 안 들어감) 또는 `eliminate` 골인 시 캐릭터가 한숨(어깨 들썩 + "후—" 말풍선) 애니메이션.
2. **사직서 특수카드**: 그날(00:00 기준) 추가된 task 수 카운트. `DAILY_LIMIT`(기본 8) 초과 시 다음 발사 탄환이 종이비행기 모양 "사직서"로 교체 — 어디에 떨어지든 점수 2배, 떨어진 quadrant에 `[사직서]` 태그 task로 들어감.
3. **Schedule 폭탄**: `schedule` quadrant의 task가 `BOMB_DAYS`(기본 3일) 이상 방치되면 카드가 빨갛게 깜빡임 → 5초 카운트다운 → 폭발 애니메이션 후 자동으로 `do`로 이동(`movedByBomb: true` 플래그, 토스트 표시). 백그라운드 인터벌로 체크.
4. **베스트루팡상**: 주간(월~일) Eliminate 골인 수를 user_id별로 집계. 일요일 23:00 이후 첫 접속자에게 토스트 + 사이드바 트로피 옆에 "👑 베스트루팡" 뱃지 부여. 집계는 클라이언트에서 tasks 쿼리로 계산(서버 cron 불필요).
5. **팀 업무뽑기**: 사이드바에 "🎰 팀 업무뽑기" 버튼. 사전 정의 풀(`["탕비실 간식 채우기", "회식 장소 예약", "프린터 토너 교체", ...]`)에서 랜덤 1개를 owner 없이 슬링샷 탄환으로 장전.

조정 가능한 값들(`DAILY_LIMIT`, `BOMB_DAYS`)도 기존 SlingshotSettings 패널에 추가합니다.

---

## 진행 방식
- **이번 턴**: 1단계만 완성(스키마/RLS/Realtime/Presence/owner/멘션/사이드바 멤버/캘린더 연동) → 빌드 통과 + Playwright로 두 탭 라이브 동기화 확인.
- **다음 턴**: 2단계 게임 아이디어 1~5.

이렇게 두 턴으로 진행해도 괜찮을까요? 아니면 한 턴에 다 밀어붙일까요?
