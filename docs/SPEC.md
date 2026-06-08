# SPEC — INU Course Mentor (INUCM)

> Technical Specification
> 참고: [PRD.md](./PRD.md) · [ROADMAP.md](./ROADMAP.md)

---

## 1. 시스템 아키텍처

수업(Nginx/Docker 강의)에서 배운 구조를 그대로 따른다.

```
                         [ 사용자 브라우저 ]
                                │  http(s)
                                ▼
                ┌──────────────────────────────┐
                │   Nginx  (Reverse Proxy)       │  단일 진입점 :80/:443
                │  /        → 정적 React 빌드     │
                │  /api/... → proxy_pass backend │
                └──────────────────────────────┘
                    │ 정적                  │ /api
                    ▼                       ▼
          [ React build (dist) ]    ┌──────────────────┐
                                    │ Express API 서버   │ :4000
                                    │ 엑셀 파싱/졸업요건  │
                                    │ /AI 프록시          │
                                    └──────────────────┘
                                       │ pg/Prisma   │ https
                                       ▼             ▼
                                ┌────────────┐   [ Gemini API ]
                                │ PostgreSQL │   [ (선택) NCS/커리어넷 ]
                                └────────────┘
   전체를 docker-compose로 4개 컨테이너(frontend·backend·db·proxy)로 오케스트레이션
```

**핵심 원칙**
- Nginx가 유일한 외부 진입점. 프론트와 백엔드가 **동일 출처(same-origin)** → CORS 문제 회피.
- AI/외부 API 키는 **백엔드에서만** 사용 (Serverless 강의의 교훈: 키를 클라이언트에 노출 금지).
- 백엔드 주소는 docker 네트워크의 **컨테이너 이름**으로 참조 (IP 하드코딩 금지).

---

## 2. 기술 스택

| 레이어 | 기술 | 비고 |
|---|---|---|
| Frontend | React 18 + Vite | SPA, react-router |
| 상태관리 | Zustand (persist) | 프로필/가상시간표 SSOT, localStorage 동기화 |
| HTTP | axios | `/api` 베이스, JWT 인터셉터 |
| 스타일 | Tailwind CSS (+ 필요시 MUI) | 빠른 UI |
| Backend | Node.js + Express | 라우팅·미들웨어 |
| 보안 | helmet, cors, jsonwebtoken, bcrypt | |
| 업로드 | multer | 메모리 스토리지로 .xlsx 수신 |
| 엑셀 | xlsx (SheetJS) | 파싱 |
| DB | PostgreSQL + Prisma | ORM, 마이그레이션 |
| AI | @google/generative-ai (Gemini) | 무료 티어 우선, OpenAI 대안 |
| Web Storage | localStorage + IndexedDB | JWT/UI 상태 + 가상시간표 오프라인 캐시 |
| Infra | Docker, docker-compose, Nginx | |
| CI/CD | GitHub Actions | build → (배포) |

> 설계 문서의 스택을 그대로 채택. 환경변수(.env)로 키 관리, 이미지에 미포함.

---

## 3. 데이터 모델 (Prisma)

PostgreSQL을 메인 DBMS로 사용. 6개 핵심 엔티티 + 보조 테이블.

