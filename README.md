# INU Course Mentor (INUCM)

인천대학교 종합강의시간표 엑셀을 업로드하면 그 학기 강의를 데이터화하고, 학생 프로필·성적을
바탕으로 졸업요건 충족 현황과 평점을 계산하며, 생성형 AI(Gemini)로 개인 맞춤 수강·학사 조언을
제공하는 웹 서비스.

웹프로그래밍 기말 프로젝트 · 컴퓨터공학부 202201642 고우석

## 문서
- [PRD](./docs/PRD.md) · [SPEC](./docs/SPEC.md) · [ROADMAP](./docs/ROADMAP.md)
- [DEPLOY](./DEPLOY.md) — 배포 가이드(DigitalOcean)

## 기술 스택
- **Frontend**: React 18 + Vite, React Router, Zustand(persist), axios, Tailwind CSS, react-markdown
- **Backend**: Node.js + Express, Prisma, JWT(jsonwebtoken)+bcrypt, multer, xlsx(SheetJS)
- **DB**: PostgreSQL (메인 DBMS) · **Web Storage**: localStorage + IndexedDB(시간표)
- **AI**: Google Gemini (`@google/generative-ai`), 키 미설정 시 규칙 기반 폴백
- **외부 API**: NCS(국가직무능력표준) 직무 역량 — 선택, 키 있을 때 AI 조언에 근거로 활용
- **Infra**: Docker · docker-compose · Nginx(단일 진입점 리버스 프록시) · GitHub Actions(CI/CD)

## 아키텍처
```
브라우저 → Nginx(proxy :80) ─┬─ /        → frontend(정적 React)
                            └─ /api/... → backend(Express :4000) → PostgreSQL
                                                                 → Gemini / NCS API
```
4개 컨테이너(db / backend / frontend / proxy)를 docker-compose로 오케스트레이션.

## 실행
```bash
cp .env.example .env          # 값 채우기 (POSTGRES_PASSWORD=DATABASE_URL 비번 일치, JWT_SECRET, GEMINI_API_KEY)
docker compose up -d --build  # 전체 스택 기동
# 접속: http://localhost   ·   관리자: admin / admininucm2026!
```
- 백엔드 컨테이너는 기동 시 `prisma db push`로 스키마 반영 + 졸업요건/관리자 계정을 시드.
- `GEMINI_API_KEY`를 비워두면 AI 조언은 규칙 기반 폴백으로 동작.

## 주요 기능
1. **회원가입·프로필** — JWT 인증, 학과/학년/관심직무/선호
2. **엑셀 업로드** — 종합강의시간표(.xlsx) 파싱→DB 적재(약 2,467강의), 과목별성적(.xlsx)→수강이력 자동 등록
3. **강의 검색** — 계열/학과/이수구분/학년/요일/시간(복수)/키워드 필터, "안겹치는 강의만" 토글
4. **시간표 생성** — 여러 개의 명명된 시간표(학년도-학기별), 시간 충돌 자동 감지, IndexedDB 영속
5. **졸업요건** — 입학년도별(2019~2022 / 2023+) 전공·교양·총학점 충족률 + 영어인증·졸업작품 체크
6. **평점 관리** — 전체/전공 GPA, 학기별 추이, 등급 분포 (성적 업로드 기반)
7. **AI 맞춤 조언** — 프로필+졸업요건+강의+NCS를 종합, **추천 강의로 시간표 자동 생성**(충돌 최소 조합)
8. **관리자 페이지** — 계정 관리(목록/아이디·비밀번호 변경/삭제)

## 과제 필수 요건 매핑
| 요건 | 구현 |
|---|---|
| Docker / Nginx | docker-compose 4컨테이너, Nginx 단일 진입점 프록시 |
| Web Storage | localStorage(JWT·테마) + IndexedDB(다중 시간표) |
| DBMS | PostgreSQL + Prisma |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`, `deploy.yml`) |
| 배포 URL | docker-compose를 클라우드 VM에 기동 (DEPLOY.md) |

## 폴더 구조
```
inu-course-mentor/
├── docker-compose.yml      # 4컨테이너 오케스트레이션
├── .env.example  DEPLOY.md
├── .github/workflows/      # ci.yml, deploy.yml
├── deploy/setup-server.sh  # 서버 초기 세팅 스크립트
├── proxy/                  # Nginx 리버스 프록시 (단일 진입점)
├── frontend/               # React + Vite (빌드 후 Nginx로 서빙)
├── backend/                # Express + Prisma (routes/services/middleware)
└── docs/                   # PRD / SPEC / ROADMAP
```