```prisma
// schema.prisma (요약 — 실제 구현 시 확정)

model User {
  id            Int          @id @default(autoincrement())
  email         String       @unique
  passwordHash  String
  department    String       // 학과
  admissionYear Int          // 입학년도
  grade         Int          // 현재 학년 (1~4)
  semester      Int          // 현재 학기 (1~2)
  createdAt     DateTime     @default(now())
  preference    Preference?
  enrollments   Enrollment[]
  recommendations Recommendation[]
}

model Preference {
  id          Int    @id @default(autoincrement())
  userId      Int    @unique
  user        User   @relation(fields: [userId], references: [id])
  interestJob String // 관심 직무
  subjectTaste String // 이론/실습 등 선호도 (JSON 문자열 또는 enum)
}

model Course {
  id          Int      @id @default(autoincrement())
  semesterKey String   // 예: "2026-1" (어느 학기 시간표인지)
  courseCode  String   // 학수번호
  title       String   // 교과목명
  titleEn     String?  // 영문명
  professor   String?  // 담당교수
  college     String?  // 대학(원)
  department  String   // 학과(부)
  targetGrade String   // 학년: "전학년" | "1".."4"
  courseType  String   // 이수구분 (전공심화 등)
  courseArea  String?  // 이수영역
  credits     Int      // 학점
  room        String?  // 강의실 (null 가능: RISE)
  language    String?  // 원어강의구분
  grading     String?  // 성적평가
  meetings    Meeting[]
  @@unique([semesterKey, courseCode])
}

model Meeting {           // 강의의 개별 수업시간 (요일별 1행)
  id        Int    @id @default(autoincrement())
  courseId  Int
  course    Course @relation(fields: [courseId], references: [id])
  day       Int    // 0=월 ... 6=일
  startMin  Int    // 자정 기준 분 (예: 09:00 → 540)
  endMin    Int    // (예: 10:15 → 615)
  room      String?
}

model Enrollment {        // 수강 이력 / 예정
  id         Int    @id @default(autoincrement())
  userId     Int
  user       User   @relation(fields: [userId], references: [id])
  courseCode String
  semesterKey String
  status     String // "taken"(수강완료) | "planned"(예정)
  credits    Int
  courseType String // 이수구분 (집계용 스냅샷)
}

model GradReqRule {       // 졸업요건 규칙 (학과·입학년도별)
  id              Int    @id @default(autoincrement())
  department      String
  admissionYear   Int
  area            String // 영역명: "전공필수","전공심화","기초교양","총학점" 등
  requiredCredits Int
  etcRequirement  String? // 영어성적 등 비학점 요건 (자유 텍스트/JSON)
}

model Recommendation {    // AI 추천 캐시
  id             Int      @id @default(autoincrement())
  userId         Int
  user           User     @relation(fields: [userId], references: [id])
  semesterKey    String
  contextSummary String   // AI에 넣은 컨텍스트 요약 (Text)
  aiAdvice       String   // 생성된 조언 (Text)
  createdAt      DateTime @default(now())
}
```

> 설계 문서의 6 엔티티(User/Preference/Course/Enrollment/GradReqRule/Recommendation)에
> `Meeting`(요일별 시간) 테이블을 추가했다. 시간 충돌 감지·시간대 필터를 정규화된 형태로
> 처리하기 위함.

---

## 4. 엑셀 파싱 규격 (가장 중요)

업로드된 종합시간표 `.xlsx`의 실제 구조를 분석한 결과:

- 시트: 단일 시트 `sheet1`
- 1행: 제목, 2행: **헤더**, 3행~: 데이터 (약 2,467행)
- **20개 컬럼** (0-indexed):

| col | 헤더 | 매핑 | 비고 |
|---|---|---|---|
| 0 | 순번 | (무시) | |
| 1 | 대학(원) | `college` | |
| 2 | 학과(부) | `department` | 87종 |
| 3 | 학년 | `targetGrade` | "전학년"/"1".."4" |
| 4 | 이수구분 | `courseType` | 아래 enum |
| 5 | 이수영역 | `courseArea` | |
| 6 | 학수번호 | `courseCode` | 키 |
| 7 | 교과목명 | `title` | |
| 8 | 교과목명(영문) | `titleEn` | |
| 9 | 담당교수 | `professor` | null 가능 |
| 10 | 강의실 | `room` | null 가능 |
| 11 | 시간표(교시) | (보조) | 교시코드 |
| 12 | **시간표(시간)** | `meetings` 파싱 원본 | **실제 시간** |
| 13 | 교시유형 | (무시) | "75분" 등 |
| 14 | 학점 | `credits` | 정수 |
| 15 | 수업구분 | (옵션) | "일반과목" 등 |
| 16 | 수업유형 | (옵션) | "강의(이론)" 등 |
| 17 | 집중이수제 | (무시) | |
| 18 | 성적평가 | `grading` | "상대평가" 등 |
| 19 | 원어강의구분 | `language` | "비대상" 등 |

**이수구분 값(enum)**: `전공심화` `전공기초` `전공핵심` `기초교양` `핵심교양` `심화교양` `교직` `일반선택` `군사학`

### 4.1 시간표(시간) 파싱 알고리즘

입력 예시 (col 12):
```
 [07-407:화(10:30~11:45),목(09:00~10:15)]      // 다중 요일
 [15-119:월(18:00~19:15)(19:25~20:40)]          // 한 요일에 연속 2블록
 [07-407:목(13:00~13:50)(14:00~14:50)(15:00~15:50)]  // 3블록
 null                                            // RISE: 시간표 없음
```

파싱 절차:
1. 값이 `null`/빈문자/`시간표 없음` → `meetings = []` (강의는 적재하되 시간 없음).
2. 양 끝 공백·대괄호 `[ ]` 제거.
3. 첫 `:` 기준 분리 → 앞=강의실코드(보조), 뒤=요일·시간 본문.
4. 본문을 `,` 로 분리 → 각 "요일블록".
5. 요일블록에서 맨 앞 한 글자 = 요일(`월화수목금토일` → `0..6`). 단, "야1-2A" 같은
   야간 표기는 시간 컬럼엔 `HH:MM~HH:MM`로 들어오므로 시간만 신뢰.
6. 블록 내 `(HH:MM~HH:MM)` 패턴을 정규식 `\((\d{2}):(\d{2})~(\d{2}):(\d{2})\)` 으로 전부 추출.
7. 각 매치 → `{ day, startMin = h*60+m, endMin = h*60+m, room }` 한 `Meeting` 생성.
8. 동일 강의(같은 학수번호)의 모든 블록이 그 강의의 `meetings` 배열이 된다.

> 핵심: **col 12(시간표(시간))를 단일 진실로 사용**한다. col 11(교시코드)은 참고용.
> 한 행이 곧 하나의 강의(courseCode 단위). 같은 학수번호가 여러 행이면 분반이므로 별도 강의로 취급.

### 4.2 적재 (upsert)
- `semesterKey`는 업로드 시 사용자가 선택(기본 "2026-1", 제목행에서 추출 시도).
- `Course`는 `(semesterKey, courseCode)` 기준 upsert. 재업로드 시 기존 `Meeting` 삭제 후 재생성.
- 대량(2,400행) 적재는 트랜잭션 + `createMany`로 배치 처리.

---

## 5. 시간 충돌 감지

두 `Meeting` a, b가 충돌 ⇔ `a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin`.
가상 시간표에 강의 추가 시, 추가 강의의 모든 meeting을 기존 meeting들과 비교해 하나라도
겹치면 충돌 경고. 시간표 없는 강의(meetings=[])는 충돌 없음.

---

## 6. 졸업요건 계산 로직

입력: 학생의 `Enrollment[]`(status=taken/planned) + 해당 학과·입학년도의 `GradReqRule[]`.

1. 이수구분(area)별로 학점을 집계 (taken은 확정, planned은 별도 합산해 "예정 포함" 뷰 제공).
2. 각 규칙에 대해 `획득학점 / requiredCredits` → 충족률(%) 과 부족 학점 = max(0, required-획득).
3. 총학점 규칙은 전 영역 합으로 계산.
4. `etcRequirement`(영어성적 등)는 충족 여부 플래그로 표시(자기 신고).
5. 결과: `[{ area, required, earned, planned, shortage, percent }]` → 프론트에서 막대/도넛 시각화.

> 초기 `GradReqRule` 데이터는 **컴퓨터공학부 데모용 샘플**로 시드한다. UI에 "데모 기준" 명시.

---

## 7. AI 통합 (백엔드 프록시)

- 엔드포인트: `POST /api/recommend`
- 백엔드가 컨텍스트를 **서버에서** 조립 후 Gemini 호출. 키는 `GEMINI_API_KEY`(.env).
- 컨텍스트 구성:
  ```
  - 학생: {학과, 학년, 학기, 입학년도}
  - 관심직무: {interestJob}, 선호: {subjectTaste}
  - 졸업요건 요약: 영역별 부족 학점 [...]
  - 후보 강의(이번 학기, 학과/이수구분 매칭 상위 N개): [{학수번호, 과목명, 이수구분, 학점}]
  - (선택) 외부 진로 데이터: NCS 직무 역량 키워드
  ```
- 프롬프트 지시: 추천 과목 + 이유, 우선순위 로드맵, 부족영역 보완, 선수과목 리마인드를
  **한국어, 구조화된 마크다운**으로.
- 응답을 `Recommendation`에 캐시(같은 컨텍스트 재요청 시 캐시 우선).
- 실패/쿼터 초과 시: 규칙 기반 폴백 메시지(부족 영역 + 매칭 과목 나열)로 graceful degrade.

> 외부 진로 API(커리어넷/NCS)는 **선택(P2)**. 커리어넷 키 미발급 상태이므로 NCS 또는
> AI 단독으로 우선 동작시키고, 키 확보 시 컨텍스트에 추가.

---

## 8. REST API 설계

베이스: `/api` (Nginx가 백엔드로 프록시). 인증 필요 라우트는 `Authorization: Bearer <JWT>`.

| Method | Path | 설명 | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | 회원가입 | - |
| POST | `/api/auth/login` | 로그인 → JWT | - |
| GET | `/api/me` | 내 프로필 조회 | ✔ |
| PUT | `/api/me/profile` | 프로필/선호 수정 | ✔ |
| POST | `/api/courses/upload` | 엑셀 업로드·파싱·적재 (multipart) | ✔ |
| GET | `/api/courses` | 강의 검색·필터 (query: dept, type, day, time, q, page) | ✔ |
| GET | `/api/courses/:id` | 강의 상세 | ✔ |
| POST | `/api/enrollments` | 수강 이력/예정 추가 | ✔ |
| GET | `/api/enrollments` | 내 수강 이력 | ✔ |
| DELETE | `/api/enrollments/:id` | 삭제 | ✔ |
| GET | `/api/graduation` | 졸업요건 충족 현황 계산 | ✔ |
| POST | `/api/recommend` | AI 맞춤 조언 생성 | ✔ |
| GET | `/api/recommendations` | 저장된 조언 목록(학기별) | ✔ |
| GET | `/api/health` | 헬스체크 | - |

응답 규약: JSON, 성공 2xx, 생성 201, 검증 실패 400, 인증 401, 서버 500.
fetch/axios 사용 시 `response.ok`/status 확인 패턴 준수.

---

## 9. Web Storage 전략 (필수 요건 — DBMS와 병행)

| 저장소 | 용도 |
|---|---|
| **localStorage** | JWT 토큰, 프로필 캐시(Zustand persist), 마지막 본 학기 등 경량 상태 |
| **sessionStorage** | 업로드 진행 상태 등 탭 단위 임시값 |
| **IndexedDB** | **구성 중인 가상 시간표**(담은 강의 목록)와 강의 검색 결과 캐시 — 오프라인에서도 유지, 용량 큼 |

IndexedDB는 교수님 `inuDB` 예제 패턴을 따른다:
`indexedDB.open` → `onupgradeneeded`에서 `createObjectStore({keyPath})` → `transaction`으로 add/get/getAll/delete.
가상 시간표 store 예: `db.createObjectStore("timetable", { keyPath: "courseId" })`.

> DBMS(PostgreSQL)는 영속·관계형 데이터, Web Storage는 클라이언트 측 상태/캐시로 역할 분리.
> 이로써 "Web Storage + DBMS 둘 다 활용" 요건을 명확히 충족.

---

## 10. 인증 · 보안

- 비밀번호는 `bcrypt`로 해시 저장 (`passwordHash`).
- 로그인 시 JWT 발급(만료 포함), 프론트는 localStorage에 보관, axios 인터셉터로 헤더 첨부.
- `helmet`으로 보안 헤더, `cors`는 same-origin이라 최소 설정.
- 모든 비밀(`GEMINI_API_KEY`, `DATABASE_URL`, `JWT_SECRET`)은 `.env` → 컨테이너 환경변수로
  주입. `.env`는 `.gitignore`. 저장소에는 `.env.example`만.

---

## 11. 컨테이너 · 배포

### docker-compose 서비스
```
services:
  db        : postgres:16-alpine     (volume로 영속화, healthcheck)
  backend   : ./backend Dockerfile   (node:20-alpine, :4000, depends_on db)
  frontend  : ./frontend 빌드 → dist  (정적, proxy가 서빙)
  proxy     : ./proxy Dockerfile      (nginx:alpine, :80, depends_on backend)
networks: 단일 bridge 네트워크
```

### nginx.conf 핵심
```
upstream backend { server backend:4000; }   # 컨테이너 이름 참조
server {
  listen 80;
  root /usr/share/nginx/html;                # React dist
  location /api/ { proxy_pass http://backend; }
  location / { try_files $uri /index.html; } # SPA 라우팅 폴백
}
```

### 배포 타깃 (결정 필요 — ROADMAP 참조)
- **권장**: 단일 클라우드 VM(EC2/Oracle Free 등)에 docker-compose 배포 →
  Docker+Nginx+CI/CD 요건을 한 번에 충족(수업 EC2 시나리오와 동일).
- GitHub Actions: push 시 build/test → SSH로 VM 접속해 `docker compose pull/up -d`
  (또는 이미지 레지스트리 경유). **git push 자체는 사용자가 수행**.

---

## 12. CI/CD (GitHub Actions)

`.github/workflows/`:
- `ci.yml`: PR/push 시 frontend 빌드 + backend lint/test (Docker 빌드 검증).
- `deploy.yml`: main 브랜치 push 시 빌드 → 배포 타깃에 반영.

> 비밀은 GitHub Actions Secrets로 관리. 워크플로 파일은 작성해두되, 실제 시크릿 등록·
> push는 사용자가 수행.

---

## 13. 폴더 구조

```
inu-course-mentor/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── docs/                      # PRD / SPEC / ROADMAP
├── .github/workflows/         # ci.yml, deploy.yml
├── proxy/
│   ├── Dockerfile
│   └── nginx.conf
├── frontend/                  # React + Vite
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx, App.jsx
│       ├── lib/        # api.js(axios), idb.js(IndexedDB), excel 관련 util
│       ├── stores/     # zustand (auth, profile, timetable)
│       ├── pages/      # Login, Register, Profile, Courses, Timetable, Graduation, Advice
│       └── components/ # CourseCard, TimetableGrid, ConflictBadge, ReqChart ...
└── backend/                   # Node + Express
    ├── Dockerfile
    ├── package.json
    ├── prisma/schema.prisma
    └── src/
        ├── index.js           # app 부트스트랩
        ├── middleware/        # auth(JWT), error
        ├── routes/            # auth, me, courses, enrollments, graduation, recommend
        ├── controllers/
        ├── services/          # excelParser, gradReq, aiAdvisor
        └── db.js              # Prisma client
```

---

## 14. 비기능 요구
- 엑셀 업로드(2,400행) 파싱·적재가 합리적 시간(수 초) 내 완료.
- SPA 초기 로드 후 페이지 전환은 클라이언트 라우팅.
- 코드: 이모지 없는 한국어/영문 주석, camelCase, 교수님 강의 패턴과 일관.
